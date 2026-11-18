import assert from 'node:assert/strict'
import test from 'node:test'
import { approachKey, airportStatus, draftNumber, snapshotAirport } from '../src/AirportState.ts'

const approach = ({
  runwayIndex,
  endIndex,
  runwayName = '27R',
  endName = '27R',
  course = 271,
  glideslope = 3,
}) => ({
  runway_index: runwayIndex,
  end_index: endIndex,
  runway_name: runwayName,
  end_name: endName,
  course_true_deg: course,
  glideslope_deg: glideslope,
  tch_m: 15,
  length_m: 3658,
  width_m: 45,
  displaced_m: 0,
})

const runway = {
  name: '27R/09L',
  length_m: 3658,
  width_m: 45,
  ends: [
    {
      name: '27R',
      true_heading_deg: 271,
      displaced_m: 300,
      blastpad_m: 60,
      markings: 3,
      approach: 2,
      touchdown: 1,
      reil: 2,
      glideslope_deg: 3,
    },
    {
      name: '09L',
      true_heading_deg: 91,
      displaced_m: 0,
      blastpad_m: 60,
      markings: 2,
      approach: 12,
      touchdown: 0,
      reil: 2,
      glideslope_deg: 3,
    },
  ],
}

const parking = (name, type, lat, lon) => ({
  name,
  type,
  operation: 'airline',
  true_heading_deg: 180,
  icao_width: 'E',
  lat,
  lon,
  aircraft_types: ['jets'],
  airlines: ['BAW'],
})

const holdingPoint = (name, lat, lon, runwayEnds, heading = 148, painted = true) => ({
  name,
  lat,
  lon,
  true_heading_deg: heading,
  runway_ends: runwayEnds,
  painted,
})

const layout = (overrides = {}) => ({
  approaches: [approach({ runwayIndex: 0, endIndex: 0 })],
  runways: [runway],
  parking: [parking('12', 'gate', 51.47, -0.46), parking('A1', 'tie_down', 51.48, -0.47)],
  // Painted hold-short lines are the only real holding positions.
  holding_points: [
    holdingPoint('A_stop', 51.471, -0.461, ['09L']),
    // Painted holds are named after the paint path; some carry no designator.
    holdingPoint('unnamed entity(split)', 51.472, -0.462, ['09L']),
    // A point that protects no published end is still a holding position.
    holdingPoint('B_start', 51.473, -0.463, []),
    // A hold whose source name carries no taxiway designator.
    holdingPoint('_stop', 51.474, -0.464, ['09L']),
    // Node-derived fallback: no paint, so it is not a marked hold.
    holdingPoint('C_stop', 51.475, -0.465, ['09L'], 148, false),
    // Two painted holds on the same taxiway are separate positions.
    holdingPoint('A_stop', 51.479, -0.469, ['09L']),
  ],
  datum: { lat: 51.47, lon: -0.46 },
  ...overrides,
})

const simulation = (world, overrides = {}) => ({
  airport_visible: true,
  airport_name: 'Heathrow',
  airport_id: 'EGLL',
  world,
  ...overrides,
})

const world = (metadata, selected = null) => ({
  airportMetadata: () => metadata,
  selected_approach: selected,
})

// The layout cache outlives a single snapshot, so a world-less snapshot starts
// each test from a clean cache.
const noWorld = () => snapshotAirport(simulation(null))

test('no loaded world still exposes the airport identity and visibility', () => {
  noWorld()
  const snapshot = snapshotAirport(simulation(null))
  assert.equal(snapshot.airportId, 'EGLL')
  assert.equal(snapshot.airportName, 'Heathrow')
  assert.equal(snapshot.airportVisible, true)
  assert.equal(snapshot.metadata, null)
})

