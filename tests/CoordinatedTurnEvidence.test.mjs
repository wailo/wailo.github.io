import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { compileUserScript } from '../src/EditorScriptRuntime.ts'
import { createLessonRunStore } from '../src/useLessonRun.ts'

const source = fs.readFileSync(
  new URL('../public/LearningModules/coordinated_turn_challenge.ts', import.meta.url),
  'utf8',
)

async function exercise(t, samples) {
  let now = 0
  t.mock.method(Date, 'now', () => now)
  const store = createLessonRunStore()
  const run = store.begin('coordinated_turn_challenge', 'Coordinated turn')
  const messages = []
  const received = []
  const model = {
    altitude_ft: 5000,
    yaw_deg: 0,
    speed_indicated_knots: 100,
    vertical_speed: 0,
    yaw_dot_deg: 3,
    bank_deg: 20,
    pitch_deg: 3,
    elevator_position: 0,
    aileron_position: 0,
    autopilot_master_switch: false,
    set_autopilot_master_switch(value) {
      this.autopilot_master_switch = value
    },
    set_autopilot_altitude_hold() {},
    set_autopilot_speed_indicated_hold() {},
    set_autopilot_heading_hold() {},
  }
  const context = {
    controls: {
      flightModel: model,
      simulation: { reset_simulation() {}, set_flight_model_c172() {} },
    },
    props: {},
    metrics: run.metrics,
    resetPanels() {},
    plotView() {},
    async repositionWithAutopilot() {},
    notifyUser: (...args) => messages.push(args),
    waitFor: async (ms) => {
      now += ms
    },
    waitForCondition: async (condition, confirmation, interval, timeout, throws) => {
      assert.deepEqual([confirmation, interval, timeout, throws], [0, 400, 60000, false])
      for (const sample of samples) {
        now += sample.advanceMs ?? 5000
        Object.assign(model, sample.values)
        if (condition()) return true
      }
      now += timeout
      return false
    },
    checkPoint: (message, data) => {
      const checkpoint = store.recordCheckpoint(run.runId, message, data)
      // Exercise the same JSON payload shape sent through the classroom connection.
      received.push(JSON.parse(JSON.stringify({ checkpoint: message, data: checkpoint.data })))
    },
  }
  await compileUserScript(source)(context)
  store.finish(run.runId, 'COMPLETED', 'Lesson completed')
  return { snapshot: store.snapshot(), messages, received, model }
}

test('coordinated turn produces teaching context, progress, and unchanged component scores', async (t) => {
  const { snapshot, messages, received } = await exercise(t, [
    { values: { yaw_deg: 60, altitude_ft: 5050 } },
    { values: { yaw_deg: 120, altitude_ft: 5000 } },
    { values: { yaw_deg: 180 } },
  ])
  assert.deepEqual(
    snapshot.checkpoints.map((item) => item.data.step),
    ['setup', 'ready', 'turn', 'turn', 'turn', 'result'],
  )
  const teaching = snapshot.checkpoints[0].data.teachingContext
  assert.equal(teaching.mode, 'practice')
  assert.equal(teaching.assessment.timeLimitMs, 60000)
  assert.match(teaching.assessment.coordination, /not measured/)
  const result = snapshot.checkpoints.at(-1).data
  assert.equal(result.outcome, 'passed')
  assert.equal(result.headingChangeDeg, 180)
  assert.equal(result.measurements.maxAltitudeDeviationFt, 50)
  assert.deepEqual(result.scores, {
    time: 95,
    turnRate: 100,
    verticalSpeed: 100,
    altitude: 99,
    speed: 100,
    pitch: 100,
  })
  assert.equal(snapshot.metrics.length, 3)
  assert.match(messages.find(([title]) => title.includes('Challenge Complete'))[1], /score: 95.00/)
  assert.deepEqual(received.at(-1).data, result)
  assert.equal(snapshot.step, 'result')
})

test('altitude failure reports evidence without inventing a score', async (t) => {
  const { snapshot } = await exercise(t, [{ values: { altitude_ft: 5150, yaw_deg: 30 } }])
  const result = snapshot.checkpoints.at(-1).data
  assert.equal(result.outcome, 'failed')
  assert.equal(result.reason, 'altitude-limit')
  assert.equal(result.altitudeDeviationFt, 150)
  assert.equal(result.scores, undefined)
})

test('timeout reports failure and retains the existing sample metrics', async (t) => {
  const { snapshot } = await exercise(t, [{ values: { yaw_deg: 10 } }])
  const result = snapshot.checkpoints.at(-1).data
  assert.equal(result.reason, 'timeout')
  assert.equal(result.outcome, 'failed')
  assert.equal(result.scores, undefined)
  assert.equal(snapshot.metrics.length, 1)
})

test('autopilot intervention is observable without changing existing behavior', async (t) => {
  const { snapshot, model } = await exercise(t, [
    { values: { autopilot_master_switch: true, yaw_deg: 10 } },
    { values: { yaw_deg: 100 } },
    { values: { yaw_deg: 180 } },
  ])
  assert.equal(model.autopilot_master_switch, false)
  const intervention = snapshot.checkpoints.find(
    (item) => item.data.event === 'autopilot-intervention',
  )
  assert.equal(intervention.data.autopilotInterventions, 1)
  assert.equal(snapshot.checkpoints.at(-1).data.outcome, 'passed')
})
