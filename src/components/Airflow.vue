<template>
  <div class="flex h-full w-full min-h-0 flex-col text-secondary">
    <div
      class="grid shrink-0 grid-cols-5 border-b border-simElementBorder bg-panelHeaderBackground"
    >
      <div class="px-2 py-1">
        <span class="opacity-60">AOA</span>
        <span class="ml-2 text-simActiveButton">{{ angleOfAttack.toFixed(1) }}°</span>
      </div>
      <div class="border-l border-simElementBorder px-2 py-1">
        <span class="opacity-60">AIRSPEED</span>
        <span class="ml-2 text-simActiveButton">{{ airspeed.toFixed(0) }} kt</span>
      </div>
      <div class="border-l border-simElementBorder px-2 py-1">
        <span class="opacity-60">PITCH</span>
        <span class="ml-2 text-simActiveButton">{{ pitchAngle.toFixed(1) }}°</span>
      </div>
      <div class="border-l border-simElementBorder px-2 py-1">
        <span class="opacity-60">GAMMA</span>
        <span class="ml-2 text-simActiveButton">{{ gammaAngle.toFixed(1) }}°</span>
      </div>
      <div class="border-l border-simElementBorder px-2 py-1">
        <span class="opacity-60">FLAPS</span>
        <span class="ml-2 text-simActiveButton">{{ flapDisplay }}</span>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <svg
        class="h-full min-h-0 w-full flex-1 bg-panelContentBackground"
        viewBox="0 40 800 420"
        role="img"
        :aria-label="`Airfoil at ${angleOfAttack.toFixed(1)} degrees angle of attack and ${airspeed.toFixed(0)} knots`"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker
            id="airflow-arrowhead"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M 0 0 L 7 3.5 L 0 7 Z" class="fill-secondary" />
          </marker>
          <mask id="airflow-reference-clearance">
            <rect x="0" y="0" width="800" height="500" fill="white" />
            <rect x="12" y="180" width="232" height="66" rx="3" fill="black" />
          </mask>
        </defs>

        <g
          class="airflow-field"
          mask="url(#airflow-reference-clearance)"
          :style="{ opacity: airflowOpacity }"
        >
          <g v-for="(stream, streamIndex) in streamlines" :key="streamIndex">
            <path
              :id="`airflow-stream-${streamIndex}`"
              :d="stream"
              class="airflow-line"
              :class="{
                'separated-flow':
                  stalling && (angleOfAttack >= 0 ? streamIndex < 4 : streamIndex >= 4),
              }"
            />
            <path v-if="airspeed > 0.5" d="M -7 -4 L 5 0 L -7 4 Z" class="fill-secondary">
              <animateMotion
                :dur="`${airflowDuration}s`"
                :begin="`${airflowAnimationDelay(streamIndex)}s`"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath :href="`#airflow-stream-${streamIndex}`" />
              </animateMotion>
            </path>
          </g>
        </g>

        <line x1="70" y1="250" x2="730" y2="250" class="reference-line" />
        <text x="76" y="242" class="diagram-label">RELATIVE AIRFLOW</text>
        <text
          x="724"
          y="58"
          text-anchor="end"
          class="flow-status"
          :class="stalling ? 'stall-warning' : 'attached-status'"
        >
          {{ stalling ? 'STALL · FLOW SEPARATED' : 'FLOW ATTACHED' }}
        </text>

        <g v-if="stalling" aria-label="Turbulent separated wake">
          <g
            v-for="(vortex, index) in stallVortices"
            :key="`vortex-${index}`"
            :transform="`translate(${vortex.x} ${vortex.y}) scale(${vortex.scale})`"
          >
            <path d="M 16 0 A 16 16 0 1 1 -5 -15" class="vortex-line">
              <animateTransform
                attributeName="transform"
                type="rotate"
                :from="`0 0 0`"
                :to="`${vortex.clockwise ? 360 : -360} 0 0`"
                :dur="`${1.8 + index * 0.4}s`"
                repeatCount="indefinite"
              />
            </path>
          </g>
        </g>

        <g :transform="`translate(400 250) rotate(${airfoilRotation})`">
          <!-- NACA 2412 main section -->
          <path
            :d="mainAirfoilPath"
            class="airfoil-surface"
            :class="{ 'stall-surface': stalling }"
          />

          <!-- Plain flap: continuous with the main profile at zero deflection -->
          <path
            :d="flapPath"
            class="airfoil-control"
            :class="{ 'stall-surface': stalling }"
            :transform="`rotate(${flapDeflection} ${flapHinge.x} ${flapHinge.y})`"
          />

          <circle :cx="flapHinge.x" :cy="flapHinge.y" r="3" class="fill-panelActive" />

          <!-- Drawn after the filled geometry so the chord remains continuous through the airfoil. -->
          <line x1="150" y1="0" x2="-190" y2="0" class="chord-line" />
        </g>

        <!-- Angular references share the trailing edge and render above the airfoil. -->
        <g transform="translate(550 250)">
          <line x1="0" y1="0" x2="-480" y2="0" class="flight-path-reference" />
          <g :transform="`rotate(${-gammaReferenceAngle})`">
            <line x1="0" y1="0" x2="-480" y2="0" class="horizon-reference" />
          </g>
        </g>

        <g transform="translate(400 250)">
          <path :d="angleArc" class="angle-arc" />
          <text x="34" :y="angleLabelY" class="diagram-label">
            α {{ angleOfAttack.toFixed(1) }}°
          </text>
        </g>

        <g transform="translate(20 465)">
          <rect width="220" height="20" class="legend-frame" />
          <path d="M 8 10 H 42" class="airflow-line" marker-end="url(#airflow-arrowhead)" />
          <text x="50" y="14" class="diagram-label">AIRFLOW SPEED {{ speedDescription }}</text>
        </g>

        <g transform="translate(16 184)">
          <rect width="235" height="58" rx="2" class="reference-key-background" />
          <line x1="8" y1="12" x2="42" y2="12" class="chord-line" />
          <text x="50" y="16" class="pitch-label">CHORD · θ {{ pitchAngle.toFixed(1) }}°</text>
          <line x1="8" y1="30" x2="42" y2="30" class="flight-path-reference" />
          <text x="50" y="34" class="gamma-label">
            FLIGHT PATH · γ {{ gammaAngle.toFixed(1) }}°
          </text>
          <line x1="8" y1="48" x2="42" y2="48" class="horizon-reference" />
          <text x="50" y="52" class="diagram-label">HORIZON</text>
        </g>
      </svg>

      <svg
        class="min-h-0 flex-1 border-t border-simElementBorder bg-panelContentBackground"
        viewBox="0 0 800 260"
        role="img"
        :aria-label="`Live angle of attack versus lift coefficient plot. Current CL ${liftCoefficient.toFixed(2)} at ${angleOfAttack.toFixed(1)} degrees.`"
        preserveAspectRatio="none"
      >
        <text x="12" y="18" class="diagram-label">LIVE LIFT CURVE · AOA vs CL</text>

        <line
          :x1="liftChart.left"
          :y1="liftChart.bottom"
          :x2="liftChart.right"
          :y2="liftChart.bottom"
          class="chart-axis"
        />
        <line
          :x1="liftChart.left"
          :y1="liftChart.top"
          :x2="liftChart.left"
          :y2="liftChart.bottom"
          class="chart-axis"
        />

        <line
          v-if="maxAngleOfAttack > 0"
          :x1="liftChart.stallX"
          :y1="liftChart.top"
          :x2="liftChart.stallX"
          :y2="liftChart.bottom"
          class="stall-reference"
        />
        <text
          v-if="maxAngleOfAttack > 0"
          :x="liftChart.stallX + 5"
          :y="liftChart.top + 12"
          class="stall-label"
        >
          MAX AOA {{ maxAngleOfAttack.toFixed(1) }}°
        </text>

        <polyline v-if="liftChart.points" :points="liftChart.points" class="lift-trace" />
        <circle
          :cx="liftChart.currentX"
          :cy="liftChart.currentY"
          r="4"
          :class="stalling ? 'fill-panelActive stall-marker' : 'fill-simActiveButton'"
        />

        <text :x="liftChart.left" y="252" class="diagram-label">{{ liftChart.minAoa }}°</text>
        <text :x="liftChart.right - 28" y="252" class="diagram-label">{{ liftChart.maxAoa }}°</text>
        <text x="390" y="252" class="diagram-label">AOA (°)</text>
        <text x="8" :y="liftChart.top + 5" class="diagram-label">
          {{ liftChart.maxCl.toFixed(1) }}
        </text>
        <text x="8" :y="liftChart.bottom" class="diagram-label">
          {{ liftChart.minCl.toFixed(1) }}
        </text>
        <text x="8" y="138" class="diagram-label">CL</text>
        <text x="570" y="18" class="diagram-label">
          α {{ angleOfAttack.toFixed(1) }}° · CL {{ liftCoefficient.toFixed(2) }}
        </text>
        <text v-if="stalling" x="770" y="18" text-anchor="end" class="stall-label">STALL</text>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import type { SimulationProperties } from '../wasm/siminterface'

