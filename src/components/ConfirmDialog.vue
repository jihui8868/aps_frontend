<script setup>
defineProps({
  visible: Boolean,
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-box" style="width: 420px;">
      <div class="modal-header">
        <span>{{ title }}</span>
        <button class="modal-close" @click="emit('cancel')">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin: 0; color: var(--text-secondary);">{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="emit('cancel')">{{ cancelText }}</button>
        <button
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
