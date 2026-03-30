<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons-vue'
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

function handleLogout() {
  authStore.logout()
  window.location.href = '/login'
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider
      v-model:collapsed="collapsed"
      collapsible
      :width="220"
      :collapsed-width="64"
      theme="light"
      :trigger="null"
    >
      <div class="logo-area">
        <div class="logo-icon">APS</div>
        <span v-if="!collapsed" class="logo-text">智能排程系统</span>
      </div>
      <SideMenu :collapsed="collapsed" />
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="top-bar">
        <div class="top-bar-left">
          <a-button type="text" @click="collapsed = !collapsed">
            <template #icon>
              <MenuUnfoldOutlined v-if="collapsed" />
              <MenuFoldOutlined v-else />
            </template>
          </a-button>
          <a-breadcrumb v-if="pageGroup">
            <a-breadcrumb-item>{{ pageGroup }}</a-breadcrumb-item>
            <a-breadcrumb-item>{{ pageTitle }}</a-breadcrumb-item>
          </a-breadcrumb>
          <span v-else class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="top-bar-right">
          <a-space>
            <UserOutlined />
            <span>{{ authStore.user?.name || authStore.user?.username || '管理员' }}</span>
            <a-button type="text" danger @click="handleLogout">
              <template #icon><LogoutOutlined /></template>
              退出登录
            </a-button>
          </a-space>
        </div>
      </a-layout-header>
      <a-layout-content class="workspace">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.logo-area {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: #1677ff;
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
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.top-bar {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  border-bottom: 1px solid #f0f0f0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
}

.top-bar-right {
  display: flex;
  align-items: center;
}

.workspace {
  padding: 16px;
  background: #f5f5f5;
  overflow-y: auto;
}
</style>
