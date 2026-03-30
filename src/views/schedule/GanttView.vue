<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useDeviceStore } from '@/stores/device'
import { useScheduleStore } from '@/stores/schedule'
import { runScheduler } from '@/utils/scheduler'

const orderStore = useOrderStore()
const deviceStore = useDeviceStore()
const scheduleStore = useScheduleStore()

const pendingOrders = ref([])
const selectedIds = ref([])
const startDate = ref(new Date().toISOString().slice(0, 10))
const scheduling = ref(false)
const progress = ref(0)
const bestFitness = ref(0)
const scheduleResult = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, data: null })

const canvasRef = ref(null)

const taskColors = [
  '#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1',
  '#13c2c2', '#eb2f96', '#faad14', '#2f54eb', '#a0d911',
  '#f5222d', '#1890ff', '#fadb14', '#ff7a45', '#597ef7',
]

const resultColumns = [
  { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '产品', dataIndex: 'productName', key: 'productName' },
  { title: '设备', dataIndex: 'deviceName', key: 'deviceName' },
  { title: '车间', dataIndex: 'workshop', key: 'workshop' },
  { title: '开始时间', key: 'startTime' },
  { title: '结束时间', key: 'endTime' },
  { title: '工时(h)', key: 'hours' },
  { title: '是否延期', key: 'isLate' },
]

function toggleSelectAll() {
  if (selectedIds.value.length === pendingOrders.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = pendingOrders.value.map(o => o.id)
  }
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

async function startSchedule() {
  if (!selectedIds.value.length) return
  if (!deviceStore.items.length) return

  scheduling.value = true
  progress.value = 0
  bestFitness.value = 0
  scheduleResult.value = null

  const orders = pendingOrders.value.filter(o => selectedIds.value.includes(o.id))
  const devices = deviceStore.items.filter(d => d.status === '运行中' || d.status === '待机')

  if (!devices.length) {
    scheduling.value = false
    return
  }

  try {
    const result = await runScheduler(
      { orders, devices, startDate: startDate.value },
      (iteration, fitness) => {
        progress.value = iteration
        bestFitness.value = fitness
      }
    )
    scheduleResult.value = result

    // Save to history
    try {
      await scheduleStore.addItem({
        createdAt: new Date().toISOString(),
        startDate: startDate.value,
        orderCount: orders.length,
        lateCount: result.schedule.filter(s => s.isLate).length,
        makespan: result.stats.makespan,
        iterations: result.stats.iterations,
        bestFitness: result.stats.bestFitness,
        schedule: result.schedule.map(s => ({
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        })),
      })
    } catch (e) {
      // Save locally if API fails
      const history = JSON.parse(localStorage.getItem('scheduleHistory') || '[]')
      history.unshift({
        id: Date.now(),
        createdAt: new Date().toISOString(),
        startDate: startDate.value,
        orderCount: orders.length,
        lateCount: result.schedule.filter(s => s.isLate).length,
        makespan: result.stats.makespan,
        iterations: result.stats.iterations,
        bestFitness: result.stats.bestFitness,
        schedule: result.schedule.map(s => ({
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        })),
      })
      localStorage.setItem('scheduleHistory', JSON.stringify(history))
    }

    await nextTick()
    drawGantt(result.schedule, devices)
  } finally {
    scheduling.value = false
  }
}

function drawGantt(schedule, devices) {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1

  const usedDeviceNames = [...new Set(schedule.map(s => s.deviceName))]
  const rowHeight = 44
  const headerHeight = 40
  const leftWidth = 140
  const padding = 16

  // Find time range
  let minTime = Infinity, maxTime = -Infinity
  schedule.forEach(s => {
    minTime = Math.min(minTime, s.startTime.getTime())
    maxTime = Math.max(maxTime, s.endTime.getTime())
  })
  const timeRange = maxTime - minTime || 3600000

  const chartWidth = Math.max(800, canvas.parentElement.offsetWidth - 40)
  const chartHeight = headerHeight + usedDeviceNames.length * rowHeight + padding

  canvas.style.width = chartWidth + 'px'
  canvas.style.height = chartHeight + 'px'
  canvas.width = chartWidth * dpr
  canvas.height = chartHeight * dpr
  ctx.scale(dpr, dpr)

  // Store task rectangles for hover detection
  canvas._taskRects = []

  // Background
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, chartWidth, chartHeight)

  // Header
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, chartWidth, headerHeight)
  ctx.fillStyle = '#333'
  ctx.font = '12px -apple-system, sans-serif'
  ctx.fillText('设备', 16, headerHeight / 2 + 4)

  // Time labels
  const timeWidth = chartWidth - leftWidth
  const hours = timeRange / 3600000
  const step = Math.max(1, Math.ceil(hours / 12))
  for (let h = 0; h <= hours; h += step) {
    const x = leftWidth + (h / hours) * timeWidth
    const date = new Date(minTime + h * 3600000)
    const label = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
    ctx.fillStyle = '#999'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.fillText(label, x, headerHeight / 2 + 4)

    ctx.strokeStyle = '#f0f0f0'
    ctx.beginPath()
    ctx.moveTo(x, headerHeight)
    ctx.lineTo(x, chartHeight)
    ctx.stroke()
  }

  // Rows
  usedDeviceNames.forEach((deviceName, i) => {
    const y = headerHeight + i * rowHeight

    if (i % 2 === 0) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(0, y, chartWidth, rowHeight)
    }

    // Device name
    ctx.fillStyle = '#333'
    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillText(deviceName, 16, y + rowHeight / 2 + 4)

    // Separator
    ctx.strokeStyle = '#f0f0f0'
    ctx.beginPath()
    ctx.moveTo(0, y + rowHeight)
    ctx.lineTo(chartWidth, y + rowHeight)
    ctx.stroke()

    // Tasks for this device
    const tasks = schedule.filter(s => s.deviceName === deviceName)
    tasks.forEach((task, tIdx) => {
      const taskStart = (task.startTime.getTime() - minTime) / timeRange
      const taskEnd = (task.endTime.getTime() - minTime) / timeRange
      const tx = leftWidth + taskStart * timeWidth
      const tw = Math.max(4, (taskEnd - taskStart) * timeWidth)
      const ty = y + 6
      const th = rowHeight - 12

      const colorIdx = schedule.indexOf(task) % taskColors.length
      ctx.fillStyle = taskColors[colorIdx]
      ctx.beginPath()
      ctx.roundRect(tx, ty, tw, th, 4)
      ctx.fill()

      // Task label
      if (tw > 50) {
        ctx.fillStyle = '#fff'
        ctx.font = '11px -apple-system, sans-serif'
        const label = task.orderNo || task.productName || ''
        ctx.fillText(label, tx + 6, ty + th / 2 + 4, tw - 12)
      }

      // Store rect for tooltip
      canvas._taskRects.push({ x: tx, y: ty, w: tw, h: th, task })
    })
  })

  // Left border
  ctx.strokeStyle = '#e8e8e8'
  ctx.beginPath()
  ctx.moveTo(leftWidth, 0)
  ctx.lineTo(leftWidth, chartHeight)
  ctx.stroke()
}

