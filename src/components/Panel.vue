<script setup lang="ts">
import {PropType, inject, computed } from "vue";



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
const panelStatusBackgroundColor = computed(() => props.active === true ? "#3cd437" : theme.primaryColor)
const borderColor = computed(() => props.active === true ? "#3cd437" : theme.borderColor)

</script>

<template>
  <div :style="{ borderColor: borderColor, backgroundColor: theme.panelHeaderBackround }"
    class="flex flex-col border-2 rounded-none w-full h-full box-border min-w-0 min-h-0">
    <!-- panel-header -->
    <div :style="{ borderColor: panelStatusBackgroundColor }"
      class="max-h-1/6 text-sm font-medium h-5 box-border justify-between border-b pb-0">
      <!-- panel-title -->
      <span :style="{ borderColor: panelStatusBackgroundColor, color: panelStatusBackgroundColor }"
        class="inline-block w-9/12 pl-2 text-nowrap">{{
          title
        }}</span>
      <!-- panel-status -->
      <span :style="{ backgroundColor: panelStatusBackgroundColor, color: statusTextColor }"
        class="inline-block w-3/12 h-full pl-2 text-nowrap">{{
          status
        }}</span>
    </div>
    <!-- panel-conent -->
    <div class="h-5/6 flex flex-1 box-border items-start justify-center pt-2 p-1 overflow-auto text-panel"
      :style="{ color: contenTexttColor, backgroundColor: theme.panelContentBackground }">
      <slot>Default Content</slot>
    </div>
  </div>
</template>

<style scoped></style>
