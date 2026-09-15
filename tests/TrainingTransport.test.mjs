import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { evaluate } from './helpers/vue-script.mjs'

function fixture(send) {
  const timers = new Map()
  let id = 0
  const applicationTimers = {
    setTimeout(fn, delay) {
      timers.set(++id, { fn, delay })
      return id
    },
    clearTimeout(id) {
      timers.delete(id)
    },
  }
  const source = readFileSync(
    new URL('../src/Pocketbase/trainingTransport.ts', import.meta.url),
    'utf8',
  )
    .replace(/^import .*$/gm, '')
    .replace('export function', 'function')
  const { trainingTransport } = evaluate(source + '\nreturn { trainingTransport }', {
    pb: { authStore: { isValid: true, record: { id: 'student' }, token: 'test-token' }, send },
    applicationTimers,
    AbortController,
  })
  return { send: trainingTransport(), timers }
}

test('successful training requests clear their timeout', async () => {
  const f = fixture(async (_path, options) => {
    assert.equal(options.headers.Authorization, 'test-token')
    assert.equal(options.signal.aborted, false)
    return { id: 'attempt' }
  })
  assert.deepEqual(await f.send('/test', {}), { id: 'attempt' })
  assert.equal(f.timers.size, 0)
})

test('unresponsive training requests time out and retry only twice', async () => {
  let requests = 0
  const f = fixture(
    (_path, options) =>
      new Promise((_resolve, reject) => {
        requests++
        options.signal.addEventListener('abort', () => reject({ status: 0 }))
      }),
  )
  const result = f.send('/test', {})
  const rejected = assert.rejects(result)
  const delays = []
  for (let i = 0; i < 5; i++) {
    const [id, timer] = f.timers.entries().next().value
    f.timers.delete(id)
    delays.push(timer.delay)
    timer.fn()
    await new Promise(setImmediate)
  }
  await rejected
  assert.deepEqual(delays, [3000, 500, 3000, 1000, 3000])
  assert.equal(requests, 3)
  assert.equal(f.timers.size, 0)
})
