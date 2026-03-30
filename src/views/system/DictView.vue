<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDictStore } from '@/stores/dict'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useDictStore()

const categorySearch = ref('')
const selectedCategory = ref(null)
const showItemModal = ref(false)
const editingItemData = ref(null)
const confirmVisible = ref(false)
const deleteTarget = ref(null)
const itemSearch = ref('')

const defaultItemForm = () => ({
  key: '',
  name: '',
  category: '',
  sort: 0,
  status: '启用',
  remark: '',
})

const itemForm = ref(defaultItemForm())

const filteredCategories = computed(() => {
  return store.categories.filter(c => {
    return !categorySearch.value || c.category?.includes(categorySearch.value)
  })
})

const filteredItems = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !itemSearch.value || item.key?.includes(itemSearch.value) || item.name?.includes(itemSearch.value)
    return matchSearch
  })
})

function selectCategory(cat) {
  selectedCategory.value = cat
  itemSearch.value = ''
  store.fetchItems(cat.category)
}

// Item CRUD
function openAddItem() {
  editingItemData.value = null
  itemForm.value = { ...defaultItemForm(), category: selectedCategory.value.category }
  showItemModal.value = true
}

function openEditItem(item) {
  editingItemData.value = item
  itemForm.value = { ...item }
  showItemModal.value = true
}

async function saveItem() {
  if (!itemForm.value.key || !itemForm.value.name) return
  try {
    if (editingItemData.value) {
      await store.updateItem(editingItemData.value.id, itemForm.value)
      await store.fetchItems(selectedCategory.value.category)
      await store.fetchCategories()
    } else {
      await store.addItem(itemForm.value)
    }
    showItemModal.value = false
  } catch (e) {
    console.error(e)
  }
}

function confirmDeleteItem(item) {
  deleteTarget.value = item
  confirmVisible.value = true
}

async function handleConfirmDelete() {
  await store.deleteItem(deleteTarget.value.id, selectedCategory.value.category)
  confirmVisible.value = false
}

onMounted(() => {
  store.fetchCategories()
})
</script>

<template>
  <div class="dict-page">
    <!-- Left: Category List -->
    <div class="dict-sidebar">
      <div class="sidebar-header">
        <h3 style="margin: 0; font-size: 15px;">字典分类</h3>
      </div>
      <div style="padding: 8px;">
        <input v-model="categorySearch" class="form-input" placeholder="搜索分类" style="width: 100%;" />
      </div>
      <div class="type-list">
        <div
          v-for="cat in filteredCategories"
          :key="cat.category"
          class="type-item"
          :class="{ active: selectedCategory?.category === cat.category }"
          @click="selectCategory(cat)"
        >
          <div class="type-info">
            <div class="type-name">{{ cat.category }}</div>
          </div>
          <span class="type-count">{{ cat.count || 0 }}</span>
        </div>
        <div v-if="!filteredCategories.length" style="text-align: center; padding: 24px 0; color: var(--text-light);">暂无分类</div>
      </div>
    </div>

    <!-- Right: Items Table -->
    <div class="dict-main">
      <div v-if="!selectedCategory" class="dict-empty">
        <p>请从左侧选择字典分类</p>
      </div>

      <div v-if="selectedCategory" class="page-card">
        <div class="toolbar">
          <h4 style="margin: 0; font-size: 15px;">{{ selectedCategory.category }}</h4>
          <input v-model="itemSearch" class="form-input" placeholder="搜索键值/名称" style="width: 180px; margin-left: 16px;" />
          <span class="spacer"></span>
          <button class="btn btn-primary" @click="openAddItem">+ 新增字典项</button>
        </div>

        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>键值</th>
                <th>名称</th>
                <th>排序</th>
                <th>状态</th>
                <th>备注</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.id">
                <td><code class="dict-code">{{ item.key }}</code></td>
                <td>{{ item.name }}</td>
                <td>{{ item.sort }}</td>
                <td>
                  <span :style="{ color: item.status === '启用' ? '#52c41a' : '#ff4d4f' }">{{ item.status }}</span>
                </td>
                <td>{{ item.remark }}</td>
                <td>
                  <button class="btn-text" @click="openEditItem(item)">编辑</button>
                  <button class="btn-text danger" @click="confirmDeleteItem(item)">删除</button>
                </td>
              </tr>
              <tr v-if="!filteredItems.length">
                <td colspan="6" class="table-empty">暂无字典项</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Item Modal -->
    <div v-if="showItemModal" class="modal-overlay" @click.self="showItemModal = false">
      <div class="modal-box" style="width: 420px;">
        <div class="modal-header">
          <span>{{ editingItemData ? '编辑字典项' : '新增字典项' }}</span>
          <button class="modal-close" @click="showItemModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">键值 <span class="required">*</span></label>
            <input v-model="itemForm.key" class="form-input" style="width: 100%;" placeholder="如: reactor" />
          </div>
          <div class="form-group">
            <label class="form-label">名称 <span class="required">*</span></label>
            <input v-model="itemForm.name" class="form-input" style="width: 100%;" placeholder="如: 反应釜" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">排序</label>
              <input v-model.number="itemForm.sort" type="number" class="form-input" style="width: 100%;" />
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="itemForm.status" class="form-select" style="width: 100%;">
                <option value="启用">启用</option>
                <option value="停用">停用</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="itemForm.remark" class="form-input" style="width: 100%;" placeholder="备注" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showItemModal = false">取消</button>
          <button class="btn btn-primary" @click="saveItem">保存</button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该字典项吗？"
      danger
      @confirm="handleConfirmDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>

<style scoped>
.dict-page {
  display: flex;
  gap: 16px;
  height: calc(100vh - 92px);
}

.dict-sidebar {
  width: 280px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.type-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.type-item:hover {
  background: var(--hover-bg);
}

.type-item.active {
  background: var(--primary-bg);
}

.type-info {
  flex: 1;
  min-width: 0;
}

.type-name {
  font-weight: 500;
  font-size: 13px;
}

.type-count {
  background: var(--border-color);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.dict-main {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}

.dict-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: #fff;
  border-radius: 8px;
  color: var(--text-light);
}

.dict-code {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 13px;
  color: #d63384;
}
</style>