test('approaches, runways, gates and holding points come from airportMetadata', () => {
  noWorld()
  const holds = layout().holding_points
  const snapshot = snapshotAirport(
    simulation(world(layout(), { ...approach({ runwayIndex: 0, endIndex: 0 }) })),
  )

  assert.equal(snapshot.metadata.approaches.length, 1)
  assert.deepEqual(snapshot.metadata.approaches[0], {
    key: '0:0',
    runwayIndex: 0,
    endIndex: 0,
    runwayName: '27R',
    endName: '27R',
    courseTrueDeg: 271,
    glideslopeDeg: 3,
    tchM: 15,
    lengthM: 3658,
    widthM: 45,
    displacedM: 0,
  })
  assert.equal(snapshot.metadata.selectedKey, '0:0')
  assert.deepEqual(snapshot.metadata.datum, { lat: 51.47, lon: -0.46 })

  assert.equal(snapshot.metadata.runways.length, 1)
  assert.equal(snapshot.metadata.runways[0].ends.length, 2)
  assert.equal(snapshot.metadata.runways[0].ends[0].key, '0:27R/09L:27R')
  assert.equal(snapshot.metadata.runways[0].ends[0].headingDeg, 271)

  // Only charted gates are offered; the tie-down is dropped.
  assert.equal(snapshot.metadata.gates.length, 1)
  assert.deepEqual(snapshot.metadata.gates[0], {
    key: '0:12',
    name: '12',
    type: 'gate',
    operation: 'airline',
    widthClass: 'E',
    headingDeg: 180,
    lat: 51.47,
    lon: -0.46,
    aircraftTypes: ['jets'],
    airlines: ['BAW'],
  })
  // The engine's `_stop` suffix marks the hold, so the label leaves it out.
  assert.deepEqual(snapshot.metadata.holdings[0], {
    key: '0:A_stop',
    name: 'A',
    headingDeg: 148,
    lat: 51.471,
    lon: -0.461,
    runwayEnds: ['09L'],
    painted: true,
  })
  // Only painted points are offered: the node-derived `C_stop` is dropped,
  // while the split node, the hold with no runway ends and the second hold on
  // the same taxiway survive.
  assert.equal(snapshot.metadata.holdings.length, holds.length - 1)
  assert.ok(snapshot.metadata.holdings.every((holding) => holding.painted))
  assert.equal(snapshot.metadata.holdings[1].name, '')
  assert.equal(snapshot.metadata.holdings[1].key, '1:unnamed entity(split)')
  assert.deepEqual(snapshot.metadata.holdings[2].runwayEnds, [])
  // A hold with no source designator becomes an empty label.
  assert.equal(snapshot.metadata.holdings[3].name, '')
  assert.equal(snapshot.metadata.holdings[3].key, '3:_stop')
  assert.equal(snapshot.metadata.holdings[4].lat, 51.479)
})

test('the layout is read once per airport, however often it is snapshotted', () => {
  noWorld()
  let reads = 0
  const heroWorld = {
    airportMetadata: () => {
      reads += 1
      return layout()
    },
    selected_approach: null,
  }
  const simulationView = simulation(heroWorld)

  snapshotAirport(simulationView)
  snapshotAirport(simulationView)
  snapshotAirport(simulationView)

  assert.equal(reads, 1)
})

test('a different airport ident rebuilds the layout', () => {
  noWorld()
  let reads = 0
  const countingWorld = {
    airportMetadata: () => {
      reads += 1
      return layout()
    },
    selected_approach: null,
  }

  snapshotAirport(simulation(countingWorld, { airport_id: 'EGLL' }))
  snapshotAirport(simulation(countingWorld, { airport_id: 'EHAM' }))

  assert.equal(reads, 2)
})

test('missing or malformed metadata yields an empty layout instead of throwing', () => {
  noWorld()
  const snapshot = snapshotAirport(
    simulation({
      airportMetadata: () => ({ approaches: 'nonsense', datum: { lat: Number.NaN, lon: 0 } }),
      selected_approach: null,
    }),
  )

  assert.deepEqual(snapshot.metadata, {
    datum: null,
    approaches: [],
    runways: [],
    gates: [],
    holdings: [],
    selectedKey: null,
  })
})

test('a world without airportMetadata degrades to no layout', () => {
  noWorld()
  const snapshot = snapshotAirport(
    simulation({ airportMetadata: undefined, selected_approach: null }),
  )

  assert.equal(snapshot.metadata.approaches.length, 0)
  assert.equal(snapshot.metadata.gates.length, 0)
})

test('approach keys combine the runway and end indices', () => {
  assert.equal(approachKey(2, 1), '2:1')
})

test('a numeric field follows its source until it is edited', () => {
  // Empty or unreadable text means "use the source again".
  assert.equal(draftNumber(null, 30), 30)
  assert.equal(draftNumber('', 30), 30)
  assert.equal(draftNumber('   ', 30), 30)
  assert.equal(draftNumber('abc', 30), 30)
  assert.equal(draftNumber('45', 30), 45)
  // v-model on an <input type="number"> hands the setter a number, not text.
  assert.equal(draftNumber(500, 0), 500)
  assert.equal(draftNumber(-45, 0), -45)
  assert.equal(draftNumber(Number.NaN, 0), 0)
})

test('status names the loaded airport and refuses to guess without a world', () => {
  noWorld()
  assert.equal(airportStatus(snapshotAirport(simulation(world(layout())))), 'EGLL')
  assert.equal(airportStatus(snapshotAirport(simulation(null))), 'NO AIRPORT')
  assert.equal(airportStatus(null), 'LOADING')
})
