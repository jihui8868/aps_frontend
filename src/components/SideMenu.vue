<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps({
  collapsed: Boolean,
})

const route = useRoute()
const router = useRouter()

const menuData = [
  {
    key: 'data',
    label: '数据管理',
    icon: '\u{1F4CA}',
    children: [
      { path: '/data/device', label: '设备管理' },
      { path: '/data/product', label: '产品管理' },
      { path: '/data/process', label: '工艺管理' },
    ],
  },
  {
    key: 'schedule',
    label: '生产排程',
    icon: '\u{1F50D}',
    children: [
      { path: '/schedule/order', label: '订单管理' },
      { path: '/schedule/gantt', label: '智能排程' },
      { path: '/schedule/history', label: '历史排程' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    icon: '\u2699\uFE0F',
    children: [
      { path: '/system/user', label: '用户管理' },
      { path: '/system/role', label: '角色管理' },
      { path: '/system/dept', label: '部门管理' },
      { path: '/system/permission', label: '权限管理' },
      { path: '/system/dict', label: '数据字典' },
    ],
  },
]

const expandedGroups = ref(['data', 'schedule', 'system'])

function toggleGroup(key) {
  const idx = expandedGroups.value.indexOf(key)
  if (idx >= 0) {
    expandedGroups.value.splice(idx, 1)
  } else {
    expandedGroups.value.push(key)
  }
}

function isActive(path) {
  return route.path === path
}

function isGroupActive(group) {
  return group.children.some(child => route.path === child.path)
}

function navigate(path) {
  router.push(path)
}
</script>

<template>
  <nav class="side-menu">
    <div v-for="group in menuData" :key="group.key" class="menu-group">
      <div
        class="menu-group-title"
        :class="{ active: isGroupActive(group) }"
        @click="toggleGroup(group.key)"
      >
        <span class="menu-icon">{{ group.icon }}</span>
        <span v-if="!collapsed" class="menu-label">{{ group.label }}</span>
        <span
          v-if="!collapsed"
          class="menu-arrow"
          :class="{ expanded: expandedGroups.includes(group.key) }"
        >&#9656;</span>
      </div>
      <div
        v-if="!collapsed && expandedGroups.includes(group.key)"
        class="menu-children"
      >
        <div
          v-for="item in group.children"
          :key="item.path"
          class="menu-item"
          :class="{ active: isActive(item.path) }"
          @click="navigate(item.path)"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.side-menu {
  padding: 8px 0;
}

.menu-group {
  margin-bottom: 4px;
}

.menu-group-title {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  gap: 10px;
  user-select: none;
}

.menu-group-title:hover {
  background: var(--hover-bg);
}

.menu-group-title.active {
  color: var(--primary);
}

.menu-icon {
  font-size: 16px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
}

.menu-arrow {
  font-size: 12px;
  transition: transform 0.2s;
  color: var(--text-light);
}

.menu-arrow.expanded {
  transform: rotate(90deg);
}

.menu-children {
  overflow: hidden;
}

.menu-item {
  padding: 9px 16px 9px 50px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  transition: all 0.2s;
  user-select: none;
}

.menu-item:hover {
  background: var(--hover-bg);
  color: var(--primary);
}

.menu-item.active {
  background: var(--primary-bg);
  color: var(--primary);
  font-weight: 500;
}
</style>
