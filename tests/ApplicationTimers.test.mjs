import assert from 'node:assert/strict'
import test from 'node:test'

test('application deadlines retain browser timers when lesson code wraps globals', async () => {
  const calls = []
  const previous = globalThis.window
  globalThis.window = {
    setTimeout: (callback, delay) => {
      calls.push(delay)
      return 123
    },
    clearTimeout: (id) => calls.push(id),
  }
  try {
    const { applicationTimers } = await import('../src/ApplicationTimers.ts')
    globalThis.window.setTimeout = () => {
      throw new Error('Lesson timer used')
    }
    globalThis.window.clearTimeout = () => {
      throw new Error('Lesson timer used')
    }
    const id = applicationTimers.setTimeout(() => {}, 500)
    applicationTimers.clearTimeout(id)
    assert.deepEqual(calls, [500, 123])
  } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
})
