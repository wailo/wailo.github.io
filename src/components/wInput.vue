<template>
  <input
    type="number"
    class="bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary"
    v-model="localValue"
    :min="inputMin"
    :max="inputMax"
    :step="inputStep"
    @change="onChange"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { PropType } from 'vue'

const props = defineProps({
  textInput: {
    type: Number as PropType<number>,
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

// STRING while editing
const localValue = ref(String(props.textInput ?? ''))

watch(
  () => props.textInput,
  (newVal) => {
    localValue.value = String(newVal ?? '')
  },
)

function commitValue() {
  // user cleared field -> restore previous valid value
  if (localValue.value === '') {
    localValue.value = String(props.textInput ?? '')
    return
  }

  const num = Number(localValue.value)

  if (!isNaN(num) && num >= props.inputMin && num <= props.inputMax) {
    props.inputChange?.(num)
  } else {
    // invalid -> revert
    localValue.value = String(props.textInput ?? '')
  }
}

function onChange() {
  commitValue()
}

function onBlur() {
  commitValue()
}
</script>
