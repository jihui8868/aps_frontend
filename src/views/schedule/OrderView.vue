<script setup>
import { ref, computed, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useProductStore } from '@/stores/product'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useOrderStore()
const productStore = useProductStore()

const search = ref('')
const filterPriority = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const priorities = ['高', '中', '低']
const priorityColorMap = { '高': '#ff4d4f', '中': '#fa8c16', '低': '#1677ff' }
const orderStatuses = ['待排产', '生产中', '已完成', '已取消']
const statusColorMap = { '待排产': '#1677ff', '生产中': '#52c41a', '已完成': '#999', '已取消': '#ff4d4f' }

const columns = [
  { title: '订单编号', dataIndex: 'code', key: 'code' },
  { title: '产品名称', dataIndex: 'productName', key: 'productName' },
  { title: '数量', dataIndex: 'quantity', key: 'quantity' },
  { title: '单位', dataIndex: 'unit', key: 'unit' },
  { title: '客户', dataIndex: 'customer', key: 'customer' },
  { title: '优先级', dataIndex: 'priority', key: 'priority' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '下单日期', dataIndex: 'orderDate', key: 'orderDate' },
  { title: '交期', dataIndex: 'deliveryDate', key: 'deliveryDate' },
  { title: '操作', key: 'action' },
]

const defaultForm = () => ({
  code: '',
  productName: '',
  quantity: '',
  unit: '',
  customer: '',
  priority: '中',
  status: '待排产',
  orderDate: new Date().toISOString().slice(0, 10),
  deliveryDate: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.code?.includes(search.value) || item.productName?.includes(search.value) || item.customer?.includes(search.value)
    const matchPriority = !filterPriority.value || item.priority === filterPriority.value
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchPriority && matchStatus
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
  if (!form.value.code || !form.value.productName) return
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

function onProductChange() {
  const product = productStore.items.find(p => p.id === form.value.productId)
  if (product) {
    form.value.productName = product.name
    form.value.unit = product.unit || form.value.unit
  }
}

onMounted(() => {
  store.fetchItems()
  productStore.fetchItems()
})
</script>

<template>
  <a-card>
    <a-flex justify="space-between" align="center" wrap="wrap" :gap="8">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索订单号/产品/客户" style="width: 220px;" />
        <a-select v-model:value="filterPriority" style="width: 120px;" placeholder="全部优先级" allow-clear>
          <a-select-option v-for="p in priorities" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px;" placeholder="全部状态" allow-clear>
          <a-select-option v-for="s in orderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增订单
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
        <template v-if="column.key === 'priority'">
          <StatusTag :label="record.priority" :color-map="priorityColorMap" :value="record.priority" />
        </template>
        <template v-else-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑订单' : '新增订单'"
      @cancel="closeModal"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="订单编号" required>
          <a-input v-model:value="form.code" placeholder="请输入订单编号" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="产品" required>
              <a-select v-model:value="form.productId" placeholder="请选择" style="width: 100%;" @change="onProductChange">
                <a-select-option v-for="p in productStore.items" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="客户">
              <a-input v-model:value="form.customer" placeholder="客户名称" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="数量">
              <a-input-number v-model:value="form.quantity" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="单位">
              <a-input v-model:value="form.unit" placeholder="kg / L / t" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="优先级">
              <a-select v-model:value="form.priority" style="width: 100%;">
                <a-select-option v-for="p in priorities" :key="p" :value="p">{{ p }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status" style="width: 100%;">
                <a-select-option v-for="s in orderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="下单日期">
              <a-date-picker v-model:value="form.orderDate" value-format="YYYY-MM-DD" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="交期">
              <a-date-picker v-model:value="form.deliveryDate" value-format="YYYY-MM-DD" style="width: 100%;" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-flex justify="flex-end" :gap="8">
          <a-button @click="closeModal">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </a-flex>
      </a-form>
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该订单吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
