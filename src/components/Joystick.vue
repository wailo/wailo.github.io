<template>
  <div
    class="flex h-full w-full select-none flex-col gap-1 overflow-hidden bg-simBackground p-1 font-mono text-secondary"
  >
    <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-[9px]">
      <span v-for="item in telemetry" :key="item.label" class="whitespace-nowrap">
        <span class="opacity-60">{{ item.label }}</span>
        <span class="ml-1 tabular-nums text-simActiveButton">{{ item.value }}</span>
      </span>
    </div>

    <div
      class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-y border-panelBorder bg-panelContentBackground px-2 py-1"
    >
      <div class="flex min-w-0 items-center gap-1">
        <span class="mr-1 text-[8px] tracking-[0.15em] opacity-60">FLAPS</span>
        <button
          v-for="option in flapOptions"
          :key="`flap-${option.value}`"
          type="button"
          class="h-5 min-w-7 border border-simElementBorder bg-panelHeaderBackground px-1 text-[9px]"
          :class="
            input.flaps === option.value
              ? 'border-simActiveButton bg-simInputBackground text-simActiveButton'
              : ''
          "
          @click="setFlaps(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="flex min-w-0 items-center gap-1">
        <span class="mr-1 text-[8px] tracking-[0.15em] opacity-60">GEAR</span>
        <button
          v-for="option in gearOptions"
          :key="`gear-${option.value}`"
          type="button"
          :disabled="gearOptions.length === 1"
          class="h-5 min-w-7 border border-simElementBorder bg-panelHeaderBackground px-1 text-[9px] disabled:opacity-50"
          :class="
            input.gear === option.value
              ? 'border-simActiveButton bg-simInputBackground text-simActiveButton'
              : ''
          "
          @click="setGear(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div
      class="grid min-h-0 flex-1 grid-cols-[minmax(85px,0.85fr)_minmax(140px,1.25fr)_minmax(90px,0.9fr)] gap-px overflow-auto bg-panelBorder"
    >
      <section class="flex min-h-[140px] min-w-0 flex-col bg-panelContentBackground p-1.5">
        <h3 class="mb-1 border-b border-panelBorder pb-1 text-[9px] tracking-[0.18em] opacity-70">
          ENGINE
        </h3>
        <div class="flex min-h-0 flex-1 items-stretch justify-center gap-2 pt-1">
          <div class="flex min-h-0 flex-col items-center gap-1">
            <div class="text-center text-[8px]">
              <span class="block opacity-70">THR</span>
              <span class="block opacity-50">Throttle</span>
              <span class="block tabular-nums text-[10px] text-simActiveButton">
                {{ percent(input.throttle) }}%
              </span>
            </div>
            <div class="relative flex min-h-0 flex-1 justify-center">
              <div
                ref="throttleBaseRef"
                class="relative h-full min-h-20 w-[18px] touch-none cursor-ns-resize overflow-hidden border border-simElementBorder bg-simInputBackground"
                @pointerdown="startThrottleDrag"
              >
                <div
                  v-for="i in 10"
                  :key="'throttle-' + i"
                  class="absolute left-[3px] right-[3px] h-px bg-panelBorder/40"
                  :style="{ bottom: `${i * 10}%` }"
                ></div>

                <div class="absolute left-0 right-0" style="bottom: 20%">
                  <div class="h-px bg-simActiveButton w-full"></div>
                  <span
                    class="absolute left-full ml-2 -translate-y-1/2 top-1/2 text-[8px] text-simActiveButton opacity-90 whitespace-nowrap pointer-events-none"
                  >
                    IDLE
                  </span>
                </div>

                <div
                  class="absolute left-1/2 top-1/2 w-7 h-[10px] bg-simActiveButton border border-secondary/40 rounded-[2px] pointer-events-none"
                  :style="throttleStyle"
                ></div>
              </div>
            </div>
          </div>

          <div v-if="input.mixture !== undefined" class="flex min-h-0 flex-col items-center gap-1">
            <div class="text-center text-[8px]">
              <span class="block opacity-70">MIX</span>
              <span class="block opacity-50">Mixture</span>
              <span class="block tabular-nums text-[10px] text-simActiveButton">
                {{ percent(input.mixture) }}%
              </span>
            </div>
            <div class="relative flex min-h-0 flex-1 justify-center">
              <div
                ref="mixtureBaseRef"
                class="relative h-full min-h-20 w-[18px] touch-none cursor-ns-resize overflow-hidden border border-simElementBorder bg-simInputBackground"
                @pointerdown="startMixtureDrag"
              >
                <!-- Tick Marks -->
                <div
                  v-for="i in 10"
                  :key="'mixture-' + i"
                  class="absolute left-[3px] right-[3px] h-px bg-panelBorder/40"
                  :style="{ bottom: `${i * 10}%` }"
                ></div>

                <!-- Handle -->
                <div
                  class="absolute left-1/2 top-1/2 w-7 h-[10px] bg-simActiveButton border border-secondary/40 rounded-[2px] pointer-events-none"
                  :style="mixtureStyle"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="flex min-h-[140px] min-w-0 flex-col bg-panelContentBackground p-1.5">
        <h3 class="mb-1 border-b border-panelBorder pb-1 text-[9px] tracking-[0.18em] opacity-70">
          FLIGHT CONTROLS
        </h3>
        <div class="flex min-h-0 flex-1 flex-col items-center gap-3 pt-1">
          <div
            class="grid min-h-0 w-full flex-1 grid-cols-[auto_minmax(36px,150px)_auto] grid-rows-[auto_minmax(36px,1fr)_auto] items-center justify-center gap-x-1 text-[8px]"
          >
            <span class="col-start-2 text-center opacity-60">
              ELEV {{ signedPercent(input.elevator) }} ↑
            </span>
            <span class="row-start-2 text-right opacity-60">LEFT</span>
            <div
              ref="rightBaseRef"
              class="relative col-start-2 row-start-2 aspect-square w-full max-w-[150px] justify-self-center touch-none cursor-crosshair overflow-hidden border border-simElementBorder bg-simInputBackground"
              @pointerdown="startRightDrag"
            >
              <div class="absolute inset-x-0 top-1/2 h-px bg-panelBorder/50"></div>
              <div class="absolute inset-y-0 left-1/2 w-px bg-panelBorder/50"></div>
              <div class="absolute inset-[25%] border border-panelBorder/25"></div>
              <div
                class="absolute left-1/2 top-1/2 h-3 w-3 border border-secondary/40 bg-simActiveButton pointer-events-none"
                :style="rightStickStyle"
              ></div>
            </div>
            <span class="col-start-3 row-start-2 opacity-60">RIGHT</span>
            <span class="col-start-2 row-start-3 text-center opacity-60">
              ↓ ELEV &nbsp; AIL {{ signedPercent(input.aileron) }}
            </span>
          </div>
          <div class="flex w-full items-center gap-2">
            <span class="shrink-0 text-[8px] opacity-60">RUDDER&nbsp; L</span>
            <div
              ref="rudderBaseRef"
              class="relative h-[18px] min-w-0 flex-1 touch-none cursor-ew-resize overflow-hidden border border-simElementBorder bg-simInputBackground"
              @pointerdown="startRudderDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-panelBorder/50"></div>

              <div
                v-for="i in 10"
                :key="'rudder-' + i"
                class="absolute top-[3px] bottom-[3px] w-px bg-panelBorder/40"
                :style="{ left: `${i * 10}%` }"
              ></div>

              <div
                class="absolute left-1/2 top-1/2 w-[10px] h-7 bg-simActiveButton border border-secondary/40 rounded-[2px] pointer-events-none"
                :style="rudderStyle"
              ></div>
            </div>
            <span class="shrink-0 text-right text-[8px] opacity-60">
              R
              <span class="ml-1 tabular-nums text-[9px] text-simActiveButton">
                {{ signedPercent(input.rudder) }}
              </span>
            </span>
          </div>
        </div>
      </section>

      <section class="min-w-0 bg-panelContentBackground p-1.5">
        <h3 class="mb-3 border-b border-panelBorder pb-1 text-[9px] tracking-[0.18em] opacity-70">
          TRIM
        </h3>
        <div class="grid gap-4">
          <div class="grid gap-1">
            <div class="flex items-center justify-between text-[8px]">
              <span class="opacity-60">ELEV TRIM</span>
              <span class="tabular-nums text-[9px] text-simActiveButton">{{
                signedPercent(input.elevatorTrim)
              }}</span>
            </div>
            <div
              ref="elevTrimRef"
              class="relative h-[14px] w-full bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
              @pointerdown="startElevTrimDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-simActiveButton/60"></div>

              <div
                class="absolute left-1/2 top-1/2 -translate-y-1/2 w-[8px] h-5 bg-simActiveButton border border-secondary/40 rounded-[1px] pointer-events-none"
                :style="elevTrimStyle"
              ></div>
            </div>
          </div>
          <div class="grid gap-1">
            <div class="flex items-center justify-between text-[8px]">
              <span class="opacity-60">AIL TRIM</span>
              <span class="tabular-nums text-[9px] text-simActiveButton">{{
                signedPercent(input.aileronTrim)
              }}</span>
            </div>
            <div
              ref="ailTrimRef"
              class="relative h-[14px] w-full bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
              @pointerdown="startAilTrimDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-simActiveButton/60"></div>

              <div
                class="absolute left-1/2 top-1/2 -translate-y-1/2 w-[8px] h-5 bg-simActiveButton border border-secondary/40 rounded-[1px] pointer-events-none"
                :style="ailTrimStyle"
              ></div>
            </div>
          </div>
          <div class="grid gap-1">
            <div class="flex items-center justify-between text-[8px]">
              <span class="opacity-60">RUD TRIM</span>
              <span class="tabular-nums text-[9px] text-simActiveButton">{{
                signedPercent(input.rudderTrim)
              }}</span>
            </div>
            <div
              ref="rudTrimRef"
              class="relative h-[14px] w-full bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
              @pointerdown="startRudTrimDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-simActiveButton/60"></div>

              <div
                class="absolute left-1/2 top-1/2 -translate-y-1/2 w-[8px] h-5 bg-simActiveButton border border-secondary/40 rounded-[1px] pointer-events-none"
                :style="rudTrimStyle"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount, watch, onMounted, type Ref } from 'vue'

