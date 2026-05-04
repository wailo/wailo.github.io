<template>
  <div
    v-for="name in getPlottableKeys"
    :key="name"
    class="relative w-full min-h-0 flex-1 border-b border-simElementBorder last:border-b-0"
  >
    <!-- Top Overlay Bar -->
    <div class="absolute top-1 left-1 right-1 z-10 flex items-start justify-between pointer-events-none">

      <!-- Left: Label -->
      <div class="text-secondary bg-opacity-50 px-2 rounded font-mono text-left pointer-events-auto">
        <span>{{ props.sources[name]?.label || name }}</span>
        <span class="ml-2 inline-block min-w-[80px] text-right">
          {{ props.sources[name]?.inputValue }}
        </span>
        <span class="ml-1">{{ props.sources[name]?.unit || '' }}</span>
      </div>

      <!-- Right: Buttons -->
      <div class="flex gap-1 pointer-events-auto">
        <button
          @click="resetPlot(name)"
          class="border border-simElementBorder bg-opacity-60 text-secondary text-xs px-0.5 py-0.5 rounded hover:bg-simInputBackground"
        >
          ⟲
        </button>

        <button
          @click="removePlot(name)"
          class="border border-simElementBorder bg-opacity-60 text-secondary text-xs px-0.5 py-0.5 rounded hover:bg-simInputBackground"
        >
          ✕
        </button>
      </div>

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
import type { SimulationProperties } from '../wasm/siminterface'

// ✅ Props
const props = defineProps({
  sources: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true
  },
  pause: {
    type: Boolean as PropType<boolean>,
    required: true
  },
  max_duration_ms: {
    type: Number,
    default: 120_000
  },
  max_plots: {
    type: Number,
    default: Math.floor(window.innerHeight / 70)
  },
  update_intervals: {
    type: Number,
    required: true
  }
})

defineExpose({ addPlot, removePlot, reset, reset_x_axis, tick })

// ✅ Reactive State
const plotRefs = reactive<Record<string, HTMLElement>>({})
const plots = new Map<string, uPlot>()
const dataBuffers = new Map<string, CircularBuffer>()
const selectedKeys = ref<Set<string>>(new Set())
let MAX_POINTS = 0
let plotResizeObserver: ResizeObserver | null = null
const renderBuffers = new Map<string, Float64Array>()
const xBuffers = new Map<string, Int32Array>() // ✅ per-buffer X

function getStrokeColor() {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-secondary')
    .trim()

  return `rgb(${val})`
}


// ✅ Derived Keys
const getPlottableKeys = computed(() =>
  Array.from(selectedKeys.value)
    .filter(k => k in props.sources)
    .slice(0, props.max_plots)
)

interface CircularBuffer {
  y: Float64Array
  index: number // ✅ per-buffer index
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
  renderBuffers.delete(propId)
  xBuffers.delete(propId)

  recreateAllPlots()
}

function resetPlot(propId: string) {
  let databuffer = dataBuffers.get(propId)
  if (!databuffer) return

  databuffer.y.fill(0)
  databuffer.index = 0
}

// ✅ Recreate plots
async function recreateAllPlots() {
  plots.forEach(p => p.destroy())

  if (plotResizeObserver) {
    plotResizeObserver.disconnect()
    plotResizeObserver = null
  }

  plots.clear()
  await nextTick()

  getPlottableKeys.value.forEach(id => {
    const el = plotRefs[id]
    if (!el) return

    const plot = new uPlot({
      legend: { show: false },
      width: el.offsetWidth,
      height: el.offsetHeight,
      padding: [25,1,5,1],
      scales: {
        x: {
          time: false,
          range: (_self) => {
            const buf = dataBuffers.get(id)
            if (!buf) return [0, MAX_POINTS]
            return [buf.index - MAX_POINTS, buf.index]
          }
        },
        y: { auto: true }
      },
      axes: [
        {
          show: false,
          stroke: getStrokeColor(),
          border: { show: true, stroke: getStrokeColor() },
          grid: { show: false },
          values: (_self, ticks) =>
            ticks.map(i => (i / (1000 / props.update_intervals)).toFixed(1))
        },
        {
          show: true,
          stroke: getStrokeColor(),
          border: { show: true, stroke: getStrokeColor() },
          grid: { show: false },
          ticks: { show: true },
          font: '8px monospace',
          gap: 0,
          labelGap: 0,
          lineGap: 0,
        }
      ],
      series: [
        { show: false },
        { stroke: getStrokeColor(), width: 1, points: { show: false } }
      ]
    }, [[], []], el)

    plots.set(id, plot)
  })

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

// ✅ Init buffer
function initBuffer(name: string) {
  if (!dataBuffers.has(name)) {
    dataBuffers.set(name, {
      y: new Float64Array(MAX_POINTS),
      index: 0 // ✅ init per-buffer index
    })

    renderBuffers.set(name, new Float64Array(MAX_POINTS))
    xBuffers.set(name, new Int32Array(MAX_POINTS))
  }
}

// ✅ Tick
function tick() {
  if (props.pause || getPlottableKeys.value.length < 1) return

  getPlottableKeys.value.forEach(propId => {
    const buf = dataBuffers.get(propId)!
    const writeIndex = buf.index % MAX_POINTS

    buf.y[writeIndex] = Number(props.sources[propId]?.inputValue)
    buf.index++

    updatePlot(propId, buf)
  })
}

function updatePlot(name: string, buf: CircularBuffer) {
  const u = plots.get(name)
  const renderBuf = renderBuffers.get(name)
  const xBuf = xBuffers.get(name)

  if (!u || !renderBuf || !xBuf) return

  const len = Math.min(buf.index, MAX_POINTS)
  const start = buf.index >= MAX_POINTS
    ? buf.index % MAX_POINTS
    : 0

  // ✅ build X buffer (per plot)
  const base = buf.index - len
  for (let i = 0; i < len; i++) {
    xBuf[i] = base + i
  }

  // ✅ same fast circular reorder
  if (buf.index >= MAX_POINTS) {
    const tailLen = MAX_POINTS - start

    renderBuf.set(buf.y.subarray(start), 0)
    renderBuf.set(buf.y.subarray(0, start), tailLen)
  } else {
    renderBuf.set(buf.y.subarray(0, len), 0)
  }

  u.setData([
    xBuf.subarray(0, len),
    renderBuf.subarray(0, len)
  ])
}

// ✅ Reset
function reset() {
  plots.forEach(p => p.destroy())
  plots.clear()
  selectedKeys.value.clear()
  dataBuffers.clear()
  renderBuffers.clear()
  xBuffers.clear()
}

function reset_x_axis() {
  dataBuffers.forEach(v => {
    v.y.fill(0)
    v.index = 0
  })
}

// ✅ Lifecycle
onMounted(() => {
  MAX_POINTS = Math.ceil(props.max_duration_ms / props.update_intervals)
  window.addEventListener('theme-change', recreateAllPlots)
})

onBeforeUnmount(() => {
  plots.forEach(p => p.destroy())
  plotResizeObserver?.disconnect()
  window.removeEventListener('theme-change', recreateAllPlots)
})
</script>

<style scoped>
.uplot {
  background-color: transparent;
}
</style>
