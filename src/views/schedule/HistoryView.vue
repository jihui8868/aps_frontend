<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
import { DeleteOutlined, ClearOutlined } from '@ant-design/icons-vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useScheduleStore()

const selected = ref(null)
const confirmVisible = ref(false)
const confirmClearAll = ref(false)
const deleteId = ref(null)
const canvasRef = ref(null)

const historyList = ref([])

const taskColors = [
  '#1677ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1',
  '#13c2c2', '#eb2f96', '#faad14', '#2f54eb', '#a0d911',
]

const detailColumns = [
  { title: '订单编号', dataIndex: 'orderNo', key: 'orderNo' },
  { title: '产品', dataIndex: 'productName', key: 'productName' },
  { title: '设备', dataIndex: 'deviceName', key: 'deviceName' },
  { title: '车间', dataIndex: 'workshop', key: 'workshop' },
  { title: '开始时间', key: 'startTime' },
  { title: '结束时间', key: 'endTime' },
  { title: '工时(h)', key: 'hours' },
  { title: '延期', key: 'isLate' },
]

async function loadHistory() {
  try {
    await store.fetchItems()
    historyList.value = store.items
  } catch {
    historyList.value = JSON.parse(localStorage.getItem('scheduleHistory') || '[]')
  }
}

function selectItem(item) {
  selected.value = item
  nextTick(() => drawGantt())
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function drawGantt() {
  const canvas = canvasRef.value
  if (!canvas || !selected.value?.schedule?.length) return

  const schedule = selected.value.schedule
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1

  const usedDeviceNames = [...new Set(schedule.map(s => s.deviceName))]
  const rowHeight = 40
  const headerHeight = 36
  const leftWidth = 130

  let minTime = Infinity, maxTime = -Infinity
  schedule.forEach(s => {
    const st = new Date(s.startTime).getTime()
    const et = new Date(s.endTime).getTime()
    minTime = Math.min(minTime, st)
    maxTime = Math.max(maxTime, et)
  })
  const timeRange = maxTime - minTime || 3600000

  const chartWidth = Math.max(600, canvas.parentElement.offsetWidth - 20)
  const chartHeight = headerHeight + usedDeviceNames.length * rowHeight + 8

  canvas.style.width = chartWidth + 'px'
  canvas.style.height = chartHeight + 'px'
  canvas.width = chartWidth * dpr
  canvas.height = chartHeight * dpr
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, chartWidth, chartHeight)

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, chartWidth, headerHeight)
  ctx.fillStyle = '#333'
  ctx.font = '12px -apple-system, sans-serif'
  ctx.fillText('设备', 12, headerHeight / 2 + 4)

  const timeWidth = chartWidth - leftWidth
  const hours = timeRange / 3600000
  const step = Math.max(1, Math.ceil(hours / 10))
  for (let h = 0; h <= hours; h += step) {
    const x = leftWidth + (h / hours) * timeWidth
    const date = new Date(minTime + h * 3600000)
    ctx.fillStyle = '#999'
    ctx.font = '10px -apple-system, sans-serif'
    ctx.fillText(`${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`, x, headerHeight / 2 + 4)
    ctx.strokeStyle = '#f0f0f0'
    ctx.beginPath()
    ctx.moveTo(x, headerHeight)
    ctx.lineTo(x, chartHeight)
    ctx.stroke()
  }

  usedDeviceNames.forEach((name, i) => {
    const y = headerHeight + i * rowHeight
    if (i % 2 === 0) {
      ctx.fillStyle = '#fafafa'
      ctx.fillRect(0, y, chartWidth, rowHeight)
    }
    ctx.fillStyle = '#333'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.fillText(name, 12, y + rowHeight / 2 + 4)

    const tasks = schedule.filter(s => s.deviceName === name)
    tasks.forEach(task => {
      const st = (new Date(task.startTime).getTime() - minTime) / timeRange
      const et = (new Date(task.endTime).getTime() - minTime) / timeRange
      const tx = leftWidth + st * timeWidth
      const tw = Math.max(3, (et - st) * timeWidth)
      const ty = y + 5
      const th = rowHeight - 10

      const ci = schedule.indexOf(task) % taskColors.length
      ctx.fillStyle = taskColors[ci]
      ctx.beginPath()
      ctx.roundRect(tx, ty, tw, th, 3)
      ctx.fill()

      if (tw > 40) {
        ctx.fillStyle = '#fff'
        ctx.font = '10px -apple-system, sans-serif'
        ctx.fillText(task.orderNo || '', tx + 4, ty + th / 2 + 3, tw - 8)
      }
    })
  })

  ctx.strokeStyle = '#e8e8e8'
  ctx.beginPath()
  ctx.moveTo(leftWidth, 0)
  ctx.lineTo(leftWidth, chartHeight)
  ctx.stroke()
}

