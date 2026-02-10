<template>
  <div class="flex flex-col w-full h-full">
    <div ref="wrapper" class="w-full space-y-2">
      <!-- Input + Buttons Row -->
      <div class="flex gap-2">
        <input v-model="searchQuery" type="text" placeholder="Search..."
          class="w-1/3 border bg-transparent border-simElementBorder p-1" @focus="isFocused = true" />
        <button @click="showAll" class="w-1/3 border text-secondary">
          Show All
        </button>
        <button @click="hideAll" class="w-1/3 border text-secondary">
          Clear
        </button>
      </div>

      <!-- Dropdown -->
      <div v-if="isDropdownVisible" class="border rounded shadow max-h-48 overflow-auto">
        <div class="flex justify-end p-1 border-b">
          <button @click="isFocused = false">✖ Close</button>
        </div>

        <div v-for="item in Object.values(searchResults)" :key="item.id"
          class="cursor-pointer p-1 transition hover:bg-primary flex items-center justify-between"
          @click="setDataView(item, true)">
          <div>
            {{ `${item.label} ${item.unit ? `(${item.unit})` : ''}` }}
          </div>
          <div class="flex gap-2">
            <button disabled class="text-xs hover:font-bold transition text-secondary" :title="`${item.id}`">
              i
            </button>
            <button class="rounded-full text-xs hover:font-bold transition text-secondary" @click.stop="plot(item.id)"
              title="Toggle Plot">
              ⦿
            </button>
          </div>
        </div>
      </div>

      <!-- Visible Items Table -->
      <table class="flex w-full h-full">
        <tbody class="w-full">
          <tr class="flex w-full border-b border-simElementBorder items-center" v-for="item in displayedItems"
            :key="item.id">
            <td class="font-medium w-3/5"> {{ `${item.label} ${item.unit ? `(${item.unit})` : ''}` }}</td>
            <td class="w-1/5">{{ item.inputValue }}</td>
            <td class="w-1/5 text-right flex justify-end items-center gap-2">
              <button disabled class="text-xs hover:font-bold transition text-secondary" :title="`${item.id}`">
                i
              </button>
              <button class="rounded-full text-xs hover:font-bold transition text-secondary" @click="plot(item.id)"
                title="Toggle Plot">
                ⦿
              </button>
              <button @click="setDataView(item, false)" class="hover:text-red-700 transition" title="Remove">
                ⅹ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Plot Component -->
    <TimePlot ref="timePlotRef" :pause="props.plotPause" :update_intervals="props.plotUpdateIntervals"
      :sources="props.simProps" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, PropType } from 'vue'
import Fuse from 'fuse.js'
import type { SimulationProperties } from '../siminterfac'
import TimePlot from './TimePlot.vue'

// Props
const props = defineProps({
  simProps: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true
  },
  plotPause: {
    type: Boolean as PropType<Boolean>,
    required: true
  },
  plotUpdateIntervals: {
    type: Number,
    required: true
  }
})

// UI state
const searchQuery = ref('')
const isFocused = ref(false)
const wrapper = ref<HTMLElement | null>(null)
const timePlotRef = ref<InstanceType<typeof TimePlot> | null>(null)

// Sets
const visibleItems = reactive(new Set<string>())

// Computed
const displayedItems = computed(() =>
  Array.from(visibleItems).map((id) => props.simProps[id])
)

const fuse = computed(() => new Fuse(Object.values(props.simProps), {
  keys: ['group', 'label'],

  threshold: 0.4
}))

const searchResults = computed(() => {
  const query = searchQuery.value.trim()
  if (query) return fuse.value.search(query).map((r) => r.item)
  if (isFocused.value) return Object.values(props.simProps)
  return []
})

const isDropdownVisible = computed(() => isFocused.value && searchResults.value.length > 0)

// Functions
function reset() {
  visibleItems.clear()
  timePlotRef.value?.reset?.()
  searchQuery.value = ''
  isFocused.value = false
}

function setDataView(item: SimulationProperties, state: boolean) {
  if (!item || !item.id) return
  const id = item.id.toLowerCase();
  if (state) {
    visibleItems.add(id)
    searchQuery.value = ''
    isFocused.value = false
  } else {
    visibleItems.delete(id)
    // timePlotRef.value?.removePlot(id)
  }
}

function plot(id: string) {
  timePlotRef.value?.addPlot(id)
}

function showAll() {
  Object.keys(props.simProps).forEach((key) => visibleItems.add(key))
}

function hideAll() {
  visibleItems.clear()
  timePlotRef.value?.reset?.()
}


// Externally callable method
function setPlotView(item: SimulationProperties, state: boolean) {
  if (!item || !item.id) return
  const id = item.id.toLowerCase();
  if (state) {
    timePlotRef.value?.addPlot(id)
  } else {
    timePlotRef.value?.removePlot(id)
  }
}

function tickPlot() {
  timePlotRef.value?.tick()
}

function handleClickOutside(e: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(e.target as Node)) {
    isFocused.value = false
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
  showAll,
  hideAll,
  tickPlot,
  setDataView,
  setPlotView
})
</script>

<style scoped>
.bg-green-100 {
  transition: background-color 0.3s ease;
}
</style>
