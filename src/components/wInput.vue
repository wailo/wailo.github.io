<template>
    <input
      type="number"
      class="bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary"
      :value.number="localValue"
      :min="inputMin"
      :max="inputMax"
      :step="inputStep"
      @input="onInput"
      @change="onChange"
    />
</template>

<script setup lang="ts">
import { ref, watch} from 'vue'
import { PropType } from 'vue'

// The best thing to do is to seperate the button from text input
// Props
const props = defineProps({
  textInput: {
    type: [Number, Boolean] as PropType<number | boolean>,
    required: false
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
