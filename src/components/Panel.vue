<script setup lang="ts">
import { PropType, computed } from "vue";

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
  flash: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
});

// const color = computed(() =>
//   props.active === false ? theme.primaryColor : "#00ff00",
// );
</script>

<template>
  <!-- panel frame -->
  <div
    :class="[
      'flex flex-col border-2 rounded-none w-full h-full box-border min-w-0 min-h-0',
      props.active ? 'border-panelActive' : 'border-panelBorder', {'animate-pulse': props.flash}
    ]"
  >
    <!-- panel-header -->
    <div
      :class="[
        'max-h-1/6 text-sm font-medium h-5 box-border justify-between border-b pb-0 bg-panelHeaderBackground',
        props.active ? 'border-panelActive' : 'border-panelBorder',
      ]"
    >
      <!-- panel-title -->
      <span
        class="inline-block w-9/12 pl-2 text-nowrap border-panelStatusBackground text-secondary"
        >{{ title }}</span
      >
      <!-- panel-status -->
      <span
        :class="[
          'inline-block w-3/12 h-full pl-2 text-nowrap text-primary',
          props.active ? 'bg-panelActive' : 'bg-secondary',
        ]"
        >{{ status }}</span
      >
    </div>
    <!-- panel-conent -->
    <div
      class="h-5/6 flex flex-1 box-border items-start justify-center pt-2 p-1 overflow-auto text-panelFont text-secondary bg-panelContentBackground"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped></style>