export interface JoystickInput {
  throttle: number
  rudder: number
  elevator: number
  aileron: number
  elevatorTrim: number
  aileronTrim: number
  rudderTrim: number
  mixture?: number // 0 (lean) to 1 (rich)
  flaps: number
  gear: number
}

export type JoystickControlOption = { label: string; value: number }

// --- Input Channel (Props) ---
const props = defineProps<{
  externalInputs?: JoystickInput
  flapOptions: JoystickControlOption[]
  gearOptions: JoystickControlOption[]
}>()

// --- Output Channel (Emits) ---
const emit = defineEmits<{
  (e: 'input', value: JoystickInput): void
}>()

// DOM Elements
const throttleBaseRef = ref<HTMLDivElement | null>(null)
const mixtureBaseRef = ref<HTMLDivElement | null>(null) // NEW
const rudderBaseRef = ref<HTMLDivElement | null>(null)
const rightBaseRef = ref<HTMLDivElement | null>(null)
const elevTrimRef = ref<HTMLDivElement | null>(null)
const ailTrimRef = ref<HTMLDivElement | null>(null)
const rudTrimRef = ref<HTMLDivElement | null>(null)

// Unified component state matching JoystickInput interface
const input = reactive<JoystickInput>({
  throttle: 0,
  rudder: 0,
  elevator: 0,
  aileron: 0,
  elevatorTrim: 0,
  aileronTrim: 0,
  rudderTrim: 0,
  mixture: 1, // Default to full rich
  flaps: 0,
  gear: 0,
})

