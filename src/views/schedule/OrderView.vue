<script setup>
import { ref, computed, onMounted } from 'vue'
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

const defaultForm = () => ({
  orderNo: '',
  productId: '',
  productName: '',
  quantity: '',
  unit: '',
  customer: '',
  priority: '中',
  status: '待排产',
  orderDate: new Date().toISOString().slice(0, 10),
  deadline: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.orderNo?.includes(search.value) || item.productName?.includes(search.value) || item.customer?.includes(search.value)
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
  if (!form.value.orderNo || !form.value.productName) return
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
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索订单号/产品/客户" style="width: 220px;" />
      <select v-model="filterPriority" class="form-select" style="width: 120px;">
        <option value="">全部优先级</option>
        <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in orderStatuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增订单</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>订单编号</th>
            <th>产品名称</th>
            <th>数量</th>
            <th>单位</th>
            <th>客户</th>
            <th>优先级</th>
            <th>状态</th>
            <th>下单日期</th>
            <th>交期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.orderNo }}</td>
            <td>{{ item.productName }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.unit }}</td>
            <td>{{ item.customer }}</td>
            <td>
              <StatusTag :label="item.priority" :color-map="priorityColorMap" :value="item.priority" />
            </td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>{{ item.orderDate }}</td>
            <td>{{ item.deadline }}</td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
              <button class="btn-text danger" @click="confirmDelete(item.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="10" class="table-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑订单' : '新增订单' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">订单编号 <span class="required">*</span></label>
            <input v-model="form.orderNo" class="form-input" style="width: 100%;" placeholder="请输入订单编号" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">产品 <span class="required">*</span></label>
              <select v-model="form.productId" class="form-select" style="width: 100%;" @change="onProductChange">
                <option value="">请选择</option>
                <option v-for="p in productStore.items" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">客户</label>
              <input v-model="form.customer" class="form-input" style="width: 100%;" placeholder="客户名称" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">数量</label>
              <input v-model="form.quantity" type="number" class="form-input" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label class="form-label">单位</label>
              <input v-model="form.unit" class="form-input" style="width: 100%;" placeholder="kg / L / t" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select v-model="form.priority" class="form-select" style="width: 100%;">
                <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select" style="width: 100%;">
                <option v-for="s in orderStatuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">下单日期</label>
              <input v-model="form.orderDate" type="date" class="form-input" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label class="form-label">交期</label>
              <input v-model="form.deadline" type="date" class="form-input" style="width: 100%;" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该订单吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>
