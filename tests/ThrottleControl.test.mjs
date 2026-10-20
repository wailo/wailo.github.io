import assert from 'node:assert/strict'
import test from 'node:test'
import { throttleFromSlider, sliderFromThrottle, sliderFromReadback } from '../src/ThrottleControl.ts'
import {
  describeB747Throttle,
  reverseIdleEntry,
  forwardIdleExit,
  engineIdleThrottlePosition,
} from '../src/B747ThrottleDetents.ts'
import { applyJoystickChanges } from '../src/JoystickControls.ts'

const engineThrottleSpan = 1 - engineIdleThrottlePosition

test('combined axis sends exactly one engine channel: reverser below the valley, throttle above', () => {
  for (const axis of [0, 0.25, 0.275, 0.3, 0.65, 1]) assert.equal(sliderFromThrottle(axis), axis)
  // Reverse region drives the reverser only; the engine couples the throttle itself.
  assert.deepEqual(throttleFromSlider(0, true), { reverseCommand: 1 })
  assert.deepEqual(throttleFromSlider(0.125, true), { reverseCommand: 0.5 })
  // Idle valley and forward drive the throttle only, in engine units (idle 0.26 .. 1).
  assert.deepEqual(throttleFromSlider(0.25, true), { throttle: engineIdleThrottlePosition })
  assert.deepEqual(throttleFromSlider(0.275, true), { throttle: engineIdleThrottlePosition })
  assert.deepEqual(throttleFromSlider(0.3, true), { throttle: engineIdleThrottlePosition })
  assert.ok(Math.abs(throttleFromSlider(0.65, true).throttle - 0.63) < 1e-12)
  assert.deepEqual(throttleFromSlider(1, true), { throttle: 1 })
})

test('throttle moves never carry both thrust channels', () => {
  for (let axis = 0; axis <= 1.0001; axis += 0.01) {
    const changes = throttleFromSlider(axis, true)
    assert.ok(
      !('throttle' in changes && 'reverseCommand' in changes),
      `axis ${axis.toFixed(2)} wrote both channels: ${JSON.stringify(changes)}`,
    )
  }
})

test('readback channels map back onto the same combined axis', () => {
  // Engine readback: throttle channel 0.26..1 when forward, reverser 0..1 when reversing.
  assert.equal(sliderFromReadback(engineIdleThrottlePosition, 0), forwardIdleExit)
  assert.ok(Math.abs(sliderFromReadback(0.63, 0) - 0.65) < 1e-12)
  assert.equal(sliderFromReadback(1, 0), 1)
  // The reverser setter leaves throttle at 0.26 * (1 - reverser); readback ignores it.
  assert.ok(
    Math.abs(sliderFromReadback(engineIdleThrottlePosition * 0.5, 0.5) - 0.125) < 1e-12,
  )
  assert.equal(sliderFromReadback(0, 1), 0)
  assert.equal(sliderFromReadback(engineIdleThrottlePosition, 0.001), forwardIdleExit)

  // Commanded axis -> engine lever state -> readback axis reproduces the position.
  // (0.25 sits on the idle plateau, which reads back at the forwardIdleExit edge.)
  for (const axis of [0, 0.125, 0.3, 0.5, 0.65, 1]) {
    const command = throttleFromSlider(axis, true)
    const reverser = command.reverseCommand ?? 0
    // One lever: a reverser write sets throttle to idle * (1 - reverser);
    // a forward write leaves it at the commanded throttle.
    const engineThrottle =
      command.throttle ?? engineIdleThrottlePosition * (1 - reverser)
    assert.ok(
      Math.abs(sliderFromReadback(engineThrottle, reverser) - axis) < 1e-9,
      `axis ${axis} round-tripped to ${sliderFromReadback(engineThrottle, reverser)}`,
    )
  }
  // Idle-valley positions can only be expressed as their nearest readback edge.
  assert.equal(sliderFromReadback(engineIdleThrottlePosition, 0), forwardIdleExit)
})

test('slider input routes the combined axis to the forward or reverse setter', () => {
  const calls = []
  const model = {
    engine_throttle_position: 0,
    set_engine_throttle_position(value) {
      this.engine_throttle_position = value
      calls.push(['forward', value])
    },
    engine_throttle_reverser_position: 0,
    set_engine_throttle_reverser_position(value) {
      this.engine_throttle_reverser_position = value
      calls.push(['reverse', value])
    },
  }
  for (const position of [0, 0.125, 0.25, 0.275, 0.3, 0.65, 1]) {
    applyJoystickChanges(model, throttleFromSlider(position, true))
  }
  assert.deepEqual(calls.slice(0, 3), [
    ['reverse', 1],
    ['reverse', 0.5],
    ['forward', engineIdleThrottlePosition],
  ])
  assert.ok(Math.abs(calls[3][1] - 0.63) < 1e-12)
  assert.equal(calls[3][0], 'forward')
  assert.deepEqual(calls[4], ['forward', 1])
})

test('description of combined axis stays in the UI domain', () => {
  assert.equal(describeB747Throttle(0), 'REV 100%')
  assert.equal(describeB747Throttle(reverseIdleEntry / 2), 'REV 50%')
  assert.equal(describeB747Throttle(0.275), 'IDLE')
  assert.equal(describeB747Throttle(0.65), 'FWD 50%')
  assert.equal(describeB747Throttle(1), 'FWD 100%')
})
