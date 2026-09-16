<template>
  <!-- Button or Label -->
  <button
    :title="props.buttonLabel"
    :class="[
      'efis-button inline-flex h-full min-w-0 items-center justify-center overflow-hidden text-ellipsis text-nowrap px-1',
      'border border-panelBorder outline-none cursor-pointer font-medium',
      'active:translate-y-px focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive',
      props.buttonState === true
        ? 'bg-simActiveButton text-primary'
        : 'bg-panelHeaderBackground text-secondary',
    ]"
    @click="props.buttonClick"
  >
    <span
      v-if="props.activeIndicator && props.buttonState"
      class="active-indicator mr-1"
      aria-hidden="true"
    >
      ●
    </span>
    <span class="min-w-0 truncate">{{ props.buttonLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { PropType } from 'vue'

// The best thing to do is to seperate the button from text input
// Props
const props = defineProps({
  buttonLabel: {
    type: String,
    required: true,
  },
  buttonState: {
    type: Boolean,
    default: false,
  },
  activeIndicator: {
    type: Boolean,
    default: false,
  },
  buttonClick: {
    type: Function as PropType<(event: MouseEvent) => void>,
    required: true,
  },
})
</script>

<style scoped>
.active-indicator {
  animation: active-indicator-pulse 1.2s ease-in-out infinite;
}

@keyframes active-indicator-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .active-indicator {
    animation: none;
  }
}

.efis-button {
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-simElementBorder)),
    inset -1px -1px 0 rgb(var(--color-panelBorder));
}

.efis-button:active {
  box-shadow:
    inset -1px -1px 0 rgb(var(--color-simElementBorder)),
    inset 1px 1px 0 rgb(var(--color-panelBorder));
}
</style>