const props = defineProps({
  simProps: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true,
  },
  liftCoefficient: {
    type: Number,
    required: true,
  },
  maxAngleOfAttack: {
    type: Number,
    required: true,
  },
  stalling: {
    type: Boolean,
    required: true,
  },
})

const readNumber = (ids: string[], fallback = 0) => {
  for (const id of ids) {
    const property = props.simProps[id]
    const value = Number(property?.inputValue)
    if (Number.isFinite(value)) return value
  }
  return fallback
}

const angleOfAttack = computed(() => readNumber(['aoa_deg']))
const pitchAngle = computed(() => readNumber(['pitch_deg']))
const gammaAngle = computed(() => pitchAngle.value - angleOfAttack.value)
const airspeed = computed(() =>
  Math.max(0, readNumber(['speed_indicated_knots', 'speed_true_knots'])),
)
const rawFlapPosition = computed(() => Math.max(0, readNumber(['flaps_position'])))
const flapRatio = computed(() =>
  Math.min(1, rawFlapPosition.value <= 1 ? rawFlapPosition.value : rawFlapPosition.value / 30),
)

const airfoilRotation = computed(() => Math.max(-20, Math.min(25, angleOfAttack.value)))
const gammaReferenceAngle = computed(() => Math.max(-30, Math.min(30, gammaAngle.value)))
const flapDeflection = computed(() => flapRatio.value * 32)
const flapDisplay = computed(() => {
  const degrees = rawFlapPosition.value <= 1 ? rawFlapPosition.value * 30 : rawFlapPosition.value
  return `${degrees.toFixed(0)}°`
})