function confirmDeleteItem(id) {
  deleteId.value = id
  confirmVisible.value = true
}

async function handleDelete() {
  try {
    await store.deleteItem(deleteId.value)
  } catch {
    const history = JSON.parse(localStorage.getItem('scheduleHistory') || '[]')
    const idx = history.findIndex(h => h.id === deleteId.value)
    if (idx >= 0) history.splice(idx, 1)
    localStorage.setItem('scheduleHistory', JSON.stringify(history))
  }
  if (selected.value?.id === deleteId.value) selected.value = null
  confirmVisible.value = false
  await loadHistory()
}

async function handleClearAll() {
  try {
    await store.clearAll()
  } catch {
    localStorage.setItem('scheduleHistory', '[]')
  }
  selected.value = null
  confirmClearAll.value = false
  historyList.value = []
}

onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="history-page">
    <!-- Left: History List -->
    <div class="history-sidebar">
      <a-card title="排程记录" :body-style="{ padding: '8px', flex: 1, overflowY: 'auto' }" style="display: flex; flex-direction: column; height: 100%;">
        <template #extra>
          <a-button v-if="historyList.length" type="link" danger size="small" @click="confirmClearAll = true">清空</a-button>
        </template>
        <div v-for="item in historyList" :key="item.id" class="history-item" :class="{ active: selected?.id === item.id }" @click="selectItem(item)">
          <div class="history-time">{{ formatDate(item.createdAt) }}</div>
          <div class="history-meta">订单: {{ item.orderCount }} | 延期: {{ item.lateCount || 0 }} | 工期: {{ item.makespan }}h</div>
          <a-button class="delete-btn" type="text" danger size="small" @click.stop="confirmDeleteItem(item.id)">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </div>
        <a-empty v-if="!historyList.length" description="暂无记录" />
      </a-card>
    </div>

    <!-- Right: Detail -->
    <div class="history-main">
      <a-empty v-if="!selected" description="请从左侧选择一条排程记录查看详情" style="margin-top: 100px" />

      <template v-if="selected">
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :span="6"><a-card><a-statistic title="总工期" :value="selected.makespan" suffix="h" /></a-card></a-col>
          <a-col :span="6"><a-card><a-statistic title="订单数" :value="selected.orderCount" /></a-card></a-col>
          <a-col :span="6"><a-card><a-statistic title="延期数" :value="selected.lateCount || 0" :value-style="{ color: selected.lateCount ? '#ff4d4f' : '#52c41a' }" /></a-card></a-col>
          <a-col :span="6"><a-card><a-statistic title="迭代次数" :value="selected.iterations" /></a-card></a-col>
        </a-row>

        <a-card title="甘特图" style="margin-bottom: 16px; overflow-x: auto;">
          <canvas ref="canvasRef"></canvas>
        </a-card>

        <a-card title="排程详情">
          <a-table :columns="detailColumns" :data-source="selected.schedule" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'startTime'">{{ formatTime(record.startTime) }}</template>
              <template v-else-if="column.key === 'endTime'">{{ formatTime(record.endTime) }}</template>
              <template v-else-if="column.key === 'hours'">{{ (record.hours || 0).toFixed ? record.hours.toFixed(1) : record.hours }}</template>
              <template v-else-if="column.key === 'isLate'">
                <a-tag :color="record.isLate ? 'red' : 'green'">{{ record.isLate ? '是' : '否' }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </template>
    </div>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该条排程记录吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
    <ConfirmDialog
      :visible="confirmClearAll"
      title="清空确认"
      message="确定要清空全部排程记录吗？此操作不可恢复。"
      danger
      @confirm="handleClearAll"
      @cancel="confirmClearAll = false"
    />
  </div>
</template>

<style scoped>
.history-page { display: flex; gap: 16px; height: calc(100vh - 92px); }
.history-sidebar { width: 300px; flex-shrink: 0; }
.history-main { flex: 1; overflow-y: auto; min-width: 0; }
.history-item { padding: 12px; border-radius: 6px; cursor: pointer; position: relative; }
.history-item:hover { background: #f5f5f5; }
.history-item.active { background: #e6f4ff; }
.history-time { font-weight: 500; font-size: 13px; margin-bottom: 4px; }
.history-meta { font-size: 12px; color: rgba(0,0,0,0.45); }
.delete-btn { position: absolute; right: 8px; top: 8px; opacity: 0; }
.history-item:hover .delete-btn { opacity: 1; }
</style>
