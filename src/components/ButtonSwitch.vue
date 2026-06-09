<template>
  <div class="flex">
    <!-- Button or Label -->
    <button
      v-if="buttonClick != null"
      :class="[
        'outline-none flex items-center justify-center w-full h-full text-nowrap',
        buttonWidth,
        buttonState ? 'bg-simActiveButton text-primary' : 'bg-primary text-secondary',
        'cursor-pointer font-medium border-transparent',
      ]"
      @click="buttonClick"
    >
      {{ buttonLabel }}
    </button>
    <div
      v-else
      :class="[
        'flex items-center justify-left w-full h-full text-nowrap pl-1',
        buttonWidth,
        'font-medium border-transparent',
      ]"
    >
      {{ buttonLabel }}
    </div>

    <slot></slot>

    <wInput
      v-if="textInput != null"
      :class="[
        'bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary',
        inputWidth,
      ]"
      :text-input="textInput as number"
      :input-change="inputChange"
      :input-min="inputMin"
      :input-max="inputMax"
      :input-step="inputStep"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType, computed } from 'vue'
import wInput from './wInput.vue'

const props = defineProps({
  // Button props
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
  },

  // Input props
  textInput: {
    type: [Number, Boolean, String] as PropType<number | boolean | string>,
    required: false,
  },
  inputChange: {
    type: Function,
  },
  inputMin: {
    type: Number,
    default: 0,
  },
  inputMax: {
    type: Number,
    default: 100,
  },
  inputStep: {
    type: Number,
    default: 1,
  },
})

// Layout
const buttonWidth = computed(() => (props.textInput !== undefined ? 'w-6/12' : 'w-full'))
const inputWidth = computed(() => (props.textInput !== undefined ? 'w-6/12' : 'w-full'))
</script>

<style scoped></style>
