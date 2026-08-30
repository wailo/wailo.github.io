import assert from 'node:assert/strict'
import test from 'node:test'

import {
  compileUserScript,
  loadUserScript,
  stripImportsExports,
} from '../src/EditorScriptRuntime.ts'

test('stripImportsExports removes lesson imports and exports', () => {
  const source = `
    import {
      ScriptContext,
      b747,
    } from '../../src/core'

    export async function main(context: ScriptContext) {
      return context
    }
  `
  const stripped = stripImportsExports(source)

  assert.doesNotMatch(stripped, /\bimport\b/)
  assert.doesNotMatch(stripped, /\bexport\b/)
  assert.match(stripped, /async function main/)
})

test('compileUserScript executes simulator controls with the original property metadata', async () => {
  const altitudeProperty = {
    id: 'altitude_ft',
    label: 'Altitude',
    type: 'number',
    group: 'position',
  }
  const plotCalls = []
  const throttleCalls = []
  const context = {
    props: { altitude_ft: altitudeProperty },
    plotView: (...args) => plotCalls.push(args),
    controls: {
      flightModel: {
        set_engine_throttle_position: (value) => throttleCalls.push(value),
      },
    },
  }
  const lesson = compileUserScript(`
    import { ScriptContext } from '../../src/core'

    export async function main(context: ScriptContext) {
      context.plotView(context.props.altitude_ft, true)
      await Promise.resolve()
      context.controls.flightModel.set_engine_throttle_position(0.75)
    }
  `)

  await lesson(context)

  assert.deepEqual(plotCalls, [[altitudeProperty, true]])
  assert.deepEqual(throttleCalls, [0.75])
})

test('compileUserScript rejects a missing main function and reports it once', () => {
  const errors = []

  assert.throws(
    () =>
      compileUserScript('export const lessonName = "No main"', (message) => errors.push(message)),
    /function named 'main'/,
  )
  assert.deepEqual(errors, ["The script must define a function named 'main'"])
})

test('loadUserScript rejects a non-function main value', () => {
  assert.throws(() => loadUserScript('const main = 42'), /function named 'main'/)
})

test('compileUserScript surfaces invalid generated JavaScript', () => {
  assert.throws(() =>
    compileUserScript(`
      export async function main(context: ScriptContext) {
        const invalid =
      }
    `),
  )
})
