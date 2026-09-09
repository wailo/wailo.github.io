import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PlotBuffer } from '../src/PlotBuffer.ts'

const snapshot = buffer => buffer.data().map(values => Array.from(values))

test('combined plot starts fresh even when a standalone series has history', () => {
  const standalone = new PlotBuffer(['speed'], 3)
  for (const speed of [80, 90, 100, 110]) standalone.sample(() => speed)
  const combined = new PlotBuffer(['target', 'speed'], 3)
  assert.deepEqual(snapshot(combined), [[], [], []])
  combined.sample(id => id === 'target' ? 250 : 150)
  assert.deepEqual(snapshot(combined), [[0], [250], [150]])
  assert.deepEqual(snapshot(standalone), [[1, 2, 3], [90, 100, 110]])
})

test('series remain aligned across circular buffer wraparound', () => {
  const plot = new PlotBuffer(['target', 'actual'], 3)
  for (let i = 0; i < 8; i++) plot.sample(id => id === 'target' ? i + 100 : i)
  assert.deepEqual(snapshot(plot), [[5, 6, 7], [105, 106, 107], [5, 6, 7]])
})

test('reset and replacement cannot change another plot sharing a source', () => {
  const standalone = new PlotBuffer(['speed'], 3)
  const combined = new PlotBuffer(['target', 'speed'], 3)
  standalone.sample(() => 120)
  combined.sample(() => 250)
  combined.reset()
  assert.deepEqual(snapshot(combined), [[], [], []])
  assert.deepEqual(snapshot(standalone), [[0], [120]])
  combined.sample(id => id === 'target' ? 200 : 180)
  assert.deepEqual(snapshot(combined), [[0], [200], [180]])
  const replacement = new PlotBuffer(['speed', 'altitude'], 3)
  assert.deepEqual(snapshot(replacement), [[], [], []])
  replacement.sample(id => id === 'speed' ? 190 : 3000)
  assert.deepEqual(snapshot(replacement), [[0], [190], [3000]])
  assert.deepEqual(snapshot(standalone), [[0], [120]])
})
