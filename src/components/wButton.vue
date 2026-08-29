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
  buttonClick: {
    type: Function as PropType<(event: MouseEvent) => void>,
    required: true,
  },
})
</script>

<style scoped>
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