const percent = (value: number) => Math.round(value * 100)
const signedPercent = (value: number) => {
  const rounded = percent(value)
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

const telemetry = computed(() => {
  const values = [
    { label: 'THR', value: `${percent(input.throttle)}%` },
    { label: 'ELEV', value: signedPercent(input.elevator) },
    { label: 'AIL', value: signedPercent(input.aileron) },
    { label: 'RUD', value: signedPercent(input.rudder) },
  ]
  if (input.mixture !== undefined) {
    values.push({ label: 'MIX', value: `${percent(input.mixture)}%` })
  }
  values.push(
    { label: 'E.TRIM', value: signedPercent(input.elevatorTrim) },
    { label: 'A.TRIM', value: signedPercent(input.aileronTrim) },
    { label: 'R.TRIM', value: signedPercent(input.rudderTrim) },
  )
  return values
})

// Position state for visual handles
const throttlePos = reactive({ y: 0 })
const mixturePos = reactive({ y: 0 }) // NEW
const rudderPos = reactive({ x: 0 })
const rightPos = reactive({ x: 0, y: 0 })
const elevTrimPos = reactive({ x: 0 })
const ailTrimPos = reactive({ x: 0 })
const rudTrimPos = reactive({ x: 0 })

// Active pointer IDs for drag handling
let activeThrottleId: number | null = null
let activeMixtureId: number | null = null // NEW
let activeRudderId: number | null = null
let activeRightId: number | null = null
let activeElevTrimId: number | null = null
let activeAilTrimId: number | null = null
let activeRudTrimId: number | null = null

// --- Handle Dimensions (MUST match CSS) ---
const HANDLE = {
  throttle: { height: 10 },
  mixture: { height: 10 }, // NEW - same as throttle
  rudder: { width: 10, height: 28 },
  trim: { width: 8, height: 20 },
  stick: { size: 10 },
}

// Computed Styles for handle positioning
const throttleStyle = computed(() => ({
  transform: 'translateX(-50%)',
  top: `${throttlePos.y}px`,
}))

const mixtureStyle = computed(() => ({
  // NEW
  transform: 'translateX(-50%)',
  top: `${mixturePos.y}px`,
}))

const rudderStyle = computed(() => ({
  transform: `translate(calc(-50% + ${rudderPos.x}px), -50%)`,
}))

const rightStickStyle = computed(() => ({
  transform: `translate(calc(-50% + ${rightPos.x}px), calc(-50% + ${rightPos.y}px))`,
}))

const elevTrimStyle = computed(() => ({
  transform: `translate(calc(-50% + ${elevTrimPos.x}px), -50%)`,
}))

const ailTrimStyle = computed(() => ({
  transform: `translate(calc(-50% + ${ailTrimPos.x}px), -50%)`,
}))

const rudTrimStyle = computed(() => ({
  transform: `translate(calc(-50% + ${rudTrimPos.x}px), -50%)`,
}))

// --- Dynamic Dimensions & Syncing ---
const syncPositionsFromControls = () => {
  // Throttle (vertical slider)
  if (activeThrottleId === null && throttleBaseRef.value) {
    const rect = throttleBaseRef.value.getBoundingClientRect()
    if (rect.height > 0) {
      const handleHeight = HANDLE.throttle.height
      const maxTravel = rect.height - handleHeight
      throttlePos.y = (1 - input.throttle) * maxTravel
    }
  }

  // Mixture (vertical slider)
  if (input.mixture !== undefined && activeMixtureId === null && mixtureBaseRef.value) {
    const rect = mixtureBaseRef.value.getBoundingClientRect()
    if (rect.height > 0) {
      const handleHeight = HANDLE.mixture.height
      const maxTravel = rect.height - handleHeight
      mixturePos.y = (1 - input.mixture!) * maxTravel
    }
  }

  // Yaw/Rudder (horizontal slider)
  if (activeRudderId === null && rudderBaseRef.value) {
    const rect = rudderBaseRef.value.getBoundingClientRect()
    if (rect.width > 0) {
      const handleWidth = HANDLE.rudder.width
      const maxTravel = (rect.width - handleWidth) / 2
      rudderPos.x = input.rudder * maxTravel
    }
  }

  // Right Stick (2D flight stick)
  if (activeRightId === null && rightBaseRef.value) {
    const rect = rightBaseRef.value.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const maxTravelX = (rect.width - HANDLE.stick.size) / 2
      const maxTravelY = (rect.height - HANDLE.stick.size) / 2
      rightPos.x = input.aileron * maxTravelX
      rightPos.y = -input.elevator * maxTravelY
    }
  }

  // Trim controls helper (horizontal sliders)
  const syncTrim = (el: HTMLDivElement | null, value: number, pos: { x: number }) => {
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0) {
        const handleWidth = HANDLE.trim.width
        const maxTravel = (rect.width - handleWidth) / 2
        pos.x = value * maxTravel
      }
    }
  }

  if (activeElevTrimId === null) syncTrim(elevTrimRef.value, input.elevatorTrim, elevTrimPos)
  if (activeAilTrimId === null) syncTrim(ailTrimRef.value, input.aileronTrim, ailTrimPos)
  if (activeRudTrimId === null) syncTrim(rudTrimRef.value, input.rudderTrim, rudTrimPos)
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  syncPositionsFromControls()
  resizeObserver = new ResizeObserver(() => {
    syncPositionsFromControls()
  })
  if (throttleBaseRef.value) resizeObserver.observe(throttleBaseRef.value)
  if (mixtureBaseRef.value) resizeObserver.observe(mixtureBaseRef.value) // NEW
  if (rudderBaseRef.value) resizeObserver.observe(rudderBaseRef.value)
  if (rightBaseRef.value) resizeObserver.observe(rightBaseRef.value)
  if (elevTrimRef.value) resizeObserver.observe(elevTrimRef.value)
  if (ailTrimRef.value) resizeObserver.observe(ailTrimRef.value)
  if (rudTrimRef.value) resizeObserver.observe(rudTrimRef.value)
})

