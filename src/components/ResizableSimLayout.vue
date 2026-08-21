<template>
  <Splitpanes
    class="sim-split-layout"
    :data-active-layout="layout"
    :data-maximized-panel="maximizedPanel ?? ''"
    :push-other-panes="false"
    :maximize-panes="false"
    @resize="notifyResize"
    @resized="saveColumnSizes"
  >
    <Pane
      v-for="(column, columnIndex) in activeColumns"
      :key="`column-${columnIndex}`"
      :size="column.size"
      :min-size="column.visible ? column.min : 0"
      :max-size="column.visible ? 100 : 0"
    >
      <div
        class="sim-column-host h-full w-full"
        :class="{ 'sim-column-host-collapsed': !column.visible }"
      >
        <Splitpanes
          horizontal
          :data-active-layout="layout"
          :data-maximized-panel="maximizedPanel ?? ''"
          :push-other-panes="true"
          :maximize-panes="false"
          @resize="notifyResize"
          @resized="(event) => savePanelSizes(columnIndex, event)"
        >
          <Pane
            v-for="panel in column.panels"
            :key="panel.id"
            :size="panel.size"
            :min-size="panel.visible ? panel.min : 0"
            :max-size="panel.visible ? panel.max : 0"
          >
            <div
              class="sim-panel-host h-full w-full"
              :class="{
                'sim-panel-host-collapsed': !panel.visible,
                'sim-panel-host-maximized': panel.maximized,
                'sim-panel-host-suppressed': panel.suppressed,
              }"
            >
              <slot :name="panel.id"></slot>
            </div>
          </Pane>
        </Splitpanes>
      </div>
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Pane, Splitpanes } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'

type LayoutName = 'instructor' | 'pilot' | 'focus' | 'classroom'
type PanelId =
  | 'cockpit'
  | 'realtime'
  | 'simulation'
  | 'learningmodules'
  | 'autopilot'
  | 'flightmodel'
  | 'classroom'
  | 'prompt'

type PanelDefinition = { id: PanelId; min?: number; max?: number }
type ColumnDefinition = { min?: number; panels: PanelDefinition[] }
type LayoutPreset = { columns: number[]; panels: Record<PanelId, number> }
type SplitpanesEvent = { panes: Array<{ size: number }> }

const props = defineProps<{ layout: LayoutName; maximizedPanel?: string | null }>()

const columns: ColumnDefinition[] = [
  {
    panels: [{ id: 'cockpit' }, { id: 'autopilot', min: 5 }, { id: 'learningmodules' }],
  },
  {
    panels: [{ id: 'prompt' }, { id: 'classroom' }, { id: 'simulation', min: 5 }],
  },
  {
    panels: [{ id: 'realtime' }, { id: 'flightmodel' }],
  },
]

const layouts: Record<LayoutName, LayoutPreset> = {
  instructor: {
    columns: [50, 25, 25],
    panels: {
      cockpit: 50,
      autopilot: 12.5,
      learningmodules: 37.5,
      prompt: 62.5,
      classroom: 37.5,
      simulation: 0,
      realtime: 62.5,
      flightmodel: 37.5,
    },
  },
  pilot: {
    columns: [50, 25, 25],
    panels: {
      cockpit: 87.5,
      autopilot: 12.5,
      learningmodules: 0,
      prompt: 87.5,
      classroom: 12.5,
      simulation: 0,
      realtime: 50,
      flightmodel: 50,
    },
  },
  focus: {
    columns: [50, 25, 25],
    panels: {
      cockpit: 100,
      autopilot: 0,
      learningmodules: 0,
      prompt: 85,
      classroom: 0,
      simulation: 15,
      realtime: 100,
      flightmodel: 0,
    },
  },
  classroom: {
    columns: [50, 50, 0],
    panels: {
      cockpit: 50,
      autopilot: 12.5,
      learningmodules: 37.5,
      prompt: 62.5,
      classroom: 37.5,
      simulation: 0,
      realtime: 0,
      flightmodel: 0,
    },
  },
}

const storageKey = (layout: LayoutName) => `sim-split-layout-v2-${layout}`
const layoutRevision = ref(0)
const panelAliases: Record<string, PanelId> = {
  'learning-modules': 'learningmodules',
  'flight-model': 'flightmodel',
}
const maximizedPanel = computed<PanelId | null>(() => {
  if (!props.maximizedPanel) return null
  return panelAliases[props.maximizedPanel] ?? (props.maximizedPanel as PanelId)
})

