<template>
  <div class="flex h-full w-full min-h-0 flex-col text-secondary">
    <div
      class="grid shrink-0 grid-cols-4 border-b border-simElementBorder bg-panelHeaderBackground"
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
        <span class="opacity-60">FLAPS</span>
        <span class="ml-2 text-simActiveButton">{{ flapDisplay }}</span>
      </div>
    </div>

    <svg
      class="min-h-0 flex-1 bg-panelContentBackground"
      viewBox="0 0 800 500"
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
        <marker
          id="pitch-arrowhead"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M 0 0 L 7 3.5 L 0 7 Z" class="fill-panelActive" />
        </marker>
      </defs>

      <g class="airflow-field" :style="{ opacity: airflowOpacity }">
        <g v-for="(stream, streamIndex) in streamlines" :key="streamIndex">
          <path
            :id="`airflow-stream-${streamIndex}`"
            :d="stream"
            class="airflow-line"
            marker-end="url(#airflow-arrowhead)"
          />
          <template v-if="airspeed > 0.5">
            <path
              v-for="offset in arrowOffsets"
              :key="offset"
              d="M -7 -4 L 5 0 L -7 4 Z"
              class="fill-secondary"
            >
              <animateMotion
                :dur="`${airflowDuration}s`"
                :begin="`${-offset * airflowDuration}s`"
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath :href="`#airflow-stream-${streamIndex}`" />
              </animateMotion>
            </path>
          </template>
        </g>
      </g>

      <line x1="70" y1="250" x2="730" y2="250" class="reference-line" />
      <text x="76" y="242" class="diagram-label">RELATIVE AIRFLOW</text>

      <g :transform="`translate(400 250) rotate(${airfoilRotation})`">
        <line x1="-175" y1="0" x2="175" y2="0" class="chord-line" />

        <!-- NACA 2412 main section -->
        <path :d="mainAirfoilPath" class="airfoil-surface" />

        <!-- Plain flap: continuous with the main profile at zero deflection -->
        <path
          :d="flapPath"
          class="airfoil-control"
          :transform="`rotate(${flapDeflection} ${flapHinge.x} ${flapHinge.y})`"
        />

        <circle :cx="flapHinge.x" :cy="flapHinge.y" r="3" class="fill-panelActive" />
      </g>

      <g transform="translate(400 250)">
        <path :d="angleArc" class="angle-arc" />
        <text x="34" :y="angleLabelY" class="diagram-label">α {{ angleOfAttack.toFixed(1) }}°</text>
      </g>

      <g transform="translate(20 465)">
        <rect width="220" height="20" class="legend-frame" />
        <path d="M 8 10 H 42" class="airflow-line" marker-end="url(#airflow-arrowhead)" />
        <text x="50" y="14" class="diagram-label">AIRFLOW SPEED {{ speedDescription }}</text>
      </g>

      <g transform="translate(620 455)">
        <line x1="-65" y1="0" x2="75" y2="0" class="reference-line" />
        <line
          x1="0"
          y1="0"
          x2="70"
          y2="0"
          class="pitch-reference"
          :transform="`rotate(${-pitchReferenceAngle})`"
          marker-end="url(#pitch-arrowhead)"
        />
        <path :d="pitchArc" class="angle-arc" />
        <text x="-65" y="16" class="diagram-label">HORIZON</text>
        <text x="10" y="-10" class="diagram-label">θ {{ pitchAngle.toFixed(1) }}°</text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { SimulationProperties } from '../wasm/siminterface'

