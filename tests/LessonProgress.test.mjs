import test from 'node:test'
import assert from 'node:assert/strict'
import { createLessonProgress, indexLessonProgress } from '../src/LessonProgress.ts'
import { moduleTree as catalogue } from '../src/components/data/EASAModules.ts'

const lessons = [{ id: 'lesson-a', legacyId: '/old/a.ts' }]
const row = (lessonId = 'lesson-a', completedAttempts = 1) => ({
  lessonId,
  completedAttempts,
  lastCompletedAt: '2026-09-15 12:00:00.000Z',
  latestAttemptAt: '2026-09-15 11:00:00.000Z',
  latestStatus: 'completed',
  latestOutcome: 'not-assessed',
})
const tick = () => new Promise(setImmediate)

function fixture() {
  let changed
  let unsubscribed = false
  const requests = []
  const authStore = {
    isValid: false,
    record: null,
    token: '',
    onChange(callback, immediate) {
      changed = callback
      if (immediate) callback()
      return () => {
        unsubscribed = true
      }
    },
  }
  const client = {
    authStore,
    send(path, options) {
      return new Promise((resolve, reject) => requests.push({ path, options, resolve, reject }))
    },
  }
  return {
    client,
    requests,
    get unsubscribed() {
      return unsubscribed
    },
    login(id) {
      Object.assign(authStore, { isValid: !!id, record: id ? { id } : null, token: id || '' })
      changed()
    },
  }
}

test('catalogue identities and legacy aliases are explicit and unique', () => {
  const entries = Object.values(catalogue).flat()
  assert.equal(new Set(entries.map((x) => x.id)).size, entries.length)
  assert.equal(new Set(entries.map((x) => x.legacyId)).size, entries.length)
  assert.ok(entries.every((x) => x.id && x.legacyId))
})

test('progress merges only explicit aliases and retains completion after a later stopped attempt', () => {
  const result = indexLessonProgress(
    [
      row('/old/a.ts'),
      {
        ...row('lesson-a', 0),
        lastCompletedAt: '',
        latestAttemptAt: '2026-09-16 11:00:00.000Z',
        latestStatus: 'stopped',
      },
      row('Same title'),
      row('/new/a.ts'),
    ],
    lessons,
  )
  assert.equal(result.size, 1)
  assert.equal(result.get('lesson-a').completedAttempts, 1)
  assert.equal(result.get('lesson-a').latestStatus, 'stopped')
  assert.equal(result.get('lesson-a').lastCompletedAt, row().lastCompletedAt)
})

test('guests do not fetch; account changes reject stale responses and clear saved ticks', async () => {
  const f = fixture()
  const progress = createLessonProgress(f.client, lessons)
  try {
    assert.equal(progress.status.value, 'guest')
    assert.equal(f.requests.length, 0)
    f.login('a')
    f.login('b')
    assert.equal(f.requests[0].options.signal.aborted, true)
    assert.equal(f.requests[1].options.headers.Authorization, 'b')
    f.requests[1].resolve({ lessons: [] })
    f.requests[0].resolve({ lessons: [row()] })
    await tick()
    assert.equal(progress.status.value, 'ready')
    assert.equal(progress.completedCount.value, 0)
    const refreshing = progress.refresh()
    f.requests[2].resolve({ lessons: [row()] })
    await refreshing
    assert.equal(progress.completedCount.value, 1)
    f.login(null)
    assert.equal(progress.status.value, 'guest')
    assert.equal(progress.completedCount.value, 0)
  } finally {
    progress.dispose()
  }
  assert.equal(f.unsubscribed, true)
})

test('unavailable progress is distinct from empty history, retries recover, disposal ignores responses', async () => {
  const f = fixture()
  const progress = createLessonProgress(f.client, lessons)
  f.login('a')
  f.requests[0].reject(new Error('offline'))
  await tick()
  assert.equal(progress.status.value, 'error')
  const retry = progress.refresh()
  f.requests[1].resolve({ lessons: [] })
  await retry
  assert.equal(progress.status.value, 'ready')
  const pending = progress.refresh()
  progress.dispose()
  assert.equal(f.requests[2].options.signal.aborted, true)
  f.requests[2].resolve({ lessons: [row()] })
  await pending
  assert.equal(progress.completedCount.value, 0)
})
