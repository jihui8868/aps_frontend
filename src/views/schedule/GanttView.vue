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
      <div class="sidebar-header">
        <h3 style="margin: 0; font-size: 15px;">待排产订单</h3>
        <button class="btn-text" @click="toggleSelectAll" style="font-size: 13px;">
          {{ selectedIds.length === pendingOrders.length ? '取消全选' : '全选' }}
        </button>
      </div>
      <div class="order-list">
        <div
          v-for="order in pendingOrders"
          :key="order.id"
          class="order-item"
          :class="{ selected: selectedIds.includes(order.id) }"
          @click="toggleSelect(order.id)"
        >
          <input type="checkbox" :checked="selectedIds.includes(order.id)" @click.stop="toggleSelect(order.id)" />
          <div class="order-info">
            <div class="order-no">{{ order.orderNo }}</div>
            <div class="order-detail">{{ order.productName }} | {{ order.quantity }}{{ order.unit }}</div>
            <div class="order-meta">
              <span :style="{ color: order.priority === '高' ? '#ff4d4f' : order.priority === '中' ? '#fa8c16' : '#1677ff' }">{{ order.priority }}优先</span>
              <span>交期: {{ order.deadline }}</span>
            </div>
          </div>
        </div>
        <div v-if="!pendingOrders.length" style="text-align: center; padding: 32px 0; color: var(--text-light);">暂无待排产订单</div>
      </div>

      <div class="sidebar-actions">
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label">排程起始日期</label>
          <input v-model="startDate" type="date" class="form-input" style="width: 100%;" />
        </div>
        <button
          class="btn btn-primary"
          style="width: 100%;"
          :disabled="!selectedIds.length || scheduling"
          @click="startSchedule"
        >
          {{ scheduling ? '排程中...' : '开始排程' }}
        </button>

        <div v-if="scheduling" class="progress-area">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (progress / 200 * 100) + '%' }"></div>
          </div>
          <div class="progress-text">迭代: {{ progress }} / 200 | 适应度: {{ bestFitness.toFixed(1) }}</div>
        </div>
      </div>
    </div>

    <!-- Right Area -->
    <div class="gantt-main">
      <div v-if="!scheduleResult" class="gantt-empty">
        <p>选择待排产订单，点击"开始排程"进行智能排程</p>
      </div>

      <template v-if="scheduleResult">
        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ scheduleResult.stats.makespan }}h</div>
            <div class="stat-label">总工期</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ scheduleResult.schedule.length }}</div>
            <div class="stat-label">排程任务</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" :style="{ color: scheduleResult.schedule.filter(s => s.isLate).length ? '#ff4d4f' : '#52c41a' }">
              {{ scheduleResult.schedule.filter(s => s.isLate).length }}
            </div>
            <div class="stat-label">延期数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ scheduleResult.stats.iterations }}</div>
            <div class="stat-label">迭代次数</div>
          </div>
        </div>

        <!-- Gantt Chart -->
        <div class="page-card" style="margin-bottom: 16px; overflow-x: auto; position: relative;">
          <h4 style="margin: 0 0 12px; font-size: 15px;">甘特图</h4>
          <canvas
            ref="canvasRef"
            @mousemove="handleCanvasMouseMove"
            @mouseleave="handleCanvasMouseLeave"
          ></canvas>
        </div>

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
        <div class="page-card">
          <h4 style="margin: 0 0 12px; font-size: 15px;">排程结果</h4>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>订单编号</th>
                  <th>产品</th>
                  <th>设备</th>
                  <th>车间</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>工时(h)</th>
                  <th>是否延期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in scheduleResult.schedule" :key="idx">
                  <td>{{ item.orderNo }}</td>
                  <td>{{ item.productName }}</td>
                  <td>{{ item.deviceName }}</td>
                  <td>{{ item.workshop }}</td>
                  <td>{{ formatDateTime(item.startTime) }}</td>
                  <td>{{ formatDateTime(item.endTime) }}</td>
                  <td>{{ item.hours.toFixed(1) }}</td>
                  <td>
                    <span :style="{ color: item.isLate ? '#ff4d4f' : '#52c41a' }">
                      {{ item.isLate ? '是 (+' + item.lateHours.toFixed(1) + 'h)' : '否' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.gantt-page {
  display: flex;
  gap: 16px;
  height: calc(100vh - 92px);
}

.gantt-sidebar {
  width: 320px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.order-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.order-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:hover {
  background: var(--hover-bg);
}

.order-item.selected {
  background: var(--primary-bg);
}

.order-item input[type="checkbox"] {
  margin-top: 2px;
  flex-shrink: 0;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-no {
  font-weight: 500;
  font-size: 13px;
}

.order-detail {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}

.sidebar-actions {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.progress-area {
  margin-top: 12px;
}

.progress-bar {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.1s;
}

.progress-text {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 6px;
}

.gantt-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.gantt-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #fff;
  border-radius: 8px;
  color: var(--text-light);
}

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-light);
  margin-top: 4px;
}

.gantt-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  pointer-events: none;
  z-index: 999;
  max-width: 300px;
}
</style>
