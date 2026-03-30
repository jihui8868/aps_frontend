<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoleStore } from '@/stores/role'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useRoleStore()

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const statuses = ['启用', '停用']
const statusColorMap = { '启用': '#52c41a', '停用': '#ff4d4f' }

// Permission tree definition
const permissionTree = [
  {
    key: 'data',
    label: '数据管理',
    children: [
      { key: 'data:device', label: '设备管理', children: [
        { key: 'data:device:add', label: '新增' },
        { key: 'data:device:edit', label: '编辑' },
        { key: 'data:device:delete', label: '删除' },
      ]},
      { key: 'data:product', label: '产品管理', children: [
        { key: 'data:product:add', label: '新增' },
        { key: 'data:product:edit', label: '编辑' },
        { key: 'data:product:delete', label: '删除' },
      ]},
      { key: 'data:process', label: '工艺管理', children: [
        { key: 'data:process:add', label: '新增' },
        { key: 'data:process:edit', label: '编辑' },
        { key: 'data:process:delete', label: '删除' },
      ]},
    ],
  },
  {
    key: 'schedule',
    label: '生产排程',
    children: [
      { key: 'schedule:order', label: '订单管理', children: [
        { key: 'schedule:order:add', label: '创建' },
        { key: 'schedule:order:edit', label: '编辑' },
        { key: 'schedule:order:delete', label: '删除' },
      ]},
      { key: 'schedule:gantt', label: '智能排程', children: [
        { key: 'schedule:gantt:run', label: '执行排程' },
      ]},
      { key: 'schedule:history', label: '历史排程', children: [
        { key: 'schedule:history:delete', label: '删除记录' },
      ]},
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    children: [
      { key: 'system:user', label: '用户管理', children: [
        { key: 'system:user:add', label: '新增' },
        { key: 'system:user:edit', label: '编辑' },
        { key: 'system:user:delete', label: '删除' },
        { key: 'system:user:reset', label: '重置密码' },
      ]},
      { key: 'system:role', label: '角色管理', children: [
        { key: 'system:role:add', label: '新增' },
        { key: 'system:role:edit', label: '编辑' },
        { key: 'system:role:delete', label: '删除' },
      ]},
      { key: 'system:permission', label: '权限管理', children: [] },
      { key: 'system:dict', label: '数据字典', children: [] },
    ],
  },
]

const defaultForm = () => ({
  code: '',
  name: '',
  description: '',
  status: '启用',
  permissions: [],
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.name?.includes(search.value) || item.code?.includes(search.value)
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

function getAllChildKeys(node) {
  const keys = [node.key]
  if (node.children) {
    node.children.forEach(child => {
      keys.push(...getAllChildKeys(child))
    })
  }
  return keys
}

function isChecked(key) {
  return form.value.permissions.includes(key)
}

function togglePermission(node) {
  const allKeys = getAllChildKeys(node)
  const allChecked = allKeys.every(k => form.value.permissions.includes(k))
  if (allChecked) {
    form.value.permissions = form.value.permissions.filter(k => !allKeys.includes(k))
  } else {
    const newPerms = new Set(form.value.permissions)
    allKeys.forEach(k => newPerms.add(k))
    form.value.permissions = [...newPerms]
  }
}

function isIndeterminate(node) {
  if (!node.children?.length) return false
  const allKeys = getAllChildKeys(node)
  const checkedCount = allKeys.filter(k => form.value.permissions.includes(k)).length
  return checkedCount > 0 && checkedCount < allKeys.length
}

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = { ...item, permissions: [...(item.permissions || [])] }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSave() {
  if (!form.value.code || !form.value.name) return
  const data = {
    ...form.value,
    permissionCount: form.value.permissions.length,
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
})
</script>

<template>
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索角色编码/名称" style="width: 200px;" />
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增角色</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>角色编码</th>
            <th>角色名称</th>
            <th>描述</th>
            <th>权限数</th>
            <th>关联用户数</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.description }}</td>
            <td>{{ item.permissionCount || item.permissions?.length || 0 }}</td>
            <td>{{ item.userCount || 0 }}</td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
              <button class="btn-text danger" @click="confirmDelete(item.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="table-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box large">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑角色' : '新增角色' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">角色编码 <span class="required">*</span></label>
              <input v-model="form.code" class="form-input" style="width: 100%;" placeholder="如: admin, editor" />
            </div>
            <div class="form-group">
              <label class="form-label">角色名称 <span class="required">*</span></label>
              <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="如: 管理员" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">描述</label>
              <input v-model="form.description" class="form-input" style="width: 100%;" placeholder="角色描述" />
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select" style="width: 100%;">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <label class="form-label" style="margin-bottom: 12px;">权限配置</label>
            <div class="perm-tree">
              <div v-for="group in permissionTree" :key="group.key" class="perm-group">
                <label class="perm-node level-0">
                  <input type="checkbox" :checked="isChecked(group.key)" :indeterminate="isIndeterminate(group)" @change="togglePermission(group)" />
                  <span>{{ group.label }}</span>
                </label>
                <div v-for="mod in group.children" :key="mod.key" class="perm-module">
                  <label class="perm-node level-1">
                    <input type="checkbox" :checked="isChecked(mod.key)" :indeterminate="isIndeterminate(mod)" @change="togglePermission(mod)" />
                    <span>{{ mod.label }}</span>
                  </label>
                  <div v-if="mod.children?.length" class="perm-actions">
                    <label v-for="action in mod.children" :key="action.key" class="perm-node level-2">
                      <input type="checkbox" :checked="isChecked(action.key)" @change="togglePermission(action)" />
                      <span>{{ action.label }}</span>
                    </label>
                  </div>
                </div>
              </div>
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
      message="确定要删除该角色吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.perm-tree {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.perm-group {
  margin-bottom: 12px;
}

.perm-group:last-child {
  margin-bottom: 0;
}

.perm-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.perm-node input {
  cursor: pointer;
}

.level-0 {
  font-weight: 500;
}

.perm-module {
  margin-left: 24px;
  margin-top: 6px;
}

.perm-actions {
  display: flex;
  gap: 16px;
  margin-left: 24px;
  margin-top: 4px;
}

.level-2 {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
