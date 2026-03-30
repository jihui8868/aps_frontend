<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import LogoIcon from '@/components/LogoIcon.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authStore.login(form.value)
    router.push('/')
  } catch (e) {
    error.value = e.message || '登录失败，请检查账号密码'
  } finally {
    loading.value = false
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="login-page" @keydown="handleKeydown">
    <div class="login-card">
      <div class="login-logo">
        <LogoIcon :size="56" />
        <h1 class="login-title">智能排程系统</h1>
        <p class="login-subtitle">化工行业高级计划排程</p>
      </div>
      <a-form layout="vertical">
        <a-form-item label="用户名">
          <a-input
            v-model:value="form.username"
            placeholder="请输入用户名"
            autocomplete="username"
            size="large"
          >
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>
        <a-form-item label="密码">
          <a-input-password
            v-model:value="form.password"
            placeholder="请输入密码"
            autocomplete="current-password"
            size="large"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>
        <a-alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" />
        <a-button
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleLogin"
          style="height: 42px; font-size: 16px; margin-bottom: 16px;"
        >
          登 录
        </a-button>
        <div class="login-hint">默认账号: admin / 123456</div>
      </a-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-logo {
  text-align: center;
  margin-bottom: 36px;
}

.login-logo :deep(svg) {
  margin-bottom: 16px;
}

.login-title {
  margin: 0 0 4px;
  font-size: 24px;
  color: rgba(0, 0, 0, 0.88);
}

.login-subtitle {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

.login-hint {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
</style>
