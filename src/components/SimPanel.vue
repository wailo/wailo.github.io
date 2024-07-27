<script setup lang="ts">
import { ref, PropType, inject, computed } from "vue";



const props = defineProps({
  title: {
    type: String as PropType<string>,
    required: true,
  },
  status: {
    type: String as PropType<string>,
    default: "Hello",
  },
  active: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
});

const theme = inject('theme');
const color = computed(() => props.active === false ? theme.primaryColor : "#00ff00")
// const color = ref("#d4af37");
const statusTextColor = theme.backgroundColor;
const contenTexttColor = theme.textColor;
const panelColor = computed(() => props.active === true ? "#3cd437" : theme.primaryColor)

// const computedPrimaryColor = computed(() => theme.primaryColor || defaultTheme.primaryColor);

</script>

<template>
  <div :style="{ borderColor: panelColor, backgroundColor: theme.backgroundColor }"
    class="flex flex-col border-2 rounded-none w-full h-full box-border min-w-0 min-h-0">
    <!-- <div class="panel-header"> -->
    <div :style="{ borderColor: panelColor }"
      class="max-h-1/6 text-sm font-medium h-5 box-border justify-between border-b mb-1 pb-0">
      <!-- <div class="panel-title"> -->
      <span :style="{ borderColor: panelColor, color: panelColor }" class="inline-block w-9/12 pl-2">{{
        title
      }}</span>
      <!-- <div class="panel-status"> -->
      <span :style="{ backgroundColor: panelColor, color: statusTextColor }" class="inline-block w-3/12 h-full pl-2">{{
        status
        }}</span>
    </div>
    <!-- <div class="panel-conent"> -->
    <div class="h-5/6 flex flex-1 box-border items-start justify-center p-1 m-1 overflow-auto text-panel"
      :style="{ color: contenTexttColor, backgroundColor: theme.panelContentBackground }">
      <slot>Default Content</slot>
    </div>
  </div>
</template>

<style scoped></style>
