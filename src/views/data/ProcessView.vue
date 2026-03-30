<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcessStore } from '@/stores/process'
import { useProductStore } from '@/stores/product'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useProcessStore()
const productStore = useProductStore()

const search = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const showDetail = ref(false)
const editingItem = ref(null)
const detailItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const processCategories = ['合成反应', '分离纯化', '聚合反应', '裂解工艺', '氧化还原', '其他']
const statuses = ['草稿', '已发布', '已停用']
const statusColorMap = { '草稿': '#1677ff', '已发布': '#52c41a', '已停用': '#ff4d4f' }

const defaultForm = () => ({
  code: '',
  name: '',
  productId: '',
  productName: '',
  category: '',
  status: '草稿',
  version: '1.0',
  steps: [{ seq: 1, name: '', deviceType: '', duration: '', temperature: '', pressure: '', description: '' }],
})

const form = ref(defaultForm())

const totalDuration = computed(() => {
  return form.value.steps.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0)
})

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.name?.includes(search.value) || item.code?.includes(search.value)
    const matchCategory = !filterCategory.value || item.category === filterCategory.value
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchCategory && matchStatus
  })
})

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = {
    ...item,
    steps: item.steps?.length ? item.steps.map(s => ({ ...s })) : [{ seq: 1, name: '', deviceType: '', duration: '', temperature: '', pressure: '', description: '' }],
  }
  showModal.value = true
}

function openDetail(item) {
  detailItem.value = item
  showDetail.value = true
}

function closeModal() {
  showModal.value = false
}

function addStep() {
  const seq = form.value.steps.length + 1
  form.value.steps.push({ seq, name: '', deviceType: '', duration: '', temperature: '', pressure: '', description: '' })
}

function removeStep(idx) {
  form.value.steps.splice(idx, 1)
  form.value.steps.forEach((s, i) => { s.seq = i + 1 })
}

async function handleSave() {
  if (!form.value.code || !form.value.name) return
  const data = {
    ...form.value,
    totalDuration: totalDuration.value,
    stepCount: form.value.steps.length,
  }
  try {
    if (editingItem.value) {
      await store.updateItem(editingItem.value.id, data)
    } else {
      await store.addItem(data)
    }
    closeModal()
  } catch (e) {
    console.error(e)
  }
}

function confirmDelete(id) {
  deleteId.value = id
  confirmVisible.value = true
}

async function handleDelete() {
  await store.deleteItem(deleteId.value)
  confirmVisible.value = false
}

onMounted(() => {
  store.fetchItems()
  productStore.fetchItems()
})
</script>

<template>
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索工艺编号/名称" style="width: 220px;" />
      <select v-model="filterCategory" class="form-select" style="width: 140px;">
        <option value="">全部类别</option>
        <option v-for="c in processCategories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增工艺</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>名称</th>
            <th>对应产品</th>
            <th>类别</th>
            <th>工序数</th>
            <th>总耗时(h)</th>
            <th>状态</th>
            <th>版本</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.productName }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.stepCount || item.steps?.length || 0 }}</td>
            <td>{{ item.totalDuration || 0 }}</td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>{{ item.version }}</td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
              <button class="btn-text" @click="openDetail(item)">查看</button>
              <button class="btn-text danger" @click="confirmDelete(item.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="9" class="table-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box xlarge">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑工艺' : '新增工艺' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">工艺编号 <span class="required">*</span></label>
              <input v-model="form.code" class="form-input" style="width: 100%;" placeholder="请输入编号" />
            </div>
            <div class="form-group">
              <label class="form-label">工艺名称 <span class="required">*</span></label>
              <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="请输入名称" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">对应产品</label>
              <select v-model="form.productId" class="form-select" style="width: 100%;" @change="form.productName = productStore.items.find(p => p.id === form.productId)?.name || ''">
                <option value="">请选择</option>
                <option v-for="p in productStore.items" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">工艺类别</label>
              <select v-model="form.category" class="form-select" style="width: 100%;">
                <option value="">请选择</option>
                <option v-for="c in processCategories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select" style="width: 100%;">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">版本</label>
              <input v-model="form.version" class="form-input" style="width: 100%;" />
            </div>
          </div>

          <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 500;">工序步骤 <span style="color: var(--text-light); font-weight: normal;">(总耗时: {{ totalDuration }}h)</span></span>
              <button class="btn" @click="addStep">+ 添加工序</button>
            </div>
            <div style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 50px;">序号</th>
                    <th>工序名称</th>
                    <th>设备类型</th>
                    <th style="width: 80px;">耗时(h)</th>
                    <th style="width: 80px;">温度</th>
                    <th style="width: 80px;">压力</th>
                    <th>描述</th>
                    <th style="width: 50px;">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(step, idx) in form.steps" :key="idx">
                    <td>{{ step.seq }}</td>
                    <td><input v-model="step.name" class="form-input" style="width: 100%;" /></td>
                    <td><input v-model="step.deviceType" class="form-input" style="width: 100%;" /></td>
                    <td><input v-model="step.duration" type="number" class="form-input" style="width: 100%;" /></td>
                    <td><input v-model="step.temperature" class="form-input" style="width: 100%;" /></td>
                    <td><input v-model="step.pressure" class="form-input" style="width: 100%;" /></td>
                    <td><input v-model="step.description" class="form-input" style="width: 100%;" /></td>
                    <td>
                      <button class="btn-text danger" @click="removeStep(idx)" :disabled="form.steps.length <= 1">&times;</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-box large">
        <div class="modal-header">
          <span>工艺详情 - {{ detailItem?.name }}</span>
          <button class="modal-close" @click="showDetail = false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <p><strong>编号：</strong>{{ detailItem?.code }}</p>
            <p><strong>产品：</strong>{{ detailItem?.productName }}</p>
            <p><strong>类别：</strong>{{ detailItem?.category }}</p>
            <p><strong>版本：</strong>{{ detailItem?.version }}</p>
          </div>
          <div class="process-flow">
            <div
              v-for="(step, idx) in (detailItem?.steps || [])"
              :key="idx"
              class="flow-step"
            >
              <div class="flow-node">
                <div class="flow-seq">{{ step.seq }}</div>
                <div class="flow-info">
                  <div class="flow-name">{{ step.name }}</div>
                  <div class="flow-meta">
                    <span v-if="step.deviceType">设备: {{ step.deviceType }}</span>
                    <span v-if="step.duration">耗时: {{ step.duration }}h</span>
                    <span v-if="step.temperature">温度: {{ step.temperature }}</span>
                    <span v-if="step.pressure">压力: {{ step.pressure }}</span>
                  </div>
                  <div v-if="step.description" class="flow-desc">{{ step.description }}</div>
                </div>
              </div>
              <div v-if="idx < (detailItem?.steps?.length || 0) - 1" class="flow-arrow">&#8595;</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该工艺吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.process-flow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.flow-node {
  display: flex;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 100%;
  background: #fafafa;
}

.flow-seq {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.flow-info {
  flex: 1;
}

.flow-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.flow-meta {
  display: flex;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}

.flow-desc {
  color: var(--text-light);
  font-size: 13px;
  margin-top: 4px;
}

.flow-arrow {
  color: var(--primary);
  font-size: 20px;
  line-height: 1;
}
</style>
