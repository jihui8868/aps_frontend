<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BarChartOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons-vue'

defineProps({
  collapsed: Boolean,
})

const route = useRoute()
const router = useRouter()

const iconMap = {
  data: BarChartOutlined,
  schedule: ScheduleOutlined,
  system: SettingOutlined,
}

const menuData = [
  {
    key: 'data',
    label: '数据管理',
    children: [
      { path: '/data/device', label: '设备管理' },
      { path: '/data/product', label: '产品管理' },
      { path: '/data/process', label: '工艺管理' },
    ],
  },
  {
    key: 'schedule',
    label: '生产排程',
    children: [
      { path: '/schedule/order', label: '订单管理' },
      { path: '/schedule/gantt', label: '智能排程' },
      { path: '/schedule/history', label: '历史排程' },
    ],
  },
  {
    key: 'system',
    label: '系统设置',
    children: [
      { path: '/system/user', label: '用户管理' },
      { path: '/system/role', label: '角色管理' },
      { path: '/system/dept', label: '部门管理' },
      { path: '/system/permission', label: '权限管理' },
      { path: '/system/dict', label: '数据字典' },
    ],
  },
]

const selectedKeys = computed(() => [route.path])
const openKeys = ref(['data', 'schedule', 'system'])

function handleMenuClick({ key }) {
  router.push(key)
}
</script>

<template>
  <a-menu
    mode="inline"
    :selected-keys="selectedKeys"
    v-model:open-keys="openKeys"
    :inline-collapsed="collapsed"
    @click="handleMenuClick"
  >
    <a-sub-menu v-for="group in menuData" :key="group.key">
      <template #icon>
        <component :is="iconMap[group.key]" />
      </template>
      <template #title>{{ group.label }}</template>
      <a-menu-item v-for="item in group.children" :key="item.path">
        {{ item.label }}
      </a-menu-item>
    </a-sub-menu>
  </a-menu>
</template>
