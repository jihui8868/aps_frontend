<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useScheduleStore } from '@/stores/schedule'
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
      <div class="sidebar-header">
        <h3 style="margin: 0; font-size: 15px;">排程记录</h3>
        <button class="btn-text danger" @click="confirmClearAll = true" v-if="historyList.length">清空</button>
      </div>
      <div class="history-list">
        <div
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
          :class="{ active: selected?.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="history-time">{{ formatDate(item.createdAt) }}</div>
          <div class="history-meta">
            订单: {{ item.orderCount }} | 延期: {{ item.lateCount || 0 }} | 工期: {{ item.makespan }}h
          </div>
          <button class="delete-btn" @click.stop="confirmDeleteItem(item.id)">&times;</button>
        </div>
        <div v-if="!historyList.length" style="text-align: center; padding: 32px 0; color: var(--text-light);">暂无记录</div>
      </div>
    </div>

    <!-- Right: Detail -->
    <div class="history-main">
      <div v-if="!selected" class="history-empty">
        <p>请从左侧选择一条排程记录查看详情</p>
      </div>

      <template v-if="selected">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ selected.makespan }}h</div>
            <div class="stat-label">总工期</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selected.orderCount }}</div>
            <div class="stat-label">订单数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" :style="{ color: selected.lateCount ? '#ff4d4f' : '#52c41a' }">{{ selected.lateCount || 0 }}</div>
            <div class="stat-label">延期数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selected.iterations }}</div>
            <div class="stat-label">迭代次数</div>
          </div>
        </div>

        <div class="page-card" style="margin-bottom: 16px; overflow-x: auto;">
          <h4 style="margin: 0 0 12px; font-size: 15px;">甘特图</h4>
          <canvas ref="canvasRef"></canvas>
        </div>

        <div class="page-card">
          <h4 style="margin: 0 0 12px; font-size: 15px;">排程详情</h4>
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
                  <th>延期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in selected.schedule" :key="idx">
                  <td>{{ item.orderNo }}</td>
                  <td>{{ item.productName }}</td>
                  <td>{{ item.deviceName }}</td>
                  <td>{{ item.workshop }}</td>
                  <td>{{ formatTime(item.startTime) }}</td>
                  <td>{{ formatTime(item.endTime) }}</td>
                  <td>{{ (item.hours || 0).toFixed ? item.hours.toFixed(1) : item.hours }}</td>
                  <td>
                    <span :style="{ color: item.isLate ? '#ff4d4f' : '#52c41a' }">{{ item.isLate ? '是' : '否' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
.history-page {
  display: flex;
  gap: 16px;
  height: calc(100vh - 92px);
}

.history-sidebar {
  width: 300px;
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

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.history-item:hover {
  background: var(--hover-bg);
}

.history-item.active {
  background: var(--primary-bg);
}

.history-time {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 4px;
}

.history-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.delete-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-light);
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--danger);
}

.history-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.history-empty {
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
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 4px;
}
</style>
