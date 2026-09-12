import assert from 'node:assert/strict'
import test from 'node:test'
import { createLessonRunStore, useLessonRun } from '../src/useLessonRun.ts'

test('lesson state is shared, with isolated factories available', () => {
  assert.equal(useLessonRun(), useLessonRun())
  const store = createLessonRunStore()
  assert.equal(store.status.value, 'IDLE')
  const run = store.begin('/lessons/climb.ts', 'Climb')
  assert.equal(store.current.value.runId, run.runId)
  assert.equal(store.current.value.lessonId, '/lessons/climb.ts')
  assert.equal(store.status.value, 'RUNNING')
  assert.equal(createLessonRunStore().current.value, null)
  run.metrics.push({ score: 4 })
  assert.deepEqual(store.snapshot().metrics, [{ score: 4 }])
})

test('plain and structured checkpoints retain text and copy evidence', () => {
  const store = createLessonRunStore()
  const { runId } = store.begin('climb', 'Climb')
  store.recordCheckpoint(runId, 'Started')
  const data = { step: 'climb', altitudeFt: 1500, targets: { altitudeFt: 3000 } }
  store.recordCheckpoint(runId, 'Climb established', data)
  data.targets.altitudeFt = 5000
  const snapshot = store.snapshot()
  assert.equal(snapshot.step, 'climb')
  assert.equal(snapshot.checkpoints[0].data, undefined)
  assert.equal(snapshot.checkpoints[1].data.targets.altitudeFt, 3000)
  assert.equal(snapshot.events.at(-1).message, 'Climb established')
  snapshot.checkpoints[1].data.altitudeFt = 999
  assert.equal(store.snapshot().checkpoints[1].data.altitudeFt, 1500)
})

test('submitted answers retain question context without changing scoring', () => {
  const store = createLessonRunStore()
  const { runId } = store.begin('test', 'Test')
  const options = {
    type: 'multiple-choice',
    mode: 'assessment',
    title: 'Forces',
    question: 'Which force?',
    choices: [{ id: 'a', label: 'Lift' }],
    correctAnswer: 'a',
  }
  const result = {
    type: 'multiple-choice',
    answer: 'b',
    correct: false,
    attempts: 1,
    elapsedMs: 20,
  }
  store.recordAnswer(runId, options, result)
  store.recordAnswer(runId, options, { ...result, cancelled: true })
  result.answer = 'a'
  options.choices[0].label = 'Changed'
  const answer = store.snapshot().answers[0]
  assert.equal(store.current.value.answers.length, 1)
  assert.equal(answer.mode, 'assessment')
  assert.equal(answer.result.answer, 'b')
  assert.equal(answer.result.correct, false)
  assert.equal(answer.choices[0].label, 'Lift')
})

test('replacement creates fresh buffers and rejects stale updates', () => {
  const store = createLessonRunStore()
  const first = store.begin('first', 'First')
  first.metrics.push({ value: 1 })
  const second = store.begin('second', 'Second')
  assert.notEqual(first.runId, second.runId)
  first.metrics.push({ value: 2 })
  store.recordCheckpoint(first.runId, 'Old checkpoint')
  store.addEvent(first.runId, 'Old event')
  store.finish(first.runId, 'ERROR', 'Old failure')
  assert.equal(store.status.value, 'RUNNING')
  assert.deepEqual(store.snapshot().metrics, [])
  assert.deepEqual(store.snapshot().checkpoints, [])
  assert.equal(store.current.value.events.length, 1)
})

test('terminal states preserve history and reject subsequent progress', () => {
  for (const status of ['COMPLETED', 'STOPPED', 'ERROR']) {
    const store = createLessonRunStore()
    const { runId } = store.begin('lesson', 'Lesson')
    store.finish(runId, status, status)
    assert.equal(store.status.value, status)
    assert.equal(typeof store.current.value.endedAt, 'number')
    store.recordCheckpoint(runId, 'Too late')
    store.finish(runId, 'COMPLETED', 'Duplicate')
    assert.equal(store.current.value.events.length, 2)
    assert.equal(store.current.value.checkpoints.length, 0)
  }
})

test('replaced prompt events keep their position and identity', () => {
  const store = createLessonRunStore()
  const { runId } = store.begin('lesson', 'Lesson')
  store.addEvent(runId, 'First prompt', 'prompt')
  const id = store.events.value.at(-1).id
  store.addEvent(runId, 'Updated prompt', 'prompt')
  assert.equal(store.events.value.length, 2)
  assert.equal(store.events.value.at(-1).id, id)
  assert.equal(store.events.value.at(-1).message, 'Updated prompt')
})
