<template>
  <div class="flex">
    <!-- Button or Label -->
    <button
      v-if="buttonClick != null"
      :class="[
        'outline-none flex items-center justify-center w-full h-full text-nowrap',
        buttonWidth,
        buttonState
          ? 'bg-simActiveButton text-primary'
          : 'bg-primary text-secondary',
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

    <!-- Smart input -->
    <input
      v-if="textInput !== undefined"
      type="number"
      :class="[
        'bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary',
        inputWidth,
      ]"
      :value="localValue"
      :min="inputMin"
      :max="inputMax"
      :step="inputStep"
      @input="onInput"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { PropType } from 'vue'

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
  textInput: {
    type: Number as PropType<number>,
  },
  buttonClick: {
    type: Function as PropType<(event: MouseEvent) => void>,
  },
  inputChange: {
    type: Function,
  },
  inputMin: {
    type: Number as PropType<number>,
    default: 0,
  },
  inputMax: {
    type: Number as PropType<number>,
    default: 100,
  },
  inputStep: {
    type: Number as PropType<number>,
    default: 1,
  },
})

// Layout
const buttonWidth = computed(() =>
  props.textInput !== undefined ? 'w-6/12' : 'w-full',
)
const inputWidth = computed(() =>
  props.textInput !== undefined ? 'w-6/12' : 'w-full',
)

// Local state
const localValue = ref(props.textInput)
const isEditing = ref(false)
let editTimeout: ReturnType<typeof setTimeout> | null = null

// External update sync logic
watch(() => props.textInput, (newVal) => {
  if (!isEditing.value) {
    localValue.value = newVal
  }
})

// User types → start editing session
function onInput(event: Event) {
  const newVal = parseFloat((event.target as HTMLInputElement).value)
  if (!isNaN(newVal)) {
    localValue.value = newVal
    startEditSession()
  }
}

// Only commit on Change
// Change happens when the user hit enter, blur or change with keyboard
function onChange() {
  if (!isNaN(localValue.value as number)) {
    props.inputChange?.(localValue.value as number)
  }
  stopEditSession()
}

function startEditSession() {
  isEditing.value = true
  if (editTimeout) clearTimeout(editTimeout)
  editTimeout = setTimeout(() => {
    isEditing.value = false
  }, 2000)
}

function stopEditSession() {
  isEditing.value = false
  if (editTimeout) clearTimeout(editTimeout)
}
</script>

<style scoped></style>
