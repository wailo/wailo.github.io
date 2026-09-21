import assert from 'node:assert/strict'
import test from 'node:test'
import { createLessonRepository } from '../src/LessonRepository.ts'

const tick = () => new Promise(setImmediate)
const draft = {
  title: 'Practice',
  category: 'Flight',
  objectives: 'Maintain altitude',
  source: 'unfinished =',
}
function fixture() {
  let changed
  let disposed = false
  const requests = []
  const pending = (kind, options, id) =>
    new Promise((resolve, reject) => requests.push({ kind, options, id, resolve, reject }))
  const authStore = {
    isValid: false,
    record: null,
    token: '',
    onChange(callback, immediate) {
      changed = callback
      if (immediate) callback()
      return () => {
        disposed = true
      }
    },
  }
  const client = {
    authStore,
    collection(name) {
      assert.equal(name, 'lessons')
      return {
        getFullList: (options) => pending('list', options),
        getOne: (id, options) => pending('load', options, id),
      }
    },
    send(path, options) {
      assert.equal(path, '/api/lesson-library/save')
      return pending('save', options)
    },
  }
  const repository = createLessonRepository(client)
  return {
    repository,
    requests,
    get disposed() {
      return disposed
    },
    login(id) {
      Object.assign(authStore, {
        isValid: Boolean(id),
        record: id ? { id } : null,
        token: `token-${id}`,
      })
      changed()
    },
  }
}

test('guests make no library requests; metadata listing excludes source', async () => {
  const f = fixture()
  assert.equal(f.requests.length, 0)
  await assert.rejects(f.repository.save(draft), /Sign in/)
  f.login('a')
  assert.equal(f.requests[0].options.headers.Authorization, 'token-a')
  assert.ok(!f.requests[0].options.fields.split(',').includes('source'))
  f.requests[0].resolve([])
  await tick()
  assert.equal(f.repository.status.value, 'ready')
  f.repository.dispose()
  assert.equal(f.disposed, true)
})

test('account changes discard stale listings and loads without exposing private source', async () => {
  const f = fixture()
  f.login('a')
  const load = f.repository.load('private-a')
  const rejected = assert.rejects(load, /Account changed/)
  f.login('b')
  f.requests[0].resolve([{ id: 'private-a' }])
  f.requests[1].resolve({ id: 'private-a', source: 'private source' })
  await rejected
  await tick()
  assert.deepEqual(f.repository.lessons.value, [])
  assert.equal(f.repository.status.value, 'loading')
  f.requests[2].resolve([{ id: 'private-b' }])
  await tick()
  assert.equal(f.repository.lessons.value[0].id, 'private-b')
  f.login('')
  assert.deepEqual(f.repository.lessons.value, [])
  assert.equal(f.repository.status.value, 'guest')
  f.repository.dispose()
})

test('save sends unfinished source and the expected revision, and stale listings cannot replace it', async () => {
  const f = fixture()
  f.login('a')
  const saving = f.repository.save(draft, { id: 'lesson', revision: 4 })
  assert.equal(f.requests[1].options.body.expectedRevision, 4)
  assert.equal(f.requests[1].options.body.source, 'unfinished =')
  const record = { ...draft, id: 'lesson', owner: 'a', revision: 5 }
  f.requests[1].resolve(record)
  assert.deepEqual(await saving, record)
  f.requests[0].resolve([])
  await tick()
  assert.equal(f.repository.lessons.value[0].revision, 5)
  assert.equal(f.repository.lessons.value[0].source, undefined)
  f.repository.dispose()
})

test('save a copy omits identity; conflicts remain errors and never overwrite local metadata', async () => {
  const f = fixture()
  f.login('a')
  f.requests[0].resolve([])
  await tick()
  const saving = f.repository.save(draft)
  assert.equal(f.requests[1].options.body.id, undefined)
  const rejected = assert.rejects(saving, (error) => error.status === 409)
  f.requests[1].reject({ status: 409 })
  await rejected
  assert.deepEqual(f.repository.lessons.value, [])
  f.repository.dispose()
})

test('an in-flight save remains bound to its original account', async () => {
  const f = fixture()
  f.login('a')
  const saving = f.repository.save(draft)
  const rejected = assert.rejects(saving, /Account changed/)
  f.login('b')
  assert.equal(f.requests[1].options.headers.Authorization, 'token-a')
  f.requests[1].resolve({ ...draft, id: 'saved-a', owner: 'a' })
  await rejected
  assert.deepEqual(f.repository.lessons.value, [])
  f.repository.dispose()
})