const props = defineProps({
  simProps: {
    type: Object as PropType<Record<string, SimulationProperties>>,
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
const airspeed = computed(() =>
  Math.max(0, readNumber(['speed_indicated_knots', 'speed_true_knots'])),
)
const rawFlapPosition = computed(() => Math.max(0, readNumber(['flaps_position'])))
const flapRatio = computed(() =>
  Math.min(1, rawFlapPosition.value <= 1 ? rawFlapPosition.value : rawFlapPosition.value / 30),
)

const airfoilRotation = computed(() => Math.max(-20, Math.min(25, angleOfAttack.value)))
const pitchReferenceAngle = computed(() => Math.max(-30, Math.min(30, pitchAngle.value)))
const flapDeflection = computed(() => flapRatio.value * 32)
const flapDisplay = computed(() => {
  const degrees = rawFlapPosition.value <= 1 ? rawFlapPosition.value * 30 : rawFlapPosition.value
  return `${degrees.toFixed(0)}°`
})

const airflowDuration = computed(() => {
  const speedRatio = Math.min(1, airspeed.value / 250)
  return 4.5 - speedRatio * 4
})
const airflowOpacity = computed(() => String(0.25 + Math.min(1, airspeed.value / 80) * 0.75))
const speedDescription = computed(() => {
  if (airspeed.value < 1) return 'STOPPED'
  if (airspeed.value < 60) return 'LOW'
  if (airspeed.value < 160) return 'MEDIUM'
  return 'HIGH'
})

const arrowOffsets = [0, 0.33, 0.66]
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
const pitchArc = computed(() => {
  const radius = 28
  const angle = (pitchReferenceAngle.value * Math.PI) / 180
  const x = radius * Math.cos(angle)
  const y = -radius * Math.sin(angle)
  const sweep = pitchReferenceAngle.value >= 0 ? 0 : 1
  return `M ${radius} 0 A ${radius} ${radius} 0 0 ${sweep} ${x} ${y}`
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
    (0.2969 * Math.sqrt(x) -
      0.126 * x -
      0.3516 * x ** 2 +
      0.2843 * x ** 3 -
      0.1036 * x ** 4)

  const camber =
    x < nacaCamberPosition
      ? (nacaCamber / nacaCamberPosition ** 2) *
        (2 * nacaCamberPosition * x - x ** 2)
      : (nacaCamber / (1 - nacaCamberPosition) ** 2) *
        (1 - 2 * nacaCamberPosition + 2 * nacaCamberPosition * x - x ** 2)
  const camberSlope =
    x < nacaCamberPosition
      ? ((2 * nacaCamber) / nacaCamberPosition ** 2) * (nacaCamberPosition - x)
      : ((2 * nacaCamber) / (1 - nacaCamberPosition) ** 2) *
        (nacaCamberPosition - x)
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
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
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
      (Math.min(1, chordPosition + sampleDistance) -
        Math.max(0, chordPosition - sampleDistance)) *
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
    const clearance = 8 + (Math.abs(offset) - 30) * 0.38
    const layerIndex = (Math.abs(offset) - 30) / 30
    const layerInfluence = [1, 0.62, 0.32, 0.14][layerIndex] ?? 0.14
    const farFieldY = 250 + offset
    const sideClearance = upper ? -clearance : clearance
    const leadingProfileY =
      farFieldY +
      (configuredSurfaceY(0, upper) + sideClearance - farFieldY) * layerInfluence
    const trailingProfileY =
      farFieldY +
      (configuredSurfaceY(1, upper) + sideClearance - farFieldY) * layerInfluence
    const leadingSlope = surfaceSlope(0.02, upper) * layerInfluence
    const trailingSlope = surfaceSlope(0.98, upper) * layerInfluence
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
        const surfaceY = configuredSurfaceY(chordPosition, upper) + sideClearance
        globalY = farFieldY + (surfaceY - farFieldY) * layerInfluence
      } else {
        const exitProgress = (approximateLocalX - (leadingEdgeX + chord)) / exitLength
        globalY =
          exitProgress >= 1
            ? downstreamY
            : hermite(
                trailingProfileY,
                downstreamY,
                trailingSlope,
                0,
                exitLength,
                exitProgress,
              )
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
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
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

.reference-line {
  stroke: rgb(var(--color-simElementBorder));
  stroke-width: 1;
  stroke-dasharray: 7 5;
  vector-effect: non-scaling-stroke;
}

.chord-line {
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1;
  stroke-dasharray: 5 4;
  vector-effect: non-scaling-stroke;
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

.pitch-reference {
  stroke: rgb(var(--color-panelActive));
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
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
