<script setup lang="ts">
import { computed } from 'vue'
import wButton from './wButton.vue'
import type { AirportApproachView, AirportView } from '../AirportState'
import type { SimulationProperties } from '../wasm/siminterface'

const props = withDefaults(
  defineProps<{
    airport: AirportView | null
    layers?: SimulationProperties[]
  }>(),
  {
    layers: () => [],
  },
)

const emit = defineEmits<{
  (event: 'select-approach', runwayIndex: number, endIndex: number): void
  (event: 'toggle-layer', layer: SimulationProperties): void
  (event: 'set-airport-visible', visible: boolean): void
}>()

const formatCoordinate = (value: number, axis: 'lat' | 'lon') => {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(5)}° ${hemisphere}`
}
const formatDegrees = (value: number, decimals: number) => `${value.toFixed(decimals)}°`
const formatMeters = (value: number) => `${Math.round(value)} m`

// The runway name can be a pair such as 36R/18L; the end already names the
// usable direction, so the row only needs that.
const approachLabel = (approach: AirportApproachView) =>
  `RWY ${approach.endName || approach.runwayName}`

const world = computed(() => props.airport?.world ?? null)
const approaches = computed(() => world.value?.approaches ?? [])
const selectedKey = computed(() => world.value?.selectedKey ?? null)
const hasWorld = computed(() => world.value !== null)
const airportLabel = computed(() => {
  const airport = props.airport
  if (!airport) return ''
  if (airport.airportName && airport.airportName !== airport.airportId) {
    return airport.airportId ? `${airport.airportName} · ${airport.airportId}` : airport.airportName
  }
  return airport.airportId || airport.airportName
})
const datumLabel = computed(() => {
  const datum = world.value?.datum
  if (!datum) return ''
  return `${formatCoordinate(datum.lat, 'lat')} · ${formatCoordinate(datum.lon, 'lon')}`
})

const selectedApproach = computed(
  () => approaches.value.find((approach) => approach.key === selectedKey.value) ?? null,
)
const selectedLabel = computed(() =>
  selectedApproach.value ? approachLabel(selectedApproach.value) : '',
)
const selectedDetails = computed(() => {
  const selected = selectedApproach.value
  if (!selected) return []
  return [
    { label: 'Course', value: `${formatDegrees(selected.courseTrueDeg, 1)} true` },
    { label: 'Glideslope', value: formatDegrees(selected.glideslopeDeg, 2) },
    { label: 'TCH', value: formatMeters(selected.tchM) },
    { label: 'Length', value: formatMeters(selected.lengthM) },
    { label: 'Width', value: formatMeters(selected.widthM) },
    { label: 'Displaced', value: formatMeters(selected.displacedM) },
  ]
})

const airportVisible = computed(() => props.airport?.airportVisible ?? false)
</script>

<template>
  <div class="flex w-full min-w-0 flex-col self-start">
    <div class="flex h-5 min-w-0 items-center gap-1 px-1">
      <wButton
        class="h-5 shrink-0"
        button-label="AIRPORT WORLD"
        :button-state="airportVisible"
        :boolean-status="true"
        :button-click="() => emit('set-airport-visible', !airportVisible)"
      />
      <span
        v-if="hasWorld && airportLabel"
        class="min-w-0 flex-1 truncate text-right font-semibold text-secondary"
        :title="airportLabel"
      >
        {{ airportLabel }}
      </span>
    </div>

    <div v-if="!hasWorld" class="flex h-5 min-w-0 items-center px-1 text-secondary">
      No airport world is loaded.
    </div>

    <template v-else>
      <div
        v-if="datumLabel"
        class="grid h-5 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-1"
      >
        <span class="text-secondary">Datum</span>
        <span class="min-w-0 truncate text-right tabular-nums" :title="datumLabel">
          {{ datumLabel }}
        </span>
      </div>

      <div
        class="flex h-5 min-w-0 items-center justify-between gap-1 border-b border-simElementBorder bg-panelHeaderBackground px-1 font-bold text-secondary"
      >
        <span class="truncate">APPROACHES</span>
        <span class="shrink-0 tabular-nums">{{ approaches.length }}</span>
      </div>
      <div v-if="!approaches.length" class="flex h-5 min-w-0 items-center px-1 text-secondary">
        No approaches published.
      </div>
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] content-start gap-0.5 p-0.5"
      >
        <button
          v-for="approach in approaches"
          :key="approach.key"
          type="button"
          class="flex h-5 min-w-0 items-center justify-center border px-1"
          :class="
            approach.key === selectedKey
              ? 'border-simActiveButton bg-simActiveButton text-primary'
              : 'border-simElementBorder text-secondary hover:bg-simInputBackground'
          "
          :aria-pressed="approach.key === selectedKey"
          :title="`Runway ${approach.runwayName}`"
          @click="emit('select-approach', approach.runwayIndex, approach.endIndex)"
        >
          <span class="truncate">{{ approachLabel(approach) }}</span>
        </button>
      </div>

      <div
        class="flex h-5 min-w-0 items-center justify-between gap-1 border-b border-simElementBorder bg-panelHeaderBackground px-1 font-bold text-secondary"
      >
        <span class="truncate">SELECTED APPROACH</span>
        <span v-if="selectedLabel" class="shrink-0 truncate">{{ selectedLabel }}</span>
      </div>
      <dl v-if="selectedDetails.length" class="grid grid-cols-2 gap-x-2">
        <div
          v-for="detail in selectedDetails"
          :key="detail.label"
          class="flex h-5 min-w-0 items-center justify-between gap-1 px-1"
        >
          <dt class="min-w-0 truncate text-secondary">{{ detail.label }}</dt>
          <dd class="shrink-0 tabular-nums">{{ detail.value }}</dd>
        </div>
      </dl>
      <div v-else class="flex h-5 min-w-0 items-center px-1 text-secondary">
        Select an approach.
      </div>
    </template>

    <div
      class="flex h-5 min-w-0 items-center justify-between gap-1 border-b border-simElementBorder bg-panelHeaderBackground px-1 font-bold text-secondary"
    >
      <span class="truncate">LAYERS</span>
      <span class="shrink-0 tabular-nums">{{ layers.length }}</span>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] content-start gap-0.5 p-0.5">
      <button
        v-for="layer in layers"
        :key="layer.id"
        type="button"
        class="flex h-5 min-w-0 items-center justify-center border px-1"
        :class="
          layer.inputValue
            ? 'border-simActiveButton bg-simActiveButton text-primary'
            : 'border-simElementBorder text-secondary hover:bg-simInputBackground'
        "
        :aria-pressed="Boolean(layer.inputValue)"
        :title="`${layer.label}: ${layer.inputValue ? 'ON' : 'OFF'}`"
        @click="emit('toggle-layer', layer)"
      >
        <span class="truncate">{{ layer.label }}</span>
      </button>
    </div>
  </div>
</template>
