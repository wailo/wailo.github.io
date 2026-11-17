import type { graphics } from './wasm/generated/flightsimulator_exec'

/** A latitude/longitude pair. */
export interface GeoPoint {
  lat: number
  lon: number
}

/**
 * What the panel asks the engine to reposition to. The engine owns the
 * geometry: the panel only forwards the selected approach and the preset.
 */
export interface ApproachRepositionRequest {
  airportId: string
  /** The runway end name, for example `36R`. */
  runwayId: string
  /** Distance from the threshold along the final course. */
  distanceM: number
  /** Positive is right of the extended centreline. */
  lateralOffsetM: number
  /** The track flown, relative to the final course. */
  headingOffsetDeg: number
  /** Target speed in knots. */
  targetSpeedKt: number
}

/** One approach as the Airport panel renders it. */
export interface AirportApproachView {
  key: string
  runwayIndex: number
  endIndex: number
  runwayName: string
  endName: string
  courseTrueDeg: number
  glideslopeDeg: number
  tchM: number
  lengthM: number
  widthM: number
  displacedM: number
}

/** One runway end as the Airport panel renders it. */
export interface AirportRunwayEndView {
  key: string
  name: string
  headingDeg: number
  displacedM: number
  blastpadM: number
  markings: number
  approach: number
  touchdown: number
  reil: number
  glideslopeDeg: number
}

export interface AirportRunwayView {
  key: string
  name: string
  lengthM: number
  widthM: number
  ends: AirportRunwayEndView[]
}

/** One gate: a parking position the panel offers as a placement target. */
export interface AirportGateView {
  key: string
  name: string
  type: string
  operation: string
  widthClass: string
  headingDeg: number
  lat: number
  lon: number
  aircraftTypes: string[]
  airlines: string[]
}

/** One runway holding point: where an aircraft waits to enter a runway. */
export interface AirportHoldingView {
  key: string
  name: string
  headingDeg: number
  lat: number
  lon: number
  runwayEnds: string[]
  /** Placed from a painted hold-short line, rather than inferred from nodes. */
  painted: boolean
}

/**
 * The airport layout the panel renders. It is sampled from the engine once per
 * loaded airport, because building it allocates a tree of roughly two thousand
 * objects (about 12 ms on EHAM).
 */
export interface AirportMetadata {
  datum: GeoPoint | null
  approaches: AirportApproachView[]
  runways: AirportRunwayView[]
  gates: AirportGateView[]
  holdings: AirportHoldingView[]
  /** The selection changes without the layout changing, so it is merged per snapshot. */
  selectedKey: string | null
}

/** A render-ready snapshot of the airport and approach state. */
export interface AirportView {
  airportVisible: boolean
  airportName: string
  airportId: string
  metadata: AirportMetadata | null
}

export const approachKey = (runwayIndex: number, endIndex: number) => `${runwayIndex}:${endIndex}`

// ---------------------------------------------------------------------------
// The snake_case tree the engine serialises. It is typed here rather than in
// the generated bindings, which expose airportMetadata() as `any`.
// ---------------------------------------------------------------------------

interface RawApproach {
  runway_index: number
  end_index: number
  runway_name: string
  end_name: string
  course_true_deg: number
  glideslope_deg: number
  tch_m: number
  length_m: number
  width_m: number
  displaced_m: number
}

interface RawRunwayEnd {
  name: string
  true_heading_deg: number
  displaced_m: number
  blastpad_m: number
  markings: number
  approach: number
  touchdown: number
  reil: number
  glideslope_deg: number
}

interface RawRunway {
  name: string
  length_m: number
  width_m: number
  ends?: RawRunwayEnd[]
}

interface RawParking {
  name: string
  type: string
  operation: string
  true_heading_deg: number
  icao_width: string
  lat: number
  lon: number
  aircraft_types?: string[]
  airlines?: string[]
}

interface RawHoldingPoint {
  name: string
  lat: number
  lon: number
  true_heading_deg: number
  runway_ends?: string[]
  painted?: boolean
}

interface RawAirportMetadata {
  approaches?: RawApproach[]
  runways?: RawRunway[]
  parking?: RawParking[]
  holding_points?: RawHoldingPoint[]
  datum?: GeoPoint
}

type AirportLayout = Omit<AirportMetadata, 'selectedKey'>
type AirportWorld = NonNullable<graphics['world']>

const asList = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : [])

const toApproach = (raw: RawApproach): AirportApproachView => ({
  key: approachKey(raw.runway_index, raw.end_index),
  runwayIndex: raw.runway_index,
  endIndex: raw.end_index,
  runwayName: raw.runway_name,
  endName: raw.end_name,
  courseTrueDeg: raw.course_true_deg,
  glideslopeDeg: raw.glideslope_deg,
  tchM: raw.tch_m,
  lengthM: raw.length_m,
  widthM: raw.width_m,
  displacedM: raw.displaced_m,
})

