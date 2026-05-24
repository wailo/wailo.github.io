<template>
  <div
    v-for="plot in plotList"
    :key="plot.id"
    class="relative w-full min-h-0 flex-1 border-b border-simElementBorder last:border-b-0"
  >
    <!-- Overlay -->
    <div
      class="absolute top-1 left-2 right-1 z-10 flex items-start justify-between pointer-events-none"
    >
      <!-- Labels -->
      <div class="flex flex-col gap-0.5 pointer-events-auto">
        <div
          v-for="sourceId in plot.sourceIds"
          :key="sourceId"
          class="text-secondary bg-opacity-50 px-2 rounded font-mono text-left"
        >
          <span>
            <!-- {{ props.sources[sourceId]?.label || sourceId }} -->
          </span>

          <span class="ml-2 inline-block min-w-[80px] text-right">
            <!-- {{ props.sources[sourceId]?.inputValue }} -->
          </span>

          <span class="ml-1">
            <!-- {{ props.sources[sourceId]?.unit || '' }} -->
          </span>
        </div>
      </div>

      <!-- Buttons -->
      <div class="flex gap-1 pointer-events-auto">
        <button
          @click="resetPlot(plot.id)"
          class="border border-simElementBorder bg-opacity-60 text-secondary text-xs px-0.5 py-0.5 rounded hover:bg-simInputBackground"
        >
          ⟲
        </button>

        <button
          @click="removePlot(plot.id)"
          class="border border-simElementBorder bg-opacity-60 text-secondary text-xs px-0.5 py-0.5 rounded hover:bg-simInputBackground"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Plot -->
    <div
      :ref="
        (el) => {
          if (el) plotRefs[plot.id] = el as HTMLElement
        }
      "
      class="w-full h-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, PropType } from 'vue'

import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'

import type { SimulationProperties } from '../wasm/siminterface'

// -------------------------------------------------------------------------------------------------
// TYPES
// -------------------------------------------------------------------------------------------------

interface PlotDefinition {
  id: string
  sourceIds: string[]
}

interface CircularBuffer {
  y: Float64Array
  index: number
}

// -------------------------------------------------------------------------------------------------
// PROPS
// -------------------------------------------------------------------------------------------------

const props = defineProps({
  sources: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true,
  },

  pause: {
    type: Boolean,
    required: true,
  },

  max_duration_ms: {
    type: Number,
    default: 120_000,
  },

  max_plots: {
    type: Number,
    default: Math.floor(window.innerHeight / 70),
  },

  update_intervals: {
    type: Number,
    required: true,
  },
})

defineExpose({
  addPlot,
  removePlot,
  reset,
  reset_x_axis,
  tick,
})

// -------------------------------------------------------------------------------------------------
// STATE
// -------------------------------------------------------------------------------------------------

const plotRefs = reactive<Record<string, HTMLElement>>({})

const plots = new Map<string, uPlot>()

const plotDefinitions = ref<PlotDefinition[]>([])

const dataBuffers = new Map<string, CircularBuffer>()

const renderBuffers = new Map<string, Float64Array>()

const xBuffers = new Map<string, Int32Array>()

let MAX_POINTS = 0

let plotResizeObserver: ResizeObserver | null = null

// -------------------------------------------------------------------------------------------------
// COMPUTED
// -------------------------------------------------------------------------------------------------

const plotList = computed(() => plotDefinitions.value.slice(0, props.max_plots))

// -------------------------------------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------------------------------------

function getStrokeColor(index: number) {
  const palette = [
    '--color-secondary',
    '#f87171', // red-400
    '#60a5fa', // blue-400
    '#34d399', // green-400
  ]

  const cssVar = palette[index % palette.length]

  const val = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()

  if (!val) {
    return `${cssVar}`
  } else {
    return `rgb(${val})`
  }
}

function createPlotId(sourceIds: string[]) {
  return sourceIds.join('|')
}

// -------------------------------------------------------------------------------------------------
// PUBLIC API
// -------------------------------------------------------------------------------------------------