// --- External Input Sync ---
watch(
  () => props.externalInputs,
  (newVal) => {
    if (!newVal) return
    input.throttle = Math.max(0, Math.min(1, newVal.throttle ?? 0))
    input.rudder = Math.max(-1, Math.min(1, newVal.rudder ?? 0))
    input.elevator = Math.max(-1, Math.min(1, newVal.elevator ?? 0))
    input.aileron = Math.max(-1, Math.min(1, newVal.aileron ?? 0))
    input.elevatorTrim = Math.max(-1, Math.min(1, newVal.elevatorTrim ?? 0))
    input.aileronTrim = Math.max(-1, Math.min(1, newVal.aileronTrim ?? 0))
    input.rudderTrim = Math.max(-1, Math.min(1, newVal.rudderTrim ?? 0))
    input.mixture =
      newVal.mixture !== undefined ? Math.max(0, Math.min(1, newVal.mixture)) : undefined
    input.flaps = newVal.flaps
    input.gear = newVal.gear
    syncPositionsFromControls()
  },
  { deep: true, flush: 'post' },
)

const setFlaps = (value: number) => {
  input.flaps = value
  emit('input', { ...input })
}

const setGear = (value: number) => {
  if (props.gearOptions.length === 1) return
  input.gear = value
  emit('input', { ...input })
}

