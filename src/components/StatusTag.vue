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
</script>

<template>
  <a-tag :color="tagColor">{{ label }}</a-tag>
</template>
