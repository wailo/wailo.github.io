<template>
  <div
    ref="menuRoot"
    class="pointer-events-auto absolute left-1 top-1 z-30 font-mono text-[10px] text-secondary"
  >
    <wButton
      button-label="☰"
      :button-state="open"
      :button-click="() => (open = !open)"
      class="h-5 w-7"
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
        <div class="group-caption">
          <span class="group-caption-label">WORKSPACE</span>
        </div>
        <div class="mt-0.5 grid grid-cols-2 gap-1">
          <wButton
            v-for="control in layoutControls"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => control.setValue(true)"
            class="h-5 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="group-caption">
          <span class="group-caption-label">APPEARANCE</span>
        </div>
        <div class="mt-0.5 grid grid-cols-2 gap-1">
          <wButton
            button-label="DARK THEME"
            :button-icon="controlIcons[themeControl.id]"
            button-icon-only
            :button-state="themeControl.value"
            :button-click="() => toggleControl(themeControl)"
            class="h-5 min-w-0"
          />
          <wButton
            button-label="FULLSCREEN"
            :button-icon="controlIcons[fullscreenControl.id]"
            button-icon-only
            :button-state="fullscreenControl.value"
            :button-click="() => toggleControl(fullscreenControl)"
            class="h-5 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="group-caption">
          <span class="group-caption-label">VISUALS</span>
          <span class="group-caption-state"
            >{{ enabledCount(utilityControls) }}/{{ utilityControls.length }}</span
          >
        </div>
        <div class="mt-0.5 grid grid-cols-4 gap-1">
          <wButton
            v-for="control in utilityControls"
            :key="control.id"
            :button-label="control.label"
            :button-icon="controlIcons[control.id]"
            button-icon-only
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-5 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="group-caption">
          <span class="group-caption-label">SIX INSTRUMENTS</span>
          <span class="group-caption-side">
            <span class="group-caption-state">{{ groupState(sixGroup) }}</span>
            <wButton
              button-label="MASTER"
              button-icon="power"
              button-icon-only
              :button-state="sixGroup.master.value"
              :button-click="() => toggleControl(sixGroup.master)"
              class="h-5 w-7"
            />
          </span>
        </div>
        <div class="mt-0.5 grid grid-cols-3 gap-1">
          <wButton
            v-for="control in sixGroup.children"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-5 min-w-0"
          />
        </div>
      </section>

      <section class="control-group">
        <div class="group-caption">
          <span class="group-caption-label">PFD</span>
          <span class="group-caption-side">
            <span class="group-caption-state">{{ groupState(pfdGroup) }}</span>
            <wButton
              button-label="MASTER"
              button-icon="power"
              button-icon-only
              :button-state="pfdGroup.master.value"
              :button-click="() => toggleControl(pfdGroup.master)"
              class="h-5 w-7"
            />
          </span>
        </div>
        <div class="mt-0.5 grid grid-cols-4 gap-1">
          <wButton
            v-for="control in pfdGroup.children"
            :key="control.id"
            :button-label="control.label"
            :button-state="control.value"
            :button-click="() => toggleControl(control)"
            class="h-5 min-w-0"
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

// Control id -> wIcon name. Controls not listed here stay as text labels.
const controlIcons: Record<string, string> = {
  'dark-theme': 'moon',
  fullscreen: 'fullscreen',
  visual: 'globe',
  map: 'map',
  motion: 'activity',
  audio: 'volume',
}

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
.control-group {
  margin-top: 0.3rem;
}

.group-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 0 2px;
}

.group-caption-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.6;
}

.group-caption-side {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.group-caption-state {
  font-size: 9px;
  letter-spacing: 0.12em;
  opacity: 0.5;
}
</style>
