<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { draftNumber } from '../AirportState'
import type { ApproachRepositionRequest, AirportView } from '../AirportState'
import type { SimulationProperties } from '../wasm/siminterface'

// ---------------------------------------------------------------------------
// Props / emits
// ---------------------------------------------------------------------------

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
  (event: 'reposition-approach', request: ApproachRepositionRequest): void
  (event: 'toggle-layer', layer: SimulationProperties): void
  (event: 'set-airport-visible', visible: boolean): void
}>()

// ---------------------------------------------------------------------------
// Shared styles: one chip language for every target in the panel
// ---------------------------------------------------------------------------

const CHIP_BASE = 'flex min-w-0 items-center justify-center border text-center uppercase'
const CHIP = `${CHIP_BASE} h-5 px-1`
// Layers get two lines: four columns are too narrow for one line of long labels.
const LAYER_CHIP = `${CHIP_BASE} h-6 whitespace-normal px-0.5 text-[0.55rem] leading-[1.05]`
const CHIP_IDLE =
  'border-simElementBorder text-secondary hover:border-secondary/60 hover:bg-simInputBackground'
const CHIP_ACTIVE = 'border-simActiveButton bg-simActiveButton text-primary'

// Numeric entry: the same frame as a chip, without the browser's spinners.
const FIELD =
  'h-4 min-w-0 flex-1 border border-simElementBorder bg-simInputBackground px-1 text-right tabular-nums text-secondary focus:border-simActiveButton focus:bg-simActiveButton/10 focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

// A section label, not a panel bar: quiet, ruled, never clickable.
const SECTION =
  'sticky top-0 z-10 flex h-5 min-w-0 items-center justify-between gap-1 border-t border-simElementBorder bg-panelContentBackground px-1 text-[0.6rem] uppercase tracking-[0.14em] text-secondary'

// A sub-section inside a major area: quieter, no sticky, hairline only.
const SUB_SECTION =
  'mt-1 flex h-5 min-w-0 items-center justify-between gap-1 border-t border-simElementBorder/40 px-1 text-[0.55rem] uppercase tracking-[0.14em] text-secondary/70'

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

// Two even rows: six ends become 3 + 3, four ends 2 + 2, so every button is the
// same size and the grid never leaves a ragged last row.
const approachColumns = computed(() => Math.max(1, Math.ceil(sortedApproaches.value.length / 2)))

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

/** Preset lateral offset of the intercept and base dots, in nautical miles. */
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

// The last target clicked stays marked, so the active preset is readable at a
// glance. Typing in a field clears it, because the placement no longer matches
// the dot.
const selectedTarget = ref<string | null>(null)
const targetKey = (distanceNm: number, track: PlacementTrack) => `${distanceNm}:${track.key}`
const isSelected = (distanceNm: number, track: PlacementTrack) =>
  selectedTarget.value === targetKey(distanceNm, track)

watch(selectedKey, () => {
  selectedTarget.value = null
})

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

// The idle line under the diagram: it explains what the fields and dots do, so
// the controls above read as the arguments for the picture.
const placementHint = computed(() => {
  if (!hasWorld.value) return ''
  if (!selectedApproach.value) return 'Select an approach to place'
  return 'Fields set the placement · click a dot'
})

// ---------------------------------------------------------------------------
// Placement fields
//
// Placements are made at a fixed approach speed unless the field is edited.
// Each field follows a source until it is edited, then holds the entered value;
// clearing it returns to the source. DIST is the last distance clicked (3 NM at
// first), SPD is 180 kt, ALT starts at 0, and LAT and HDG follow the last
// diagram target clicked.
// ---------------------------------------------------------------------------

/** Distance from the threshold shown before any target has been clicked, in NM. */
const DEFAULT_DISTANCE_NM = 3

/** Target speed in knots when the SPD field has not been edited. */
const DEFAULT_SPEED_KT = 180

