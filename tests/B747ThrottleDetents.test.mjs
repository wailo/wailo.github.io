import assert from 'node:assert/strict'
import test from 'node:test'
import { describeB747Throttle, idleDetentCenter } from '../src/B747ThrottleDetents.ts'

test('B747 labels match reverse, inclusive idle valley, and forward axis ranges', () => {
  for (const [axis, label] of [
    [0, 'REV 100%'],
    [0.125, 'REV 50%'],
    [0.249, 'REV 0%'],
    [0.25, 'IDLE'],
    [idleDetentCenter, 'IDLE'],
    [0.3, 'IDLE'],
    [0.65, 'FWD 50%'],
    [1, 'FWD 100%'],
    [-1, 'REV 100%'],
    [2, 'FWD 100%'],
  ])
    assert.equal(describeB747Throttle(axis), label)
})
