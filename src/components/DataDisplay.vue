<template>
  <div ref="displayRoot" class="flex flex-col w-full h-full">
    <div class="relative w-full space-y-1">
      <!-- Input + Buttons Row -->
      <div class="flex h-6 gap-1">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="/ Search signals"
          class="min-w-0 flex-1 text-secondary bg-simInputBackground border border-simElementBorder px-1 outline-none focus:border-panelActive"
          @focus="isFocused = true"
        />
        <wButton class="w-14" button-label="Clear" :button-click="hideAll" />
        <wButton
          class="w-14"
          button-label="Reset"
          :button-click="() => timePlotRef?.reset_x_axis()"
        />
      </div>

      <!-- Signal palette -->
      <div
        v-if="isDropdownVisible"
        class="absolute left-0 right-0 top-6 z-30 max-h-64 overflow-auto border border-simElementBorder bg-panelContentBackground shadow-lg"
      >
        <div
          class="sticky top-0 z-10 flex min-h-6 bg-panelHeaderBackground justify-between items-center px-1 border-b border-simElementBorder"
        >
          <div class="min-w-0 truncate">
            <span v-if="plotComposer" class="text-simActiveButton">
              ADD SERIES · {{ plotSelection.size }} SELECTED
            </span>
            <span v-else class="text-simActiveButton">
              {{ searchResults.length }} /
              <span class="text-secondary">{{ totalVariablesCount }}</span>
            </span>
          </div>
          <button class="px-1 text-secondary" @click="closePalette">×</button>
        </div>

        <div
          v-for="item in paletteSearchResults"
          :key="item.id"
          class="flex min-h-7 items-center gap-1 px-1 hover:bg-simInputBackground"
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-secondary">
              {{ `${item.label} ${item.unit ? `(${item.unit})` : ''}` }}
            </div>
            <div class="truncate text-secondary opacity-60">{{ item.group }}</div>
          </div>
          <div class="grid w-[6.25rem] shrink-0 grid-cols-2 gap-1">
            <wButton
              v-if="plotComposer"
              class="col-span-2 h-5 w-full"
              button-label="Series"
              :button-state="plotSelection.has(item.id.toLowerCase())"
              :button-click="() => togglePlotSelection(item.id)"
            />
            <template v-else>
              <wButton
                class="h-5 w-full"
                button-label="Value"
                :button-state="visibleItems.has(item.id.toLowerCase())"
                :button-click="() => toggleDataView(item)"
              />
              <wButton
                v-if="item.type === 'number'"
                class="h-5 w-full"
                button-label="Plot"
                :button-click="() => plot(item.id)"
              />
            </template>
          </div>
        </div>

        <div v-if="paletteSearchResults.length === 0" class="p-3 text-center text-secondary">
          No matching signals
        </div>

        <div
          v-if="plotComposer"
          class="sticky bottom-0 flex min-h-7 items-center gap-1 border-t border-simElementBorder bg-panelHeaderBackground px-1"
        >
          <span
            class="min-w-0 flex-1 truncate"
            :class="plotSelectionUnits.length > 1 ? 'text-panelActive' : 'text-secondary'"
          >
            {{
              plotSelectionUnits.length > 1
                ? `! MIXED UNITS: ${plotSelectionUnits.join(', ')}`
                : plotSelectionUnits[0] || 'SELECT SERIES'
            }}
          </span>
          <wButton class="h-5 w-14" button-label="Cancel" :button-click="closePalette" />
          <wButton
            class="h-5 w-14"
            :button-label="`Apply ${plotSelection.size}`"
            :button-state="plotSelection.size > 0"
            :button-click="applyPlotSelection"
          />
        </div>
      </div>

      <!-- Visible Items Table -->
      <table v-if="displayedItems.length" class="flex w-full h-full table-fixed">
        <tbody class="w-full">
          <tr
            class="flex min-h-6 w-full items-center hover:bg-simInputBackground/40"
            v-for="item in displayedItems"
            :key="item.id"
          >
            <td class="min-w-0 flex-1 truncate font-medium">
              {{ `${item.label} ${item.unit ? `(${item.unit})` : ''}` }}
            </td>
            <td class="w-1/4 truncate text-right">{{ item.inputValue }}</td>
            <td class="flex w-24 justify-end gap-1 pl-1">
              <wButton
                v-if="item.type === 'number'"
                class="h-5 w-12"
                button-label="Plot"
                :button-click="() => plot(item.id)"
              />
              <wButton
                class="h-5 w-6"
                button-label="×"
                :button-click="() => setDataView(item, false)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Plot Component -->
    <TimePlot
      ref="timePlotRef"
      :pause="props.plotPause"
      :update_intervals="props.plotUpdateIntervals"
      :sources="props.simProps"
      @edit-plot="openPlotComposer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, PropType } from 'vue'
