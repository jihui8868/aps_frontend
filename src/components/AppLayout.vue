<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SideMenu from './SideMenu.vue'

const route = useRoute()
const authStore = useAuthStore()
const collapsed = ref(false)

const pageTitle = computed(() => {
  return route.meta?.title || ''
})

const pageGroup = computed(() => {
  return route.meta?.group || ''
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function handleLogout() {
  authStore.logout()
  window.location.href = '/login'
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="logo-area">
        <div class="logo-icon">APS</div>
        <span v-if="!collapsed" class="logo-text">智能排程系统</span>
      </div>
      <SideMenu :collapsed="collapsed" />
    </aside>
    <div class="main-area">
      <header class="top-bar">
        <div class="top-bar-left">
          <button class="collapse-btn" @click="toggleCollapse">
            <span :class="collapsed ? 'icon-expand' : 'icon-collapse'">{{ collapsed ? '&#9776;' : '&#9776;' }}</span>
          </button>
          <span class="breadcrumb" v-if="pageGroup">
            <span class="breadcrumb-group">{{ pageGroup }}</span>
            <span class="breadcrumb-sep">/</span>
          </span>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="top-bar-right">
          <span class="user-name">{{ authStore.user?.name || authStore.user?.username || '管理员' }}</span>
          <button class="btn-text" @click="handleLogout">退出登录</button>
        </div>
      </header>
      <main class="workspace">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  background: #fff;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.25s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: var(--primary);
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-secondary);
  padding: 4px;
}

.collapse-btn:hover {
  color: var(--primary);
}

.breadcrumb-group {
  color: var(--text-light);
}

.breadcrumb-sep {
  color: var(--text-light);
  margin: 0 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  color: var(--text-secondary);
}

.workspace {
  flex: 1;
  background: var(--workspace-bg);
  padding: 16px;
  overflow-y: auto;
}
</style>