const toRunway = (raw: RawRunway, index: number): AirportRunwayView => {
  const key = `${index}:${raw.name}`
  return {
    key,
    name: raw.name,
    lengthM: raw.length_m,
    widthM: raw.width_m,
    ends: asList(raw.ends).map((end) => ({
      key: `${key}:${end.name}`,
      name: end.name,
      headingDeg: end.true_heading_deg,
      displacedM: end.displaced_m,
      blastpadM: end.blastpad_m,
      markings: end.markings,
      approach: end.approach,
      touchdown: end.touchdown,
      reil: end.reil,
      glideslopeDeg: end.glideslope_deg,
    })),
  }
}

// Only charted gates are offered; tie-downs and misc aprons would add another
// 144 chips to a panel that already lists every approach.
const isGate = (raw: RawParking) => String(raw.type).toLowerCase() === 'gate'

const toGate = (raw: RawParking, index: number): AirportGateView => ({
  // Stand names repeat across width classes, so the index keeps the key unique.
  key: `${index}:${raw.name}`,
  name: raw.name,
  type: raw.type,
  operation: raw.operation,
  widthClass: raw.icao_width,
  headingDeg: raw.true_heading_deg,
  lat: raw.lat,
  lon: raw.lon,
  aircraftTypes: asList(raw.aircraft_types),
  airlines: asList(raw.airlines),
})

// The layout names a hold `<taxiway>_stop` (or just `_stop` when the source has
// no designator); the suffix marks the stopping point rather than the location,
// so it is dropped from the label. Rows with no name at all arrive as an
// "unnamed entity" sentinel, which is reported as empty so the panel can show a
// placeholder. The key stays index-based and unaffected.
const holdingName = (raw: RawHoldingPoint) => {
  const name = String(raw.name ?? '')
    .replace(/_(stop|start)$/i, '')
    .trim()
  return /^unnamed\b/i.test(name) ? '' : name
}

const toHolding = (raw: RawHoldingPoint, index: number): AirportHoldingView => ({
  // Hold names repeat many times over the airport, so the index disambiguates.
  key: `${index}:${raw.name}`,
  name: holdingName(raw),
  headingDeg: raw.true_heading_deg,
  lat: raw.lat,
  lon: raw.lon,
  runwayEnds: asList(raw.runway_ends),
  painted: Boolean(raw.painted),
})

const toDatum = (raw: GeoPoint | undefined): GeoPoint | null =>
  raw && Number.isFinite(raw.lat) && Number.isFinite(raw.lon)
    ? { lat: raw.lat, lon: raw.lon }
    : null

function buildLayout(raw: RawAirportMetadata | null): AirportLayout {
  if (!raw) return { datum: null, approaches: [], runways: [], gates: [], holdings: [] }

  return {
    datum: toDatum(raw.datum),
    approaches: asList(raw.approaches).map(toApproach),
    runways: asList(raw.runways).map(toRunway),
    gates: asList(raw.parking).filter(isGate).map(toGate),
    // Only painted hold-short lines are real holding positions: the layout
    // derives one point per painted line, so every painted point is offered as
    // it arrives. Node-derived fallbacks are hints, not marked positions.
    holdings: asList(raw.holding_points)
      .filter((holding) => Boolean(holding.painted))
      .map(toHolding),
  }
}

// The layout is static for a loaded airport, so it is built once and reused for
// the life of the page. `world` yields a fresh embind handle on every read, so
// the airport ident is the cache key rather than the handle.
let cachedLayout: { airportId: string; layout: AirportLayout } | null = null

function readLayout(world: AirportWorld, airportId: string): AirportLayout {
  if (cachedLayout && cachedLayout.airportId === airportId) return cachedLayout.layout

  const raw =
    typeof world.airportMetadata === 'function'
      ? (world.airportMetadata() as RawAirportMetadata | null)
      : null
  const layout = buildLayout(raw)
  cachedLayout = { airportId, layout }
  return layout
}

/**
 * Header status for the Airport surface. Identity belongs to the loaded world:
 * without one the name/id bindings have nothing meaningful to read, so they
 * are reported as absent rather than echoed.
 */
export function airportStatus(view: AirportView | null): string {
  if (!view) return 'LOADING'
  if (!view.metadata) return 'NO AIRPORT'
  return view.airportId || view.airportName || 'NO AIRPORT'
}

/**
 * Embind getters are not reactive, so the caller resamples this on the UI tick.
 * The layout comes from one airportMetadata() call per loaded airport; only the
 * selection is read every tick, which is free by comparison.
 */
export function snapshotAirport(simulation: graphics): AirportView {
  const world = simulation.world
  const airportId = simulation.airport_id
  let metadata: AirportMetadata | null = null

  if (world) {
    const layout = readLayout(world, airportId)
    const selected = world.selected_approach
    metadata = {
      ...layout,
      selectedKey: selected ? approachKey(selected.runway_index, selected.end_index) : null,
    }
  } else {
    cachedLayout = null
  }

  return {
    airportVisible: simulation.airport_visible,
    airportName: simulation.airport_name,
    airportId,
    metadata,
  }
}
