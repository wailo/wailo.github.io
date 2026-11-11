import assert from 'node:assert/strict'
import test from 'node:test'
import { approachKey, airportStatus, snapshotAirport } from '../src/AirportState.ts'

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

const simulation = (world) => ({
  airport_visible: true,
  airport_name: 'Heathrow',
  airport_id: 'EGLL',
  world,
})

test('no loaded world still exposes the airport identity and visibility', () => {
  const snapshot = snapshotAirport(simulation(null))
  assert.equal(snapshot.airportId, 'EGLL')
  assert.equal(snapshot.airportName, 'Heathrow')
  assert.equal(snapshot.airportVisible, true)
  assert.equal(snapshot.world, null)
})

test('approaches are read through size and get and keep their selection', () => {
  const entries = [
    approach({ runwayIndex: 0, endIndex: 0 }),
    approach({
      runwayIndex: 1,
      endIndex: 1,
      runwayName: '09L',
      endName: '09L',
      course: 91,
      glideslope: 3.25,
    }),
  ]
  const world = {
    approaches: {
      size: () => entries.length,
      get: (index) => entries[index],
    },
    selected_approach: entries[1],
    datum: { lat: 51.47, lon: -0.46 },
    select_runway_end: () => true,
    select_runway_end_by_name: () => true,
  }

  const snapshot = snapshotAirport(simulation(world))

  assert.equal(snapshot.world.approaches.length, 2)
  assert.equal(snapshot.world.selectedKey, approachKey(1, 1))
  assert.deepEqual(snapshot.world.datum, { lat: 51.47, lon: -0.46 })
  assert.deepEqual(snapshot.world.approaches[0], {
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
  assert.equal(snapshot.world.approaches[1].glideslopeDeg, 3.25)
})

test('a missing approach handle is skipped and clears the selection key', () => {
  const world = {
    approaches: {
      size: () => 2,
      get: (index) => (index === 0 ? approach({ runwayIndex: 0, endIndex: 0 }) : undefined),
    },
    selected_approach: null,
    datum: { lat: 0, lon: 0 },
  }

  const snapshot = snapshotAirport(simulation(world))

  assert.equal(snapshot.world.approaches.length, 1)
  assert.equal(snapshot.world.selectedKey, null)
})

test('approach keys combine the runway and end indices', () => {
  assert.equal(approachKey(2, 1), '2:1')
})

test('status names the loaded airport and refuses to guess without a world', () => {
  const world = {
    approaches: { size: () => 0, get: () => undefined },
    selected_approach: null,
    datum: { lat: 0, lon: 0 },
  }

  assert.equal(airportStatus(snapshotAirport(simulation(world))), 'EGLL')
  assert.equal(airportStatus(snapshotAirport(simulation(null))), 'NO AIRPORT')
  assert.equal(airportStatus(null), 'LOADING')
})
