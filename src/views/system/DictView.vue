<script setup>
import { ref, computed, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
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

const columns = [
  { title: '键值', dataIndex: 'key', key: 'key' },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '排序', dataIndex: 'sort', key: 'sort' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '备注', dataIndex: 'remark', key: 'remark' },
  { title: '操作', key: 'action' },
]

function selectCategory(cat) {
  selectedCategory.value = cat
  itemSearch.value = ''
  store.fetchItems(cat.category)
}

function handleMenuClick({ key }) {
  const cat = store.categories.find(c => c.category === key)
  if (cat) selectCategory(cat)
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
      <a-card title="字典分类" :body-style="{ padding: '8px' }">
        <a-input-search v-model:value="categorySearch" placeholder="搜索分类" style="margin-bottom: 8px;" />
        <a-menu
          mode="inline"
          :selected-keys="selectedCategory ? [selectedCategory.category] : []"
          @click="handleMenuClick"
        >
          <a-menu-item v-for="cat in filteredCategories" :key="cat.category">
            <a-flex justify="space-between" align="center">
              <span>{{ cat.category }}</span>
              <a-badge :count="cat.count || 0" :number-style="{ backgroundColor: '#f0f0f0', color: '#999' }" />
            </a-flex>
          </a-menu-item>
        </a-menu>
        <a-empty v-if="!filteredCategories.length" description="暂无分类" />
      </a-card>
    </div>

    <!-- Right: Items Table -->
    <div class="dict-main">
      <div v-if="!selectedCategory" class="dict-empty">
        <a-empty description="请从左侧选择字典分类" />
      </div>

      <a-card v-if="selectedCategory">
        <a-flex justify="space-between" align="center" wrap="wrap" :gap="8">
          <a-space>
            <span style="font-weight: 500; font-size: 15px;">{{ selectedCategory.category }}</span>
            <a-input v-model:value="itemSearch" placeholder="搜索键值/名称" style="width: 180px;" allow-clear />
          </a-space>
          <a-button type="primary" @click="openAddItem">
            <template #icon><PlusOutlined /></template>
            新增字典项
          </a-button>
        </a-flex>

        <a-table
          :columns="columns"
          :data-source="filteredItems"
          row-key="id"
          :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: total => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'] }"
          style="margin-top: 16px;"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'key'">
              <code class="dict-code">{{ record.key }}</code>
            </template>
            <template v-if="column.key === 'status'">
              <span :style="{ color: record.status === '启用' ? '#52c41a' : '#ff4d4f' }">{{ record.status }}</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openEditItem(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="confirmDeleteItem(record)">删除</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- Item Modal -->
    <a-modal
      v-model:open="showItemModal"
      :title="editingItemData ? '编辑字典项' : '新增字典项'"
      width="480px"
      @cancel="showItemModal = false"
    >
      <template #footer>
        <a-button @click="showItemModal = false">取消</a-button>
        <a-button type="primary" @click="saveItem">保存</a-button>
      </template>

      <a-form layout="vertical">
        <a-form-item label="键值" required>
          <a-input v-model:value="itemForm.key" placeholder="如: reactor" />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model:value="itemForm.name" placeholder="如: 反应釜" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number v-model:value="itemForm.sort" style="width: 100%;" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="itemForm.status">
                <a-select-option value="启用">启用</a-select-option>
                <a-select-option value="停用">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-input v-model:value="itemForm.remark" placeholder="备注" />
        </a-form-item>
      </a-form>
    </a-modal>

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
  flex-shrink: 0;
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