// ✅ addPlot('a')
// ✅ addPlot('a', 'b')
// ✅ addPlot('a', 'b', 'c')
function addPlot(...sourceIds: string[]) {
  const filtered = sourceIds.filter((id) => props.sources[id])

  if (filtered.length === 0) {
    return
  }

  const plotId = createPlotId(filtered)

  const exists = plotDefinitions.value.some((p) => p.id === plotId)

  if (exists) {
    return
  }

  if (plotDefinitions.value.length >= props.max_plots) {
    return
  }

  // init all buffers
  filtered.forEach(initBuffer)

  plotDefinitions.value.push({
    id: plotId,
    sourceIds: filtered,
  })

  setTimeout(() => {
    recreateAllPlots()
  }, 50)
}

function removePlot(plotId: string) {
  plotDefinitions.value = plotDefinitions.value.filter((p) => p.id !== plotId)

  const plot = plots.get(plotId)

  if (plot) {
    plot.destroy()
    plots.delete(plotId)
  }

  recreateAllPlots()
}

function resetPlot(plotId: string) {
  const plotDef = plotDefinitions.value.find((p) => p.id === plotId)

  if (!plotDef) {
    return
  }

  plotDef.sourceIds.forEach((sourceId) => {
    const buf = dataBuffers.get(sourceId)

    if (!buf) return

    buf.y.fill(0)
    buf.index = 0
  })
}

// -------------------------------------------------------------------------------------------------
// PLOT CREATION
// -------------------------------------------------------------------------------------------------

async function recreateAllPlots() {
  plots.forEach((p) => p.destroy())
  plots.clear()

  if (plotResizeObserver) {
    plotResizeObserver.disconnect()
    plotResizeObserver = null
  }

  await nextTick()

  plotList.value.forEach((plotDef) => {
    const el = plotRefs[plotDef.id]

    if (!el) return

    const series: uPlot.Series[] = [
      {
        show: false,
        label: 'Time', // Empty label
      },
    ]

    // dynamic series
    plotDef.sourceIds.forEach((_, i) => {
      series.push({
        stroke: plotDef.sourceIds.length > 1 ? getStrokeColor(i + 1) : getStrokeColor(0),
        width: 1,
        points: {
          show: false,
        },
        dash: i === 0 ? undefined : [10, 5],
        label: `${props.sources[plotDef.sourceIds[i]]?.label} [${props.sources[plotDef.sourceIds[i]]?.unit || ''}]`,
        value: (self, val, seriesIdx, dataIdx) => {
          // When not hovering, dataIdx is null
          if (dataIdx == null) {
            const seriesData = self.data[seriesIdx]
            const lastVal = seriesData[seriesData.length - 1]
            return lastVal != null ? lastVal : '--'
          }
          // Standard behavior when hovering
          return val
        },
      })
    })

    const data: uPlot.AlignedData = [[]]

    plotDef.sourceIds.forEach(() => {
      data.push([])
    })

    const plot = new uPlot(
      {
        legend: {
          show: true,
        },

        width: el.offsetWidth,
        height: el.offsetHeight,

        padding: [25, 1, 5, 1],

        scales: {
          x: {
            time: false,

            range: () => {
              const first = dataBuffers.get(plotDef.sourceIds[0])

              if (!first) {
                return [0, MAX_POINTS]
              }

              return [first.index - MAX_POINTS, first.index]
            },
          },

          y: {
            auto: true,
          },
        },

        axes: [
          {
            show: false,

            stroke: getStrokeColor(0),

            border: {
              show: true,
              stroke: getStrokeColor(0),
            },

            grid: {
              show: false,
            },

            values: (_self, ticks) =>
              ticks.map((i) => (i / (1000 / props.update_intervals)).toFixed(1)),
          },

          {
            show: true,

            stroke: getStrokeColor(0),

            border: {
              show: true,
              stroke: getStrokeColor(0),
            },

            grid: {
              show: false,
            },

            ticks: {
              show: true,
            },

            font: '8px monospace',

            gap: 0,
            labelGap: 0,
            lineGap: 0,
          },
        ],

        series,
      },
      data,
      el,
    )

    plots.set(plotDef.id, plot)
  })

  plotResizeObserver = new ResizeObserver(() => {
    plots.forEach((plot, id) => {
      const el = plotRefs[id]

      if (!el) return

      plot.setSize({
        width: el.offsetWidth,
        height: el.offsetHeight,
      })
    })
  })

  const parentEl = Object.values(plotRefs)[0]?.parentElement

  if (parentEl) {
    plotResizeObserver.observe(parentEl)
  }
}

