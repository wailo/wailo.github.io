import assert from 'node:assert/strict'
import test from 'node:test'
import { nextClassroomFocus, isNativeControlKey } from '../src/ClassroomFocus.ts'

const rows = [
  { peerId: 'a', assigned: true },
  { peerId: 'b', assigned: true },
  { peerId: 'c', assigned: false },
]

test('batch actions prefer the next unassigned peer', () => {
  assert.equal(nextClassroomFocus(rows, 'a', ['a']), 'c')
})

test('batch actions fall back to another assigned peer', () => {
  assert.equal(nextClassroomFocus(rows, 'a', ['a', 'c']), 'b')
})

test('targeting every peer retains current focus', () => {
  assert.equal(nextClassroomFocus(rows, 'b', ['a', 'b', 'c']), 'b')
})

test('focus follows peer identity after regrouping', () => {
  assert.equal(nextClassroomFocus([...rows].reverse(), 'b'), 'b')
})

test('removed peers fall back to the first visible peer or the panel', () => {
  assert.equal(nextClassroomFocus(rows, 'removed'), 'a')
  assert.equal(nextClassroomFocus([], 'removed'), '')
})

test('native activation and tab navigation remain available on buttons', () => {
  for (const key of ['Enter', ' ', 'Tab']) assert.equal(isNativeControlKey(key), true)
  for (const key of ['a', 's', 'm', 'ArrowRight', 'ArrowLeft', 'Escape']) {
    assert.equal(isNativeControlKey(key), false)
  }
})