// v-model on a number input casts the entered value to a number before it
// reaches the setter, so drafts are stored as text to keep trim/parse cheap.
const draftText = (value: string) => String(value)

/** The distance of the last target clicked: the DIST field's default. */
const trackDistanceNm = ref(DEFAULT_DISTANCE_NM)

const distanceDraft = ref<string | null>(null)
const distanceInput = computed({
  get: () => distanceDraft.value ?? String(trackDistanceNm.value),
  set: (value: string) => {
    distanceDraft.value = draftText(value)
    selectedTarget.value = null
  },
})
/** Along the approach from the threshold; 0 is the threshold itself. */
const distanceNm = computed(() => {
  const entered = draftNumber(distanceDraft.value, trackDistanceNm.value)
  return entered >= 0 ? entered : trackDistanceNm.value
})

const speedDraft = ref<string | null>(null)
const speedInput = computed({
  get: () => speedDraft.value ?? String(DEFAULT_SPEED_KT),
  set: (value: string) => {
    speedDraft.value = draftText(value)
  },
})
const targetSpeedKt = computed(() => {
  const entered = Number(speedInput.value)
  if (Number.isFinite(entered) && entered > 0) return Math.round(entered)
  return DEFAULT_SPEED_KT
})

/** The track of the last target clicked: the HDG field's default. */
const trackHeadingOffsetDeg = ref(0)

const headingDraft = ref<string | null>(null)
const headingInput = computed({
  get: () => headingDraft.value ?? String(trackHeadingOffsetDeg.value),
  set: (value: string) => {
    headingDraft.value = draftText(value)
    selectedTarget.value = null
  },
})
/** Positive is clockwise from the final course, as the engine expects. */
const headingOffsetDeg = computed(() =>
  draftNumber(headingDraft.value, trackHeadingOffsetDeg.value),
)

const altitudeDraft = ref<string | null>(null)
const altitudeInput = computed({
  get: () => altitudeDraft.value ?? '0',
  set: (value: string) => {
    altitudeDraft.value = draftText(value)
  },
})
/** Added to the glide-path altitude, in feet. */
const altitudeOffsetFt = computed(() => draftNumber(altitudeDraft.value, 0))

/** The side of the last target clicked: the LAT field's default. */
const trackLateralOffsetNm = ref(0)

const lateralDraft = ref<string | null>(null)
const lateralInput = computed({
  get: () => lateralDraft.value ?? String(trackLateralOffsetNm.value),
  set: (value: string) => {
    lateralDraft.value = draftText(value)
    selectedTarget.value = null
  },
})
/** Positive is right of the extended centreline, as the engine expects. */
const lateralOffsetNm = computed(() => draftNumber(lateralDraft.value, trackLateralOffsetNm.value))

// An empty field follows its source again, so show that source as the value.
const resetEmptyDrafts = () => {
  if (!distanceDraft.value?.trim()) distanceDraft.value = null
  if (!headingDraft.value?.trim()) headingDraft.value = null
  if (!altitudeDraft.value?.trim()) altitudeDraft.value = null
  if (!lateralDraft.value?.trim()) lateralDraft.value = null
}

const signed = (value: number) => (value > 0 ? `+${value}` : String(value))

/** True when a typed field replaces the clicked target, so no dot is "active". */
const fieldsOverridden = () =>
  Boolean(distanceDraft.value?.trim() || lateralDraft.value?.trim() || headingDraft.value?.trim())

