import assert from 'node:assert/strict'
import test from 'node:test'
import { applyJoystickChanges } from '../src/JoystickControls.ts'
import { RemoteCallManager } from '../src/RemoteCallManager.ts'

const fields = {
  throttle: 'engine_throttle_position',
  aileron: 'aileron_position',
  elevator: 'elevator_position',
  rudder: 'rudder_position',
  mixture: 'engine_mixture_position',
  flaps: 'flaps_selector_position',
  gear: 'landing_gear_selector_position',
  aileronTrim: 'aileron_trim_position',
  elevatorTrim: 'elevator_trim_position',
  rudderTrim: 'rudder_trim_position',
}
function fixture() {
  const calls = []
  const model = {}
  for (const field of Object.values(fields)) {
    model[field] = 0
    model[`set_${field}`] = function (value) {
      assert.equal(this, model)
      calls.push([field, value])
      this[field] = value
    }
  }
  return { model, calls }
}

test('throttle motion only updates throttle, preserving other live controls', () => {
  const { model, calls } = fixture()
  model.elevator_position = 0.7
  applyJoystickChanges(model, { throttle: 0.5 })
  assert.deepEqual(calls, [['engine_throttle_position', 0.5]])
  assert.equal(model.elevator_position, 0.7)
  applyJoystickChanges(model, { throttle: 0.5 })
  assert.equal(calls.length, 1)
})

test('stick release applies final zero values and leaves trim untouched', () => {
  const { model, calls } = fixture()
  applyJoystickChanges(model, { aileron: 0.3, elevator: -0.2 })
  applyJoystickChanges(model, { aileron: 0, elevator: 0 })
  assert.equal(calls.length, 4)
  assert.deepEqual(calls.slice(-2), [
    ['aileron_position', 0],
    ['elevator_position', 0],
  ])
})

test('every supported control maps to its setter; unsupported mixture is ignored', () => {
  const { model, calls } = fixture()
  for (const key of Object.keys(fields)) applyJoystickChanges(model, { [key]: 1 })
  assert.equal(calls.length, Object.keys(fields).length)
  delete model.set_engine_mixture_position
  applyJoystickChanges(model, { mixture: 0 })
  assert.equal(calls.length, 10)
})

test('invalid or absent values do not call setters', () => {
  const { model, calls } = fixture()
  applyJoystickChanges(model, { throttle: NaN, elevator: Infinity, rudder: undefined, unknown: 1 })
  assert.deepEqual(calls, [])
})

test('one changed axis results in one mirrored call per peer, not seven', () => {
  const { model } = fixture()
  const messages = Array.from({ length: 30 }, () => [])
  const manager = new RemoteCallManager((call) => messages.forEach((peer) => peer.push(call)))
  manager.wrapObject('flightModel', model, ['set_'])
  applyJoystickChanges(model, { throttle: 0.5 })
  applyJoystickChanges(model, { throttle: 0.5 })
  assert.equal(
    messages.reduce((sum, peer) => sum + peer.length, 0),
    30,
  )
  assert.equal(messages[0][0].path.at(-1), 'set_engine_throttle_position')
})
