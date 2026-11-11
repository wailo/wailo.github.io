<template>
  <Splitpanes
    class="sim-split-layout"
    :data-active-layout="layout"
    :data-maximized-panel="maximizedPanel ?? ''"
    :data-panel-revision="panelRevision"
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
          :data-panel-revision="panelRevision"
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

type LayoutName = 'instructor' | 'pilot'
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

const props = withDefaults(
  defineProps<{
    layout: LayoutName
    maximizedPanel?: string | null
    pilotConsoleOpen?: boolean
    pilotPlotsOpen?: boolean
    pilotAutopilotOpen?: boolean
  }>(),
  {
    maximizedPanel: null,
    pilotConsoleOpen: true,
    pilotPlotsOpen: true,
    pilotAutopilotOpen: true,
  },
)

const instructorColumns: ColumnDefinition[] = [
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

const pilotColumns: ColumnDefinition[] = [
  {
    min: 20,
    panels: [{ id: 'cockpit' }, { id: 'autopilot', min: 5 }],
  },
  {
    min: 12,
    panels: [{ id: 'prompt' }, { id: 'realtime' }],
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
    columns: [62, 38],
    panels: {
      cockpit: 88,
      autopilot: 12,
      learningmodules: 0,
      prompt: 42,
      classroom: 0,
      simulation: 0,
      realtime: 58,
      flightmodel: 0,
    },
  },
}

// v6 drops the airport column/panel; older presets would restore stale sizes.
const storageKey = (layout: LayoutName) => `sim-split-layout-v6-${layout}`
const layoutRevision = ref(0)
const panelAliases: Record<string, PanelId> = {
  'learning-modules': 'learningmodules',
  'flight-model': 'flightmodel',
}
const maximizedPanel = computed<PanelId | null>(() => {
  if (!props.maximizedPanel) return null
  return panelAliases[props.maximizedPanel] ?? (props.maximizedPanel as PanelId)
})

const layoutColumns = computed(() => (props.layout === 'pilot' ? pilotColumns : instructorColumns))

// Splitpanes reads pane sizes when its own render runs. The nested workspace
// toggles panels through props, so give each splitpanes instance a changing
// attribute to force that render without remounting the panel contents.
const panelRevision = computed(() =>
  [
    props.layout,
    props.pilotConsoleOpen ? '1' : '0',
    props.pilotPlotsOpen ? '1' : '0',
    props.pilotAutopilotOpen ? '1' : '0',
    props.maximizedPanel ?? '',
    layoutRevision.value,
  ].join(':'),
)

const isPanelVisible = (panelId: PanelId, preset: LayoutPreset) => {
  if (props.layout === 'pilot') {
    switch (panelId) {
      case 'cockpit':
        return true
      case 'autopilot':
        return props.pilotAutopilotOpen
      case 'prompt':
        return props.pilotConsoleOpen
      case 'realtime':
        return props.pilotPlotsOpen
      default:
        return false
    }
  }
  return preset.panels[panelId] > 0
}

const isColumnVisible = (column: ColumnDefinition, preset: LayoutPreset) =>
  column.panels.some((panel) => isPanelVisible(panel.id, preset))

const activeColumns = computed(() => {
  layoutRevision.value
  const preset = layouts[props.layout]
  const columns = layoutColumns.value
  const pilotDeckVisible =
    props.layout === 'pilot' && (props.pilotConsoleOpen || props.pilotPlotsOpen)
  const maximizedColumnIndex = maximizedPanel.value
    ? columns.findIndex((column) =>
        column.panels.some(
          (panel) => panel.id === maximizedPanel.value && isPanelVisible(panel.id, preset),
        ),
      )
    : -1
  const maximizedColumnSiblingMinimum = columns.reduce(
    (sum, column, columnIndex) =>
      columnIndex !== maximizedColumnIndex && isColumnVisible(column, preset)
        ? sum + (column.min ?? 10)
        : sum,
    0,
  )
  let saved: { columns?: number[]; panels?: Partial<Record<PanelId, number>> } = {}
  try {
    saved = JSON.parse(localStorage.getItem(storageKey(props.layout)) || '{}')
  } catch {
    // Ignore stale layout data.
  }
  const savedColumns =
    Array.isArray(saved.columns) && saved.columns.length === columns.length ? saved.columns : null

  return columns.map((column, columnIndex) => {
    const panels = column.panels.map((panel) => {
      const visible = isPanelVisible(panel.id, preset)
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

    // A single visible panel owns the full column; multiple visible panels share it
    // proportionally so any combination of the toggled panels fills the column.
    if (props.layout === 'pilot') {
      const visiblePanels = panels.filter((panel) => panel.visible)
      if (visiblePanels.length === 1) {
        visiblePanels[0].size = 100
      } else if (visiblePanels.length > 1) {
        const total = visiblePanels.reduce((sum, panel) => sum + panel.size, 0)
        if (total > 0) {
          visiblePanels.forEach((panel) => {
            panel.size = (panel.size / total) * 100
          })
        }
      }
    }

    const maximizedInColumn = panels.some(
      (panel) => panel.visible && panel.id === maximizedPanel.value,
    )
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

    const visible = isColumnVisible(column, preset)
    let normalSize = visible ? (savedColumns?.[columnIndex] ?? preset.columns[columnIndex]) : 0
    if (props.layout === 'pilot') {
      if (columnIndex === 0) normalSize = pilotDeckVisible ? (savedColumns?.[0] ?? 62) : 100
      if (columnIndex === 1) normalSize = pilotDeckVisible ? (savedColumns?.[1] ?? 38) : 0
    }
    const maximizedSize =
      maximizedColumnIndex < 0
        ? normalSize
        : columnIndex === maximizedColumnIndex
          ? 100 - maximizedColumnSiblingMinimum
          : visible
            ? (column.min ?? 10)
            : 0

    return {
      ...column,
      visible,
      size: maximizedSize,
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
  if (maximizedPanel.value) return
  if (props.layout === 'pilot' && !props.pilotConsoleOpen && !props.pilotPlotsOpen) {
    return
  }
  const saved = readSaved()
  saved.columns = panes.map((pane) => pane.size)
  localStorage.setItem(storageKey(props.layout), JSON.stringify(saved))
  notifyResize()
}

const savePanelSizes = (columnIndex: number, { panes }: SplitpanesEvent) => {
  if (maximizedPanel.value) return
  const preset = layouts[props.layout]
  const column = layoutColumns.value[columnIndex]
  if (!column) return
  const visiblePanels = column.panels.filter((panel) => isPanelVisible(panel.id, preset))
  if (visiblePanels.length < 2) return
  const saved = readSaved()
  saved.panels ||= {}
  column.panels.forEach((panel, panelIndex) => {
    if (!isPanelVisible(panel.id, preset)) return
    const pane = panes[panelIndex]
    if (pane) saved.panels[panel.id] = pane.size
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