const activeColumns = computed(() => {
  layoutRevision.value
  const preset = layouts[props.layout]
  let saved: { columns?: number[]; panels?: Partial<Record<PanelId, number>> } = {}
  try {
    saved = JSON.parse(localStorage.getItem(storageKey(props.layout)) || '{}')
  } catch {
    // Ignore stale layout data.
  }

  return columns.map((column, columnIndex) => {
    const panels = column.panels.map((panel) => {
      const visible = preset.panels[panel.id] > 0
      return {
        ...panel,
        visible,
        size: visible ? (saved.panels?.[panel.id] ?? preset.panels[panel.id]) : 0,
        min: panel.min ?? 8,
        max: panel.max ?? 100,
        maximized: false,
        suppressed: false,
      }
    })

    const maximizedInColumn = panels.some((panel) => panel.id === maximizedPanel.value)
    if (maximizedInColumn) {
      const siblingMinimum = panels
        .filter((panel) => panel.visible && panel.id !== maximizedPanel.value)
        .reduce((sum, panel) => sum + panel.min, 0)

      panels.forEach((panel) => {
        panel.maximized = panel.id === maximizedPanel.value
        panel.suppressed = false
        if (!panel.visible) return
        panel.size = panel.maximized ? 100 - siblingMinimum : panel.min
        if (panel.maximized) panel.max = 100
      })
    }

    return {
      ...column,
      visible: preset.columns[columnIndex] > 0,
      size:
        preset.columns[columnIndex] > 0
          ? (saved.columns?.[columnIndex] ?? preset.columns[columnIndex])
          : 0,
      min: column.min ?? 10,
      panels,
    }
  })
})

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(props.layout)) || '{}')
  } catch {
    return {}
  }
}

const saveColumnSizes = ({ panes }: SplitpanesEvent) => {
  const saved = readSaved()
  saved.columns = panes.map((pane) => pane.size)
  localStorage.setItem(storageKey(props.layout), JSON.stringify(saved))
  notifyResize()
}

const savePanelSizes = (columnIndex: number, { panes }: SplitpanesEvent) => {
  if (maximizedPanel.value) return
  const saved = readSaved()
  saved.panels ||= {}
  columns[columnIndex].panels.forEach((panel, panelIndex) => {
    if (layouts[props.layout].panels[panel.id] > 0) {
      saved.panels[panel.id] = panes[panelIndex].size
    }
  })
  localStorage.setItem(storageKey(props.layout), JSON.stringify(saved))
  notifyResize()
}

let resizeQueued = false
const notifyResize = () => {
  if (resizeQueued) return
  resizeQueued = true
  requestAnimationFrame(async () => {
    await nextTick()
    window.dispatchEvent(new Event('resize'))
    resizeQueued = false
  })
}

const reset = (layoutToReset: LayoutName = props.layout) => {
  localStorage.removeItem(storageKey(layoutToReset))
  layoutRevision.value += 1
  notifyResize()
}

defineExpose({ reset })
</script>

<style scoped>
.sim-split-layout,
.sim-split-layout :deep(.splitpanes),
.sim-split-layout :deep(.splitpanes__pane) {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: transparent;
}

.sim-split-layout :deep(.splitpanes__splitter) {
  position: relative;
  z-index: 40;
  flex: 0 0 0.25rem;
  background-color: transparent;
}

.sim-split-layout :deep(.splitpanes--vertical > .splitpanes__splitter) {
  border-left: 1px solid;
  border-right: 1px solid;
  @apply border-simElementBorder bg-panelHeaderBackground;
}

.sim-split-layout :deep(.splitpanes--horizontal > .splitpanes__splitter) {
  border-top: 1px solid;
  border-bottom: 1px solid;
  @apply border-simElementBorder bg-panelHeaderBackground;
}

.sim-split-layout :deep(.splitpanes__splitter:hover),
.sim-split-layout :deep(.splitpanes__splitter:focus-visible) {
  @apply bg-simActiveButton;
}

.sim-split-layout :deep(.sim-panel-host-collapsed),
.sim-split-layout :deep(.sim-column-host-collapsed) {
  overflow: hidden;
}

.sim-split-layout :deep(.splitpanes__splitter:has(+ .splitpanes__pane > .sim-panel-host-collapsed)),
.sim-split-layout :deep(.splitpanes__pane:has(> .sim-panel-host-collapsed) + .splitpanes__splitter),
.sim-split-layout
  :deep(.splitpanes__splitter:has(+ .splitpanes__pane > .sim-column-host-collapsed)),
.sim-split-layout
  :deep(.splitpanes__pane:has(> .sim-column-host-collapsed) + .splitpanes__splitter) {
  display: none;
}
</style>