import Fuse from 'fuse.js'
import { type SimulationProperties } from '../wasm/siminterface'
import TimePlot from './TimePlot.vue'
import wButton from './wButton.vue'

// Props
const props = defineProps({
  simProps: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true,
  },
  plotPause: {
    type: Boolean as PropType<boolean>,
    required: true,
  },
  plotUpdateIntervals: {
    type: Number,
    required: true,
  },
})

// UI state
const searchQuery = ref('')
const isFocused = ref(false)
const displayRoot = ref<HTMLElement | null>(null)
const timePlotRef = ref<InstanceType<typeof TimePlot> | null>(null)
const plotComposer = ref<{ plotId: string; sourceIds: string[] } | null>(null)
const plotSelection = ref(new Set<string>())

// Sets
const visibleItems = reactive(new Set<string>())

// Computed
const displayedItems = computed(() =>
  Array.from(visibleItems)
    .map((id) => props.simProps[id])
    .filter((item): item is SimulationProperties => item != null),
)

const fuse = computed(
  () =>
    new Fuse(Object.values(props.simProps), {
      keys: ['group', 'label', 'id', 'unit'],

      threshold: 0.4,
    }),
)

const searchResults = computed(() => {
  const query = searchQuery.value.trim()
  if (query) return fuse.value.search(query).map((r) => r.item)
  if (isFocused.value) return Object.values(props.simProps)
  return []
})

const paletteSearchResults = computed(() =>
  plotComposer.value
    ? searchResults.value.filter((item) => item.type === 'number')
    : searchResults.value,
)

const plotSelectionUnits = computed(() => [
  ...new Set(
    [...plotSelection.value]
      .map((id) => props.simProps[id]?.unit || 'unitless')
      .filter((unit): unit is string => Boolean(unit)),
  ),
])

const isDropdownVisible = computed(() => isFocused.value)
const totalVariablesCount = computed(() => Object.keys(props.simProps).length)

// Functions
function reset() {
  visibleItems.clear()
  timePlotRef.value?.reset?.()
  searchQuery.value = ''
  isFocused.value = false
}

function setDataView(item: SimulationProperties, state: boolean) {
  if (!item || !item.id) return
  const id = item.id.toLowerCase()
  if (state) {
    visibleItems.add(id)
  } else {
    visibleItems.delete(id)
    // timePlotRef.value?.removePlot(id)
  }
}

function toggleDataView(item: SimulationProperties) {
  const id = item.id.toLowerCase()
  setDataView(item, !visibleItems.has(id))
}

function openPlotComposer(plot: { plotId: string; sourceIds: string[] }) {
  plotComposer.value = plot
  plotSelection.value = new Set(plot.sourceIds.map((id) => id.toLowerCase()))
  searchQuery.value = ''
  isFocused.value = true
}

function togglePlotSelection(id: string) {
  const normalizedId = id.toLowerCase()
  const next = new Set(plotSelection.value)
  if (next.has(normalizedId)) next.delete(normalizedId)
  else next.add(normalizedId)
  plotSelection.value = next
}

function applyPlotSelection() {
  if (!plotComposer.value || plotSelection.value.size === 0) return
  timePlotRef.value?.replacePlot(plotComposer.value.plotId, [...plotSelection.value])
  closePalette()
}

function closePalette() {
  isFocused.value = false
  plotComposer.value = null
  plotSelection.value = new Set()
  searchQuery.value = ''
}

function plot(id: string) {
  timePlotRef.value?.addPlot(id)
}

// function showAll() {
//   Object.keys(props.simProps).forEach((key) => visibleItems.add(key))
// }

function hideAll() {
  visibleItems.clear()
  timePlotRef.value?.reset?.()
}

// Externally callable method
function setPlotView(item: SimulationProperties | SimulationProperties[], state: boolean) {
  if (!item) return

  // normalize to array
  const items = Array.isArray(item) ? item : [item]

  // collect valid ids
  const ids = items.filter((v) => v?.id).map((v) => v.id.toLowerCase())

  if (ids.length === 0) {
    return
  }

  if (state) {
    // supports:
    // addPlot("a")
    // addPlot("a", "b")
    // addPlot("a", "b", "c")
    timePlotRef.value?.addPlot(...ids)
  } else {
    // removePlot expects plotId
    // plotId format = ids joined with "|"
    timePlotRef.value?.removePlot(ids.join('|'))
  }
}

function tickPlot() {
  timePlotRef.value?.tick()
}

function handleClickOutside(e: MouseEvent) {
  if (displayRoot.value && !displayRoot.value.contains(e.target as Node)) {
    closePalette()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Expose to parent
defineExpose({
  reset,
  // showAll,
  hideAll,
  tickPlot,
  setDataView,
  setPlotView,
})
</script>

<style scoped>
.bg-green-100 {
  transition: background-color 0.3s ease;
}
</style>
