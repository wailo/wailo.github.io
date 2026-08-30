import assert from 'node:assert/strict'
import test from 'node:test'

import { isPlottableSimulationProperty } from '../src/PlotProperty.ts'

const property = (type, enumValues) => ({
  id: 'test',
  label: 'Test',
  group: 'test',
  type,
  enumValues,
})

test('numeric and boolean simulator properties are plottable', () => {
  assert.equal(isPlottableSimulationProperty(property('number')), true)
  assert.equal(isPlottableSimulationProperty(property('boolean')), true)
})

test('numeric enum simulator properties are plottable', () => {
  assert.equal(
    isPlottableSimulationProperty(
      property('enum', [
        { enumName: 'ZERO', enumValue: 0 },
        { enumName: 'TEN', enumValue: 10 },
      ]),
    ),
    true,
  )
})

test('string and empty enum simulator properties are not plottable', () => {
  assert.equal(
    isPlottableSimulationProperty(
      property('enum', [
        { enumName: 'OFF', enumValue: 'off' },
        { enumName: 'ON', enumValue: 'on' },
      ]),
    ),
    false,
  )
  assert.equal(isPlottableSimulationProperty(property('enum', [])), false)
})
