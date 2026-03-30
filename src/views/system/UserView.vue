<script setup>
import { ref, computed, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import { useRoleStore } from '@/stores/role'
import { useDeptStore } from '@/stores/dept'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const userStore = useUserStore()
const roleStore = useRoleStore()
const deptStore = useDeptStore()

const search = ref('')
const filterRole = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const confirmAction = ref('')
const actionId = ref(null)

const statuses = ['启用', '停用']
const statusColorMap = { '启用': '#52c41a', '停用': '#ff4d4f' }

const columns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '姓名', dataIndex: 'realName', key: 'realName' },
  { title: '角色', dataIndex: 'role', key: 'role' },
  { title: '部门', dataIndex: 'department', key: 'department' },
  { title: '手机号', dataIndex: 'phone', key: 'phone' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  { title: '操作', key: 'action' },
]

const defaultForm = () => ({
  username: '',
  password: '',
  realName: '',
  role: '',
  department: '',
  phone: '',
  email: '',
  status: '启用',
  remark: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return userStore.items.filter(item => {
    const matchSearch = !search.value || item.username?.includes(search.value) || item.realName?.includes(search.value)
    const matchRole = !filterRole.value || item.role === filterRole.value
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchRole && matchStatus
  })
})

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = { ...item, password: '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  if (!form.value.username || !form.value.realName) return
  if (!editingItem.value && !form.value.password) return
  try {
    if (editingItem.value) {
      const data = { ...form.value }
      if (!data.password) delete data.password
      await userStore.updateItem(editingItem.value.id, data)
    } else {
      await userStore.addItem(form.value)
    }
    closeModal()
  } catch (e) {
    console.error(e)
  }
}

function confirmResetPassword(id) {
  actionId.value = id
  confirmAction.value = 'reset'
  confirmVisible.value = true
}

function confirmToggleStatus(id) {
  actionId.value = id
  confirmAction.value = 'toggle'
  confirmVisible.value = true
}

function confirmDelete(id) {
  actionId.value = id
  confirmAction.value = 'delete'
  confirmVisible.value = true
}

async function handleConfirm() {
  if (confirmAction.value === 'delete') {
    await userStore.deleteItem(actionId.value)
  } else if (confirmAction.value === 'reset') {
    await userStore.resetPassword(actionId.value)
  } else if (confirmAction.value === 'toggle') {
    await userStore.toggleStatus(actionId.value)
  }
  confirmVisible.value = false
}

const confirmMessage = computed(() => {
  if (confirmAction.value === 'delete') return '确定要删除该用户吗？'
  if (confirmAction.value === 'reset') return '确定要重置该用户密码为 123456 吗？'
  if (confirmAction.value === 'toggle') return '确定要切换该用户状态吗？'
  return ''
})

onMounted(() => {
  userStore.fetchItems()
  roleStore.fetchItems()
  deptStore.fetchItems()
})
</script>

<template>
  <a-card>
    <a-flex justify="space-between" align="center" wrap="wrap" :gap="8">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索用户名/姓名" style="width: 200px;" />
        <a-select v-model:value="filterRole" style="width: 130px;" placeholder="全部角色" allow-clear>
          <a-select-option v-for="r in roleStore.items" :key="r.id" :value="r.name">{{ r.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px;" placeholder="全部状态" allow-clear>
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增用户
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filtered"
      :loading="userStore.loading"
      row-key="id"
      :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] }"
      style="margin-top: 16px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" size="small" @click="confirmToggleStatus(record.id)">{{ record.status === '启用' ? '停用' : '启用' }}</a-button>
          <a-button type="link" size="small" @click="confirmResetPassword(record.id)">重置密码</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑用户' : '新增用户'"
      @cancel="closeModal"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="用户名" required>
          <a-input v-model:value="form.username" :disabled="!!editingItem" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item v-if="!editingItem" label="密码" required>
          <a-input-password v-model:value="form.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="姓名" required>
          <a-input v-model:value="form.realName" placeholder="请输入姓名" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="角色">
              <a-select v-model:value="form.role" placeholder="请选择" style="width: 100%;">
                <a-select-option v-for="r in roleStore.items" :key="r.id" :value="r.name">{{ r.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="部门">
              <a-select v-model:value="form.department" placeholder="请选择" style="width: 100%;">
                <a-select-option v-for="d in deptStore.items" :key="d.id" :value="d.name">{{ d.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="手机号">
              <a-input v-model:value="form.phone" placeholder="手机号码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱">
              <a-input v-model:value="form.email" placeholder="电子邮箱" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" placeholder="备注信息" />
        </a-form-item>
        <a-flex justify="flex-end" :gap="8">
          <a-button @click="closeModal">取消</a-button>
          <a-button type="primary" @click="handleSave">保存</a-button>
        </a-flex>
      </a-form>
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      :title="confirmAction === 'delete' ? '删除确认' : '操作确认'"
      :message="confirmMessage"
      :danger="confirmAction === 'delete'"
      @confirm="handleConfirm"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
