<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/product'
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
  <div class="page-card">
    <div class="toolbar">
      <input v-model="search" class="form-input" placeholder="搜索编号/名称/CAS号" style="width: 220px;" />
      <select v-model="filterCategory" class="form-select" style="width: 140px;">
        <option value="">全部类别</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterDanger" class="form-select" style="width: 130px;">
        <option value="">全部危险等级</option>
        <option v-for="d in dangerLevels" :key="d" :value="d">{{ d }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增产品</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>名称</th>
            <th>CAS号</th>
            <th>类别</th>
            <th>规格</th>
            <th>单位</th>
            <th>密度</th>
            <th>闪点</th>
            <th>危险等级</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.cas }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.spec }}</td>
            <td>{{ item.unit }}</td>
            <td>{{ item.density }}</td>
            <td>{{ item.flashPoint }}</td>
            <td>
              <StatusTag :label="item.dangerLevel" :color-map="dangerColorMap" :value="item.dangerLevel" />
            </td>
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
      <div class="modal-box large">
        <div class="modal-header">
          <span>{{ editingItem ? '编辑产品' : '新增产品' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">编号 <span class="required">*</span></label>
              <input v-model="form.code" class="form-input" style="width: 100%;" placeholder="请输入编号" />
            </div>
            <div class="form-group">
              <label class="form-label">名称 <span class="required">*</span></label>
              <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="请输入名称" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">CAS号</label>
              <input v-model="form.cas" class="form-input" style="width: 100%;" placeholder="请输入CAS号" />
            </div>
            <div class="form-group">
              <label class="form-label">类别</label>
              <select v-model="form.category" class="form-select" style="width: 100%;">
                <option value="">请选择</option>
                <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">规格</label>
              <input v-model="form.spec" class="form-input" style="width: 100%;" placeholder="请输入规格" />
            </div>
            <div class="form-group">
              <label class="form-label">单位</label>
              <input v-model="form.unit" class="form-input" style="width: 100%;" placeholder="如: kg, L, t" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">密度</label>
              <input v-model="form.density" class="form-input" style="width: 100%;" placeholder="g/cm3" />
            </div>
            <div class="form-group">
              <label class="form-label">闪点</label>
              <input v-model="form.flashPoint" class="form-input" style="width: 100%;" placeholder="摄氏度" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">危险等级</label>
            <select v-model="form.dangerLevel" class="form-select" style="width: 200px;">
              <option value="">请选择</option>
              <option v-for="d in dangerLevels" :key="d" :value="d">{{ d }}</option>
            </select>
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
      message="确定要删除该产品吗？删除后不可恢复。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>
