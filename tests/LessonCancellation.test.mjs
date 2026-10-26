import assert from 'node:assert/strict'
import test from 'node:test'

import { LessonCancelledError, isLessonCancelled } from '../src/LessonCancellation.ts'

test('a replaced run is recognised as cancellation, not as a script failure', () => {
  assert.equal(isLessonCancelled(new LessonCancelledError()), true)
  assert.equal(isLessonCancelled(new Error('Lesson run cancelled')), true)
  assert.equal(isLessonCancelled(new Error('Lesson stopped.')), true)
  const abort = new Error('The operation was aborted')
  abort.name = 'AbortError'
  assert.equal(isLessonCancelled(abort), true)
})

test('ordinary failures and non-errors are still reported', () => {
  assert.equal(isLessonCancelled(new Error('Condition not met within 60000 ms.')), false)
  assert.equal(isLessonCancelled(new TypeError('x is undefined')), false)
  assert.equal(isLessonCancelled('Lesson run cancelled'), false)
  assert.equal(isLessonCancelled(undefined), false)
})
