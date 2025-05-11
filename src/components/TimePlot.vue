<template>
  <div class="w-full h-full grid overflow-none" :style="{ gridTemplateRows: gridRows }">
    <div
      v-for="(source, idx) in props.sources.slice(0, MAX_PLOTS)"
      :key="source.name"
      :ref="el => plotRefs[idx] = el as HTMLElement"
      class="w-full h-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, type Ref, computed } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

interface SourceVar {
  name: string
  ref: Ref<number>
}

const props = defineProps<{
  sources: SourceVar[]
  pause: boolean
}>()

// ❗ Public methods
defineExpose({ reset })

// Configuration
const MAX_DURATION = 2 * 60 * 1000  // 2 minutes
const PLOT_INTERVAL = 1000          // in ms
const MAX_POINTS = Math.ceil(MAX_DURATION / PLOT_INTERVAL)
const MAX_PLOTS = 3                // ✅ limit to 4 plots max

// Types
interface CircularBuffer {
  x: Float64Array
  y: Float64Array
  index: number
  full: boolean
}

// State
const dataBuffers = new Map<string, CircularBuffer>()
const plots = new Map<string, uPlot>()
const plotRefs = ref<HTMLElement[]>([])

const gridRows = computed(() => `repeat(${Math.min(props.sources.length, MAX_PLOTS)}, 1fr)`)

// Lifecycle
onMounted(async () => {
  props.sources.slice(0, MAX_PLOTS).forEach(source => {
    dataBuffers.set(source.name, {
      x: new Float64Array(MAX_POINTS),
      y: new Float64Array(MAX_POINTS),
      index: 0,
      full: false,
    })
  })

  await nextTick()
  createPlots()

  intervalId = setInterval(() => {
    if (props.pause || props.sources.length < 1) return

    props.sources.slice(0, MAX_PLOTS).forEach(source => {
      const value = source.ref.value
      const buf = dataBuffers.get(source.name)!
      buf.y[buf.index] = value
      buf.index = (buf.index + 1) % MAX_POINTS
      if (buf.index === 0) buf.full = true
      updatePlot(source.name, buf)
    })
  }, PLOT_INTERVAL)
})

function createPlots() {
  props.sources.slice(0, MAX_PLOTS).forEach((source, idx) => {
    const el = plotRefs.value[idx]
    if (!el) return

    const options: uPlot.Options = {
      legend: { show: false },
      width: el.offsetWidth,
      height: el.offsetHeight,
      scales: {
        x: {
          time: false,
          range: () => [0, MAX_POINTS - 1] // ✅ fixed X range
        },
        y: {
          auto: true,
        },
      },
      axes: [
        { show: false }, // ❌ no X axis
        {
          label: source.name,
          stroke: 'white',
          grid: { show: false },
        },
      ],
      series: [
        { show: false }, // X series
        {
          stroke: 'red',
          width: 1,
          points: { show: false }, // ❌ no dots
        },
      ],
      hooks: {
        ready: [
          (u) => {
            const resizeObserver = new ResizeObserver(() => {
              u.setSize({
                width: el.clientWidth,
                height: el.clientHeight,
              })
            })
            resizeObserver.observe(el)
          }
        ]
      },
    }

    const plot = new uPlot(options, [[], []], el)
    plots.set(source.name, plot)
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

function reset() {
  props.sources.slice(0, MAX_PLOTS).forEach(source => {
    const buf = dataBuffers.get(source.name)
    if (buf) {
      buf.index = 0
      buf.full = false
      buf.x.fill(0)
      buf.y.fill(0)
    }
    plots.get(source.name)?.setData([[], []])
  })
}

let intervalId: ReturnType<typeof setInterval> | null = null

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
  plots.forEach(p => p.destroy())
})
</script>

<style scoped>
.uplot {
  background-color: transparent;
}
</style>
