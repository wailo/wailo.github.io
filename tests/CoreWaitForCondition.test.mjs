import assert from 'node:assert/strict'
import test from 'node:test'

// core.ts wraps the browser timers at import time. Mirror a browser by making
// `window` the global object, so its override of setTimeout is the one lesson
// code (and the wait helpers) actually call.
const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout
const hadWindow = 'window' in globalThis
const previousWindow = globalThis.window

globalThis.window = globalThis

const { DEFAULT_CONDITION_TIMEOUT_MS, resetTimeouts, waitFor, waitForCondition } =
  await import('../src/core.ts')

test.after(() => {
  globalThis.setTimeout = originalSetTimeout
  globalThis.clearTimeout = originalClearTimeout
  if (hadWindow) globalThis.window = previousWindow
  else delete globalThis.window
})

test('waitForCondition resolves once the confirmation window passes', async () => {
  let reads = 0
  const met = await waitForCondition(() => ++reads >= 2, 20, 5, 1000)
  assert.equal(met, true)
  assert.ok(reads >= 2)
})

test('waitForCondition rejects when the condition throws', async () => {
  // This used to kill the setTimeout chain and leave the lesson awaiting forever.
  await assert.rejects(
    waitForCondition(
      () => {
        throw new Error('plot sync failed')
      },
      0,
      5,
      1000,
    ),
    /plot sync failed/,
  )
})

test('waitForCondition resolves false on the hard timeout and stops polling', async () => {
  let reads = 0
  const met = await waitForCondition(
    () => {
      reads++
      return false
    },
    0,
    5,
    30,
  )
  assert.equal(met, false)
  const readsAtTimeout = reads
  await new Promise((resolve) => globalThis.setTimeout(resolve, 30))
  assert.equal(reads, readsAtTimeout, 'polling must stop once the wait has settled')
})

test('waitForCondition can throw on timeout when asked to', async () => {
  await assert.rejects(
    waitForCondition(() => false, 0, 5, 20, true),
    /not met within 20 ms/,
  )
})

test('waitForCondition tolerates a zero poll interval instead of dividing by zero', async () => {
  const met = await waitForCondition(() => true, 100, 0, 1000)
  assert.equal(met, true)
})

test('waitForCondition defaults to a finite deadline', () => {
  assert.ok(Number.isFinite(DEFAULT_CONDITION_TIMEOUT_MS))
  assert.ok(DEFAULT_CONDITION_TIMEOUT_MS > 0)
})

test('resetTimeouts unwinds pending lesson waits instead of stranding them', async () => {
  const conditionWait = waitForCondition(() => false, 0, 5, null)
  const durationWait = waitFor(60_000)
  const unwound = Promise.all([
    assert.rejects(conditionWait, /Lesson run cancelled/),
    assert.rejects(durationWait, /Lesson run cancelled/),
  ])

  await new Promise((resolve) => globalThis.setTimeout(resolve, 20))
  resetTimeouts()
  await unwound
})
