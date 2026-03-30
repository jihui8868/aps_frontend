<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/product'
import { PlusOutlined } from '@ant-design/icons-vue'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useProductStore()

const search = ref('')
const filterCategory = ref('')
const filterDanger = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const categories = ['有机化学品', '无机化学品', '高分子材料', '精细化学品', '石油化工', '其他']
const dangerLevels = ['甲类', '乙类', '丙类', '丁类']
const dangerColorMap = { '甲类': '#ff4d4f', '乙类': '#fa8c16', '丙类': '#1677ff', '丁类': '#52c41a' }

const columns = [
  { title: '编号', dataIndex: 'code', key: 'code' },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: 'CAS号', dataIndex: 'cas', key: 'cas' },
  { title: '类别', dataIndex: 'category', key: 'category' },
  { title: '规格', dataIndex: 'spec', key: 'spec' },
  { title: '单位', dataIndex: 'unit', key: 'unit' },
  { title: '密度', dataIndex: 'density', key: 'density' },
  { title: '闪点', dataIndex: 'flashPoint', key: 'flashPoint' },
  { title: '危险等级', dataIndex: 'dangerLevel', key: 'dangerLevel' },
  { title: '操作', key: 'action' },
]

const defaultForm = () => ({
  code: '',
  name: '',
  cas: '',
  category: '',
  spec: '',
  unit: '',
  density: '',
  flashPoint: '',
  dangerLevel: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.name?.includes(search.value) || item.code?.includes(search.value) || item.cas?.includes(search.value)
    const matchCategory = !filterCategory.value || item.category === filterCategory.value
    const matchDanger = !filterDanger.value || item.dangerLevel === filterDanger.value
    return matchSearch && matchCategory && matchDanger
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
  <a-card>
    <a-flex justify="space-between" style="margin-bottom: 16px;">
      <a-space>
        <a-input v-model:value="search" placeholder="搜索编号/名称/CAS号" style="width: 220px;" allow-clear />
        <a-select v-model:value="filterCategory" style="width: 140px;" allow-clear placeholder="全部类别">
          <a-select-option v-for="c in categories" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterDanger" style="width: 130px;" allow-clear placeholder="全部危险等级">
          <a-select-option v-for="d in dangerLevels" :key="d" :value="d">{{ d }}</a-select-option>
        </a-select>
      </a-space>
      <a-button type="primary" @click="openAdd">
        <template #icon><PlusOutlined /></template>
        新增产品
      </a-button>
    </a-flex>

    <a-table
      :columns="columns"
      :data-source="filtered"
      :loading="store.loading"
      row-key="id"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'dangerLevel'">
          <StatusTag :label="record.dangerLevel" :color-map="dangerColorMap" :value="record.dangerLevel" />
        </template>
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          <a-button type="link" danger size="small" @click="confirmDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      :open="showModal"
      :title="editingItem ? '编辑产品' : '新增产品'"
      @cancel="closeModal"
      @ok="handleSave"
      ok-text="保存"
      cancel-text="取消"
      width="640px"
    >
      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="编号" required>
              <a-input v-model:value="form.code" placeholder="请输入编号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="名称" required>
              <a-input v-model:value="form.name" placeholder="请输入名称" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="CAS号">
              <a-input v-model:value="form.cas" placeholder="请输入CAS号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="类别">
              <a-select v-model:value="form.category" placeholder="请选择">
                <a-select-option v-for="c in categories" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="规格">
              <a-input v-model:value="form.spec" placeholder="请输入规格" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="单位">
              <a-input v-model:value="form.unit" placeholder="如: kg, L, t" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="密度">
              <a-input v-model:value="form.density" placeholder="g/cm3" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="闪点">
              <a-input v-model:value="form.flashPoint" placeholder="摄氏度" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="危险等级">
              <a-select v-model:value="form.dangerLevel" placeholder="请选择">
                <a-select-option v-for="d in dangerLevels" :key="d" :value="d">{{ d }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <ConfirmDialog
      :visible="confirmVisible"
      title="删除确认"
      message="确定要删除该产品吗？删除后不可恢复。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </a-card>
</template>