function handleCanvasMouseMove(e) {
  const canvas = canvasRef.value
  if (!canvas || !canvas._taskRects) return

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const hit = canvas._taskRects.find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
  if (hit) {
    tooltip.value = {
      visible: true,
      x: e.clientX + 12,
      y: e.clientY + 12,
      data: hit.task,
    }
  } else {
    tooltip.value.visible = false
  }
}

function handleCanvasMouseLeave() {
  tooltip.value.visible = false
}

function formatDateTime(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(async () => {
  await Promise.all([orderStore.fetchItems(), deviceStore.fetchItems()])
  pendingOrders.value = orderStore.items.filter(o => o.status === '待排产')
})
</script>

<template>
  <div class="gantt-page">
    <!-- Left Panel -->
    <div class="gantt-sidebar">
      <a-card title="待排产订单" :body-style="{ padding: '8px', display: 'flex', flexDirection: 'column', flex: 1 }" style="display: flex; flex-direction: column; height: 100%;">
        <template #extra>
          <a-button type="link" size="small" @click="toggleSelectAll">
            {{ selectedIds.length === pendingOrders.length ? '取消全选' : '全选' }}
          </a-button>
        </template>

        <!-- Order list -->
        <div style="flex: 1; overflow-y: auto;">
          <div
            v-for="order in pendingOrders"
            :key="order.id"
            class="order-item"
            :class="{ selected: selectedIds.includes(order.id) }"
            @click="toggleSelect(order.id)"
          >
            <a-checkbox :checked="selectedIds.includes(order.id)" @click.stop="toggleSelect(order.id)" />
            <div class="order-info">
              <div class="order-no">{{ order.orderNo }}</div>
              <div class="order-detail">{{ order.productName }} | {{ order.quantity }}{{ order.unit }}</div>
              <div class="order-meta">
                <span :style="{ color: order.priority === '高' ? '#ff4d4f' : order.priority === '中' ? '#fa8c16' : '#1677ff' }">{{ order.priority }}优先</span>
                <span>交期: {{ order.deadline }}</span>
              </div>
            </div>
          </div>
          <a-empty v-if="!pendingOrders.length" description="暂无待排产订单" />
        </div>

        <!-- Bottom actions -->
        <div style="padding: 12px 8px 0; border-top: 1px solid #f0f0f0;">
          <a-form-item label="排程起始日期" style="margin-bottom: 12px">
            <a-date-picker v-model:value="startDate" value-format="YYYY-MM-DD" style="width: 100%" />
          </a-form-item>
          <a-button type="primary" block :loading="scheduling" :disabled="!selectedIds.length" @click="startSchedule">
            {{ scheduling ? '排程中...' : '开始排程' }}
          </a-button>
          <div v-if="scheduling" style="margin-top: 12px">
            <a-progress :percent="progress / 200 * 100" :show-info="false" />
            <div style="font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 6px;">
              迭代: {{ progress }} / 200 | 适应度: {{ bestFitness.toFixed(1) }}
            </div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- Right Area -->
    <div class="gantt-main">
      <a-empty v-if="!scheduleResult" description="选择待排产订单，点击「开始排程」进行智能排程" style="margin-top: 100px" />

      <template v-if="scheduleResult">
        <!-- Stats -->
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :span="6">
            <a-card>
              <a-statistic title="总工期" :value="scheduleResult.stats.makespan" suffix="h" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="排程任务" :value="scheduleResult.schedule.length" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="延期数" :value="scheduleResult.schedule.filter(s => s.isLate).length"
                :value-style="{ color: scheduleResult.schedule.filter(s => s.isLate).length ? '#ff4d4f' : '#52c41a' }" />
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic title="迭代次数" :value="scheduleResult.stats.iterations" />
            </a-card>
          </a-col>
        </a-row>

        <!-- Gantt Chart -->
        <a-card title="甘特图" style="margin-bottom: 16px; overflow-x: auto; position: relative;">
          <canvas
            ref="canvasRef"
            @mousemove="handleCanvasMouseMove"
            @mouseleave="handleCanvasMouseLeave"
          ></canvas>
        </a-card>

        <!-- Tooltip -->
        <div
          v-if="tooltip.visible && tooltip.data"
          class="gantt-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div><strong>{{ tooltip.data.orderNo }}</strong></div>
          <div>产品: {{ tooltip.data.productName }}</div>
          <div>设备: {{ tooltip.data.deviceName }}</div>
          <div>时间: {{ formatDateTime(tooltip.data.startTime) }} ~ {{ formatDateTime(tooltip.data.endTime) }}</div>
        </div>

        <!-- Result Table -->
        <a-card title="排程结果">
          <a-table :columns="resultColumns" :data-source="scheduleResult.schedule" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'startTime'">{{ formatDateTime(record.startTime) }}</template>
              <template v-else-if="column.key === 'endTime'">{{ formatDateTime(record.endTime) }}</template>
              <template v-else-if="column.key === 'hours'">{{ record.hours.toFixed(1) }}</template>
              <template v-else-if="column.key === 'isLate'">
                <a-tag :color="record.isLate ? 'red' : 'green'">
                  {{ record.isLate ? '是 (+' + record.lateHours.toFixed(1) + 'h)' : '否' }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gantt-page { display: flex; gap: 16px; height: calc(100vh - 92px); }
.gantt-sidebar { width: 320px; flex-shrink: 0; }
.gantt-main { flex: 1; overflow-y: auto; min-width: 0; }
.order-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 6px; cursor: pointer; }
.order-item:hover { background: #f5f5f5; }
.order-item.selected { background: #e6f4ff; }
.order-info { flex: 1; min-width: 0; }
.order-no { font-weight: 500; font-size: 13px; }
.order-detail { font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 2px; }
.order-meta { display: flex; gap: 12px; font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 4px; }
.gantt-tooltip { position: fixed; background: rgba(0,0,0,0.8); color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 12px; line-height: 1.6; pointer-events: none; z-index: 999; max-width: 300px; }
</style>
