<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRoleStore } from '@/stores/role'

const userStore = useUserStore()
const roleStore = useRoleStore()

const activeTab = ref(0)
const tabs = ['人员角色配置', '角色权限总览', '人员权限明细']

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

// Tab 3: User permission detail
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
  <div class="page-card">
    <div class="tabs">
      <div
        v-for="(tab, idx) in tabs"
        :key="idx"
        class="tab-item"
        :class="{ active: activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ tab }}
      </div>
    </div>

    <!-- Tab 1: User-Role Config -->
    <div v-if="activeTab === 0" class="tab-content">
      <div class="perm-layout">
        <div class="perm-left">
          <h4 style="margin: 0 0 12px; font-size: 14px;">用户列表</h4>
          <div
            v-for="user in userStore.items"
            :key="user.id"
            class="user-item"
            :class="{ active: selectedUser?.id === user.id }"
            @click="selectUser(user)"
          >
            <div class="user-name">{{ user.name || user.username }}</div>
            <div class="user-role">{{ user.roleName || '未分配' }}</div>
          </div>
        </div>
        <div class="perm-right" v-if="selectedUser">
          <h4 style="margin: 0 0 12px; font-size: 14px;">
            为 <span style="color: var(--primary);">{{ selectedUser.name || selectedUser.username }}</span> 分配角色
          </h4>
          <div class="role-cards">
            <div
              v-for="role in roleStore.items"
              :key="role.id"
              class="role-card"
              :class="{ selected: userRoles.includes(role.id) }"
              @click="toggleUserRole(role.id)"
            >
              <input type="checkbox" :checked="userRoles.includes(role.id)" @click.stop="toggleUserRole(role.id)" />
              <div>
                <div class="role-name">{{ role.name }}</div>
                <div class="role-desc">{{ role.description || '无描述' }}</div>
              </div>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <button class="btn btn-primary" @click="saveUserRoles">保存</button>
          </div>
          <div style="margin-top: 16px;">
            <h4 style="margin: 0 0 8px; font-size: 13px; color: var(--text-secondary);">当前权限预览</h4>
            <div class="perm-preview">
              <span
                v-for="perm in getUserPermissions(selectedUser)"
                :key="perm"
                class="perm-tag"
              >{{ permissionLabels[perm] || perm }}</span>
              <span v-if="!getUserPermissions(selectedUser).length" style="color: var(--text-light);">暂无权限</span>
            </div>
          </div>
        </div>
        <div v-else class="perm-right" style="display: flex; align-items: center; justify-content: center; color: var(--text-light);">
          请选择一个用户
        </div>
      </div>
    </div>

    <!-- Tab 2: Role-Permission Matrix -->
    <div v-if="activeTab === 1" class="tab-content">
      <div style="overflow-x: auto;">
        <table class="data-table matrix-table">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; background: #fafafa; z-index: 2;">角色</th>
              <th v-for="perm in allPermissions" :key="perm" style="writing-mode: vertical-lr; font-size: 12px; padding: 8px 6px; min-width: 36px;">
                {{ permissionLabels[perm] || perm }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in roleStore.items" :key="role.id">
              <td style="position: sticky; left: 0; background: #fff; z-index: 1; font-weight: 500;">{{ role.name }}</td>
              <td v-for="perm in allPermissions" :key="perm" style="text-align: center;">
                <span v-if="roleHasPerm(role, perm)" style="color: #52c41a; font-size: 16px;">&#10003;</span>
                <span v-else style="color: #d9d9d9;">&#8212;</span>
              </td>
            </tr>
            <tr v-if="!roleStore.items.length">
              <td :colspan="allPermissions.length + 1" class="table-empty">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: User Permission Detail -->
    <div v-if="activeTab === 2" class="tab-content">
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>权限数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userStore.items" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.roleName || '未分配' }}</td>
              <td>{{ getUserPermissions(user).length }}</td>
              <td>
                <button class="btn-text" @click="viewUserDetail(user)">查看权限</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-box">
        <div class="modal-header">
          <span>{{ detailUser?.name || detailUser?.username }} - 权限明细</span>
          <button class="modal-close" @click="showDetailModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>角色：</strong>{{ detailUser?.roleName || '未分配' }}</p>
          <div class="perm-preview">
            <span
              v-for="perm in getUserPermissions(detailUser)"
              :key="perm"
              class="perm-tag"
            >{{ permissionLabels[perm] || perm }}</span>
            <span v-if="!getUserPermissions(detailUser).length" style="color: var(--text-light);">暂无权限</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.tab-item {
  padding: 10px 20px;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  user-select: none;
}

.tab-item:hover {
  color: var(--primary);
}

.tab-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 500;
}

.perm-layout {
  display: flex;
  gap: 20px;
  min-height: 400px;
}

.perm-left {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color);
  padding-right: 20px;
  overflow-y: auto;
  max-height: 500px;
}

.perm-right {
  flex: 1;
  min-width: 0;
}

.user-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
}

.user-item:hover {
  background: var(--hover-bg);
}

.user-item.active {
  background: var(--primary-bg);
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.user-role {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.role-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.role-card:hover {
  border-color: var(--primary);
}

.role-card.selected {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.role-name {
  font-weight: 500;
}

.role-desc {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.perm-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.perm-tag {
  display: inline-block;
  padding: 3px 10px;
  background: var(--primary-bg);
  color: var(--primary);
  border-radius: 4px;
  font-size: 12px;
}

.matrix-table th,
.matrix-table td {
  text-align: center;
}
</style>
