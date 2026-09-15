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

test('assessment submits a snapshot through checkpoints once per run, including zero scores', () => {
  const deps = createDependencies({})
  const checkpoints = []
  deps.checkPoint = (message, data) => checkpoints.push({ message, data })
  const context = createScriptContext(deps)
  const result = { score: 0, maxScore: 6, passingScore: 5 }
  context.assessment.submit(result)
  result.score = 6
  assert.deepEqual(checkpoints[0].data.assessment, { score: 0, maxScore: 6, passingScore: 5 })
  assert.match(checkpoints[0].message, /0\/6/)
  assert.throws(() => context.assessment.submit(result), /already submitted/)
  createScriptContext(deps).assessment.submit(result)
  assert.equal(checkpoints.length, 2, 'a new run has its own submission state')
})

test('invalid assessment scores and thresholds never publish evidence', () => {
  const deps = createDependencies({})
  deps.checkPoint = () => assert.fail('invalid scores must not publish')
  const context = createScriptContext(deps)
  for (const change of [
    { score: -1 },
    { score: 7 },
    { score: NaN },
    { score: Infinity },
    { score: '5' },
    { maxScore: 0 },
    { maxScore: Infinity },
    { passingScore: -1 },
    { passingScore: 7 },
  ]) {
    assert.throws(
      () => context.assessment.submit({ score: 5, maxScore: 6, passingScore: 5, ...change }),
      /Invalid assessment/,
    )
  }
})

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
  dependencies.ai = { request: async () => ({ status: 'completed', message: 'Debrief' }) }
  const context = createScriptContext(dependencies)

  assert.equal(context.props, props)
  assert.equal(context.controls, dependencies.controls)
  assert.equal(context.plotView, dependencies.plotView)
  assert.equal(context.dataView, dependencies.dataView)
  assert.equal(context.waitForCondition, dependencies.waitForCondition)
  assert.equal(context.askQuestion, dependencies.askQuestion)
  assert.equal(context.ai, dependencies.ai)
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

test('checkPoint forwards both legacy text and optional structured evidence', () => {
  const dependencies = createDependencies({})
  const calls = []
  dependencies.checkPoint = (...args) => calls.push(args)
  const context = createScriptContext(dependencies)
  context.checkPoint('Started')
  const evidence = { step: 'climb', altitudeFt: 1500 }
  context.checkPoint('Climb established', evidence)
  assert.deepEqual(calls, [['Started'], ['Climb established', evidence]])
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
