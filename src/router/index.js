import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/components/AppLayout.vue'),
      redirect: '/data/device',
      children: [
        {
          path: 'data/device',
          name: 'Device',
          component: () => import('@/views/data/DeviceView.vue'),
          meta: { title: '设备管理', group: '数据管理' },
        },
        {
          path: 'data/product',
          name: 'Product',
          component: () => import('@/views/data/ProductView.vue'),
          meta: { title: '产品管理', group: '数据管理' },
        },
        {
          path: 'data/process',
          name: 'Process',
          component: () => import('@/views/data/ProcessView.vue'),
          meta: { title: '工艺管理', group: '数据管理' },
        },
        {
          path: 'schedule/order',
          name: 'Order',
          component: () => import('@/views/schedule/OrderView.vue'),
          meta: { title: '订单管理', group: '生产排程' },
        },
        {
          path: 'schedule/gantt',
          name: 'Gantt',
          component: () => import('@/views/schedule/GanttView.vue'),
          meta: { title: '智能排程', group: '生产排程' },
        },
        {
          path: 'schedule/history',
          name: 'History',
          component: () => import('@/views/schedule/HistoryView.vue'),
          meta: { title: '历史排程', group: '生产排程' },
        },
        {
          path: 'system/user',
          name: 'User',
          component: () => import('@/views/system/UserView.vue'),
          meta: { title: '用户管理', group: '系统设置' },
        },
        {
          path: 'system/role',
          name: 'Role',
          component: () => import('@/views/system/RoleView.vue'),
          meta: { title: '角色管理', group: '系统设置' },
        },
        {
          path: 'system/dept',
          name: 'Dept',
          component: () => import('@/views/system/DeptView.vue'),
          meta: { title: '部门管理', group: '系统设置' },
        },
        {
          path: 'system/permission',
          name: 'Permission',
          component: () => import('@/views/system/PermissionView.vue'),
          meta: { title: '权限管理', group: '系统设置' },
        },
        {
          path: 'system/dict',
          name: 'Dict',
          component: () => import('@/views/system/DictView.vue'),
          meta: { title: '数据字典', group: '系统设置' },
        },
      ],
    },
  ],
})

// 全局前置守卫：每次路由跳转前进行登录鉴权
router.beforeEach((to, from, next) => {
  // 目标页面不是登录页时，检查登录状态
  if (to.path !== '/login') {
    const token = localStorage.getItem('token')
    // 无 token，重定向到登录页
    if (!token) {
      next('/login')
      return
    }
  }
  // 已登录或目标为登录页，直接放行
  next()
})

export default router