// --- Throttle Logic ---
const handleThrottleMove = (event: PointerEvent) => {
  if (!throttleBaseRef.value) return
  const rect = throttleBaseRef.value.getBoundingClientRect()
  const handleHeight = HANDLE.throttle.height
  const maxTravel = rect.height - handleHeight
  let y = event.clientY - rect.top - handleHeight / 2
  y = Math.max(0, Math.min(maxTravel, y))
  throttlePos.y = y
  input.throttle = 1 - y / maxTravel
  emit('input', { ...input })
}

const startThrottleDrag = (e: PointerEvent) => {
  if (activeThrottleId !== null || !throttleBaseRef.value) return
  activeThrottleId = e.pointerId
  throttleBaseRef.value.setPointerCapture(e.pointerId)
  handleThrottleMove(e)
  throttleBaseRef.value.addEventListener('pointermove', onThrottleMove)
  throttleBaseRef.value.addEventListener('pointerup', onThrottleUp)
  throttleBaseRef.value.addEventListener('pointercancel', onThrottleUp)
}

const onThrottleMove = (e: PointerEvent) => {
  if (e.pointerId !== activeThrottleId || !throttleBaseRef.value) return
  handleThrottleMove(e)
}

const onThrottleUp = (e: PointerEvent) => {
  if (e.pointerId !== activeThrottleId || !throttleBaseRef.value) return
  throttleBaseRef.value.releasePointerCapture(e.pointerId)
  throttleBaseRef.value.removeEventListener('pointermove', onThrottleMove)
  throttleBaseRef.value.removeEventListener('pointerup', onThrottleUp)
  throttleBaseRef.value.removeEventListener('pointercancel', onThrottleUp)
  activeThrottleId = null
}

// --- Mixture Logic (NEW - mirrors throttle) ---
const handleMixtureMove = (event: PointerEvent) => {
  if (!mixtureBaseRef.value) return
  const rect = mixtureBaseRef.value.getBoundingClientRect()
  const handleHeight = HANDLE.mixture.height
  const maxTravel = rect.height - handleHeight
  let y = event.clientY - rect.top - handleHeight / 2
  y = Math.max(0, Math.min(maxTravel, y))
  mixturePos.y = y
  input.mixture = 1 - y / maxTravel
  emit('input', { ...input })
}

