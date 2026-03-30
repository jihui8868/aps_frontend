<script setup>
defineProps({
  size: { type: Number, default: 32 },
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Background rounded square -->
    <rect width="120" height="120" rx="24" fill="url(#logoGrad)" />

    <!-- Gantt chart bars representing scheduling -->
    <rect x="24" y="28" width="40" height="12" rx="3" fill="rgba(255,255,255,0.95)" />
    <rect x="36" y="46" width="52" height="12" rx="3" fill="rgba(255,255,255,0.75)" />
    <rect x="28" y="64" width="36" height="12" rx="3" fill="rgba(255,255,255,0.55)" />

    <!-- Clock / gear accent -->
    <circle cx="86" cy="80" r="20" stroke="rgba(255,255,255,0.9)" stroke-width="4" fill="none" />
    <line x1="86" y1="80" x2="86" y2="68" stroke="rgba(255,255,255,0.9)" stroke-width="3.5" stroke-linecap="round" />
    <line x1="86" y1="80" x2="95" y2="84" stroke="rgba(255,255,255,0.9)" stroke-width="3.5" stroke-linecap="round" />

    <!-- Small dot at clock center -->
    <circle cx="86" cy="80" r="2.5" fill="rgba(255,255,255,0.9)" />

    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#4F6EF7" />
        <stop offset="100%" stop-color="#1677FF" />
      </linearGradient>
    </defs>
  </svg>
</template>
