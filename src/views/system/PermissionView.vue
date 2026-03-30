<script setup>
import { ref, computed, onMounted } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { useUserStore } from '@/stores/user'
import { useRoleStore } from '@/stores/role'

const userStore = useUserStore()
const roleStore = useRoleStore()

const activeTab = ref(0)

// Tab 1: User-Role assignment
const selectedUser = ref(null)
const userRoles = ref([])

function selectUser(user) {
  selectedUser.value = user
  userRoles.value = user.roleIds ? [...user.roleIds] : (user.roleId ? [user.roleId] : [])
}

function toggleUserRole(roleId) {
  const idx = userRoles.value.indexOf(roleId)
  if (idx >= 0) {
    userRoles.value.splice(idx, 1)
  } else {
    userRoles.value.push(roleId)
  }
}

async function saveUserRoles() {
  if (!selectedUser.value) return
  try {
    await userStore.updateItem(selectedUser.value.id, {
      ...selectedUser.value,
      roleIds: userRoles.value,
      roleName: roleStore.items.filter(r => userRoles.value.includes(r.id)).map(r => r.name).join(', '),
    })
  } catch (e) {
    console.error(e)
  }
}

// Get user's permissions from their roles
function getUserPermissions(user) {
  const roleIds = user.roleIds || (user.roleId ? [user.roleId] : [])
  const perms = new Set()
  roleStore.items.forEach(role => {
    if (roleIds.includes(role.id)) {
      ;(role.permissions || []).forEach(p => perms.add(p))
    }
  })
  return [...perms]
}

// Tab 2: Permission matrix
const allPermissions = [
  'data:device:add', 'data:device:edit', 'data:device:delete',
  'data:product:add', 'data:product:edit', 'data:product:delete',
  'data:process:add', 'data:process:edit', 'data:process:delete',
  'schedule:order:add', 'schedule:order:edit', 'schedule:order:delete',
  'schedule:gantt:run',
  'schedule:history:delete',
  'system:user:add', 'system:user:edit', 'system:user:delete', 'system:user:reset',
  'system:role:add', 'system:role:edit', 'system:role:delete',
  'system:permission',
  'system:dict',
]

const permissionLabels = {
  'data:device:add': '设备-新增', 'data:device:edit': '设备-编辑', 'data:device:delete': '设备-删除',
  'data:product:add': '产品-新增', 'data:product:edit': '产品-编辑', 'data:product:delete': '产品-删除',
  'data:process:add': '工艺-新增', 'data:process:edit': '工艺-编辑', 'data:process:delete': '工艺-删除',
  'schedule:order:add': '订单-创建', 'schedule:order:edit': '订单-编辑', 'schedule:order:delete': '订单-删除',
  'schedule:gantt:run': '排程-执行',
  'schedule:history:delete': '历史-删除',
  'system:user:add': '用户-新增', 'system:user:edit': '用户-编辑', 'system:user:delete': '用户-删除', 'system:user:reset': '用户-重置',
  'system:role:add': '角色-新增', 'system:role:edit': '角色-编辑', 'system:role:delete': '角色-删除',
  'system:permission': '权限管理',
  'system:dict': '数据字典',
}

function roleHasPerm(role, perm) {
  return (role.permissions || []).includes(perm)
}

const matrixColumns = computed(() => [
  { title: '角色', key: 'name', dataIndex: 'name', fixed: 'left', width: 120 },
  ...allPermissions.map(perm => ({
    title: permissionLabels[perm] || perm,
    dataIndex: perm,
    key: perm,
    width: 80,
    align: 'center',
  })),
])

// Tab 3: User permission detail
const userColumns = [
  { title: '用户名', dataIndex: 'username', key: 'username' },
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '角色', dataIndex: 'roleName', key: 'roleName' },
  { title: '权限数', key: 'permCount' },
  { title: '操作', key: 'action' },
]

const detailUser = ref(null)
const showDetailModal = ref(false)

function viewUserDetail(user) {
  detailUser.value = user
  showDetailModal.value = true
}

onMounted(() => {
  userStore.fetchItems()
  roleStore.fetchItems()
})
</script>

