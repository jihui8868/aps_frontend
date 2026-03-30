<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcessStore } from '@/stores/process'
import { useProductStore } from '@/stores/product'
import { processApi } from '@/api/process'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { PlusOutlined } from '@ant-design/icons-vue'

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

const processCategories = ['合成', '酯化', '聚合', '蒸馏', '其他']
const deviceTypes = ['反应釜', '塔器', '储罐', '换热器', '压缩机', '泵', '干燥机', '过滤器', '其他']
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

const columns = [
  { title: '编号', dataIndex: 'code', key: 'code' },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '对应产品', dataIndex: 'productName', key: 'productName' },
  { title: '类别', dataIndex: 'category', key: 'category' },
  { title: '工序数', key: 'stepCount' },
  { title: '总耗时(h)', key: 'totalDuration' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '版本', dataIndex: 'version', key: 'version' },
  { title: '操作', key: 'action' },
]

const stepColumns = [
  { title: '序号', dataIndex: 'seq', key: 'seq', width: 60 },
  { title: '工序名称', dataIndex: 'name', key: 'name' },
  { title: '设备类型', dataIndex: 'deviceType', key: 'deviceType' },
  { title: '耗时(h)', dataIndex: 'duration', key: 'duration', width: 90 },
  { title: '温度', dataIndex: 'temperature', key: 'temperature', width: 90 },
  { title: '压力', dataIndex: 'pressure', key: 'pressure', width: 90 },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '操作', key: 'action', width: 60 },
]

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function mapStepsFromApi(steps) {
  return (steps || []).map(s => ({
    seq: s.seq,
    name: s.name,
    deviceType: s.device || s.deviceType || '',
    duration: s.duration,
    temperature: s.temperature || '',
    pressure: s.pressure || '',
    description: s.remark || s.description || '',
  }))
}

function mapStepsToApi(steps) {
  return (steps || []).map(s => ({
    seq: s.seq,
    name: s.name,
    device: s.deviceType,
    duration: s.duration,
    temperature: s.temperature,
    pressure: s.pressure,
    remark: s.description,
  }))
}

async function openEdit(item) {
  editingItem.value = item
  try {
    const detail = await processApi.getById(item.id)
    const steps = mapStepsFromApi(detail.steps)
    form.value = {
      ...detail,
      steps: steps.length ? steps : [{ seq: 1, name: '', deviceType: '', duration: '', temperature: '', pressure: '', description: '' }],
    }
  } catch (e) {
    form.value = {
      ...item,
      steps: [{ seq: 1, name: '', deviceType: '', duration: '', temperature: '', pressure: '', description: '' }],
    }
  }
  showModal.value = true
}

async function openDetail(item) {
  try {
    const detail = await processApi.getById(item.id)
    detailItem.value = { ...detail, steps: mapStepsFromApi(detail.steps) }
  } catch (e) {
    detailItem.value = item
  }
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
    steps: mapStepsToApi(form.value.steps),
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
  <a-card>
    <a-flex justify="space-between" align="center" :gap="8">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索工艺编号/名称" style="width: 220px;" />
        <a-select v-model:value="filterCategory" placeholder="全部类别" allow-clear style="width: 140px;">
          <a-select-option v-for="c in processCategories" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" placeholder="全部状态" allow-clear style="width: 120px;">
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增工艺
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filtered"
      :loading="store.loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] }"
      style="margin-top: 16px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'stepCount'">
          {{ record.stepCount || record.steps?.length || 0 }}
        </template>
        <template v-else-if="column.key === 'totalDuration'">
          {{ record.totalTime || record.totalDuration || 0 }}
        </template>
        <template v-else-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <!-- Add/Edit Modal -->
    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑工艺' : '新增工艺'"
      @cancel="closeModal"
      :footer="null"
      width="900px"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="工艺编号" required>
              <a-input v-model:value="form.code" placeholder="请输入编号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="工艺名称" required>
              <a-input v-model:value="form.name" placeholder="请输入名称" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="对应产品">
              <a-select v-model:value="form.productId" placeholder="请选择" @change="val => form.productName = productStore.items.find(p => p.id === val)?.name || ''">
                <a-select-option v-for="p in productStore.items" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="工艺类别">
              <a-select v-model:value="form.category" placeholder="请选择">
                <a-select-option v-for="c in processCategories" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="版本">
              <a-input v-model:value="form.version" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-divider />

      <a-flex justify="space-between" align="center" style="margin-bottom: 12px;">
        <span style="font-weight: 500;">工序步骤 <span style="color: rgba(0,0,0,0.45); font-weight: normal;">(总耗时: {{ totalDuration }}h)</span></span>
        <a-button @click="addStep">
          <template #icon><PlusOutlined /></template>
          添加工序
        </a-button>
      </a-flex>

      <a-table
        :columns="stepColumns"
        :data-source="form.steps"
        row-key="seq"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'seq'">
            {{ record.seq }}
          </template>
          <template v-else-if="column.key === 'name'">
            <a-input v-model:value="record.name" size="small" />
          </template>
          <template v-else-if="column.key === 'deviceType'">
            <a-select v-model:value="record.deviceType" size="small" style="width: 100%;">
              <a-select-option v-for="t in deviceTypes" :key="t" :value="t">{{ t }}</a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'duration'">
            <a-input-number v-model:value="record.duration" size="small" style="width: 100%;" />
          </template>
          <template v-else-if="column.key === 'temperature'">
            <a-input v-model:value="record.temperature" size="small" />
          </template>
          <template v-else-if="column.key === 'pressure'">
            <a-input v-model:value="record.pressure" size="small" />
          </template>
          <template v-else-if="column.key === 'description'">
            <a-input v-model:value="record.description" size="small" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" danger size="small" @click="removeStep(index)" :disabled="form.steps.length <= 1">&times;</a-button>
          </template>
        </template>
      </a-table>

      <a-flex justify="flex-end" :gap="8" style="margin-top: 16px;">
        <a-button @click="closeModal">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </a-flex>
    </a-modal>

    <!-- Detail Modal -->
    <a-modal
      :open="showDetail"
      :title="'工艺详情 - ' + detailItem?.name"
      @cancel="showDetail = false"
      :footer="null"
      width="700px"
    >
      <a-descriptions :column="2" bordered>
        <a-descriptions-item label="编号">{{ detailItem?.code }}</a-descriptions-item>
        <a-descriptions-item label="产品">{{ detailItem?.productName }}</a-descriptions-item>
        <a-descriptions-item label="类别">{{ detailItem?.category }}</a-descriptions-item>
        <a-descriptions-item label="版本">{{ detailItem?.version }}</a-descriptions-item>
      </a-descriptions>

      <div class="process-flow" style="margin-top: 16px;">
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
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该工艺吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>

<style scoped>
.process-flow { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.flow-step { display: flex; flex-direction: column; align-items: center; width: 100%; }
.flow-node { display: flex; gap: 16px; padding: 16px; border: 1px solid #f0f0f0; border-radius: 8px; width: 100%; background: #fafafa; }
.flow-seq { width: 32px; height: 32px; border-radius: 50%; background: #1677ff; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.flow-info { flex: 1; }
.flow-name { font-weight: 500; margin-bottom: 4px; }
.flow-meta { display: flex; gap: 16px; color: rgba(0,0,0,0.45); font-size: 13px; }
.flow-desc { color: rgba(0,0,0,0.45); font-size: 13px; margin-top: 4px; }
.flow-arrow { color: #1677ff; font-size: 20px; line-height: 1; }
</style>
