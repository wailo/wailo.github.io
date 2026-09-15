import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { prepareTrainingArtifact, loadUserScript } from '../src/EditorScriptRuntime.ts'
import { createLessonRunStore } from '../src/useLessonRun.ts'
import { createTrainingRecorder } from '../src/TrainingRecorder.ts'

const runtime = { appCommit: 'a'.repeat(40), modelVersion: 'test-model' }
const tick = () => new Promise(setImmediate)

test('saved notification waits for terminal acknowledgment and never fires for failed saving', async () => {
  for (const fail of [false, true]) {
    const store = createLessonRunStore()
    let resolveSave,
      rejectSave,
      saved = 0
    const recorder = createTrainingRecorder(
      store,
      () => async (path) => {
        if (path.endsWith('/events'))
          await new Promise((resolve, reject) => {
            resolveSave = resolve
            rejectSave = reject
          })
      },
      () => {},
      () => {
        saved++
      },
    )
    const run = store.begin('lesson', 'Test')
    await recorder.start(store.snapshot(), prepareTrainingArtifact(''), runtime, {})
    store.finish(run.runId, 'COMPLETED', 'Done')
    await tick()
    assert.equal(saved, 0)
    if (fail) rejectSave(new Error('offline'))
    else resolveSave()
    await tick()
    assert.equal(saved, fail ? 0 : 1)
    recorder.dispose()
  }
})

test('artifact preserves original bytes and compiler settings without running top-level code', () => {
  const source = '// café\r\nexport async function main() {}\r\nglobalThis.__artifactProbe = 42'
  const artifact = prepareTrainingArtifact(source)
  assert.equal(artifact.originalSource, source)
  assert.equal(globalThis.__artifactProbe, undefined)
  assert.equal(artifact.compiler.version, ts.version)
  assert.equal(artifact.compiler.target, 'ES2020')
  assert.equal(artifact.compiler.module, 'None')
  try {
    loadUserScript(artifact.javascript)
    assert.equal(globalThis.__artifactProbe, 42)
  } finally {
    delete globalThis.__artifactProbe
  }
})

test('stop during initial save queues a terminal record with its own evidence and identity', async () => {
  const store = createLessonRunStore()
  const sent = [],
    errors = []
  let acknowledge
  const recorder = createTrainingRecorder(
    store,
    () => async (path, body) => {
      sent.push({ path, body })
      if (path === '/api/training/attempts')
        await new Promise((resolve) => {
          acknowledge = resolve
        })
    },
    (error) => errors.push(error),
  )
  const run = store.begin('lesson', 'Test', 'assignment')
  const starting = recorder.start(
    store.snapshot(),
    prepareTrainingArtifact('export async function main() {}'),
    runtime,
    {},
  )
  run.metrics.push({ score: 2 })
  store.recordCheckpoint(run.runId, 'Checkpoint', { value: 3 })
  store.finish(run.runId, 'STOPPED', 'Student stopped')
  run.metrics[0].score = 99
  store.begin('other', 'Other')
  assert.equal(sent.length, 1)
  acknowledge()
  await starting
  await tick()
  assert.deepEqual(
    sent.slice(1).map((x) => x.body.kind),
    ['checkpoint', 'finished'],
  )
  assert.deepEqual(
    sent.slice(1).map((x) => x.body.sequence),
    [1, 2],
  )
  assert.equal(sent[2].body.payload.status, 'STOPPED')
  assert.equal(sent[2].body.payload.metrics[0].score, 2)
  assert.ok(sent[2].body.payload.endedAt)
  assert.equal(sent[0].body.assignmentId, 'assignment')
  assert.equal(sent[0].body.lessonId, 'lesson')
  assert.equal(sent[0].body.appCommit, runtime.appCommit)
  assert.equal(sent[0].body.modelVersion, runtime.modelVersion)
  assert.deepEqual(errors, [])
  recorder.dispose()
})

test('guests create no records; failed start warns and permits unrecorded practice', async () => {
  const store = createLessonRunStore()
  const guest = createTrainingRecorder(store, () => null, assert.fail)
  store.begin('lesson', 'Test')
  await guest.start(store.snapshot(), prepareTrainingArtifact(''), runtime, {})
  store.finish(store.current.value.runId, 'COMPLETED', 'Done')
  guest.dispose()
  const errors = [],
    requests = []
  const recorder = createTrainingRecorder(
    store,
    () => async (path) => {
      requests.push(path)
      throw new Error('offline')
    },
    (error) => errors.push(error),
  )
  store.begin('lesson', 'Test')
  await recorder.start(store.snapshot(), prepareTrainingArtifact(''), runtime, {})
  store.recordCheckpoint(store.current.value.runId, 'Unrecorded practice')
  store.finish(store.current.value.runId, 'COMPLETED', 'Done')
  await tick()
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /offline/)
  assert.equal(requests.length, 1, 'no subsequent writes for the unrecorded run')
  recorder.dispose()
})

test('a failed evidence write prevents later events from skipping the missing sequence', async () => {
  const store = createLessonRunStore(),
    sent = [],
    errors = []
  const recorder = createTrainingRecorder(
    store,
    () => async (path, body) => {
      sent.push(body)
      if (path.endsWith('/events')) throw new Error('failed evidence')
    },
    (error) => errors.push(error),
  )
  const run = store.begin('lesson', 'Test')
  await recorder.start(store.snapshot(), prepareTrainingArtifact(''), runtime, {})
  store.recordCheckpoint(run.runId, 'First')
  store.finish(run.runId, 'COMPLETED', 'Done')
  await tick()
  assert.equal(sent.length, 2)
  assert.ok(errors.length > 0)
  recorder.dispose()
})
