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

    <!-- Custom Label Top-Right (FIXED) -->
    <div class="absolute top-1 right-7 z-10 text-secondary bg-opacity-50 px-2 py-0.5 rounded 
                w-64 font-mono text-right">
      {{ props.sources[name]?.label || name }} 
      <span class="inline-block w-24 text-right">{{ props.sources[name]?.inputValue }}</span>
      {{ props.sources[name]?.unit || '' }}
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
  // Number of plots is calculated based on window height if not provided
  max_plots: {
    type: Number,
    default: Math.floor(window.innerHeight / 70)
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
let globalIndex = 0
let plotResizeObserver: ResizeObserver | null = null
let globalXBuffer :Int32Array;
const renderBuffers = new Map<string, Float64Array>()

// ✅ Derived Keys
const getPlottableKeys = computed(() =>
  Array.from(selectedKeys.value)
    .filter(k => k in props.sources)
    .slice(0, props.max_plots)
)

interface CircularBuffer {
  // x: Float64Array
  y: Float64Array
  // index: number
  // full: boolean
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
  dataBuffers.delete(propId)
  renderBuffers.delete(propId);
  recreateAllPlots()
  if (dataBuffers.size === 0) {
    globalIndex = 0
  }
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

        { show: true, stroke: 'white', border :{show: true, stroke: 'grey'}, grid: { show: false, stroke: '#333', width: 1 },
          values: (_self, ticks) => ticks.map(i => (i / (1000/props.update_intervals)).toFixed(1)), },
        { show: true, stroke: 'white', border :{show: true, stroke: 'grey'}, grid: { show: false, stroke: '#333', width: 1 },
        ticks: {show: true, stroke: "rgba(1,0,0,1)" }}],
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
      // x: new Float64Array(MAX_POINTS),
      y: new Float64Array(MAX_POINTS),
      // index: globalIndex,
      // full: false
    })
  // Create global X buffer once
   globalXBuffer = new Int32Array(MAX_POINTS)
  for (let i = 0; i < MAX_POINTS; i++) {
    globalXBuffer[i] = i
  }
     // ✅ Pre-allocate the render buffer too
    renderBuffers.set(name, new Float64Array(MAX_POINTS))
  }
 // dataX = [...Array(MAX_POINTS).keys()]
}

// ✅ Tick
function tick() {
  if (props.pause || getPlottableKeys.value.length < 1) return

  const writeIndex = globalIndex % MAX_POINTS

  getPlottableKeys.value.forEach(propId => {
    const buf = dataBuffers.get(propId)!
    buf.y[writeIndex] = Number(props.sources[propId]?.inputValue)
  })

  globalIndex++
  getPlottableKeys.value.forEach(propId => {
    updatePlot(propId, dataBuffers.get(propId)!)
  })
}

function updatePlot(name: string, buf: CircularBuffer) {
  const u = plots.get(name)
  const renderBuf = renderBuffers.get(name)
  if (!u || !renderBuf) return

  const len = Math.min(globalIndex, MAX_POINTS)
  const start = globalIndex >= MAX_POINTS
    ? globalIndex % MAX_POINTS
    : 0

  if (globalIndex >= MAX_POINTS) {
    const tailLen = MAX_POINTS - start

    // oldest → end
    renderBuf.set(buf.y.subarray(start), 0)

    // beginning → newest
    renderBuf.set(buf.y.subarray(0, start), tailLen)
  } else {
    renderBuf.set(buf.y.subarray(0, len), 0)
  }

  u.setData([
    globalXBuffer.subarray(0, len),
    renderBuf.subarray(0, len)
  ])
}

// ✅ Reset data
function reset() {
  plots.forEach(p => p.destroy())
  plots.clear()
  selectedKeys.value.clear()
  dataBuffers.clear()
  globalIndex = 0
}

// ✅ On Mount
onMounted(() => {
  MAX_POINTS = Math.ceil(props.max_duration_ms / props.update_intervals)
})

onBeforeUnmount(() => {
  plots.forEach(p => p.destroy())
  plotResizeObserver?.disconnect()
})
</script>

<style scoped>
.uplot {
  background-color: transparent;
}
</style>
