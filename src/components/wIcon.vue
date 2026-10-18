<template>
  <!-- Inline icon set: hand-drawn stroke paths, colored via currentColor -->
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'moon'" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    <template v-else-if="name === 'fullscreen'">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4.5" ry="9" />
      <path d="M3 12h18" />
    </template>
    <template v-else-if="name === 'map'">
      <g transform="translate(12 12) scale(0.94) translate(-12 -12)" stroke-width="2.13">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </g>
    </template>
    <template v-else-if="name === 'activity'">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </template>
    <template v-else-if="name === 'volume'">
      <path d="M13.5 4.5 8 9H3.5v6H8l5.5 4.5v-15Z" />
      <path d="M17 9a4.2 4.2 0 0 1 0 6" />
      <path d="M19.5 6.5a8 8 0 0 1 0 11" />
    </template>
    <template v-else-if="name === 'power'">
      <path d="M12 2v10" />
      <path d="M18.36 6.64a9 9 0 1 1-12.72 0" />
    </template>
    <template v-else-if="name === 'rows'">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M3 3v18h18" />
      <path d="M7.5 14.5l3-4.5 3 2.5 5.5-7" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </template>
    <template v-else-if="name === 'reset'">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </template>
  </svg>
</template>

<script setup lang="ts">
/**
 * Available names: 'moon' | 'fullscreen' | 'globe' | 'map' | 'activity' | 'volume' | 'power'
 *                 | 'rows' | 'chart' | 'trash' | 'reset'
 */
defineProps({
  name: {
    type: String,
    required: true,
  },
})
</script>
