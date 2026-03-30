<script setup>
const props = defineProps({
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
  <a-modal
    :open="visible"
    :title="title"
    :ok-text="confirmText"
    :cancel-text="cancelText"
    :ok-button-props="{ danger }"
    @ok="emit('confirm')"
    @cancel="emit('cancel')"
    :width="420"
  >
    <p style="margin: 0; color: rgba(0,0,0,0.65);">{{ message }}</p>
  </a-modal>
</template>
