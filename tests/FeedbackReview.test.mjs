import assert from 'node:assert/strict'
import test from 'node:test'
import { createFeedbackReview } from '../src/FeedbackReview.ts'
import { createInstructorActions, acceptsAssignmentMessage } from '../src/InstructorActions.ts'

function harness() {
  const checkpoint = {
    timestamp: 1000,
    message: 'Turn in progress',
    data: { altitudeFt: 4950, referenceAltitudeFt: 5000 },
  }
  const state = {
    allowed: true,
    open: true,
    assignment: { id: 'turn-1', status: 'running', checkpoints: [checkpoint] },
    sent: [],
    fail: false,
  }
  const actions = createInstructorActions({
    canAct: () => state.allowed,
    session: () => 'session',
    peer: (id) =>
      id === 'student'
        ? { connection: state, open: state.open, assignment: state.assignment }
        : undefined,
    lesson: () => undefined,
    loadSource: async () => '',
    assigned: () => {},
    send: (id, type, payload) => {
      if (state.fail) throw new Error('Transport failed')
      state.sent.push({ id, type, payload })
      return true
    },
  })
  const review = createFeedbackReview({
    assignment: (id) => (id === 'student' ? state.assignment : undefined),
    send: (id, assignmentId, message) => actions.message([id], message, { assignmentId })[0],
  })
  // Fixture exists only in tests; normal sessions never inject sample feedback.
  const input = {
    id: 'suggestion-1',
    peerId: 'student',
    assignmentId: 'turn-1',
    message: 'Monitor altitude during the turn.',
    evidence: [{ timestamp: checkpoint.timestamp, message: checkpoint.message }],
  }
  return { state, review, input }
}

test('enqueue snapshots real evidence and never sends automatically', () => {
  const { state, review, input } = harness()
  assert.equal(review.suggestions.value.length, 0)
  assert.deepEqual(review.enqueue(input), { accepted: true })
  assert.equal(state.sent.length, 0)
  state.assignment.checkpoints[0].data.altitudeFt = 4800
  input.message = 'Changed'
  assert.equal(review.suggestions.value[0].message, 'Monitor altitude during the turn.')
  assert.equal(review.suggestions.value[0].evidence[0].data.altitudeFt, 4950)
})

test('approval sends through shared actions with an assignment ID, once only', () => {
  const { state, review, input } = harness()
  review.enqueue(input)
  assert.equal(review.approve(input.id).status, 'sent')
  assert.deepEqual(state.sent, [
    {
      id: 'student',
      type: 'announcement',
      payload: { message: input.message, assignmentId: 'turn-1' },
    },
  ])
  assert.equal(review.suggestions.value[0].status, 'sent')
  assert.equal(review.approve(input.id), undefined)
  assert.equal(state.sent.length, 1)
})

test('dismissal has no transport side effects and prevents later approval', () => {
  const { state, review, input } = harness()
  review.enqueue(input)
  review.dismiss(input.id)
  assert.equal(review.suggestions.value[0].status, 'dismissed')
  assert.equal(review.approve(input.id), undefined)
  assert.equal(state.sent.length, 0)
})

test('changed or removed assignments expire suggestions before approval', () => {
  for (const assignment of [{ id: 'replacement', checkpoints: [] }, undefined]) {
    const { state, review, input } = harness()
    review.enqueue(input)
    state.assignment = assignment
    assert.equal(review.approve(input.id), undefined)
    assert.equal(review.suggestions.value[0].status, 'expired')
    assert.equal(state.sent.length, 0)
  }
})

test('expiry refresh is permanent even if an old assignment ID reappears', () => {
  const { state, review, input } = harness()
  review.enqueue(input)
  const original = state.assignment
  state.assignment = undefined
  review.expireStale()
  state.assignment = original
  assert.equal(review.approve(input.id), undefined)
  assert.equal(state.sent.length, 0)
})

test('rejects duplicate IDs, stale targets, and invented evidence', () => {
  const { review, input } = harness()
  assert.equal(review.enqueue({ ...input, assignmentId: 'old' }).accepted, false)
  assert.equal(review.enqueue({ ...input, peerId: 'other' }).accepted, false)
  assert.equal(review.enqueue({ ...input, evidence: [] }).accepted, false)
  assert.equal(
    review.enqueue({ ...input, evidence: [{ timestamp: 0, message: 'Invented' }] }).accepted,
    false,
  )
  assert.equal(review.enqueue({ ...input, message: '' }).accepted, false)
  assert.equal(review.enqueue(input).accepted, true)
  assert.equal(review.enqueue(input).accepted, false)
})

test('offline, permission, and transport failures preserve feedback for retry', () => {
  for (const key of ['allowed', 'open', 'fail']) {
    const { state, review, input } = harness()
    review.enqueue(input)
    state[key] = key === 'fail'
    assert.notEqual(review.approve(input.id).status, 'sent')
    assert.equal(review.suggestions.value[0].status, 'pending')
    assert.ok(review.suggestions.value[0].error)
    assert.equal(state.sent.length, 0)
    state[key] = key !== 'fail'
    assert.equal(review.approve(input.id).status, 'sent')
    assert.equal(review.suggestions.value[0].error, undefined)
  }
})

test('student rejects assignment-bound feedback after assignment changes; ordinary messages still work', () => {
  assert.equal(acceptsAssignmentMessage('turn-1', 'turn-1'), true)
  assert.equal(acceptsAssignmentMessage('new', 'turn-1'), false)
  assert.equal(acceptsAssignmentMessage(undefined, 'turn-1'), false)
  assert.equal(acceptsAssignmentMessage('turn-1', null), false)
  assert.equal(acceptsAssignmentMessage(undefined, undefined), true)
})
