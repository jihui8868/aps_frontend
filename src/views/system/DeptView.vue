<script setup>
import { ref, computed, onMounted } from 'vue'
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
const expandedIds = ref(new Set())
const allExpanded = ref(true)

const statuses = ['启用', '停用']
const statusColorMap = { '启用': '#52c41a', '停用': '#ff4d4f' }

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

// Flatten tree for display
function flattenTree(tree, level = 0) {
  const result = []
  tree.forEach(node => {
    const matchSearch = !search.value || node.name?.includes(search.value) || node.code?.includes(search.value)
    const matchStatus = !filterStatus.value || node.status === filterStatus.value
    const childNodes = flattenTree(node.children || [], level + 1)

    if (matchSearch && matchStatus || childNodes.length > 0) {
      result.push({ ...node, level, hasChildren: (node.children || []).length > 0 })
      if ((allExpanded.value || expandedIds.value.has(node.id)) && childNodes.length) {
        result.push(...childNodes)
      }
    }
  })
  return result
}

const treeData = computed(() => buildTree(store.items))
const flatData = computed(() => flattenTree(treeData.value))

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

function toggleExpand(id) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
  allExpanded.value = false
}

function toggleAllExpand() {
  allExpanded.value = !allExpanded.value
  if (!allExpanded.value) {
    expandedIds.value.clear()
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

onMounted(() => {
  store.fetchItems()
})
</script>

<template>
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索部门编码/名称" style="width: 200px;" />
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <button class="btn" @click="toggleAllExpand">{{ allExpanded ? '全部折叠' : '全部展开' }}</button>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd()">+ 新增顶级部门</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>部门名称</th>
            <th>部门编码</th>
            <th>负责人</th>
            <th>联系电话</th>
            <th>排序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in flatData" :key="item.id">
            <td>
              <span :style="{ paddingLeft: item.level * 24 + 'px' }" style="display: inline-flex; align-items: center; gap: 4px;">
                <span
                  v-if="item.hasChildren"
                  class="expand-icon"
                  @click="toggleExpand(item.id)"
                >{{ (allExpanded || expandedIds.has(item.id)) ? '&#9660;' : '&#9654;' }}</span>
                <span v-else style="width: 14px; display: inline-block;"></span>
                {{ item.name }}
              </span>
            </td>
            <td>{{ item.code }}</td>
            <td>{{ item.leader }}</td>
            <td>{{ item.phone }}</td>
            <td>{{ item.sort }}</td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
              <button class="btn-text" @click="openAdd(item.id, item.name)">新增子部门</button>
              <button class="btn-text danger" @click="confirmDelete(item.id)">删除</button>
            </td>
          </tr>
          <tr v-if="!flatData.length">
            <td colspan="7" class="table-empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑部门' : '新增部门' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">上级部门</label>
            <select v-model="form.parentId" class="form-select" style="width: 100%;" @change="form.parentName = getAvailableParents(editingItem?.id).find(d => d.id === form.parentId)?.name || ''">
              <option value="">无（顶级部门）</option>
              <option v-for="d in getAvailableParents(editingItem?.id)" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">部门编码 <span class="required">*</span></label>
              <input v-model="form.code" class="form-input" style="width: 100%;" placeholder="请输入编码" />
            </div>
            <div class="form-group">
              <label class="form-label">部门名称 <span class="required">*</span></label>
              <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="请输入名称" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">负责人</label>
              <input v-model="form.leader" class="form-input" style="width: 100%;" placeholder="负责人姓名" />
            </div>
            <div class="form-group">
              <label class="form-label">联系电话</label>
              <input v-model="form.phone" class="form-input" style="width: 100%;" placeholder="联系电话" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="form.sort" type="number" class="form-input" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select" style="width: 100%;">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
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
      message="确定要删除该部门吗？子部门也将被删除。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.expand-icon {
  cursor: pointer;
  font-size: 10px;
  color: var(--text-light);
  width: 14px;
  display: inline-block;
  text-align: center;
  user-select: none;
}

.expand-icon:hover {
  color: var(--primary);
}
</style>
