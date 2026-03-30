<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  color: String,
  colorMap: Object,
  value: [String, Number],
})

const tagColor = computed(() => {
  if (props.color) return props.color
  if (props.colorMap && props.value !== undefined) {
    return props.colorMap[props.value] || '#999'
  }
  return '#999'
})

const bgColor = computed(() => {
  return tagColor.value + '18'
})
</script>

<template>
  <span
    class="status-tag"
    :style="{
      color: tagColor,
      background: bgColor,
      border: `1px solid ${tagColor}30`,
    }"
  >
    {{ label }}
  </span>
</template>