const airflowDuration = computed(() => {
  const speedRatio = Math.min(1, airspeed.value / 250)
  return 14 - speedRatio * 9.5
})
const airflowOpacity = computed(() => String(0.25 + Math.min(1, airspeed.value / 80) * 0.75))
const speedDescription = computed(() => {
  if (airspeed.value < 1) return 'STOPPED'
  if (airspeed.value < 60) return 'LOW'
  if (airspeed.value < 160) return 'MEDIUM'
  return 'HIGH'
})

const airflowAnimationDelay = (streamIndex: number) =>
  -((streamIndex % 4) / 4) * airflowDuration.value
const streamlineOffsets = [-120, -90, -60, -30, 30, 60, 90, 120]

const angleArc = computed(() => {
  const radius = 48
  const angle = (airfoilRotation.value * Math.PI) / 180
  const x = radius * Math.cos(angle)
  const y = radius * Math.sin(angle)
  const sweep = airfoilRotation.value >= 0 ? 1 : 0
  return `M ${radius} 0 A ${radius} ${radius} 0 0 ${sweep} ${x} ${y}`
})
const angleLabelY = computed(() => (airfoilRotation.value >= 0 ? 24 : -12))
type LiftSample = { aoa: number; cl: number }
const liftSamples = ref<LiftSample[]>([])

watch(
  [angleOfAttack, () => props.liftCoefficient],
  ([aoa, cl]) => {
    if (!Number.isFinite(aoa) || !Number.isFinite(cl)) return
    const previous = liftSamples.value.at(-1)
    if (previous && Math.abs(previous.aoa - aoa) < 0.005 && Math.abs(previous.cl - cl) < 0.0005) {
      return
    }
    liftSamples.value = [...liftSamples.value.slice(-299), { aoa, cl }]
  },
  { immediate: true },
)

const liftChart = computed(() => {
  const left = 55
  const right = 780
  const top = 28
  const bottom = 225
  const observedAoa = liftSamples.value.map((sample) => sample.aoa)
  const observedCl = liftSamples.value.map((sample) => sample.cl)
  const minAoa = Math.floor(Math.min(-5, ...observedAoa))
  const maxAoa = Math.ceil(Math.max(20, props.maxAngleOfAttack + 3, ...observedAoa))
  const minCl = Math.min(-0.5, ...observedCl)
  const maxCl = Math.max(1.5, ...observedCl)
  const xScale = (aoa: number) =>
    left + ((aoa - minAoa) / Math.max(1, maxAoa - minAoa)) * (right - left)
  const yScale = (cl: number) =>
    bottom - ((cl - minCl) / Math.max(0.1, maxCl - minCl)) * (bottom - top)

  return {
    left,
    right,
    top,
    bottom,
    minAoa,
    maxAoa,
    minCl,
    maxCl,
    stallX: xScale(props.maxAngleOfAttack),
    currentX: xScale(angleOfAttack.value),
    currentY: yScale(props.liftCoefficient),
    points: liftSamples.value
      .map((sample) => `${xScale(sample.aoa).toFixed(1)},${yScale(sample.cl).toFixed(1)}`)
      .join(' '),
  }
})

