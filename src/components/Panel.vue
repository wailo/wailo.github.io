<script setup lang="ts">
import { ref, watchEffect, useSlots } from "vue";
import { PropType } from "vue";

const props = defineProps({
  status: {
    type: String as PropType<string>,
    default: "Idle",
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

// Dynamic tab detection via named slots
const tabSlots = useSlots();
const tabMap = ref<{ name: string; display: string }[]>([]);
const activeTab = ref<string | null>(null);

watchEffect(() => {
  tabMap.value = Object.keys(tabSlots)
    .filter((key) => key !== 'default')
    .map((slotName) => ({
      name: slotName,
      display: slotName.replace(/-/g, ' '), // Customize to your liking
    }));

  if (!activeTab.value && tabMap.value.length > 0) {
    activeTab.value = tabMap.value[0].name;
  }
});

</script>

<template>
  <!-- panel frame -->
  <div
    :class="[
      'flex flex-col border-2 w-full h-full box-border min-w-0 min-h-0 rounded overflow-hidden',
      props.active ? 'border-panelActive' : 'border-panelBorder',
      { 'animate-pulse': props.flash },
    ]"
  >
    <!-- panel-header -->
    <div
      :class="[
        'max-h-1/6 text-sm font-medium h-5 box-border justify-between border-b pb-0 flex items-center',
        props.active ? 'border-panelActive' : 'border-panelBorder',
      ]"
    >
      <!-- TABS -->
      <div class="flex h-full gap-2  text-secondary">
        <button
          v-for="tab in tabMap"
          :key="tab.name"
          @click="activeTab = tab.name"
          :class="[
            'px-2 rounded-t',
            tabMap.length > 1 ? activeTab === tab.name
              ? 'bg-panelActive'
              : 'text-xs' : '',
          ]"
        >
          {{ tab.display}}
        </button>
      </div>

      <!-- panel-status -->
      <span
        :class="[
          'inline-block w-3/12 h-full pl-2 text-nowrap text-primary border-panelBorder border-l-1',
          props.active ? 'bg-panelActive' : 'bg-panelStatusBackground',
        ]"
      >
        {{ status }}
      </span>
    </div>

    <!-- panel-content -->
    <div
      class="h-5/6 flex flex-1 box-border items-start justify-center pt-2 p-1 overflow-auto text-panelFont text-secondary bg-panelContentBackground w-full"
    >
      <slot :name="activeTab" />
    </div>
  </div>
</template>

<style scoped></style>
