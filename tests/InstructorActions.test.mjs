import assert from 'node:assert/strict'
import test from 'node:test'
import { createInstructorActions, acceptsExerciseControl } from '../src/InstructorActions.ts'

function harness() {
  const state = {
    allowed: true,
    session: {},
    peers: new Map([
      ['a', { connection: {}, open: true, assignment: { id: 'one', status: 'assigned' } }],
      ['b', { connection: {}, open: true, assignment: { id: 'two', status: 'running' } }],
    ]),
    sends: [],
    assigned: [],
    loads: [],
  }
  const deps = {
    canAct: () => state.allowed,
    session: () => state.session,
    peer: (id) => state.peers.get(id),
    lesson: (id) => (id === 'turn' ? { name: 'Turn', path: '/turn.ts' } : undefined),
    loadSource: async (path) => {
      state.loads.push(path)
      return 'source'
    },
    send: (...args) => {
      state.sends.push(args)
      return true
    },
    assigned: (...args) => {
      state.assigned.push(args)
      state.peers.get(args[0]).assignment = { id: args[1].id, status: 'assigned' }
    },
  }
  return { state, deps, actions: createInstructorActions(deps) }
}
const a = () => ({ peerId: 'a', assignmentId: 'one' })

test('all actions check authority without sending or loading lessons', async () => {
  const { state, actions } = harness()
  state.allowed = false
  assert.equal(actions.message(['a'], 'Hello')[0].status, 'skipped')
  assert.equal(actions.control('start', [a()])[0].status, 'skipped')
  assert.equal((await actions.assign([a()], 'turn', 60000))[0].status, 'skipped')
  assert.equal(state.sends.length, 0)
  assert.equal(state.loads.length, 0)
})

test('messages trim text, deduplicate explicit targets, and report disconnected peers', () => {
  const { state, actions } = harness()
  state.peers.get('b').open = false
  const result = actions.message(['a', 'b', 'missing', 'a'], ' Hello ')
  assert.deepEqual(
    result.map((r) => r.status),
    ['sent', 'skipped', 'skipped'],
  )
  assert.deepEqual(state.sends, [['a', 'announcement', { message: 'Hello' }]])
  assert.equal(actions.message(['a'], ' ')[0].reason, 'Message is empty')
  assert.deepEqual(actions.message([], 'Hello'), [])
})

test('controls require current assignment and appropriate state', () => {
  const { state, actions } = harness()
  assert.equal(actions.control('start', [a()])[0].status, 'sent')
  assert.deepEqual(state.sends[0], [
    'a',
    'exercise-control',
    { action: 'start', assignmentId: 'one' },
  ])
  assert.equal(actions.control('stop', [a()])[0].reason, 'Not running')
  assert.equal(
    actions.control('start', [{ peerId: 'b', assignmentId: 'two' }])[0].reason,
    'Already running',
  )
  assert.equal(actions.control('stop', [{ peerId: 'b', assignmentId: 'two' }])[0].status, 'sent')
  assert.equal(
    actions.control('start', [{ peerId: 'a', assignmentId: 'old' }])[0].reason,
    'Assignment changed',
  )
  state.peers.get('a').assignment = undefined
  assert.equal(
    actions.control('start', [{ peerId: 'a', assignmentId: null }])[0].reason,
    'No assignment',
  )
})

test('assignment validates catalog and duration before fetching', async () => {
  const { state, actions } = harness()
  assert.equal((await actions.assign([a()], 'unknown', 60000))[0].reason, 'Unknown lesson')
  assert.equal((await actions.assign([a()], 'turn', NaN))[0].reason, 'Invalid duration')
  assert.equal(state.loads.length, 0)
})

test('assignment sends source and updates only peers successfully sent to', async () => {
  const { state, actions } = harness()
  state.peers.get('b').open = false
  const result = await actions.assign([a(), { peerId: 'b', assignmentId: 'two' }], 'turn', 60000)
  assert.deepEqual(
    result.map((r) => r.status),
    ['sent', 'skipped'],
  )
  assert.equal(state.assigned.length, 1)
  assert.equal(state.sends[0][2].source, 'source')
  assert.equal(state.peers.get('a').assignment.id, state.sends[0][2].id)
  assert.equal(state.peers.get('b').assignment.id, 'two')
})

test('assignment rechecks authority, session, connection, and assignment after loading', async () => {
  for (const change of [
    (s) => {
      s.allowed = false
    },
    (s) => {
      s.session = {}
    },
    (s) => {
      s.peers.get('a').open = false
    },
    (s) => {
      s.peers.get('a').connection = {}
    },
    (s) => {
      s.peers.get('a').assignment.id = 'replacement'
    },
  ]) {
    const { state, deps, actions } = harness()
    deps.loadSource = async () => {
      change(state)
      return 'source'
    }
    assert.equal((await actions.assign([a()], 'turn', 60000))[0].status, 'skipped')
    assert.equal(state.sends.length, 0)
    assert.equal(state.assigned.length, 0)
  }
})

test('fetch failure and transport failure do not update assignments', async () => {
  const { state, deps, actions } = harness()
  deps.loadSource = async () => {
    throw new Error('HTTP 404')
  }
  assert.equal((await actions.assign([a()], 'turn', 60000))[0].status, 'failed')
  deps.loadSource = async () => 'source'
  deps.send = () => {
    throw new Error('Send failed')
  }
  assert.equal((await actions.assign([a()], 'turn', 60000))[0].status, 'failed')
  deps.send = () => false
  assert.equal((await actions.assign([a()], 'turn', 60000))[0].status, 'skipped')
  assert.equal(state.assigned.length, 0)
})

test('one failed send does not prevent other batch targets from receiving a message', () => {
  const { deps, actions } = harness()
  deps.send = (id) => {
    if (id === 'a') throw new Error('Failed')
    return true
  }
  assert.deepEqual(
    actions.message(['a', 'b'], 'Hello').map((r) => r.status),
    ['failed', 'sent'],
  )
})

test('receiver rejects stale, missing, and inappropriate exercise controls', () => {
  const current = { id: 'new', status: 'assigned' }
  assert.equal(acceptsExerciseControl(current, { assignmentId: 'old', action: 'start' }), false)
  assert.equal(acceptsExerciseControl(current, { action: 'start' }), false)
  assert.equal(acceptsExerciseControl(null, { assignmentId: 'new', action: 'start' }), false)
  assert.equal(acceptsExerciseControl(current, { assignmentId: 'new', action: 'stop' }), false)
  assert.equal(acceptsExerciseControl(current, { assignmentId: 'new', action: 'start' }), true)
  assert.equal(
    acceptsExerciseControl(
      { ...current, status: 'running' },
      { assignmentId: 'new', action: 'stop' },
    ),
    true,
  )
})