const startMixtureDrag = (e: PointerEvent) => {
  if (activeMixtureId !== null || !mixtureBaseRef.value) return
  activeMixtureId = e.pointerId
  mixtureBaseRef.value.setPointerCapture(e.pointerId)
  handleMixtureMove(e)
  mixtureBaseRef.value.addEventListener('pointermove', onMixtureMove)
  mixtureBaseRef.value.addEventListener('pointerup', onMixtureUp)
  mixtureBaseRef.value.addEventListener('pointercancel', onMixtureUp)
}

const onMixtureMove = (e: PointerEvent) => {
  if (e.pointerId !== activeMixtureId || !mixtureBaseRef.value) return
  handleMixtureMove(e)
}

const onMixtureUp = (e: PointerEvent) => {
  if (e.pointerId !== activeMixtureId || !mixtureBaseRef.value) return
  mixtureBaseRef.value.releasePointerCapture(e.pointerId)
  mixtureBaseRef.value.removeEventListener('pointermove', onMixtureMove)
  mixtureBaseRef.value.removeEventListener('pointerup', onMixtureUp)
  mixtureBaseRef.value.removeEventListener('pointercancel', onMixtureUp)
  activeMixtureId = null
}

// --- Yaw/Rudder Logic ---
const handleRudderMove = (event: PointerEvent) => {
  if (!rudderBaseRef.value) return
  const rect = rudderBaseRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const handleWidth = HANDLE.rudder.width
  const maxTravel = (rect.width - handleWidth) / 2
  let deltaX = event.clientX - centerX
  deltaX = Math.max(-maxTravel, Math.min(maxTravel, deltaX))
  rudderPos.x = deltaX
  input.rudder = deltaX / maxTravel
  emit('input', { ...input })
}

const startRudderDrag = (e: PointerEvent) => {
  if (activeRudderId !== null || !rudderBaseRef.value) return
  activeRudderId = e.pointerId
  rudderBaseRef.value.setPointerCapture(e.pointerId)
  handleRudderMove(e)
  rudderBaseRef.value.addEventListener('pointermove', onRudderMove)
  rudderBaseRef.value.addEventListener('pointerup', onRudderUp)
  rudderBaseRef.value.addEventListener('pointercancel', onRudderUp)
}

const onRudderMove = (e: PointerEvent) => {
  if (e.pointerId !== activeRudderId || !rudderBaseRef.value) return
  handleRudderMove(e)
}

const onRudderUp = (e: PointerEvent) => {
  if (e.pointerId !== activeRudderId || !rudderBaseRef.value) return
  rudderBaseRef.value.releasePointerCapture(e.pointerId)
  rudderBaseRef.value.removeEventListener('pointermove', onRudderMove)
  rudderBaseRef.value.removeEventListener('pointerup', onRudderUp)
  rudderBaseRef.value.removeEventListener('pointercancel', onRudderUp)
  activeRudderId = null
  rudderPos.x = 0
  input.rudder = 0
  emit('input', { ...input })
}

// --- Right Stick Logic (Elevator/Aileron) ---
const handleRightMove = (event: PointerEvent) => {
  if (!rightBaseRef.value) return
  const rect = rightBaseRef.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const maxTravelX = (rect.width - HANDLE.stick.size) / 2
  const maxTravelY = (rect.height - HANDLE.stick.size) / 2
  let deltaX = event.clientX - centerX
  let deltaY = event.clientY - centerY
  deltaX = Math.max(-maxTravelX, Math.min(maxTravelX, deltaX))
  deltaY = Math.max(-maxTravelY, Math.min(maxTravelY, deltaY))
  rightPos.x = deltaX
  rightPos.y = deltaY
  input.aileron = deltaX / maxTravelX
  input.elevator = -deltaY / maxTravelY
  emit('input', { ...input })
}

const startRightDrag = (e: PointerEvent) => {
  if (activeRightId !== null || !rightBaseRef.value) return
  activeRightId = e.pointerId
  rightBaseRef.value.setPointerCapture(e.pointerId)
  handleRightMove(e)
  rightBaseRef.value.addEventListener('pointermove', onRightMove)
  rightBaseRef.value.addEventListener('pointerup', onRightUp)
  rightBaseRef.value.addEventListener('pointercancel', onRightUp)
}

const onRightMove = (e: PointerEvent) => {
  if (e.pointerId !== activeRightId || !rightBaseRef.value) return
  handleRightMove(e)
}

