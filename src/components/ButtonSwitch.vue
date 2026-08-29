<template>
  <div class="flex min-w-0">
    <!-- Button or Label -->
    <wButton
      v-if="buttonClick != null"
      :class="buttonWidth"
      :button-label="buttonLabel"
      :button-state="buttonState"
      :button-click="buttonClick"
    />
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
import wButton from './wButton.vue'
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