<template>
  <a-card>
    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane :key="0" tab="人员角色配置">
        <div style="display: flex; gap: 20px; min-height: 400px;">
          <div style="width: 240px; flex-shrink: 0; border-right: 1px solid #f0f0f0; padding-right: 20px; overflow-y: auto; max-height: 500px;">
            <h4 style="margin: 0 0 12px; font-size: 14px;">用户列表</h4>
            <div v-for="user in userStore.items" :key="user.id"
              style="padding: 10px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 4px;"
              :style="{ background: selectedUser?.id === user.id ? '#e6f4ff' : 'transparent' }"
              @click="selectUser(user)">
              <div style="font-weight: 500; font-size: 14px;">{{ user.name || user.username }}</div>
              <div style="font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 2px;">{{ user.roleName || '未分配' }}</div>
            </div>
          </div>
          <div style="flex: 1; min-width: 0;" v-if="selectedUser">
            <h4>为 <span style="color: #1677ff">{{ selectedUser.name }}</span> 分配角色</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
              <a-card v-for="role in roleStore.items" :key="role.id" size="small" hoverable
                :style="{ borderColor: userRoles.includes(role.id) ? '#1677ff' : undefined, background: userRoles.includes(role.id) ? '#e6f4ff' : undefined }"
                @click="toggleUserRole(role.id)">
                <a-flex :gap="10" align="start">
                  <a-checkbox :checked="userRoles.includes(role.id)" @click.stop="toggleUserRole(role.id)" />
                  <div>
                    <div style="font-weight: 500">{{ role.name }}</div>
                    <div style="font-size: 12px; color: rgba(0,0,0,0.45); margin-top: 2px;">{{ role.description || '无描述' }}</div>
                  </div>
                </a-flex>
              </a-card>
            </div>
            <div style="margin-top: 16px">
              <a-button type="primary" @click="saveUserRoles">保存</a-button>
            </div>
            <div style="margin-top: 16px">
              <h4 style="font-size: 13px; color: rgba(0,0,0,0.45)">当前权限预览</h4>
              <a-space wrap>
                <a-tag v-for="perm in getUserPermissions(selectedUser)" :key="perm" color="blue">{{ permissionLabels[perm] || perm }}</a-tag>
                <span v-if="!getUserPermissions(selectedUser).length" style="color: rgba(0,0,0,0.25)">暂无权限</span>
              </a-space>
            </div>
          </div>
          <div v-else style="flex: 1; display: flex; align-items: center; justify-content: center;">
            <a-empty description="请选择一个用户" />
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane :key="1" tab="角色权限总览">
        <a-table :columns="matrixColumns" :data-source="roleStore.items" row-key="id" :pagination="false" :scroll="{ x: 'max-content' }" bordered size="small">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <span style="font-weight: 500">{{ record.name }}</span>
            </template>
            <template v-else-if="column.dataIndex">
              <CheckOutlined v-if="roleHasPerm(record, column.dataIndex)" style="color: #52c41a" />
              <span v-else style="color: #d9d9d9">&mdash;</span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane :key="2" tab="人员权限明细">
        <a-table :columns="userColumns" :data-source="userStore.items" row-key="id" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'roleName'">
              {{ record.roleName || '未分配' }}
            </template>
            <template v-else-if="column.key === 'permCount'">
              {{ getUserPermissions(record).length }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="viewUserDetail(record)">查看权限</a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </a-card>

  <a-modal :open="showDetailModal" :title="(detailUser?.name || detailUser?.username) + ' - 权限明细'" @cancel="showDetailModal = false" :footer="null">
    <p><strong>角色：</strong>{{ detailUser?.roleName || '未分配' }}</p>
    <a-space wrap>
      <a-tag v-for="perm in getUserPermissions(detailUser)" :key="perm" color="blue">{{ permissionLabels[perm] || perm }}</a-tag>
      <span v-if="!getUserPermissions(detailUser).length" style="color: rgba(0,0,0,0.25)">暂无权限</span>
    </a-space>
  </a-modal>
</template>
