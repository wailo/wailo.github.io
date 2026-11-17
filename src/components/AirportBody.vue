<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ApproachRepositionRequest, AirportView } from '../AirportState'
import type { SimulationProperties } from '../wasm/siminterface'

// ---------------------------------------------------------------------------
// Props / emits
// ---------------------------------------------------------------------------

const props = withDefaults(
  defineProps<{
    airport: AirportView | null
    layers?: SimulationProperties[]
    /** The aircraft's indicated airspeed, used until the speed field is edited. */
    currentSpeedKt?: number
  }>(),
  {
    layers: () => [],
    currentSpeedKt: 0,
  },
)

const emit = defineEmits<{
  (event: 'select-approach', runwayIndex: number, endIndex: number): void
  (event: 'reposition-approach', request: ApproachRepositionRequest): void
  (event: 'toggle-layer', layer: SimulationProperties): void
  (event: 'set-airport-visible', visible: boolean): void
}>()

// ---------------------------------------------------------------------------
// Shared styles: one chip language for every target in the panel
// ---------------------------------------------------------------------------

const CHIP = 'flex h-5 min-w-0 items-center justify-center border px-1'
const CHIP_IDLE = 'border-simElementBorder text-secondary hover:bg-simInputBackground'
const CHIP_ACTIVE = 'border-simActiveButton bg-simActiveButton text-primary'

