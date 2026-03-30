<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'
import { PlusOutlined } from '@ant-design/icons-vue'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useDeviceStore()

const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const deviceTypes = ['反应釜', '蒸馏塔', '储罐', '换热器', '压缩机', '泵', '干燥器', '其他']
const statuses = ['运行中', '待机', '检修中', '停用']
const statusColorMap = { '运行中': '#52c41a', '待机': '#1677ff', '检修中': '#fa8c16', '停用': '#ff4d4f' }

const columns = [
  { title: '设备编号', dataIndex: 'code', key: 'code' },
  { title: '设备名称', dataIndex: 'name', key: 'name' },
  { title: '设备类型', dataIndex: 'type', key: 'type' },
  { title: '规格型号', dataIndex: 'model', key: 'model' },
  { title: '生产能力', dataIndex: 'capacity', key: 'capacity' },
  { title: '所属车间', dataIndex: 'workshop', key: 'workshop' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '安装日期', dataIndex: 'installDate', key: 'installDate' },
  { title: '操作', key: 'action' },
]

const defaultForm = () => ({
  code: '',
  name: '',
  type: '',
  spec: '',
  capacity: '',
  workshop: '',
  status: '待机',
  installDate: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.name?.includes(search.value) || item.code?.includes(search.value)
    const matchType = !filterType.value || item.type === filterType.value
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchType && matchStatus
  })
})

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = { ...item }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  if (!form.value.code || !form.value.name) return
  try {
    if (editingItem.value) {
      await store.updateItem(editingItem.value.id, form.value)
    } else {
      await store.addItem(form.value)
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
})
</script>

<template>
  <a-card>
    <a-flex justify="space-between" style="margin-bottom: 16px;">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索设备编号/名称" style="width: 220px;" allow-clear />
        <a-select v-model:value="filterType" style="width: 140px;" allow-clear placeholder="全部类型">
          <a-select-option v-for="t in deviceTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px;" allow-clear placeholder="全部状态">
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增设备
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filtered"
      :loading="store.loading"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑设备' : '新增设备'"
      @cancel="closeModal"
      @ok="handleSave"
      ok-text="保存"
      cancel-text="取消"
      width="640px"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="设备编号" required>
              <a-input v-model:value="form.code" placeholder="请输入设备编号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="设备名称" required>
              <a-input v-model:value="form.name" placeholder="请输入设备名称" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="设备类型">
              <a-select v-model:value="form.type" placeholder="请选择">
                <a-select-option v-for="t in deviceTypes" :key="t" :value="t">{{ t }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="规格型号">
              <a-input v-model:value="form.spec" placeholder="请输入规格型号" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="生产能力">
              <a-input v-model:value="form.capacity" placeholder="请输入生产能力" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属车间">
              <a-input v-model:value="form.workshop" placeholder="请输入所属车间" />
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
            <a-form-item label="安装日期">
              <a-date-picker v-model:value="form.installDate" value-format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该设备吗？删除后不可恢复。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
