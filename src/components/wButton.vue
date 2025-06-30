<template>
    <!-- Button or Label -->
    <button
      :class="[
        'outline-none items-center justify-center h-full text-nowrap',
        props.buttonState === true
          ? 'bg-simActiveButton text-primary'
          : 'bg-primary text-secondary',
        'cursor-pointer font-medium',
      ]"
      @click="props.buttonClick"
    >
      {{ props.buttonLabel }}
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
    type: Function as PropType<() => void>,
    required: true
  }
})

</script>