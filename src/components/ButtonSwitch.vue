<template>
  <div class="flex">
    <button class="font-medium" :disabled="buttonState == null && buttonClick == null" @click="buttonClick"
      :style="{ color: labelColor, backgroundColor: buttonBackgroundColor, width: buttonWidth, maxWidth: buttonWidth }">
      {{ buttonLabel }}
    </button>
    <input @change="event => inputChange(event.target.value)" v-if="textInput != undefined" type="number"
      class="bg-transparent border-l border-slate-600 pl-1 h-full" :style="{ width: inputWidth, maxWidth: inputWidth }"
      :value="textInput" :min="inputMin" :max="inputMax" :step="inputStep" />
  </div>
</template>

<script setup lang="ts">

import { PropType, computed, inject } from "vue";

const theme = inject('theme');

const props = defineProps({
  // hasInput: {
  //   type: Boolean as PropType<Boolean>,
  //   default: false
  // },
  buttonLabel: {
    type: String as PropType<string>,
    required: true
  },
  buttonState: {
    type: Boolean as PropType<Boolean>
  },
  textInput: {
    type: Number as PropType<Number>
  },
  buttonClick: {
    type: Function as PropType<Function>
  },
  inputChange: {
    type: Function as PropType<Function>
  },
  inputMin: {
    type: Number as PropType<Number>,
    default: 0
  },
  inputMax: {
    type: Number as PropType<Number>,
    default: 100
  },
  inputStep: {
    type: Number as PropType<Number>,
    default: 1
  }
});

const buttonBackgroundColor = computed(() => props.buttonState === true ? theme.primaryColor : theme.activeButton)
const labelColor = computed(() => props.buttonState === true ? theme.activeButton : theme.primaryColor)
const buttonWidth = computed(() => props.textInput != undefined ? "60%" : "100%")
const inputWidth = computed(() => props.textInput != undefined ? "40%" : "100%")
</script>

<style scoped>
button:enabled:hover {
  opacity: 70%;
  color: white;
}
</style>
