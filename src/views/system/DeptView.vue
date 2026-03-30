<script setup>
import { ref, computed, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useDeptStore } from '@/stores/dept'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useDeptStore()

const search = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)
const expandedRowKeys = ref([])

const statuses = ['启用', '停用']
const statusColorMap = { '启用': '#52c41a', '停用': '#ff4d4f' }

const columns = [
  { title: '部门名称', dataIndex: 'name', key: 'name' },
  { title: '部门编码', dataIndex: 'code', key: 'code' },
  { title: '负责人', dataIndex: 'leader', key: 'leader' },
  { title: '联系电话', dataIndex: 'phone', key: 'phone' },
  { title: '排序', dataIndex: 'sort', key: 'sort' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action' },
]

const defaultForm = () => ({
  code: '',
  name: '',
  parentId: '',
  parentName: '',
  leader: '',
  phone: '',
  sort: 0,
  status: '启用',
})

const form = ref(defaultForm())

// Build tree from flat list
function buildTree(items, parentId = null) {
  return items
    .filter(item => (item.parentId || null) === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id),
    }))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

const treeData = computed(() => buildTree(store.items))

// Filter tree data based on search and status
const filteredTreeData = computed(() => {
  if (!search.value && !filterStatus.value) return treeData.value

  function filterNodes(nodes) {
    const result = []
    for (const node of nodes) {
      const matchSearch = !search.value || node.name?.includes(search.value) || node.code?.includes(search.value)
      const matchStatus = !filterStatus.value || node.status === filterStatus.value
      const filteredChildren = filterNodes(node.children || [])

      if (matchSearch && matchStatus || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children })
      }
    }
    return result
  }

  return filterNodes(treeData.value)
})

// Get all available parent depts (excluding self and children)
function getAvailableParents(excludeId) {
  function collectIds(node) {
    const ids = [node.id]
    ;(node.children || []).forEach(child => ids.push(...collectIds(child)))
    return ids
  }
  const excludeIds = new Set()
  if (excludeId) {
    function findNode(nodes) {
      for (const n of nodes) {
        if (n.id === excludeId) return n
        const found = findNode(n.children || [])
        if (found) return found
      }
      return null
    }
    const node = findNode(treeData.value)
    if (node) collectIds(node).forEach(id => excludeIds.add(id))
  }
  return store.items.filter(d => !excludeIds.has(d.id))
}

function getAllIds(nodes) {
  const ids = []
  nodes.forEach(n => {
    ids.push(n.id)
    if (n.children?.length) ids.push(...getAllIds(n.children))
  })
  return ids
}

function toggleAllExpand() {
  if (expandedRowKeys.value.length) {
    expandedRowKeys.value = []
  } else {
    expandedRowKeys.value = getAllIds(treeData.value)
  }
}

function openAdd(parentId = null, parentName = '') {
  editingItem.value = null
  form.value = { ...defaultForm(), parentId, parentName }
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

onMounted(async () => {
  await store.fetchItems()
  expandedRowKeys.value = getAllIds(treeData.value)
})
</script>

<template>
  <a-card>
    <a-flex justify="space-between" align="center" wrap="wrap" :gap="8">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索部门编码/名称" style="width: 200px;" />
        <a-select v-model:value="filterStatus" style="width: 120px;" placeholder="全部状态" allow-clear>
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-button @click="toggleAllExpand">{{ expandedRowKeys.length ? '全部折叠' : '全部展开' }}</a-button>
      </a-space>
      <a-button type="primary" @click="openAdd()">
        <template #icon><PlusOutlined /></template>
        新增顶级部门
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filteredTreeData"
      :loading="store.loading"
      v-model:expanded-row-keys="expandedRowKeys"
      row-key="id"
      :pagination="false"
      style="margin-top: 16px;"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <StatusTag :label="record.status" :color-map="statusColorMap" :value="record.status" />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" size="small" @click="openAdd(record.id, record.name)">新增子部门</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑部门' : '新增部门'"
      @cancel="closeModal"
      :footer="null"
    >
      <a-form layout="vertical">
        <a-form-item label="上级部门">
          <a-select
            v-model:value="form.parentId"
            placeholder="无（顶级部门）"
            style="width: 100%;"
            allow-clear
            @change="val => form.parentName = getAvailableParents(editingItem?.id).find(d => d.id === val)?.name || ''"
          >
            <a-select-option v-for="d in getAvailableParents(editingItem?.id)" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="部门编码" required>
              <a-input v-model:value="form.code" placeholder="请输入编码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="部门名称" required>
              <a-input v-model:value="form.name" placeholder="请输入名称" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="负责人">
              <a-input v-model:value="form.leader" placeholder="负责人姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="联系电话">
              <a-input v-model:value="form.phone" placeholder="联系电话" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="form.sort" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status" style="width: 100%;">
                <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
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
      message="确定要删除该部门吗？子部门也将被删除。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
