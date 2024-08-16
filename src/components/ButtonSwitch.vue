<template>
  <div class="flex">
    <button
      v-if="buttonClick"
      :class="[
        'flex items-center justify-center w-full h-full text-nowrap',
        buttonWidth,
        buttonState
          ? 'bg-simActiveButton text-primary'
          : 'bg-primary text-secondary',
        'cursor-pointer  font-medium border-transparent',
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

    <input
      @change="(event) => inputChange(event.target?.value)"
      v-if="textInput != undefined"
      type="number"
      :class="[
        'bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary',
        inputWidth,
      ]"
      :value="textInput"
      :min="inputMin"
      :max="inputMax"
      :step="inputStep"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType, computed } from "vue";

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
    type: Function,
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
});

const buttonWidth = computed(() =>
  props.textInput != undefined ? "w-3/5" : "w-full",
);
const inputWidth = computed(() =>
  props.textInput != undefined ? "w-2/5" : "w-full",
);
</script>

<style scoped></style>
