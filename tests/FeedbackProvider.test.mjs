import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFeedbackInput, requestFeedback } from '../src/FeedbackProvider.ts'

const config = (provider = 'ollama') => ({
  provider,
  endpoint: provider === 'ollama' ? 'http://127.0.0.1:11434/api/chat' : '/api/feedback/responses',
  model: 'test-model',
  timeoutMs: 1000,
})
const observation = () => ({
  peerId: 'private-peer',
  assignmentId: 'private-assignment',
  lessonName: 'Turn',
  status: 'running',
  checkpoints: [
    {
      timestamp: 1,
      message: 'Preparing',
      data: { teachingContext: { mode: 'practice', allowedHints: ['Monitor altitude'] } },
    },
    {
      timestamp: 2,
      message: 'Turn in progress',
      data: { altitudeFt: 4950, referenceAltitudeFt: 5000 },
    },
  ],
})
const feedback = { message: 'Monitor altitude during the turn.', evidenceIds: ['checkpoint-2'] }
const ollama = (value = feedback) =>
  Response.json({ done: true, message: { content: JSON.stringify(value) } })

test('Ollama receives bounded evidence with schema and returns a review suggestion', async () => {
  let body
  const result = await requestFeedback(config(), observation(), undefined, async (url, options) => {
    assert.equal(url, config().endpoint)
    body = JSON.parse(options.body)
    assert.equal(options.credentials, 'omit')
    return ollama()
  })
  assert.equal(body.stream, false)
  assert.equal(body.format.type, 'object')
  assert.equal(body.model, 'test-model')
  assert.doesNotMatch(JSON.stringify(body), /private-peer|private-assignment/)
  assert.equal(result.peerId, 'private-peer')
  assert.equal(result.assignmentId, 'private-assignment')
  assert.deepEqual(result.evidence, [{ timestamp: 2, message: 'Turn in progress' }])
})

test('OpenAI proxy uses Responses structured outputs and app authentication, not a bundled key', async () => {
  const result = await requestFeedback(
    { ...config('openai'), headers: () => ({ 'X-App-Session': 'session' }) },
    observation(),
    undefined,
    async (_, options) => {
      const body = JSON.parse(options.body)
      assert.equal(options.headers['X-App-Session'], 'session')
      assert.equal(body.store, false)
      assert.equal(body.text.format.type, 'json_schema')
      assert.equal(body.text.format.strict, true)
      assert.equal(body.tools, undefined)
      return Response.json({
        status: 'completed',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(feedback) }] },
        ],
      })
    },
  )
  assert.equal(result.message, feedback.message)
})

test('snapshot keeps teaching context while limiting recent checkpoints', () => {
  const sample = observation()
  sample.checkpoints.push(
    ...Array.from({ length: 20 }, (_, i) => ({ timestamp: i + 3, message: `Progress ${i}` })),
  )
  const snapshot = buildFeedbackInput(sample)
  assert.equal(snapshot.checkpoints.length, 12)
  assert.equal(JSON.parse(snapshot.input).teachingContext.mode, 'practice')
  sample.checkpoints.at(-1).message = 'Changed'
  assert.notEqual(snapshot.checkpoints.at(-1).message, 'Changed')
})

test('no evidence, oversized input, and incomplete configuration fail before network use', async () => {
  const noFetch = async () => {
    assert.fail('Must not fetch')
  }
  await assert.rejects(
    requestFeedback(config(), { ...observation(), checkpoints: [] }, undefined, noFetch),
    /checkpoint/,
  )
  await assert.rejects(
    requestFeedback({ ...config('openai'), endpoint: '' }, observation(), undefined, noFetch),
    /Configure/,
  )
  await assert.rejects(
    requestFeedback(
      config(),
      { ...observation(), lessonName: 'x'.repeat(40000) },
      undefined,
      noFetch,
    ),
    /too large/,
  )
})

test('insufficient evidence is a supported no-suggestion response', async () => {
  assert.equal(
    await requestFeedback(config(), observation(), undefined, async () =>
      ollama({ message: '', evidenceIds: [] }),
    ),
    null,
  )
})

test('rejects unknown evidence, extra actions, oversized text, and HTML', async () => {
  for (const invalid of [
    { ...feedback, evidenceIds: ['invented'] },
    { ...feedback, action: 'start' },
    { ...feedback, message: 'x'.repeat(601) },
    { ...feedback, message: '<img src="https://example.invalid/image">' },
    { ...feedback, message: '![image](https://example.invalid/image)' },
    { ...feedback, evidenceIds: [] },
  ]) {
    await assert.rejects(
      requestFeedback(config(), observation(), undefined, async () => ollama(invalid)),
    )
  }
})

test('reports provider errors, invalid JSON, incomplete output, and refusal', async () => {
  await assert.rejects(
    requestFeedback(
      config(),
      observation(),
      undefined,
      async () => new Response('', { status: 401 }),
    ),
    /HTTP 401/,
  )
  await assert.rejects(
    requestFeedback(config(), observation(), undefined, async () =>
      Response.json({ done: true, message: { content: 'not json' } }),
    ),
    /invalid JSON/,
  )
  await assert.rejects(
    requestFeedback(config(), observation(), undefined, async () => Response.json({ done: false })),
    /incomplete/,
  )
  await assert.rejects(
    requestFeedback(config('openai'), observation(), undefined, async () =>
      Response.json({ status: 'incomplete' }),
    ),
    /incomplete/,
  )
  await assert.rejects(
    requestFeedback(config('openai'), observation(), undefined, async () =>
      Response.json({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'refusal' }] }],
      }),
    ),
    /declined/,
  )
})

test('cancellation and timeout abort the request', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    requestFeedback(config(), observation(), controller.signal, async () => {
      assert.fail('Must not fetch')
    }),
    /cancelled/,
  )
  await assert.rejects(
    requestFeedback({ ...config(), timeoutMs: 5 }, observation(), undefined, async (_, options) => {
      return new Promise((_, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        ),
      )
    }),
    /timed out/,
  )
})