// NACA 2412 geometry. The main section and flap share the exact hinge samples,
// so the zero-deflection outline is continuous by construction.
const chord = 300
const leadingEdgeX = -150
const flapStart = 0.75
const nacaCamber = 0.02
const nacaCamberPosition = 0.4
const nacaThickness = 0.12

type AirfoilPoint = { x: number; y: number }

const nacaSurfacePoint = (chordPosition: number, upper: boolean): AirfoilPoint => {
  const x = Math.max(0, Math.min(1, chordPosition))
  const thickness =
    5 *
    nacaThickness *
    (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4)

  const camber =
    x < nacaCamberPosition
      ? (nacaCamber / nacaCamberPosition ** 2) * (2 * nacaCamberPosition * x - x ** 2)
      : (nacaCamber / (1 - nacaCamberPosition) ** 2) *
        (1 - 2 * nacaCamberPosition + 2 * nacaCamberPosition * x - x ** 2)
  const camberSlope =
    x < nacaCamberPosition
      ? ((2 * nacaCamber) / nacaCamberPosition ** 2) * (nacaCamberPosition - x)
      : ((2 * nacaCamber) / (1 - nacaCamberPosition) ** 2) * (nacaCamberPosition - x)
  const surfaceAngle = Math.atan(camberSlope)
  const surfaceX = upper
    ? x - thickness * Math.sin(surfaceAngle)
    : x + thickness * Math.sin(surfaceAngle)
  const surfaceY = upper
    ? camber + thickness * Math.cos(surfaceAngle)
    : camber - thickness * Math.cos(surfaceAngle)

  return {
    x: leadingEdgeX + surfaceX * chord,
    y: -surfaceY * chord,
  }
}

const sampleSurface = (start: number, end: number, count: number, upper: boolean) =>
  Array.from({ length: count + 1 }, (_, index) =>
    nacaSurfacePoint(start + ((end - start) * index) / count, upper),
  )

const pathFromClosedSurfaces = (upper: AirfoilPoint[], lower: AirfoilPoint[]) => {
  const points = [...upper, ...lower.slice().reverse()]
  return `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')} Z`
}

const mainAirfoilPath = pathFromClosedSurfaces(
  sampleSurface(0, flapStart, 42, true),
  sampleSurface(0, flapStart, 42, false),
)
const flapPath = pathFromClosedSurfaces(
  sampleSurface(flapStart, 1, 18, true),
  sampleSurface(flapStart, 1, 18, false),
)
const flapUpperHinge = nacaSurfacePoint(flapStart, true)
const flapLowerHinge = nacaSurfacePoint(flapStart, false)
const flapHinge = {
  x: (flapUpperHinge.x + flapLowerHinge.x) / 2,
  y: (flapUpperHinge.y + flapLowerHinge.y) / 2,
}

const stallSeverity = computed(() => {
  if (!props.stalling) return 0
  const referenceAoa = Math.max(1, Math.abs(props.maxAngleOfAttack))
  return Math.max(0.45, Math.min(1, Math.abs(angleOfAttack.value) / referenceAoa))
})

const stallVortices = computed(() => {
  const wakeSide = angleOfAttack.value >= 0 ? -1 : 1
  const severity = stallSeverity.value
  return [
    { x: 555, y: 250 + wakeSide * (38 + 20 * severity), scale: 0.65, clockwise: true },
    { x: 620, y: 250 + wakeSide * (27 + 12 * severity), scale: 0.9, clockwise: false },
    { x: 695, y: 250 + wakeSide * (18 + 8 * severity), scale: 0.7, clockwise: true },
  ]
})

