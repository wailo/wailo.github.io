import assert from 'node:assert/strict'
import test from 'node:test'
import { effectScope, ref } from 'vue'
import { createLessonRunStore } from '../src/useLessonRun.ts'
import { watchLessonLifecycle } from '../src/ClassroomLessonLifecycle.ts'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'

test('classroom follows matching lifecycle transitions without progress traffic or stale results', () => {
  const store = createLessonRunStore()
  const scope = effectScope()
  const sent = []
  const currentAssignment = ref({ id: 'assignment-1', name: 'Test', status: 'assigned' })
  const { reportLessonState } = evaluate(
    declarations(componentScript('ClassRoom'), ['reportLessonState']) +
      '\nreturn { reportLessonState }',
    { currentAssignment, sendExerciseStatus: (...args) => sent.push(args) },
  )
  scope.run(() => watchLessonLifecycle(store, reportLessonState))
  try {
    const first = store.begin('lesson-1', 'Test', 'assignment-1')
    store.addEvent(first.runId, 'Progress')
    store.recordCheckpoint(first.runId, 'Answer selected')
    assert.deepEqual(
      sent.map(([status]) => status),
      ['running'],
    )
    store.finish(first.runId, 'STOPPED', 'Lesson stopped')
    assert.deepEqual(sent.at(-1), ['stopped', 'Lesson stopped'])
    const second = store.begin('lesson-1', 'Test', 'assignment-1')
    store.finish(first.runId, 'COMPLETED', 'Stale completion')
    assert.equal(sent.at(-1)[0], 'running')
    store.finish(second.runId, 'COMPLETED', 'Lesson completed')
    assert.equal(sent.at(-1)[0], 'completed')
    const third = store.begin('lesson-1', 'Test', 'assignment-1')
    store.finish(third.runId, 'ERROR', 'Script failed')
    assert.deepEqual(sent.at(-1), ['error', 'Script failed'])
    store.begin('lesson-1', 'Test', 'assignment-1')
    const before = sent.length
    store.begin('unrelated-lesson', 'Test')
    assert.equal(sent.length, before + 1, 'replacement reports stop, not unrelated start')
    assert.equal(sent.at(-1)[0], 'stopped')
    scope.stop()
    const count = sent.length
    store.begin('lesson-1', 'Test', 'assignment-1')
    assert.equal(sent.length, count, 'watcher is disposed with its component')
  } finally {
    scope.stop()
  }
})
