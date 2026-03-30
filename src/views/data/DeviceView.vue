<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'
import StatusTag from '@/components/StatusTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useDeviceStore()

const search = ref('')
const filterType = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingItem = ref(null)
const confirmVisible = ref(false)
const deleteId = ref(null)

const deviceTypes = ['反应釜', '蒸馏塔', '储罐', '换热器', '压缩机', '泵', '干燥器', '其他']
const statuses = ['运行中', '待机', '检修中', '停用']
const statusColorMap = { '运行中': '#52c41a', '待机': '#1677ff', '检修中': '#fa8c16', '停用': '#ff4d4f' }

const defaultForm = () => ({
  code: '',
  name: '',
  type: '',
  spec: '',
  capacity: '',
  workshop: '',
  status: '待机',
  installDate: '',
})

const form = ref(defaultForm())

const filtered = computed(() => {
  return store.items.filter(item => {
    const matchSearch = !search.value || item.name?.includes(search.value) || item.code?.includes(search.value)
    const matchType = !filterType.value || item.type === filterType.value
    const matchStatus = !filterStatus.value || item.status === filterStatus.value
    return matchSearch && matchType && matchStatus
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
      <input v-model="search" class="form-input" placeholder="搜索设备编号/名称" style="width: 220px;" />
      <select v-model="filterType" class="form-select" style="width: 140px;">
        <option value="">全部类型</option>
        <option v-for="t in deviceTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="width: 120px;">
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <span class="spacer"></span>
      <button class="btn btn-primary" @click="openAdd">+ 新增设备</button>
    </div>

    <div style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>设备编号</th>
            <th>设备名称</th>
            <th>设备类型</th>
            <th>规格型号</th>
            <th>生产能力</th>
            <th>所属车间</th>
            <th>状态</th>
            <th>安装日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filtered" :key="item.id">
            <td>{{ item.code }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.model }}</td>
            <td>{{ item.capacity }}</td>
            <td>{{ item.workshop }}</td>
            <td>
              <StatusTag :label="item.status" :color-map="statusColorMap" :value="item.status" />
            </td>
            <td>{{ item.installDate }}</td>
            <td>
              <button class="btn-text" @click="openEdit(item)">编辑</button>
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
          <span>{{ editingItem ? '编辑设备' : '新增设备' }}</span>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">设备编号 <span class="required">*</span></label>
              <input v-model="form.code" class="form-input" style="width: 100%;" placeholder="请输入设备编号" />
            </div>
            <div class="form-group">
              <label class="form-label">设备名称 <span class="required">*</span></label>
              <input v-model="form.name" class="form-input" style="width: 100%;" placeholder="请输入设备名称" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">设备类型</label>
              <select v-model="form.type" class="form-select" style="width: 100%;">
                <option value="">请选择</option>
                <option v-for="t in deviceTypes" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">规格型号</label>
              <input v-model="form.spec" class="form-input" style="width: 100%;" placeholder="请输入规格型号" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">生产能力</label>
              <input v-model="form.capacity" class="form-input" style="width: 100%;" placeholder="请输入生产能力" />
            </div>
            <div class="form-group">
              <label class="form-label">所属车间</label>
              <input v-model="form.workshop" class="form-input" style="width: 100%;" placeholder="请输入所属车间" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="form.status" class="form-select" style="width: 100%;">
                <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">安装日期</label>
              <input v-model="form.installDate" type="date" class="form-input" style="width: 100%;" />
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
      message="确定要删除该设备吗？删除后不可恢复。"
      danger
      @confirm="handleDelete"
      @cancel="confirmVisible = false"
    />
  </div>
</template>