const streamlines = computed(() => {
  const angle = (airfoilRotation.value * Math.PI) / 180
  const cosine = Math.max(0.8, Math.cos(angle))
  const sine = Math.sin(angle)
  const entryLength = 240
  const exitLength = 300

  const configuredSurfaceY = (chordPosition: number, upper: boolean) => {
    const baseSurfacePoint = nacaSurfacePoint(chordPosition, upper)
    let surfaceX = baseSurfacePoint.x
    let surfaceLocalY = baseSurfacePoint.y
    if (chordPosition >= flapStart) {
      const flapAngle = (flapDeflection.value * Math.PI) / 180
      const flapCosine = Math.cos(flapAngle)
      const flapSine = Math.sin(flapAngle)
      const hingeOffsetX = baseSurfacePoint.x - flapHinge.x
      const hingeOffsetY = baseSurfacePoint.y - flapHinge.y
      surfaceX = flapHinge.x + hingeOffsetX * flapCosine - hingeOffsetY * flapSine
      surfaceLocalY = flapHinge.y + hingeOffsetX * flapSine + hingeOffsetY * flapCosine
    }
    return 250 + surfaceX * sine + surfaceLocalY * cosine
  }

  const surfaceSlope = (chordPosition: number, upper: boolean) => {
    const sampleDistance = 0.003
    const before = configuredSurfaceY(Math.max(0, chordPosition - sampleDistance), upper)
    const after = configuredSurfaceY(Math.min(1, chordPosition + sampleDistance), upper)
    const localDistance = Math.max(
      chord * sampleDistance,
      (Math.min(1, chordPosition + sampleDistance) - Math.max(0, chordPosition - sampleDistance)) *
        chord,
    )
    return Math.max(-0.45, Math.min(0.45, (after - before) / localDistance))
  }

  const hermite = (
    startY: number,
    endY: number,
    startSlope: number,
    endSlope: number,
    distance: number,
    progress: number,
  ) => {
    const t = Math.max(0, Math.min(1, progress))
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * startY +
      (t3 - 2 * t2 + t) * distance * startSlope +
      (-2 * t3 + 3 * t2) * endY +
      (t3 - t2) * distance * endSlope
    )
  }

  const linePoints = streamlineOffsets.map((offset) => {
    const upper = offset < 0
    const separatedSurface = props.stalling && (angleOfAttack.value >= 0 ? upper : !upper)
    const clearance = 8 + (Math.abs(offset) - 30) * 0.38
    const layerIndex = (Math.abs(offset) - 30) / 30
    const layerInfluence = [1, 0.62, 0.32, 0.14][layerIndex] ?? 0.14
    const farFieldY = 250 + offset
    const sideClearance = upper ? -clearance : clearance
    const leadingProfileY =
      farFieldY + (configuredSurfaceY(0, upper) + sideClearance - farFieldY) * layerInfluence
    const leadingSlope = surfaceSlope(0.02, upper) * layerInfluence
    const separationStart = 0.56 - stallSeverity.value * 0.18
    const profileY = (chordPosition: number) => {
      const surfaceY = configuredSurfaceY(chordPosition, upper) + sideClearance
      const attachedY = farFieldY + (surfaceY - farFieldY) * layerInfluence
      if (!separatedSurface || chordPosition <= separationStart) return attachedY

      const separationProgress =
        (chordPosition - separationStart) / Math.max(0.01, 1 - separationStart)
      const direction = upper ? -1 : 1
      const displacement =
        direction *
        layerInfluence *
        stallSeverity.value *
        (22 * separationProgress ** 1.35 +
          5 * Math.sin(separationProgress * Math.PI * 3 + layerIndex * 0.8) * separationProgress)
      return attachedY + displacement
    }
    const trailingProfileY = profileY(1)
    const trailingSlope = separatedSurface
      ? Math.max(-0.65, Math.min(0.65, (profileY(1) - profileY(0.97)) / (chord * 0.03)))
      : surfaceSlope(0.98, upper) * layerInfluence
    const downstreamY = trailingProfileY + trailingSlope * exitLength * 0.5

    const points = Array.from({ length: 96 }, (_, index) => {
      const globalX = 24 + (752 * index) / 95
      const approximateLocalX = (globalX - 400) / cosine
      const chordPosition = (approximateLocalX - leadingEdgeX) / chord
      let globalY: number

      if (approximateLocalX < leadingEdgeX) {
        const entryStart = leadingEdgeX - entryLength
        globalY =
          approximateLocalX <= entryStart
            ? farFieldY
            : hermite(
                farFieldY,
                leadingProfileY,
                0,
                leadingSlope,
                entryLength,
                (approximateLocalX - entryStart) / entryLength,
              )
      } else if (approximateLocalX <= leadingEdgeX + chord) {
        globalY = profileY(chordPosition)
      } else {
        const exitProgress = (approximateLocalX - (leadingEdgeX + chord)) / exitLength
        globalY =
          exitProgress >= 1
            ? downstreamY
            : hermite(trailingProfileY, downstreamY, trailingSlope, 0, exitLength, exitProgress)
      }
      return { x: globalX, y: globalY }
    })

    return points
  })

  const minimumSpacing = 8
  for (let pointIndex = 0; pointIndex < linePoints[0].length; pointIndex++) {
    const upperInner = linePoints[3][pointIndex]
    const lowerInner = linePoints[4][pointIndex]
    if (lowerInner.y - upperInner.y < minimumSpacing) {
      const midpoint = (upperInner.y + lowerInner.y) / 2
      upperInner.y = midpoint - minimumSpacing / 2
      lowerInner.y = midpoint + minimumSpacing / 2
    }

    // Preserve the surface-adjacent lines, moving outer upper layers upward.
    for (let lineIndex = 2; lineIndex >= 0; lineIndex--) {
      linePoints[lineIndex][pointIndex].y = Math.min(
        linePoints[lineIndex][pointIndex].y,
        linePoints[lineIndex + 1][pointIndex].y - minimumSpacing,
      )
    }

    // Preserve the surface-adjacent lines, moving outer lower layers downward.
    for (let lineIndex = 5; lineIndex < linePoints.length; lineIndex++) {
      linePoints[lineIndex][pointIndex].y = Math.max(
        linePoints[lineIndex][pointIndex].y,
        linePoints[lineIndex - 1][pointIndex].y + minimumSpacing,
      )
    }
  }

  return linePoints.map((points) =>
    points
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' '),
  )
})
</script>