const offsetSummary = (speedKt = targetSpeedKt.value) => {
  const parts = [`${speedKt} kt`]
  if (lateralOffsetNm.value !== 0) parts.push(`${signed(lateralOffsetNm.value)} NM`)
  if (headingOffsetDeg.value !== 0) parts.push(`${signed(headingOffsetDeg.value)}°`)
  if (altitudeOffsetFt.value !== 0) parts.push(`${signed(altitudeOffsetFt.value)} ft`)
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const placeOnApproach = (targetDistanceNm: number, track: PlacementTrack) => {
  const approach = selectedApproach.value
  if (!approach || !airportId.value || !trackAvailable(targetDistanceNm, track)) return
  // Clicking a target pre-fills DIST, LAT and HDG from it; typed values win.
  trackDistanceNm.value = targetDistanceNm
  trackLateralOffsetNm.value = track.lateralSign * INTERCEPT_OFFSET_NM
  trackHeadingOffsetDeg.value = -track.lateralSign * track.angleDeg
  resetEmptyDrafts()
  emit('reposition-approach', {
    airportId: airportId.value,
    runwayId: approach.endName,
    distanceNm: distanceNm.value,
    lateralOffsetNm: lateralOffsetNm.value,
    headingOffsetDeg: headingOffsetDeg.value,
    altitudeOffsetFt: altitudeOffsetFt.value,
    targetSpeedKt: targetSpeedKt.value,
  })
  showFeedback(`${distanceNm.value} NM ${track.description} · ${offsetSummary()}`)
  // A dot is only marked while it matches the placement: a typed field wins, and
  // then no preset is active.
  selectedTarget.value = fieldsOverridden() ? null : targetKey(targetDistanceNm, track)
}

// The threshold: 0 NM, inline with the final course, and stopped. The SPD field
// keeps its own value, so a following 3/6/9 NM placement still has a speed.
const placeAtThreshold = () => {
  const approach = selectedApproach.value
  if (!approach || !airportId.value) return
  trackDistanceNm.value = 0
  trackLateralOffsetNm.value = 0
  trackHeadingOffsetDeg.value = 0
  resetEmptyDrafts()
  emit('reposition-approach', {
    airportId: airportId.value,
    runwayId: approach.endName,
    distanceNm: 0,
    lateralOffsetNm: lateralOffsetNm.value,
    headingOffsetDeg: headingOffsetDeg.value,
    altitudeOffsetFt: altitudeOffsetFt.value,
    targetSpeedKt: 0,
  })
  showFeedback(`0 NM threshold · ${offsetSummary(0)}`)
  selectedTarget.value = 'threshold'
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
        <span class="truncate">Airport World</span>
      </button>
      <span
        v-if="hasWorld && datumLabel"
        class="min-w-0 flex-1 truncate text-right tabular-nums text-secondary/60"
        :title="datumLabel"
      >
        {{ datumLabel }}
      </span>
    </div>

    <!-- APPROACH CONFIGURATION: runway selection and placement are one workflow. -->
    <div :class="SECTION">
      <span class="truncate font-medium">Approach Configuration</span>
      <span class="shrink-0 tabular-nums">{{ approaches.length }}</span>
    </div>

    <div v-if="!approaches.length" class="flex h-5 min-w-0 items-center px-1 text-secondary">
      {{ hasWorld ? 'No approaches published' : 'No airport world loaded' }}
    </div>
    <div
      v-else
      class="grid gap-1 px-1 py-1"
      :style="{ gridTemplateColumns: `repeat(${approachColumns}, minmax(0, 1fr))` }"
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

    <!-- REPOSITION: the arguments the diagram below sends. -->
    <div :class="SUB_SECTION">
      <span class="truncate">Reposition</span>
      <span class="shrink-0 tabular-nums" :class="selectedApproach ? '' : 'opacity-40'">
        {{ selectedApproach ? `RWY ${selectedApproach.endName}` : 'NO RUNWAY' }}
      </span>
    </div>

    <!-- Four columns, one cell per argument. SPD wraps to the second row. -->
    <div class="grid grid-cols-4 gap-x-2 gap-y-1 px-1 pt-1" :class="canPlace ? '' : 'opacity-40'">
      <label
        class="flex min-w-0 flex-col gap-1"
        title="Distance along the approach from the threshold in nautical miles. Pre-filled by the diagram target until edited."
      >
        <span class="text-[0.55rem] uppercase tracking-wider text-secondary/70">Dist</span>
        <span class="flex min-w-0 items-center gap-1">
          <input
            v-model="distanceInput"
            type="number"
            min="0"
            step="0.5"
            inputmode="decimal"
            :class="FIELD"
            :disabled="!canPlace"
            aria-label="Distance from the threshold along the approach in nautical miles"
          />
          <span class="w-4 shrink-0 text-[0.55rem]">NM</span>
        </span>
      </label>
      <label
        class="flex min-w-0 flex-col gap-1"
        title="Lateral OFFSET in nautical miles from the extended centreline, positive to the right. Pre-filled by the diagram target until edited."
      >
        <span class="text-[0.55rem] uppercase tracking-wider text-secondary/70">Lat Ofs</span>
        <span class="flex min-w-0 items-center gap-1">
          <input
            v-model="lateralInput"
            type="number"
            step="0.1"
            inputmode="decimal"
            :class="FIELD"
            :disabled="!canPlace"
            aria-label="Lateral offset from the extended centreline in nautical miles"
          />
          <span class="w-4 shrink-0 text-[0.55rem]">NM</span>
        </span>
      </label>
      <label
        class="flex min-w-0 flex-col gap-1"
        title="Altitude OFFSET in feet, added to the glide-path altitude. 0 places the aircraft on the path."
      >
        <span class="text-[0.55rem] uppercase tracking-wider text-secondary/70">Alt Ofs</span>
        <span class="flex min-w-0 items-center gap-1">
          <input
            v-model="altitudeInput"
            type="number"
            step="10"
            inputmode="numeric"
            :class="FIELD"
            :disabled="!canPlace"
            aria-label="Altitude offset above the glide path in feet"
          />
          <span class="w-4 shrink-0 text-[0.55rem]">ft</span>
        </span>
      </label>
      <label
        class="flex min-w-0 flex-col gap-1"
        title="Heading OFFSET in degrees from the final course, positive clockwise. Pre-filled by the diagram target until edited."
      >
        <span class="text-[0.55rem] uppercase tracking-wider text-secondary/70">Hdg Ofs</span>
        <span class="flex min-w-0 items-center gap-1">
          <input
            v-model="headingInput"
            type="number"
            step="1"
            inputmode="numeric"
            :class="FIELD"
            :disabled="!canPlace"
            aria-label="Heading offset from the final course in degrees"
          />
          <span class="w-4 shrink-0 text-[0.55rem]">°</span>
        </span>
      </label>
      <label
        class="flex min-w-0 flex-col gap-1"
        title="Target speed in knots. Defaults to 180 kt until edited."
      >
        <span class="text-[0.55rem] uppercase tracking-wider text-secondary/70">Spd</span>
        <span class="flex min-w-0 items-center gap-1">
          <input
            v-model="speedInput"
            type="number"
            min="0"
            max="999"
            step="1"
            inputmode="numeric"
            :class="FIELD"
            :disabled="!canPlace"
            aria-label="Approach target speed in knots"
          />
          <span class="w-4 shrink-0 text-[0.55rem]">kt</span>
        </span>
      </label>
    </div>

    <!-- Diagram: distance down the left, side across, track through each dot.
         Horizontal placement is schematic: every intercept and base turn is
         2 NM abeam the centreline. -->
    <div class="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-1 px-1 pt-1">
      <!-- Approach data: one muted line, full width. -->
      <div
        class="col-span-2 grid h-5 min-w-0 grid-cols-3 items-center gap-2 text-[0.6rem] tabular-nums text-secondary"
        :title="
          selectedDetails.length
            ? selectedDetails.map((detail) => `${detail.label}: ${detail.value}`).join(' · ')
            : 'Select an approach'
        "
      >
        <span class="truncate">CRS {{ approachLine?.course ?? '—' }}</span>
        <span class="truncate text-center">GS {{ approachLine?.glideslope ?? '—' }}</span>
        <span class="truncate text-right">TCH {{ approachLine?.tch ?? '—' }}</span>
      </div>

      <!-- 0 NM: the threshold. The strip is the button, the dot the point.
           The strip is open-topped: the runway continues away. -->
      <span
        class="flex h-9 items-end justify-end pb-1 pr-1 text-[0.6rem] tabular-nums text-secondary"
      >
        0 NM
      </span>
      <div class="relative flex h-9 justify-center">
        <button
          type="button"
          class="group flex h-full w-20 flex-col items-center justify-between border-x border-b border-secondary/50 pt-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
          :class="
            canPlace ? 'cursor-pointer hover:border-secondary/80' : 'cursor-not-allowed opacity-40'
          "
          :disabled="!canPlace"
          :aria-pressed="selectedTarget === 'threshold'"
          :title="`Place at the threshold, 0 NM, speed 0${
            selectedApproach ? ` · RWY ${selectedApproach.endName}` : ''
          }`"
          aria-label="Place at the threshold, 0 NM, speed 0"
          @click="placeAtThreshold"
        >
          <span class="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-secondary">
            {{ selectedApproach?.endName ?? '' }}
          </span>
          <span class="mb-1 flex w-full items-center px-1" aria-hidden="true">
            <span class="flex flex-1 justify-between">
              <span v-for="n in 4" :key="`l${n}`" class="h-1.5 w-0.5 bg-secondary/60" />
            </span>
            <span
              class="mx-1 h-2 w-2 shrink-0 rounded-full ring-2 transition-colors"
              :class="
                selectedTarget === 'threshold'
                  ? 'bg-simActiveButton ring-simActiveButton/30'
                  : 'bg-secondary ring-panelContentBackground group-hover:ring-secondary/30'
              "
            />
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
                :aria-pressed="isSelected(row.distanceNm, slot.track)"
                :title="slot.title"
                :aria-label="slot.title"
                @click="placeOnApproach(row.distanceNm, slot.track)"
              >
                <span
                  class="absolute h-0.5 w-3.5 transition-colors duration-100"
                  :class="
                    isSelected(row.distanceNm, slot.track)
                      ? 'bg-simActiveButton'
                      : 'bg-secondary/40 group-hover:bg-secondary'
                  "
                  :style="{ transform: `rotate(${slot.track.rotation}deg)` }"
                  aria-hidden="true"
                ></span>
                <span
                  class="relative h-2 w-2 rounded-full ring-2 transition-transform duration-100"
                  :class="
                    isSelected(row.distanceNm, slot.track)
                      ? 'bg-simActiveButton ring-simActiveButton/30'
                      : 'bg-secondary ring-panelContentBackground group-hover:scale-125'
                  "
                  aria-hidden="true"
                ></span>
              </button>
              <span v-else aria-hidden="true" />
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- One fixed line: placement confirmation, or what the panel expects next. -->
    <div class="flex h-5 min-w-0 items-center px-1 text-[0.6rem] text-secondary" aria-live="polite">
      <span class="truncate">
        {{ placementFeedback ?? placementHint }}
      </span>
    </div>

    <!-- LAYERS. The engine already orders the group by related layers, so the
         four-column grid keeps that order rather than inventing headings. -->
    <div :class="SECTION">
      <span class="truncate font-medium">Layers</span>
      <span class="shrink-0 tabular-nums">{{ layers.length }}</span>
    </div>

    <div class="grid grid-cols-4 gap-1 px-1 py-1">
      <button
        v-for="layer in layers"
        :key="layer.id"
        type="button"
        :class="[LAYER_CHIP, layer.inputValue ? CHIP_ACTIVE : CHIP_IDLE]"
        :aria-pressed="Boolean(layer.inputValue)"
        :title="`${layer.label}: ${layer.inputValue ? 'ON' : 'OFF'}`"
        @click="emit('toggle-layer', layer)"
      >
        <span class="break-words">{{ layer.label }}</span>
      </button>
    </div>
  </div>
</template>