const onRightUp = (e: PointerEvent) => {
  if (e.pointerId !== activeRightId || !rightBaseRef.value) return
  rightBaseRef.value.releasePointerCapture(e.pointerId)
  rightBaseRef.value.removeEventListener('pointermove', onRightMove)
  rightBaseRef.value.removeEventListener('pointerup', onRightUp)
  rightBaseRef.value.removeEventListener('pointercancel', onRightUp)
  activeRightId = null
  rightPos.x = 0
  rightPos.y = 0
  input.elevator = 0
  input.aileron = 0
  emit('input', { ...input })
}

// --- Trim Control Logic (generic factory) ---
const createTrimHandlers = (
  elRef: Ref<HTMLDivElement | null>,
  pos: { x: number },
  key: keyof Pick<JoystickInput, 'elevatorTrim' | 'aileronTrim' | 'rudderTrim'>,
  activeIdRef: { current: number | null },
) => {
  const handleMove = (event: PointerEvent) => {
    if (!elRef.value) return
    const rect = elRef.value.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const handleWidth = HANDLE.trim.width
    const maxTravel = (rect.width - handleWidth) / 2
    let deltaX = event.clientX - centerX
    deltaX = Math.max(-maxTravel, Math.min(maxTravel, deltaX))
    pos.x = deltaX
    input[key] = deltaX / maxTravel
    emit('input', { ...input })
  }

  const startDrag = (e: PointerEvent) => {
    if (activeIdRef.current !== null || !elRef.value) return
    activeIdRef.current = e.pointerId
    elRef.value.setPointerCapture(e.pointerId)
    handleMove(e)
    elRef.value.addEventListener('pointermove', onMove)
    elRef.value.addEventListener('pointerup', onUp)
    elRef.value.addEventListener('pointercancel', onUp)
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activeIdRef.current || !elRef.value) return
    handleMove(e)
  }

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activeIdRef.current || !elRef.value) return
    elRef.value.releasePointerCapture(e.pointerId)
    elRef.value.removeEventListener('pointermove', onMove)
    elRef.value.removeEventListener('pointerup', onUp)
    elRef.value.removeEventListener('pointercancel', onUp)
    activeIdRef.current = null
  }

  return { startDrag, onMove, onUp }
}

// Elevator Trim handlers
const elevTrimActiveRef = { current: activeElevTrimId }
const {
  startDrag: startElevTrimDrag,
  onMove: onElevTrimMove,
  onUp: onElevTrimUp,
} = createTrimHandlers(elevTrimRef, elevTrimPos, 'elevatorTrim', elevTrimActiveRef)
watch(
  () => elevTrimActiveRef.current,
  (val) => {
    activeElevTrimId = val
  },
)

// Aileron Trim handlers
const ailTrimActiveRef = { current: activeAilTrimId }
const {
  startDrag: startAilTrimDrag,
  onMove: onAilTrimMove,
  onUp: onAilTrimUp,
} = createTrimHandlers(ailTrimRef, ailTrimPos, 'aileronTrim', ailTrimActiveRef)
watch(
  () => ailTrimActiveRef.current,
  (val) => {
    activeAilTrimId = val
  },
)

// Rudder Trim handlers
const rudTrimActiveRef = { current: activeRudTrimId }
const {
  startDrag: startRudTrimDrag,
  onMove: onRudTrimMove,
  onUp: onRudTrimUp,
} = createTrimHandlers(rudTrimRef, rudTrimPos, 'rudderTrim', rudTrimActiveRef)
watch(
  () => rudTrimActiveRef.current,
  (val) => {
    activeRudTrimId = val
  },
)

// Cleanup on unmount
onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  const cleanup = (ref: HTMLDivElement | null, move: any, up: any) => {
    if (ref) {
      ref.removeEventListener('pointermove', move)
      ref.removeEventListener('pointerup', up)
      ref.removeEventListener('pointercancel', up)
    }
  }
  cleanup(throttleBaseRef.value, onThrottleMove, onThrottleUp)
  cleanup(mixtureBaseRef.value, onMixtureMove, onMixtureUp) // NEW
  cleanup(rudderBaseRef.value, onRudderMove, onRudderUp)
  cleanup(rightBaseRef.value, onRightMove, onRightUp)
  cleanup(elevTrimRef.value, onElevTrimMove, onElevTrimUp)
  cleanup(ailTrimRef.value, onAilTrimMove, onAilTrimUp)
  cleanup(rudTrimRef.value, onRudTrimMove, onRudTrimUp)
})
</script>
