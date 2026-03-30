<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoleStore } from '@/stores/role'
import { PlusOutlined } from '@ant-design/icons-vue'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useRoleStore()

const search = ref('')
const filterStatus = ref(undefined)
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

// Convert permissionTree to a-tree format
function mapTreeData(nodes) {
  return nodes.map(node => ({
    title: node.label,
    key: node.key,
    children: node.children?.length ? mapTreeData(node.children) : undefined,
  }))
}

const treeData = computed(() => mapTreeData(permissionTree))

// Collect all leaf keys from the permission tree
function collectLeafKeys(nodes) {
  const leafKeys = []
  for (const node of nodes) {
    if (!node.children?.length) {
      leafKeys.push(node.key)
    } else {
      leafKeys.push(...collectLeafKeys(node.children))
    }
  }
  return leafKeys
}

const allLeafKeys = collectLeafKeys(permissionTree)

// checkedKeys for a-tree (leaf keys only, since a-tree derives parent state)
const checkedKeys = ref([])

function onTreeCheck(keys, e) {
  checkedKeys.value = keys
  form.value.permissions = [...keys, ...(e.halfCheckedKeys || [])]
}

const columns = [
  { title: '角色编码', dataIndex: 'code', key: 'code' },
  { title: '角色名称', dataIndex: 'name', key: 'name' },
  { title: '描述', dataIndex: 'description', key: 'description' },
  { title: '权限数', key: 'permissionCount' },
  { title: '关联用户数', key: 'userCount' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action' },
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

function openAdd() {
  editingItem.value = null
  form.value = defaultForm()
  checkedKeys.value = []
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = { ...item, permissions: [...(item.permissions || [])] }
  // Initialize checkedKeys with only leaf keys from the item's permissions
  checkedKeys.value = (item.permissions || []).filter(k => allLeafKeys.includes(k))
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
  <a-card>
    <a-flex justify="space-between" align="center" wrap="wrap" :gap="8">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索角色编码/名称" style="width: 200px;" allow-clear />
        <a-select v-model:value="filterStatus" placeholder="全部状态" style="width: 120px;" allow-clear>
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增角色
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filtered"
      row-key="id"
      :pagination="false"
      style="margin-top: 16px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'permissionCount'">
          {{ record.permissionCount || record.permissions?.length || 0 }}
        </template>
        <template v-if="column.key === 'userCount'">
          {{ record.userCount || 0 }}
        </template>
        <template v-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" size="small" danger @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <!-- Add/Edit Modal -->
    <a-modal
      v-model:open="showModal"
      :title="editingItem ? '编辑角色' : '新增角色'"
      width="680px"
      @cancel="closeModal"
    >
      <template #footer>
        <a-button @click="closeModal">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </template>

      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="角色编码" required>
              <a-input v-model:value="form.code" placeholder="如: admin, editor" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="角色名称" required>
              <a-input v-model:value="form.name" placeholder="如: 管理员" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="描述">
              <a-input v-model:value="form.description" placeholder="角色描述" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider />

        <a-form-item label="权限配置">
          <a-tree
            checkable
            :tree-data="treeData"
            :checked-keys="checkedKeys"
            @check="onTreeCheck"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该角色吗？"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
