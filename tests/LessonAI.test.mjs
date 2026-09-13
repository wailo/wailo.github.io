import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate as tick } from 'node:timers/promises'
import { createAICoordinator, createAIClient, validAIRequest } from '../src/LessonAI.ts'

const request = (id = 'r', extra = {}) => ({
  requestId: id,
  assignmentId: 'assignment',
  runId: 'run',
  purpose: 'debrief',
  evidence: { scorePercent: 80 },
  ...extra,
})
const suggestion = (job) => ({
  id: job.id,
  peerId: job.peerId,
  assignmentId: job.request.assignmentId,
  message: `Feedback for ${job.peerId}`,
  evidence: [{ timestamp: 1, message: 'Score: 80%' }],
})
const setup = (extra = {}) => {
  const delivered = []
  const queue = createAICoordinator({
    current: () => true,
    generate: async (job) => suggestion(job),
    deliver: (job, result) => delivered.push({ peerId: job.peerId, result }),
    ...extra,
  })
  return { queue, delivered }
}

test('twenty peers receive isolated responses with at most two provider calls in flight', async () => {
  let active = 0
  let peak = 0
  const { queue, delivered } = setup({
    generate: async (job) => {
      active++
      peak = Math.max(peak, active)
      await tick()
      active--
      return suggestion(job)
    },
  })
  try {
    for (let i = 0; i < 20; i++)
      assert.equal(queue.submit(`peer-${i}`, request(), 'automatic'), true)
    while (delivered.length < 20) await tick()
    assert.equal(peak, 2)
    assert.equal(new Set(delivered.map((d) => d.peerId)).size, 20)
    for (const d of delivered) assert.equal(d.result.message, `Feedback for ${d.peerId}`)
  } finally {
    queue.dispose()
  }
})

test('review requires explicit approval and dismiss settles the requesting script', async () => {
  const { queue, delivered } = setup()
  try {
    queue.submit('a', request(), 'review')
    queue.submit('b', request(), 'review')
    await tick()
    assert.equal(delivered.length, 0)
    assert.equal(queue.jobs.value[0].state, 'review')
    queue.approve(queue.jobs.value[0].id)
    queue.cancel(queue.jobs.value[1].id, true)
    assert.deepEqual(
      delivered.map((d) => d.result.status),
      ['completed', 'dismissed'],
    )
    queue.approve(queue.jobs.value[0].id)
    assert.equal(delivered.length, 2)
  } finally {
    queue.dispose()
  }
})

test('off makes no provider call; duplicate requests do not regenerate', async () => {
  let calls = 0
  const { queue, delivered } = setup({
    generate: async (job) => {
      calls++
      return suggestion(job)
    },
  })
  try {
    queue.submit('a', request(), 'off')
    queue.submit('a', request(), 'automatic')
    await tick()
    assert.equal(calls, 0)
    assert.equal(delivered[0].result.status, 'unavailable')
    queue.submit('a', request('new'), 'review')
    assert.equal(queue.submit('a', request('another'), 'review'), false)
  } finally {
    queue.dispose()
  }
})

test('replacement cancels queued work and rejects late provider results', async () => {
  let current = true
  let resolve
  const { queue, delivered } = setup({
    current: () => current,
    generate: (job) =>
      new Promise((done) => {
        resolve = () => done(suggestion(job))
      }),
  })
  queue.submit('a', request(), 'automatic')
  await tick()
  current = false
  queue.expire()
  resolve()
  await tick()
  assert.equal(delivered.length, 0)
  assert.equal(queue.jobs.value[0].result.status, 'cancelled')
  queue.dispose()
})

test('provider failure settles one job without blocking the next student', async () => {
  const { queue, delivered } = setup({
    concurrency: 1,
    generate: async (job) => {
      if (job.peerId === 'a') throw new Error('Provider unavailable')
      return suggestion(job)
    },
  })
  try {
    queue.submit('a', request(), 'automatic')
    queue.submit('b', request(), 'automatic')
    await tick()
    assert.deepEqual(
      delivered.map((d) => d.result.status),
      ['failed', 'completed'],
    )
  } finally {
    queue.dispose()
  }
})

test('queue and review timeout returns an explicit outcome', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { queue, delivered } = setup()
  queue.submit('a', request('r', { timeoutMs: 1000 }), 'review')
  await tick()
  t.mock.timers.tick(1001)
  assert.equal(delivered[0].result.status, 'timeout')
  queue.dispose()
})

test('client rejects wrong run, assignment and malformed responses', async () => {
  const sent = []
  const client = createAIClient((type, payload) => sent.push({ type, payload }))
  let settled = false
  const pending = client.request(request()).then((r) => {
    settled = true
    return r
  })
  client.receive({
    ...request(),
    runId: 'old-run',
    result: { status: 'completed', message: 'Wrong' },
  })
  client.receive({
    ...request(),
    assignmentId: 'old',
    result: { status: 'completed', message: 'Wrong' },
  })
  client.receive({ ...request(), result: { status: 'completed', message: 123 } })
  await tick()
  assert.equal(settled, false)
  client.receive({ ...request(), result: { status: 'completed', message: 'Correct' } })
  assert.deepEqual(await pending, { status: 'completed', message: 'Correct' })
  assert.equal(sent[0].type, 'ai-request')
})

test('stopping a script sends cancellation and settles its pending request', async () => {
  const sent = []
  const client = createAIClient((type) => sent.push(type))
  const controller = new AbortController()
  const pending = client.request(request(), controller.signal)
  controller.abort()
  assert.equal((await pending).status, 'cancelled')
  assert.deepEqual(sent, ['ai-request', 'ai-cancel'])
})

test('client timeout and offline sends settle without throwing', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const client = createAIClient(() => {})
  const pending = client.request(request('r', { timeoutMs: 1000 }))
  t.mock.timers.tick(1001)
  assert.equal((await pending).status, 'timeout')
  const offline = createAIClient(() => {
    throw new Error('Offline')
  })
  assert.equal((await offline.request(request())).status, 'unavailable')
})

test('rejects oversized evidence and snapshots the request before queueing', async () => {
  assert.equal(validAIRequest(request('r', { evidence: { text: 'x'.repeat(24001) } })), false)
  assert.equal(validAIRequest(request('r', { purpose: 'control' })), false)
  const { queue } = setup()
  const input = request()
  queue.submit('a', input, 'review')
  input.evidence.scorePercent = 1
  assert.equal(queue.jobs.value[0].request.evidence.scorePercent, 80)
  queue.dispose()
  await tick()
})
