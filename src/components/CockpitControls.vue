<template>
  <div
    ref="menuRoot"
    class="pointer-events-auto absolute left-1 top-1 z-30 font-mono text-xs text-secondary"
  >
    <wButton
      button-label="☰"
      :button-state="open"
      :button-click="() => (open = !open)"
      class="h-6 w-7"
      title="Cockpit controls"
      aria-label="Cockpit controls"
      aria-haspopup="true"
      :aria-expanded="open"
    />

    <div
      v-if="open"
      class="mt-1 w-72 border border-panelBorder bg-panelContentBackground/95 p-1 shadow-lg"
      role="dialog"
      aria-label="Cockpit display controls"
    >
      <div class="mb-1 flex items-center justify-between border-b border-simElementBorder pb-1">
        <span class="opacity-60">COCKPIT CONTROLS</span>
        <button
          class="px-1 text-secondary hover:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
          title="Close controls"
          @click="open = false"
        >
          ×
        </button>
      </div>

      <section class="control-group">
        <div class="group-label">APPEARANCE</div>
        <div class="mt-1 grid grid-cols-2 gap-1">
          <wButton
            button-label="DARK THEME"
            :button-state="themeControl.value"
            :button-click="() => toggleControl(themeControl)"
            class="h-7 min-w-0"
          />
          <wButton
            button-label="FULLSCREEN"
            :button-state="fullscreenControl.value"
            :button-click="() => toggleControl(fullscreenControl)"
            class="h-7 min-w-0"
          />
        </div>
        <div class="mt-1 grid grid-cols-4 gap-1">
          <wButton
            v-for="control in layoutControls"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => control.setValue(true)"
            class="h-7 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <button class="group-toggle" @click="visualsOpen = !visualsOpen">
          <span>{{ visualsOpen ? '▾' : '▸' }} VISUALS</span>
          <span>{{ enabledCount(utilityControls) }}/{{ utilityControls.length }}</span>
        </button>
        <div v-if="visualsOpen" class="mt-1 grid grid-cols-4 gap-1">
          <wButton
            v-for="control in utilityControls"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-7 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="control-group-header">
          <button class="group-disclosure" @click="sixOpen = !sixOpen">
            <span>{{ sixOpen ? '▾' : '▸' }} SIX INSTRUMENTS</span>
            <span>{{ groupState(sixGroup) }}</span>
          </button>
          <wButton
            button-label="MASTER"
            :button-state="sixGroup.master.value"
            :button-click="() => toggleControl(sixGroup.master)"
            class="h-7 w-20"
          />
        </div>
        <div v-if="sixOpen" class="mt-1 grid grid-cols-3 gap-1">
          <wButton
            v-for="control in sixGroup.children"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-7 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="control-group-header">
          <button class="group-disclosure" @click="pfdOpen = !pfdOpen">
            <span>{{ pfdOpen ? '▾' : '▸' }} PFD</span>
            <span>{{ groupState(pfdGroup) }}</span>
          </button>
          <wButton
            button-label="MASTER"
            :button-state="pfdGroup.master.value"
            :button-click="() => toggleControl(pfdGroup.master)"
            class="h-7 w-20"
          />
        </div>
        <div v-if="pfdOpen" class="mt-1 grid grid-cols-4 gap-1">
          <wButton
            v-for="control in pfdGroup.children"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-7 min-w-0"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type PropType } from 'vue'
import wButton from './wButton.vue'

type CockpitToggle = {
  id: string
  label: string
  value: boolean
  setValue: (state: boolean) => void
}

type CockpitToggleGroup = {
  master: CockpitToggle
  children: CockpitToggle[]
}

defineProps({
  pfdGroup: {
    type: Object as PropType<CockpitToggleGroup>,
    required: true,
  },
  sixGroup: {
    type: Object as PropType<CockpitToggleGroup>,
    required: true,
  },
  utilityControls: {
    type: Array as PropType<CockpitToggle[]>,
    required: true,
  },
  themeControl: {
    type: Object as PropType<CockpitToggle>,
    required: true,
  },
  fullscreenControl: {
    type: Object as PropType<CockpitToggle>,
    required: true,
  },
  layoutControls: {
    type: Array as PropType<CockpitToggle[]>,
    required: true,
  },
})

const open = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const visualsOpen = ref(true)
const pfdOpen = ref(false)
const sixOpen = ref(false)

const allEnabled = (group: CockpitToggleGroup) => group.children.every((item) => item.value)
const someEnabled = (group: CockpitToggleGroup) => group.children.some((item) => item.value)
const enabledCount = (controls: CockpitToggle[]) => controls.filter((item) => item.value).length
const groupState = (group: CockpitToggleGroup) =>
  allEnabled(group) ? 'ALL' : someEnabled(group) ? 'MIX' : 'OFF'

const toggleControl = (control: CockpitToggle) => control.setValue(!control.value)

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && open.value) {
    event.stopPropagation()
    open.value = false
  }
}

const handlePointerDown = (event: PointerEvent) => {
  if (!open.value || menuRoot.value?.contains(event.target as Node)) return
  open.value = false
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true)
  document.addEventListener('pointerdown', handlePointerDown, true)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  document.removeEventListener('pointerdown', handlePointerDown, true)
})
</script>

<style scoped>
.group-toggle,
.group-disclosure {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-toggle {
  width: 100%;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.2rem 0.3rem;
}

.group-toggle:focus-visible,
.group-disclosure:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
}

.control-group {
  margin-top: 0.3rem;
}

.control-group-header {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
}

.group-disclosure {
  min-width: 0;
  flex: 1;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.2rem 0.3rem;
}

.group-label {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.2rem 0.3rem;
}
</style>