// A section label, not a panel bar: quiet, ruled, never clickable.
const SECTION =
  'sticky top-0 z-10 flex h-5 min-w-0 items-center justify-between gap-1 border-t border-simElementBorder bg-panelContentBackground px-1 text-[0.6rem] uppercase tracking-[0.14em] text-secondary'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCoordinate = (value: number, axis: 'lat' | 'lon') => {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(5)}° ${hemisphere}`
}
const formatDegrees = (value: number, decimals: number) => `${value.toFixed(decimals)}°`
const formatMeters = (value: number) => `${Math.round(value)} m`
/** The engine can return 361° for runway 01; the panel shows 1°. */
const normaliseDegrees = (value: number) => ((value % 360) + 360) % 360

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const metadata = computed(() => props.airport?.metadata ?? null)
const approaches = computed(() => metadata.value?.approaches ?? [])
const selectedKey = computed(() => metadata.value?.selectedKey ?? null)
const hasWorld = computed(() => metadata.value !== null)
const airportId = computed(() => props.airport?.airportId ?? '')

// Datum: the airport reference point. Displayed in the world-toggle row.
const datumLabel = computed(() => {
  const datum = metadata.value?.datum
  if (!datum) return ''
  return `${formatCoordinate(datum.lat, 'lat')} · ${formatCoordinate(datum.lon, 'lon')}`
})

const selectedApproach = computed(
  () => approaches.value.find((approach) => approach.key === selectedKey.value) ?? null,
)

// Runway ends sort by designator: 06, 09L, 09R, 18, 27, 36R.
const sortedApproaches = computed(() =>
  [...approaches.value].sort((a, b) =>
    a.endName.localeCompare(b.endName, undefined, { numeric: true }),
  ),
)

// Keep a selection at all times: with none, every dot is inert and the panel
// reads as broken. One attempt per airport: if the engine refuses, the panel
// stays usable with explicit clicks instead of retrying on every snapshot.
let autoSelectedAirport: string | null = null

const ensureApproachSelected = () => {
  const meta = metadata.value
  const id = airportId.value
  if (!meta || !id) {
    autoSelectedAirport = null
    return
  }
  if (selectedKey.value || autoSelectedAirport === id) return
  const first = sortedApproaches.value[0]
  if (!first) return
  autoSelectedAirport = id
  emit('select-approach', first.runwayIndex, first.endIndex)
}

// Emitted after mount so the parent is not re-rendered in the middle of a patch.
watch([metadata, selectedKey, airportId], ensureApproachSelected, { flush: 'post' })
onMounted(ensureApproachSelected)

// Reference data for the selected approach. Course, glideslope and TCH head the
// diagram; the rest lives in the runway's tooltip so nothing changes height.
const selectedDetails = computed(() => {
  const selected = selectedApproach.value
  if (!selected) return []
  return [
    {
      label: 'Course',
      value: `${formatDegrees(normaliseDegrees(selected.courseTrueDeg), 1)} true`,
    },
    { label: 'Glideslope', value: formatDegrees(selected.glideslopeDeg, 2) },
    { label: 'TCH', value: formatMeters(selected.tchM) },
    { label: 'Length', value: formatMeters(selected.lengthM) },
    { label: 'Width', value: formatMeters(selected.widthM) },
    { label: 'Displaced', value: formatMeters(selected.displacedM) },
  ]
})

// The muted line above the diagram: course, glideslope and threshold crossing
// height. Kept as one object so the template stays flat.
const approachLine = computed(() => {
  const selected = selectedApproach.value
  if (!selected) return null
  return {
    course: formatDegrees(normaliseDegrees(selected.courseTrueDeg), 1),
    glideslope: formatDegrees(selected.glideslopeDeg, 2),
    tch: formatMeters(selected.tchM),
  }
})

const airportVisible = computed(() => props.airport?.airportVisible ?? false)

// ---------------------------------------------------------------------------
// Placement diagram
//
// The engine takes a distance, a signed lateral offset and a track relative to
// the final course. The panel draws that as a map: the runway at the top, the
// final course down the middle, distance down the left gutter and side across.
// ---------------------------------------------------------------------------

/** The panel presents nautical miles; the engine takes metres. */
const METRES_PER_NM = 1852
/** Intercepts and base turns sit 2 NM abeam the extended centreline. */
const INTERCEPT_OFFSET_NM = 2
/** Distances offered from the threshold. */
const DISTANCES_NM = [3, 6, 9] as const

type PlacementTrack = {
  key: string
  /** Tooltip and feedback wording. */
  description: string
  /** Sign of the lateral offset: negative is left of the centreline. */
  lateralSign: number
  /** Track relative to the final course, in degrees. */
  angleDeg: number
  /**
   * Rotation of the track mark in CSS degrees. A bar has an orientation, not a
   * heading, so the final course is 90° and both base turns are 0°.
   */
  rotation: number
}

// Display order, left to right: the 30° intercept sits inside the 90° base turn.
const TRACKS: PlacementTrack[] = [
  {
    key: 'base-left',
    description: 'left 90° base turn',
    lateralSign: -1,
    angleDeg: 90,
    // Horizontal: the base turn points across the centreline.
    rotation: 0,
  },
  {
    key: 'intercept-left',
    description: 'left 30° intercept',
    lateralSign: -1,
    angleDeg: 30,
    // 30° off a vertical track, and turned in towards the centreline.
    rotation: -60,
  },
  {
    key: 'final',
    description: 'final',
    lateralSign: 0,
    angleDeg: 0,
    rotation: 90,
  },
  {
    key: 'intercept-right',
    description: 'right 30° intercept',
    lateralSign: 1,
    angleDeg: 30,
    rotation: 60,
  },
  {
    key: 'base-right',
    description: 'right 90° base turn',
    lateralSign: 1,
    angleDeg: 90,
    rotation: 0,
  },
]

const canPlace = computed(() => Boolean(selectedApproach.value && airportId.value))

// 3 NM is threshold distance, so only the final works there: an intercept from
// 3 NM crosses the localizer behind the runway.
const trackAvailable = (distanceNm: number, track: PlacementTrack) =>
  distanceNm === 3 ? track.key === 'final' : true

const diagramRows = computed(() =>
  DISTANCES_NM.map((distanceNm) => ({
    distanceNm,
    slots: TRACKS.map((track) => ({
      track,
      available: trackAvailable(distanceNm, track),
      title: `Place at ${distanceNm} NM, ${track.description}${
        selectedApproach.value ? `, RWY ${selectedApproach.value.endName}` : ''
      }`,
    })),
  })),
)

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

// One muted line under the diagram: it never moves, changes height or swaps a
// header. Cleared after 2 s.
const placementFeedback = ref<string | null>(null)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const showFeedback = (text: string) => {
  placementFeedback.value = text
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    placementFeedback.value = null
    feedbackTimer = null
  }, 2000)
}

// ---------------------------------------------------------------------------
// Speed field
// ---------------------------------------------------------------------------

const speedDraft = ref<string | null>(null)
const speedInput = computed({
  get: () => speedDraft.value ?? String(Math.round(props.currentSpeedKt)),
  set: (value: string) => {
    speedDraft.value = value
  },
})
const targetSpeedKt = computed(() => {
  const entered = Number(speedInput.value)
  if (Number.isFinite(entered) && entered > 0) return Math.round(entered)
  return Math.round(props.currentSpeedKt)
})

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const placeOnApproach = (distanceNm: number, track: PlacementTrack) => {
  const approach = selectedApproach.value
  if (!approach || !airportId.value || !trackAvailable(distanceNm, track)) return
  emit('reposition-approach', {
    airportId: airportId.value,
    runwayId: approach.endName,
    distanceM: distanceNm * METRES_PER_NM,
    lateralOffsetM: track.lateralSign * INTERCEPT_OFFSET_NM * METRES_PER_NM,
    headingOffsetDeg: -track.lateralSign * track.angleDeg,
    targetSpeedKt: targetSpeedKt.value,
  })
  showFeedback(`${distanceNm} NM ${track.description} · ${targetSpeedKt.value} kt`)
}

// The threshold: 0 NM, inline with the final course, and stopped. The SPD field
// keeps its own value, so a following 3/6/9 NM placement still has a speed.
const placeAtThreshold = () => {
  const approach = selectedApproach.value
  if (!approach || !airportId.value) return
  emit('reposition-approach', {
    airportId: airportId.value,
    runwayId: approach.endName,
    distanceM: 0,
    lateralOffsetM: 0,
    headingOffsetDeg: 0,
    targetSpeedKt: 0,
  })
  showFeedback('0 NM threshold · 0 kt')
}
</script>

<template>
  <div class="flex w-full min-w-0 flex-col self-start">
    <!-- World toggle + datum. The airport name is already in the panel status. -->
    <div class="flex h-5 min-w-0 items-center gap-1 px-1">
      <button
        type="button"
        class="shrink-0"
        :class="[CHIP, airportVisible ? CHIP_ACTIVE : CHIP_IDLE]"
        :aria-pressed="airportVisible"
        title="Show or hide the airport world"
        @click="emit('set-airport-visible', !airportVisible)"
      >
        <span class="truncate">AIRPORT WORLD</span>
      </button>
      <span
        v-if="hasWorld && datumLabel"
        class="min-w-0 flex-1 truncate text-right tabular-nums text-secondary/60"
        :title="datumLabel"
      >
        {{ datumLabel }}
      </span>
    </div>

    <div v-if="!hasWorld" class="flex h-5 min-w-0 items-center px-1 text-secondary">
      No airport world is loaded.
    </div>

    <template v-else>
      <!-- APPROACHES -->
      <div :class="SECTION">
        <span class="truncate font-medium">APPROACHES</span>
        <span class="shrink-0 tabular-nums">{{ approaches.length }}</span>
      </div>
      <div v-if="!approaches.length" class="flex h-5 min-w-0 items-center px-1 text-secondary">
        No approaches published.
      </div>
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] content-start gap-0.5 p-0.5"
      >
        <button
          v-for="approach in sortedApproaches"
          :key="approach.key"
          type="button"
          :class="[CHIP, approach.key === selectedKey ? CHIP_ACTIVE : CHIP_IDLE]"
          :aria-pressed="approach.key === selectedKey"
          :title="`Approach RWY ${approach.endName} · ${formatDegrees(normaliseDegrees(approach.courseTrueDeg), 1)} · ${formatDegrees(approach.glideslopeDeg, 2)}`"
          @click="emit('select-approach', approach.runwayIndex, approach.endIndex)"
        >
          <span class="truncate">{{ approach.endName }}</span>
        </button>
      </div>

      <!-- REPOSITION -->
      <div :class="SECTION">
        <span class="truncate font-medium">REPOSITION</span>
        <label
          class="flex shrink-0 items-center gap-1 font-normal"
          title="Target speed in knots. Follows the current indicated airspeed until edited."
        >
          <span class="text-[0.55rem] uppercase tracking-wider">SPD</span>
          <input
            v-model="speedInput"
            type="number"
            min="0"
            max="999"
            step="1"
            inputmode="numeric"
            class="h-4 w-12 border border-simElementBorder bg-simInputBackground px-1 text-right tabular-nums text-secondary focus:border-simActiveButton focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Approach target speed in knots"
          />
          <span class="normal-case tracking-normal">kt</span>
        </label>
      </div>

      <!-- Diagram: distance down the left, side across, track through each dot.
           Horizontal placement is schematic: every intercept and base turn is
           2 NM abeam the centreline. -->
      <div class="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-1 px-0.5 pt-0.5">
        <!-- Approach data: one muted line, full width. -->
        <div
          class="col-span-2 flex h-5 min-w-0 items-center justify-between gap-2 px-1 text-[0.6rem] tabular-nums text-secondary"
          :title="
            selectedDetails.length
              ? selectedDetails.map((detail) => `${detail.label}: ${detail.value}`).join(' · ')
              : 'Select an approach'
          "
        >
          <span>CRS {{ approachLine?.course ?? '—' }}</span>
          <span>GS {{ approachLine?.glideslope ?? '—' }}</span>
          <span>TCH {{ approachLine?.tch ?? '—' }}</span>
        </div>

        <!-- 0 NM: the threshold. The strip is the button, the red dot the point.
             The strip is open-topped: the runway continues away. -->
        <span
          class="flex h-9 items-center justify-end pr-1 text-[0.6rem] tabular-nums text-secondary"
        >
          0 NM
        </span>
        <div class="relative flex h-9 justify-center">
          <button
            type="button"
            class="group flex h-full w-20 flex-col items-center justify-between border-x border-b border-secondary/50 pt-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
            :class="
              canPlace
                ? 'cursor-pointer hover:border-secondary/80'
                : 'cursor-not-allowed opacity-40'
            "
            :disabled="!canPlace"
            :title="`Place at the threshold, 0 NM, speed 0${
              selectedApproach ? ` · RWY ${selectedApproach.endName}` : ''
            }`"
            aria-label="Place at the threshold, 0 NM, speed 0"
            @click="placeAtThreshold"
          >
            <span class="text-[0.55rem] font-bold tracking-[0.14em] text-secondary">
              {{ selectedApproach?.endName ?? '' }}
            </span>
            <span class="mb-1 flex w-full items-center px-1" aria-hidden="true">
              <span class="flex flex-1 justify-between">
                <span v-for="n in 4" :key="`l${n}`" class="h-1.5 w-0.5 bg-secondary/60" />
              </span>
              <span class="mx-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
              <span class="flex flex-1 justify-between">
                <span v-for="n in 4" :key="`r${n}`" class="h-1.5 w-0.5 bg-secondary/60" />
              </span>
            </span>
          </button>
        </div>

        <!-- One row per distance -->
        <template v-for="row in diagramRows" :key="row.distanceNm">
          <span
            class="flex h-7 items-center justify-end pr-1 text-[0.6rem] tabular-nums text-secondary"
          >
            {{ row.distanceNm }} NM
          </span>
          <div class="relative flex h-7 items-center">
            <span
              class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-simElementBorder"
              aria-hidden="true"
            ></span>
            <div class="relative grid w-full grid-cols-5">
              <template v-for="slot in row.slots" :key="slot.track.key">
                <button
                  v-if="slot.available"
                  type="button"
                  class="group relative flex h-7 w-full items-center justify-center"
                  :class="canPlace ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'"
                  :disabled="!canPlace"
                  :title="slot.title"
                  :aria-label="slot.title"
                  @click="placeOnApproach(row.distanceNm, slot.track)"
                >
                  <span
                    class="absolute h-0.5 w-3.5 bg-secondary/40 group-hover:bg-secondary"
                    :style="{ transform: `rotate(${slot.track.rotation}deg)` }"
                    aria-hidden="true"
                  ></span>
                  <span
                    class="relative h-1.5 w-1.5 rounded-full bg-secondary ring-2 ring-panelContentBackground"
                    aria-hidden="true"
                  ></span>
                </button>
                <span v-else aria-hidden="true" />
              </template>
            </div>
          </div>
        </template>
      </div>

      <!-- One fixed line: placement confirmation, or the empty-state hint. -->
      <div
        class="flex h-5 min-w-0 items-center px-1 text-[0.6rem] text-secondary"
        aria-live="polite"
      >
        <span class="truncate">
          {{ placementFeedback ?? (selectedApproach ? '' : 'Select an approach to place') }}
        </span>
      </div>
    </template>

    <!-- LAYERS -->
    <div :class="SECTION">
      <span class="truncate font-medium">LAYERS</span>
      <span class="shrink-0 tabular-nums">{{ layers.length }}</span>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] content-start gap-0.5 p-0.5">
      <button
        v-for="layer in layers"
        :key="layer.id"
        type="button"
        :class="[CHIP, layer.inputValue ? CHIP_ACTIVE : CHIP_IDLE]"
        :aria-pressed="Boolean(layer.inputValue)"
        :title="`${layer.label}: ${layer.inputValue ? 'ON' : 'OFF'}`"
        @click="emit('toggle-layer', layer)"
      >
        <span class="truncate">{{ layer.label }}</span>
      </button>
    </div>
  </div>
</template>