<style scoped>
.airflow-line {
  fill: none;
  stroke: rgb(var(--color-secondary));
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.separated-flow {
  stroke: rgb(var(--color-panelActive));
  stroke-dasharray: 5 3;
}

.flow-status {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
}

.attached-status {
  fill: rgb(var(--color-simActiveButton));
}

.stall-warning {
  fill: rgb(var(--color-panelActive));
}

.stall-surface {
  stroke: rgb(var(--color-panelActive));
}

.vortex-line {
  fill: none;
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
  vector-effect: non-scaling-stroke;
}

.stall-marker {
  animation: stall-pulse 1s ease-in-out infinite;
}

@keyframes stall-pulse {
  50% {
    opacity: 0.35;
  }
}

.reference-line {
  stroke: rgb(var(--color-simElementBorder));
  stroke-width: 1;
  stroke-dasharray: 7 5;
  vector-effect: non-scaling-stroke;
}

.chord-line {
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  vector-effect: non-scaling-stroke;
}

.flight-path-reference {
  stroke: rgb(var(--color-simActiveButton));
  stroke-width: 1.5;
  stroke-dasharray: 8 4;
  vector-effect: non-scaling-stroke;
}

.horizon-reference {
  stroke: rgb(var(--color-simElementBorder));
  stroke-width: 1.5;
  stroke-dasharray: 3 4;
  vector-effect: non-scaling-stroke;
}

.reference-key-background {
  fill: rgb(var(--color-panelContentBackground));
  fill-opacity: 0.92;
}

.airfoil-surface,
.airfoil-control {
  fill: rgb(var(--color-panelHeaderBackground));
  stroke: rgb(var(--color-secondary));
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.airfoil-control {
  fill: rgb(var(--color-simInputBackground));
  stroke: rgb(var(--color-simActiveButton));
}

.angle-arc {
  fill: none;
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.pitch-label {
  fill: rgb(var(--color-panelActive));
  font-family: monospace;
  font-size: 11px;
}

.gamma-label {
  fill: rgb(var(--color-simActiveButton));
  font-family: monospace;
  font-size: 11px;
}

.chart-axis {
  stroke: rgb(var(--color-secondary));
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.lift-trace {
  fill: none;
  stroke: rgb(var(--color-simActiveButton));
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.stall-reference {
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
}

.stall-label {
  fill: rgb(var(--color-panelActive));
  font-family: monospace;
  font-size: 10px;
}

.diagram-label {
  fill: rgb(var(--color-secondary));
  font-family: monospace;
  font-size: 11px;
}

.legend-frame {
  fill: rgb(var(--color-panelHeaderBackground));
  stroke: rgb(var(--color-simElementBorder));
  stroke-width: 1;
}
</style>