// -------------------------------------------------------------------------------------------------
// BUFFERS
// -------------------------------------------------------------------------------------------------

function initBuffer(name: string) {
  if (dataBuffers.has(name)) {
    return
  }

  dataBuffers.set(name, {
    y: new Float64Array(MAX_POINTS),
    index: 0,
  })

  renderBuffers.set(name, new Float64Array(MAX_POINTS))

  xBuffers.set(name, new Int32Array(MAX_POINTS))
}

// -------------------------------------------------------------------------------------------------
// TICK
// -------------------------------------------------------------------------------------------------

function tick() {
  if (props.pause) {
    return
  }

  if (plotList.value.length < 1) {
    return
  }

  // update buffers
  dataBuffers.forEach((buf, sourceId) => {
    const writeIndex = buf.index % MAX_POINTS

    buf.y[writeIndex] = Number(props.sources[sourceId]?.inputValue ?? 0)

    buf.index++
  })

  // render plots
  plotList.value.forEach(updatePlot)
}

// -------------------------------------------------------------------------------------------------
// UPDATE PLOT
// -------------------------------------------------------------------------------------------------

function updatePlot(plotDef: PlotDefinition) {
  const u = plots.get(plotDef.id)

  if (!u) {
    return
  }

  const firstBuf = dataBuffers.get(plotDef.sourceIds[0])

  if (!firstBuf) {
    return
  }

  const len = Math.min(firstBuf.index, MAX_POINTS)

  const start = firstBuf.index >= MAX_POINTS ? firstBuf.index % MAX_POINTS : 0

  const xBuf = xBuffers.get(plotDef.sourceIds[0])

  if (!xBuf) {
    return
  }

  // build X
  const base = firstBuf.index - len

  for (let i = 0; i < len; i++) {
    xBuf[i] = base + i
  }

  const aligned: uPlot.AlignedData = [xBuf.subarray(0, len)]

  // build Y arrays
  plotDef.sourceIds.forEach((sourceId) => {
    const buf = dataBuffers.get(sourceId)
    const render = renderBuffers.get(sourceId)

    if (!buf || !render) {
      // aligned.push([])
      return
    }

    if (buf.index >= MAX_POINTS) {
      const tailLen = MAX_POINTS - start

      render.set(buf.y.subarray(start), 0)

      render.set(buf.y.subarray(0, start), tailLen)
    } else {
      render.set(buf.y.subarray(0, len), 0)
    }

    aligned.push(render.subarray(0, len))
  })

  // ✅ supports any number of Y buffers
  u.setData(aligned)
}

// -------------------------------------------------------------------------------------------------
// RESET
// -------------------------------------------------------------------------------------------------

function reset() {
  plots.forEach((p) => p.destroy())

  plots.clear()

  plotDefinitions.value = []

  dataBuffers.clear()

  renderBuffers.clear()

  xBuffers.clear()
}

function reset_x_axis() {
  dataBuffers.forEach((buf) => {
    buf.y.fill(0)
    buf.index = 0
  })
}

// -------------------------------------------------------------------------------------------------
// LIFECYCLE
// -------------------------------------------------------------------------------------------------

onMounted(() => {
  MAX_POINTS = Math.ceil(props.max_duration_ms / props.update_intervals)

  window.addEventListener('theme-change', recreateAllPlots)
})

onBeforeUnmount(() => {
  plots.forEach((p) => p.destroy())

  plotResizeObserver?.disconnect()

  window.removeEventListener('theme-change', recreateAllPlots)
})
</script>

<style scoped>
.uplot {
  background-color: transparent;
}

/* Target the legend inside your component */
:deep(.u-legend) {
  position: absolute;
  top: 10px;
  left: 50%;
  /* Move the left edge to the middle */
  transform: translateX(-50%);
  /* Pull it back by half its own width */

  font-size: 9px;
  z-index: 10;
  pointer-events: none;

  /* Optional: Ensure the legend items sit in one row */
  display: flex;
  gap: 10px;
}

:deep(.u-legend th),
:deep(.u-legend td) {
  padding: 1px 4px;
}

:deep(.u-marker) {
  width: 10px;
  height: 10px;
}

/* Hides the first row of the legend (the X-series) */
:deep(.u-legend tr:first-child) {
  display: none;
}
</style>
