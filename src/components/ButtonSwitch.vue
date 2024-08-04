<template>
  <div class="flex">
    <div class="flex w-full h-full">
      <input
        type="checkbox"
        :checked="buttonState"
        :id="buttonLabel"
        class="hidden peer"
        @click.prevent="() => (buttonClick ? buttonClick() : null)"
      />
      <label
        :for="buttonLabel"
        :class="[
          'flex items-center justify-center w-full h-full',
          buttonWidth,
          'cursor-pointer transition-colors font-medium peer-checked:bg-primary peer-checked:text-simActiveButton peer-checked:border-transparent bg-activeButton text-primary border-transparent',
        ]"
      >
        {{ buttonLabel }}
      </label>
    </div>

    <!-- <button
      class="font-medium bg-primary"
      :disabled="buttonState == null && buttonClick == null"
      @click="buttonClick"
      :style="{ color: labelColor, width: buttonWidth, maxWidth: buttonWidth }"
    >

    </button> -->
    <input
      @change="(event) => inputChange(event.target.value)"
      v-if="textInput != undefined"
      type="number"
      :class="[
        'bg-transparent border-l border-slate-600 pl-1 h-full',
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

<style scoped>
button:enabled:hover {
  opacity: 70%;
  color: white;
}
</style>
