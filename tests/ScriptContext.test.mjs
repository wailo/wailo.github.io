import assert from 'node:assert/strict'
import test from 'node:test'

import { createScriptContext, runUserScript } from '../src/ScriptContext.ts'

function createDependencies(props) {
  const noOp = () => {}
  const asyncNoOp = async () => {}

  return {
    controls: { FLIGHTMODEL_VERSION: 'test' },
    props,
    repositionWithAutopilot: async () => true,
    waitFor: asyncNoOp,
    waitForCondition: async () => true,
    notifyUser: asyncNoOp,
    waitForUser: asyncNoOp,
    askQuestion: async () => ({ type: 'essay', answer: '', attempts: 1, elapsedMs: 0 }),
    dataView: noOp,
    plotView: noOp,
    dataDisplayReset: noOp,
    setLayout: noOp,
    layoutTypes: {},
    setVisuals: noOp,
    setMap: noOp,
    setTheme: noOp,
    setTab: noOp,
    resetPanels: noOp,
    checkPoint: noOp,
    metrics: [],
  }
}

test('createScriptContext preserves live simulator properties and forwards utilities', () => {
  let altitude = 1200
  const props = {
    altitude_ft: {
      id: 'altitude_ft',
      get inputValue() {
        return altitude
      },
    },
  }
  const dependencies = createDependencies(props)
  const context = createScriptContext(dependencies)

  assert.equal(context.props, props)
  assert.equal(context.controls, dependencies.controls)
  assert.equal(context.plotView, dependencies.plotView)
  assert.equal(context.dataView, dependencies.dataView)
  assert.equal(context.waitForCondition, dependencies.waitForCondition)
  assert.equal(context.askQuestion, dependencies.askQuestion)
  assert.equal(context.setTab, dependencies.setTab)

  altitude = 2400
  assert.equal(context.props.altitude_ft.inputValue, 2400)
  assert.equal(context.layoutTypes.INSTRUCTOR, 'instructor')
})

test('runUserScript passes the same context to a successful lesson', async () => {
  const context = createScriptContext(createDependencies({}))
  let receivedContext

  await runUserScript(async (received) => {
    receivedContext = received
  }, context)

  assert.equal(receivedContext, context)
})

test('runUserScript reports an error once and rethrows the original failure', async (t) => {
  t.mock.method(console, 'error', () => {})
  const notifications = []
  const dependencies = createDependencies({})
  dependencies.notifyUser = async (...args) => notifications.push(args)
  const context = createScriptContext(dependencies)
  const failure = new Error('lesson failed')

  await assert.rejects(
    runUserScript(async () => {
      throw failure
    }, context),
    (error) => error === failure,
  )

  assert.deepEqual(notifications, [['Script Error', 'Error: lesson failed']])
})
