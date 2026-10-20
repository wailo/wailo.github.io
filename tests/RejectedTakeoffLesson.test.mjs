import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileUserScript } from '../src/EditorScriptRuntime.ts'
import { moduleTree } from '../src/components/data/EASAModules.ts'
const source = readFileSync(
  new URL('../public/LearningModules/b747_rejected_takeoff.ts', import.meta.url),
  'utf8',
)
const lesson = compileUserScript(source)

async function run(failStage) {
  const events = []
  const aircraft = new Proxy(
    {
      weight_on_wheel: true,
      damaged: false,
      speed_true_knots: 0,
      speed_indicated_knots: 0,
      latitude: 51,
      longitude: 0,
      flaps_position: 20,
    },
    {
      get(target, key) {
        if (typeof key === 'string' && key.startsWith('set_'))
          return (value) => {
            events.push([key, value])
            target[key.slice(4)] = value
          }
        return target[key]
      },
    },
  )
  const simulation = {
    simulation_time: 0,
    reset_simulation() {},
    set_flight_model_b747: () => aircraft,
    set_simulation_speed() {},
    set_simulation_pause(value) {
      events.push(['pause', value])
    },
  }
  let stage = 0
  const context = {
    controls: { simulation, B747FlapSelector: { TWENTY: 20 }, B747GearSelector: { DOWN: 0 } },
    props: new Proxy({}, { get: (_, key) => key }),
    layoutTypes: { PILOT: 1 },
    resetPanels() {},
    setLayout() {},
    setVisuals() {},
    setTab() {},
    dataView() {},
    plotView() {},
    notifyUser: async (title) => {
      events.push(['notice', title])
    },
    checkPoint: (title, data) => events.push(['checkpoint', title, data]),
    async waitForCondition(condition, confirmation, interval, timeout) {
      stage++
      assert.ok(timeout > 0)
      if (stage === failStage) return false
      if (stage === 2) {
        assert.equal(condition(), false)
        aircraft.speed_indicated_knots = 130
        aircraft.speed_true_knots = 130
      }
      if (stage === 3) {
        assert.equal(aircraft.engine_throttle_position, 0)
        assert.equal(aircraft.parking_brake, true)
        assert.equal(aircraft.engine_throttle_reverser_position, 1)
        assert.equal(condition(), false)
        aircraft.latitude += 0.001
        aircraft.speed_true_knots = 15
        assert.equal(condition(), false)
        assert.equal(aircraft.engine_throttle_reverser_position, 0.4)
        aircraft.speed_true_knots = 0
        simulation.simulation_time = 12
      }
      assert.equal(condition(), true)
      return true
    },
  }
  let error
  try {
    await lesson(context)
  } catch (e) {
    error = e
  }
  return { events, aircraft, error }
}

test('demo rejects before announcing, stops, then shuts down all four engines', async () => {
  const { events, aircraft, error } = await run()
  assert.equal(error, undefined)
  const reject = events.findIndex(
    (event) => event[0] === 'set_engine_throttle_reverser_position' && event[1] === 1,
  )
  assert.deepEqual(events.slice(reject - 2, reject + 1), [
    ['set_engine_throttle_position', 0],
    ['set_parking_brake', true],
    ['set_engine_throttle_reverser_position', 1],
  ])
  assert.ok(events.findIndex((event) => event[1] === 'V1 — REJECT') > reject)
  for (let i = 1; i <= 4; i++) assert.equal(aircraft[`engine_${i}_fuel_switch_state`], false)
  assert.equal(aircraft.engine_throttle_reverser_position, 0)
  const summary = events.find(
    (event) => event[0] === 'checkpoint' && event[1].startsWith('Stopped'),
  )[2]
  assert.equal(summary.stoppingTimeSeconds, 12)
  assert.ok(summary.stoppingDistanceMetres > 100)
  assert.ok(
    moduleTree.Demo.some((entry) => entry.path === '/LearningModules/b747_rejected_takeoff.ts'),
  )
})

for (const stage of [1, 2, 3])
  test(`timeout at stage ${stage} secures and pauses without reporting success`, async () => {
    const { events, aircraft, error } = await run(stage)
    assert.match(error.message, /timed out/)
    assert.equal(aircraft.engine_throttle_position, 0)
    assert.equal(aircraft.engine_throttle_reverser_position, 0)
    assert.equal(aircraft.parking_brake, true)
    assert.ok(events.some((event) => event[0] === 'pause' && event[1] === true))
    assert.ok(!events.some((event) => event[1] === 'Rejected take-off complete'))
  })
