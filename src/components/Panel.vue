<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect, useSlots, PropType } from 'vue'

const props = defineProps({
  status: {
    type: String as PropType<string>,
    default: 'Idle',
  },
  active: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  flash: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  panelId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits<{
  (event: 'header-dblclick', panelId: string): void
}>()

// Dynamic tab detection via named slots
const tabSlots = useSlots()
const tabMap = ref<{ name: string; display: string }[]>([])
const activeTab = ref<string | null>(null)

const setActiveTab = (tabName: string) => {
  if (tabMap.value.some((tab) => tab.name === tabName)) activeTab.value = tabName
}

const requestActiveTab = (tabName: string) => {
  if (!props.panelId) {
    setActiveTab(tabName)
    return
  }
  window.dispatchEvent(
    new CustomEvent('sim:request-panel-tab', {
      detail: { panelId: props.panelId, tabName },
    }),
  )
}

defineExpose({ setActiveTab })

const handleSetTab = (event: Event) => {
  const detail = (event as CustomEvent<{ panelId: string; tabName: string }>).detail
  if (detail?.panelId === props.panelId) setActiveTab(detail.tabName)
}

const resetActiveTab = () => {
  activeTab.value = tabMap.value[0]?.name || null
}

onMounted(() => {
  window.addEventListener('sim:set-panel-tab', handleSetTab)
  window.addEventListener('sim:reset-panel-tabs', resetActiveTab)
})
onBeforeUnmount(() => {
  window.removeEventListener('sim:set-panel-tab', handleSetTab)
  window.removeEventListener('sim:reset-panel-tabs', resetActiveTab)
})

watchEffect(() => {
  tabMap.value = Object.keys(tabSlots)
    .filter((key) => key !== 'default')
    .map((slotName) => ({
      name: slotName,
      display: slotName.replace(/-/g, ' '), // Customize to your liking
    }))

  if (!activeTab.value && tabMap.value.length > 0) {
    activeTab.value = tabMap.value[0].name
  }
})
</script>

<template>
  <!-- panel frame -->
  <div
    :class="[
      'flex flex-col border w-full h-full box-border min-w-0 min-h-0 rounded overflow-hidden',
      props.active ? 'border-panelActive' : 'border-panelBorder',
      { 'panel-attention-flash': props.flash },
    ]"
  >
    <!-- panel-header -->
    <div
      :class="[
        'max-h-1/6 text-xs font-medium h-5 box-border justify-between border-b pb-0 flex items-center bg-panelHeaderBackground',
        props.active ? 'border-panelActive' : 'border-panelBorder',
      ]"
      :title="props.panelId ? 'Double-click to maximize or restore panel' : undefined"
      @dblclick="props.panelId && emit('header-dblclick', props.panelId)"
    >
      <!-- TABS -->
      <div class="flex h-full gap-1 text-secondary">
        <button
          v-for="tab in tabMap"
          :key="tab.name"
          @click="requestActiveTab(tab.name)"
          :class="[
            'px-1 rounded-t flex items-center',
            tabMap.length > 1 ? (activeTab === tab.name ? 'bg-panelActive' : 'text-xs') : '',
          ]"
        >
          {{ tab.display }}
        </button>
      </div>

      <!-- panel-status -->
      <span
        :class="[
          'inline-block w-3/12 h-full pl-2 text-nowrap text-primary border-panelBorder border-l-1 flex items-center',
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
      <div
        v-for="tab in tabMap"
        v-show="activeTab === tab.name"
        :key="tab.name"
        class="h-full w-full min-h-0 min-w-0"
      >
        <slot :name="tab.name" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-attention-flash {
  animation: panel-attention-flash 850ms ease-in-out infinite;
}

@keyframes panel-attention-flash {
  0%,
  100% {
    border-color: rgb(var(--color-panelBorder));
  }

  50% {
    border-color: rgb(var(--color-panelActive));
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-attention-flash {
    animation: none;
    border-color: rgb(var(--color-panelActive));
  }
}
</style>
