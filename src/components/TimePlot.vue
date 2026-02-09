<template>
<div
  v-for="name in getPlottableKeys"
  :key="name"
  class="relative w-full min-h-0 flex-1 border-b border-simElementBorder last:border-b-0"
>
  <!-- Close Button -->
  <button
    @click="removePlot(name)"
    class="absolute top-1 right-1 z-10 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded hover:bg-red-600"
  >
    ✕
  </button>

  <!-- Custom Label Top-Right -->
  <div class="absolute top-1 right-7 z-10 text-scondary bg-opacity-50 px-2 py-0.5 rounded">
    {{ props.sources[name]?.label || name }} {{ props.sources[name]?.unit || '' }}
  </div>

  <!-- uPlot Container -->
  <div
    :ref="el => { if (el) plotRefs[name] = el as HTMLElement }"
    class="w-full h-full"
  />
</div>
</template>


<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  PropType
} from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { SimulationProperties } from '../siminterfac'

// ✅ Props
const props = defineProps({
  sources: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true
  },
  pause: {
    type: Boolean as PropType<Boolean>,
    required: true
    },
  max_duration_ms: {
    type: Number,
    default: 120_000
  },
  max_plots: {
    type: Number,
    default: 4
  },
  update_intervals: {
    type: Number,
    required: true
  }
})

defineExpose({ addPlot, removePlot, reset, tick })

// ✅ Reactive State
const plotRefs = reactive<Record<string, HTMLElement>>({})
const plots = new Map<string, uPlot>()
const dataBuffers = new Map<string, CircularBuffer>()
const selectedKeys = ref<Set<string>>(new Set())
let MAX_POINTS = 0
let plotResizeObserver: ResizeObserver | null = null

// ✅ Derived Keys
const getPlottableKeys = computed(() =>
  Array.from(selectedKeys.value)
    .filter(k => k in props.sources)
    .slice(0, props.max_plots)
)

interface CircularBuffer {
  x: Float64Array
  y: Float64Array
  index: number
  full: boolean
}

function addPlot(propId: keyof typeof props.sources) {
  if (!props.sources[propId]) return
  if (selectedKeys.value.has(propId)) return
  if (selectedKeys.value.size >= props.max_plots) return

  selectedKeys.value.add(propId)
  initBuffer(propId)

    setTimeout(() => {
    recreateAllPlots()
  }, 50)
}

function removePlot(propId: string) {
  if (!selectedKeys.value.has(propId)) return

  selectedKeys.value.delete(propId)
  recreateAllPlots()
}

// ✅ Recreate all plots from scratch
async function recreateAllPlots() {
  // Destroy existing plots
  plots.forEach(p => p.destroy())
  // remove all resize observers
  if (plotResizeObserver) {
    plotResizeObserver.disconnect()
    plotResizeObserver = null
  }

  plots.clear()
  await nextTick()

  getPlottableKeys.value.forEach(id => {
    const el = plotRefs[id]
    // const prop = props.sources[id]
    // const prop_label = prop?.label || id
    // const prop_unit = prop?.unit || ''
    // const prop_min = prop.min
    // const prop_max = prop.max

    if (!el) return

    const plot = new uPlot({
      legend: { show: false },
      width: el.offsetWidth,
      height: el.offsetHeight,
      scales: {
        x: { time: false, range: () => [0, MAX_POINTS - 1] },
        y: { auto: true }
      },
      axes: [
        { show: false, grid: { show: false, stroke: '#333', width: 1 } },
        { stroke: 'white', grid: { show: false, stroke: '#333', width: 1 }}
      ],
      series: [
        { show: false },
        { stroke: 'grey', width: 1, points: { show: false }}
      ]
    }, [[], []], el)

    plots.set(id, plot)
  })

  // Re-add resize observer
    plotResizeObserver = new ResizeObserver(() => {
    plots.forEach((plot, id) => {
      const el = plotRefs[id]
      if (el) {
        plot.setSize({ width: el.offsetWidth, height: el.offsetHeight })
      }
    })
  })

  const parentEl = Object.values(plotRefs)[0]?.parentElement
  if (parentEl) {
    plotResizeObserver.observe(parentEl)
  }
}

// ✅ Init buffer if needed
function initBuffer(name: string) {
  if (!dataBuffers.has(name)) {
    dataBuffers.set(name, {
      x: new Float64Array(MAX_POINTS),
      y: new Float64Array(MAX_POINTS),
      index: 0,
      full: false
    })
  }
}

// ✅ Tick
function tick() {
  if (props.pause || getPlottableKeys.value.length < 1) return

  getPlottableKeys.value.forEach(propId => {
    const buf = dataBuffers.get(propId)!
    buf.y[buf.index] = props.sources[propId].inputValue || 0
    buf.index = (buf.index + 1) % MAX_POINTS
    if (buf.index === 0) buf.full = true
    updatePlot(propId, buf)
  })
}

function updatePlot(name: string, buf: CircularBuffer) {
  const u = plots.get(name)
  if (!u) return

  let dataX: number[], dataY: number[]

  if (!buf.full) {
    dataY = Array.from(buf.y.slice(0, buf.index))
    dataX = dataY.map((_, i) => i)
  } else {
    dataY = Array.from(buf.y.slice(buf.index)).concat(Array.from(buf.y.slice(0, buf.index)))
    dataX = dataY.map((_, i) => i)
  }

  u.setData([dataX, dataY])
}

// ✅ Reset data
function reset() {
  plots.forEach(p => p.destroy())
  plots.clear()
  selectedKeys.value.clear()
  dataBuffers.clear()
}

// ✅ On Mount
onMounted(() => {
  MAX_POINTS = Math.ceil(props.max_duration_ms / props.update_intervals)
})

onBeforeUnmount(() => {
  plots.forEach(p => p.destroy())
})
</script>

<style scoped>
.uplot {
  background-color: transparent;
}
</style>
