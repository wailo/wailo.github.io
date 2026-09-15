import test from 'node:test'
import assert from 'node:assert/strict'
import { createLessonHistory, attemptDuration } from '../src/LessonHistory.ts'

const tick = () => new Promise(setImmediate)
function fixture() {
  let changed
  const requests = []
  const authStore = {
    isValid: false,
    record: null,
    token: '',
    onChange(callback, immediate) {
      changed = callback
      if (immediate) callback()
      return () => {}
    },
  }
  const client = {
    authStore,
    filter: (expression, parameters) => ({ expression, parameters }),
    collection(name) {
      assert.equal(name, 'studentRecords')
      return {
        getList(page, size, options) {
          return new Promise((resolve, reject) =>
            requests.push({ page, size, options, resolve, reject }),
          )
        },
      }
    },
  }
  const history = createLessonHistory(client, { id: 'lesson-a', legacyId: '/old/a.ts' })
  return {
    history,
    requests,
    login(id) {
      Object.assign(authStore, { isValid: !!id, record: id ? { id } : null, token: id ?? '' })
      changed()
    },
  }
}

test('history is lazy for guests, account-scoped and paginated using explicit lesson aliases', async () => {
  const f = fixture()
  try {
    assert.equal(f.history.status.value, 'guest')
    assert.equal(f.requests.length, 0)
    f.login('student-a')
    const first = f.requests[0]
    assert.equal(first.size, 10)
    assert.deepEqual(first.options.filter.parameters, {
      student: 'student-a',
      id: 'lesson-a',
      legacy: '/old/a.ts',
    })
    assert.equal(first.options.headers.Authorization, 'student-a')
    assert.equal(first.options.sort, '-start_time,-id')
    assert.ok(!first.options.fields.includes('bundle'))
    first.resolve({ items: [{ id: 'attempt-1' }], totalPages: 3 })
    await tick()
    const secondPage = f.history.refresh(2)
    assert.equal(f.requests[1].page, 2)
    f.requests[1].resolve({ items: [{ id: 'attempt-2' }], totalPages: 3 })
    await secondPage
    assert.equal(f.history.attempts.value[0].id, 'attempt-2')
    assert.equal(f.history.page.value, 2)
  } finally {
    f.history.dispose()
  }
})

test('account switch and disposal abort requests and ignore late history responses', async () => {
  const f = fixture()
  f.login('a')
  f.login('b')
  assert.equal(f.requests[0].options.signal.aborted, true)
  f.requests[1].resolve({ items: [], totalPages: 0 })
  f.requests[0].resolve({ items: [{ id: 'private-a' }], totalPages: 1 })
  await tick()
  assert.deepEqual(f.history.attempts.value, [])
  assert.equal(f.history.status.value, 'ready')
  const pending = f.history.refresh()
  f.history.dispose()
  assert.equal(f.requests[2].options.signal.aborted, true)
  f.requests[2].resolve({ items: [{ id: 'late' }], totalPages: 1 })
  await pending
  assert.deepEqual(f.history.attempts.value, [])
})

test('history error is not empty history; retry recovers and logout clears records', async () => {
  const f = fixture()
  try {
    f.login('a')
    f.requests[0].reject(new Error('offline'))
    await tick()
    assert.equal(f.history.status.value, 'error')
    const retry = f.history.refresh()
    f.requests[1].resolve({ items: [{ id: 'saved' }], totalPages: 1 })
    await retry
    assert.equal(f.history.status.value, 'ready')
    f.login(null)
    assert.equal(f.history.status.value, 'guest')
    assert.deepEqual(f.history.attempts.value, [])
  } finally {
    f.history.dispose()
  }
})

test('duration uses recorded start/end times, never a live timer or inferred end', () => {
  assert.equal(
    attemptDuration({
      start_time: '2026-09-15 10:00:00.000Z',
      end_time: '2026-09-15 10:02:05.000Z',
    }),
    '2m 5s',
  )
  assert.equal(attemptDuration({ start_time: 'invalid', end_time: '' }), '—')
  assert.equal(attemptDuration({ start_time: 'invalid', end_time: 'invalid' }), '—')
})
