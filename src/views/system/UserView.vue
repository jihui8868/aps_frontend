<script setup>
import { ref, computed, onMounted } from 'vue'
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

const defaultForm = () => ({
  username: '',
  password: '',
  name: '',
  roleId: '',
  roleName: '',
  deptId: '',
  deptName: '',
  phone: '',
  email: '',
  status: '启用',
  remark: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return userStore.items.filter(item => {
    const matchSearch = !search.value || item.username?.includes(search.value) || item.name?.includes(search.value)
    const matchRole = !filterRole.value || item.roleName === filterRole.value
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
  if (!form.value.username || !form.value.name) return
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
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索用户名/姓名" style="width: 200px;" />
      <select v-model="filterRole" class="form-select" style="width: 130px;">
        <option value="">全部角色</option>
        <option v-for="r in roleStore.items" :key="r.id" :value="r.name">{{ r.name }}</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增用户</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>姓名</th>
            <th>角色</th>
            <th>部门</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.username }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.roleName }}</td>
            <td>{{ item.deptName }}</td>
            <td>{{ item.phone }}</td>
            <td>{{ item.email }}</td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>{{ item.createdAt }}</td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
              <button class="btn-text" @click="confirmToggleStatus(item.id)">{{ item.status === '启用' ? '停用' : '启用' }}</button>
              <button class="btn-text" @click="confirmResetPassword(item.id)">重置密码</button>
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
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑用户' : '新增用户' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">用户名 <span class="required">*</span></label>
            <input v-model="form.username" class="form-input" style="width: 100%;" :disabled="!!editingItem" placeholder="请输入用户名" />
          </div>
          <div class="form-group" v-if="!editingItem">
            <label class="form-label">密码 <span class="required">*</span></label>
            <input v-model="form.password" type="password" class="form-input" style="width: 100%;" placeholder="请输入密码" />
          </div>
          <div class="form-group">
            <label class="form-label">姓名 <span class="required">*</span></label>
            <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="请输入姓名" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">角色</label>
              <select v-model="form.roleId" class="form-select" style="width: 100%;" @change="form.roleName = roleStore.items.find(r => r.id === form.roleId)?.name || ''">
                <option value="">请选择</option>
                <option v-for="r in roleStore.items" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">部门</label>
              <select v-model="form.deptId" class="form-select" style="width: 100%;" @change="form.deptName = deptStore.items.find(d => d.id === form.deptId)?.name || ''">
                <option value="">请选择</option>
                <option v-for="d in deptStore.items" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">手机号</label>
              <input v-model="form.phone" class="form-input" style="width: 100%;" placeholder="手机号码" />
            </div>
            <div class="form-group">
              <label class="form-label">邮箱</label>
              <input v-model="form.email" class="form-input" style="width: 100%;" placeholder="电子邮箱" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <textarea v-model="form.remark" class="form-textarea" style="width: 100%;" placeholder="备注信息"></textarea>
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
      :title="confirmAction === 'delete' ? '删除确认' : '操作确认'"
      :message="confirmMessage"
      :danger="confirmAction === 'delete'"
      @confirm="handleConfirm"
      @cancel="confirmVisible = false"
    />
  </div>
</template>
