<template>
  <div
    class="flex flex-col w-full h-full bg-simBackground text-secondary font-mono overflow-hidden select-none p-0 gap-0"
  >
    <!-- Combined & Compact Telemetry Panel -->
    <div
      class="grid gap-1 pb-1 bg-panelContentBackground flex-shrink-0"
      :class="input.mixture !== undefined ? 'grid-cols-8' : 'grid-cols-7'"
    >
      <!-- Primary Controls -->
      <div class="flex flex-col items-center justify-center h-8 border border-panelBorder">
        <span class="text-[8px] tracking-[0.15em] opacity-60">THR</span>
        <span class="text-[11px] font-bold text-simActiveButton">
          {{ Math.round(input.throttle * 100) }}%
        </span>
      </div>
      <div class="flex flex-col items-center justify-center h-8 border border-panelBorder">
        <span class="text-[8px] tracking-[0.15em] opacity-60">ELEV</span>
        <span class="text-[11px] font-bold text-simActiveButton">
          {{ input.elevator > 0 ? '+' : '' }}{{ Math.round(input.elevator * 100) }}
        </span>
      </div>
      <div class="flex flex-col items-center justify-center h-8 border border-panelBorder">
        <span class="text-[8px] tracking-[0.15em] opacity-60">AIL</span>
        <span class="text-[11px] font-bold text-simActiveButton">
          {{ input.aileron > 0 ? '+' : '' }}{{ Math.round(input.aileron * 100) }}
        </span>
      </div>
      <div class="flex flex-col items-center justify-center h-8 border border-panelBorder">
        <span class="text-[8px] tracking-[0.15em] opacity-60">RUD</span>
        <span class="text-[11px] font-bold text-simActiveButton">
          {{ input.rudder > 0 ? '+' : '' }}{{ Math.round(input.rudder * 100) }}
        </span>
      </div>

      <!-- Mixture Telemetry (conditional) -->
      <div
        v-if="input.mixture !== undefined"
        class="flex flex-col items-center justify-center h-8 border border-panelBorder"
      >
        <span class="text-[8px] tracking-[0.15em] opacity-60">MIX</span>
        <span class="text-[11px] font-bold text-simActiveButton">
          {{ Math.round(input.mixture * 100) }}%
        </span>
      </div>

      <!-- Trim Values (Visual separation using subtle background change) -->
      <div
        class="flex flex-col items-center justify-center h-8 border border-panelBorder/60 bg-panelContentBackground/40"
      >
        <span class="text-[8px] tracking-[0.15em] opacity-60">E.TRM</span>
        <span class="text-[11px] font-bold text-simActiveButton/90">
          {{ input.elevatorTrim > 0 ? '+' : '' }}{{ Math.round(input.elevatorTrim * 100) }}
        </span>
      </div>
      <div
        class="flex flex-col items-center justify-center h-8 border border-panelBorder/60 bg-panelContentBackground/40"
      >
        <span class="text-[8px] tracking-[0.15em] opacity-60">A.TRM</span>
        <span class="text-[11px] font-bold text-simActiveButton/90">
          {{ input.aileronTrim > 0 ? '+' : '' }}{{ Math.round(input.aileronTrim * 100) }}
        </span>
      </div>
      <div
        class="flex flex-col items-center justify-center h-8 border border-panelBorder/60 bg-panelContentBackground/40"
      >
        <span class="text-[8px] tracking-[0.15em] opacity-60">R.TRM</span>
        <span class="text-[11px] font-bold text-simActiveButton/90">
          {{ input.rudderTrim > 0 ? '+' : '' }}{{ Math.round(input.rudderTrim * 100) }}
        </span>
      </div>
    </div>

    <!-- Main Controls -->
    <div class="grid grid-cols-2 gap-1 w-full flex-1 min-h-0 overflow-y-auto">
      <!-- LEFT PANEL -->
      <!-- LEFT PANEL -->
      <div
        class="grid gap-1 min-h-full border border-panelBorder bg-panelContentBackground p-1 min-w-0"
        :class="
          input.mixture !== undefined
            ? 'grid-rows-[minmax(0,1fr)_auto_auto]'
            : 'grid-rows-[minmax(0,1fr)_auto_auto]'
        "
      >
        <!-- THROTTLE + MIXTURE -->
        <div
          class="flex items-stretch justify-center gap-4 min-h-0"
          :class="input.mixture !== undefined ? 'flex-row' : 'justify-center'"
        >
          <!-- THROTTLE -->
          <div class="flex items-center justify-center gap-2 min-h-0">
            <!-- Vertical Label -->
            <div class="flex items-center justify-center h-full">
              <span
                class="text-[9px] tracking-[0.2em] opacity-60 rotate-[-90deg] whitespace-nowrap"
              >
                THROTTLE
              </span>
            </div>

            <!-- THROTTLE SLIDER -->
            <div class="relative flex justify-center items-center min-h-0 h-full">
              <div
                ref="throttleBaseRef"
                class="relative w-[18px] h-full bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ns-resize touch-none"
                @pointerdown="startThrottleDrag"
              >
                <!-- Tick Marks -->
                <div
                  v-for="i in 10"
                  :key="'throttle-' + i"
                  class="absolute left-[3px] right-[3px] h-px bg-panelBorder/40"
                  :style="{ bottom: `${i * 10}%` }"
                ></div>

                <!-- Idle Mark -->
                <div class="absolute left-0 right-0" style="bottom: 20%">
                  <div class="h-px bg-simActiveButton w-full"></div>
                  <span
                    class="absolute left-full ml-2 -translate-y-1/2 top-1/2 text-[8px] text-simActiveButton opacity-90 whitespace-nowrap pointer-events-none"
                  >
                    IDLE
                  </span>
                </div>

                <!-- Handle -->
                <div
                  class="absolute left-1/2 top-1/2 w-7 h-[10px] bg-simActiveButton border border-secondary/40 rounded-[2px] pointer-events-none"
                  :style="throttleStyle"
                ></div>
              </div>
            </div>
          </div>

          <!-- MIXTURE -->
          <div
            v-if="input.mixture !== undefined"
            class="flex items-center justify-center gap-2 min-h-0"
          >
            <!-- Vertical Label -->
            <div class="flex items-center justify-center h-full">
              <span
                class="text-[9px] tracking-[0.2em] opacity-60 rotate-[-90deg] whitespace-nowrap"
              >
                MIXTURE
              </span>
            </div>

            <!-- MIXTURE SLIDER -->
            <div class="relative flex justify-center items-center min-h-0 h-full">
              <div
                ref="mixtureBaseRef"
                class="relative w-[18px] h-full bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ns-resize touch-none"
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

        <!-- YAW / RUDDER -->
        <div class="flex flex-col items-center justify-center min-h-0">
          <span class="text-[9px] tracking-[0.2em] opacity-60 mb-1 flex-shrink-0"> RUDDER </span>

          <div
            ref="rudderBaseRef"
            class="relative w-full max-w-[180px] h-[18px] bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none flex-shrink-0"
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
        </div>

        <!-- TRIM CONTROLS -->
        <div class="flex flex-col gap-3 pt-2 border-t border-panelBorder/40">
          <!-- Elevator Trim -->
          <div class="flex items-center gap-2">
            <span class="text-[8px] tracking-[0.15em] opacity-60 w-16 flex-shrink-0">
              ELEV TRIM
            </span>

            <div
              ref="elevTrimRef"
              class="relative flex-1 h-[14px] bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
              @pointerdown="startElevTrimDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-simActiveButton/60"></div>

              <div
                class="absolute left-1/2 top-1/2 -translate-y-1/2 w-[8px] h-5 bg-simActiveButton border border-secondary/40 rounded-[1px] pointer-events-none"
                :style="elevTrimStyle"
              ></div>
            </div>
          </div>

          <!-- Aileron Trim -->
          <div class="flex items-center gap-2">
            <span class="text-[8px] tracking-[0.15em] opacity-60 w-16 flex-shrink-0">
              AIL TRIM
            </span>

            <div
              ref="ailTrimRef"
              class="relative flex-1 h-[14px] bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
              @pointerdown="startAilTrimDrag"
            >
              <div class="absolute top-0 bottom-0 left-1/2 w-px bg-simActiveButton/60"></div>

              <div
                class="absolute left-1/2 top-1/2 -translate-y-1/2 w-[8px] h-5 bg-simActiveButton border border-secondary/40 rounded-[1px] pointer-events-none"
                :style="ailTrimStyle"
              ></div>
            </div>
          </div>

          <!-- Rudder Trim -->
          <div class="flex items-center gap-2">
            <span class="text-[8px] tracking-[0.15em] opacity-60 w-16 flex-shrink-0">
              RUD TRIM
            </span>

            <div
              ref="rudTrimRef"
              class="relative flex-1 h-[14px] bg-simInputBackground border border-simElementBorder overflow-hidden cursor-ew-resize touch-none"
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
      </div>

      <!-- RIGHT PANEL - Flight Stick -->
      <div
        class="flex items-center justify-center border border-panelBorder bg-panelContentBackground relative min-w-0 min-h-full overflow-hidden"
      >
        <!-- Aileron Label (horizontal axis) -->
        <span
          class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full text-[9px] tracking-[0.2em] opacity-60 whitespace-nowrap pb-1 pointer-events-none flex-shrink-0"
        >
          AILERON
        </span>

        <!-- Elevator Label (vertical axis) -->
        <span
          class="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 text-[9px] tracking-[0.2em] opacity-60 rotate-90 origin-top-left whitespace-nowrap pr-1 pointer-events-none flex-shrink-0"
        >
          ELEVATOR
        </span>

        <div
          ref="rightBaseRef"
          class="relative aspect-square w-full max-w-[180px] max-h-full rounded-full border border-simElementBorder bg-simInputBackground overflow-hidden cursor-crosshair touch-none"
          @pointerdown="startRightDrag"
        >
          <!-- Crosshair -->
          <div class="absolute inset-x-0 top-1/2 h-px bg-panelBorder/40"></div>
          <div class="absolute inset-y-0 left-1/2 w-px bg-panelBorder/40"></div>
          <!-- Outer Ring -->
          <div class="absolute inset-[10%] rounded-full border border-panelBorder/40"></div>
          <!-- Inner Ring -->
          <div class="absolute inset-[28%] rounded-full border border-panelBorder/20"></div>
          <!-- Radial Ring -->
          <div
            class="absolute inset-0 rounded-full opacity-40"
            style="
              background: radial-gradient(
                circle,
                transparent 68%,
                rgba(255, 255, 255, 0.1) 69%,
                transparent 70%
              );
            "
          ></div>
          <!-- Stick -->
          <div
            class="absolute left-1/2 top-1/2 w-[10%] h-[10%] rounded-full bg-simActiveButton border border-secondary/40 pointer-events-none"
            :style="rightStickStyle"
          ></div>
        </div>
      </div>
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
}

// --- Input Channel (Props) ---
const props = defineProps<{
  externalInputs?: JoystickInput
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
    if (rect.width > 0) {
      const maxRadius = rect.width * 0.425
      rightPos.x = input.aileron * maxRadius
      rightPos.y = -input.elevator * maxRadius
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
    syncPositionsFromControls()
  },
  { deep: true, flush: 'post' },
)

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
  const maxRadius = rect.width * 0.425
  let deltaX = event.clientX - centerX
  let deltaY = event.clientY - centerY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  if (distance > maxRadius) {
    const angle = Math.atan2(deltaY, deltaX)
    deltaX = Math.cos(angle) * maxRadius
    deltaY = Math.sin(angle) * maxRadius
  }
  rightPos.x = deltaX
  rightPos.y = deltaY
  input.aileron = deltaX / maxRadius
  input.elevator = -deltaY / maxRadius
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
