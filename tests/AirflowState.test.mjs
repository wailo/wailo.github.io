import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, ref, shallowReactive, watch, nextTick } from 'vue'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'

test('airflow CL, stall state and limits follow UI ticks and aircraft replacement', async () => {
  const renderSignal = ref(0)
  const FlightSimModule = {
    flightModel: { cl: 0.2, max_aoa_deg: 15, stalling: false },
  }
  const { airflowState } = evaluate(
    `${declarations(componentScript('Sim'), ['airflowState'])}; return { airflowState }`,
    { computed, renderSignal, FlightSimModule },
  )
  const props = shallowReactive({ ...airflowState.value })
  const angleOfAttack = ref(4)
  const source = componentScript('Airflow')
  // Exercise the actual graph's sample watcher and coordinate calculation.
  const sampleWatcher = source.statements.find((node) => node.getText(source).startsWith('watch('))
  const graph = evaluate(
    `${declarations(source, ['liftSamples'])}\n${sampleWatcher.getText(source)}\n${declarations(source, ['liftChart'])}; return { liftSamples, liftChart }`,
    { ref, computed, watch, props, angleOfAttack },
  )
  const initialY = graph.liftChart.value.currentY
  FlightSimModule.flightModel.cl = 0.9
  FlightSimModule.flightModel.stalling = true
  assert.equal(airflowState.value.liftCoefficient, 0.2)
  renderSignal.value++
  Object.assign(props, airflowState.value)
  await nextTick()
  assert.equal(props.liftCoefficient, 0.9)
  assert.equal(props.stalling, true)
  assert.ok(graph.liftChart.value.currentY < initialY)
  assert.deepEqual(graph.liftSamples.value.at(-1), { aoa: 4, cl: 0.9 })

  FlightSimModule.flightModel = { cl: 0.4, max_aoa_deg: 18, stalling: false }
  renderSignal.value++
  Object.assign(props, airflowState.value)
  await nextTick()
  assert.equal(props.liftCoefficient, 0.4)
  assert.equal(props.maxAngleOfAttack, 18)
  assert.equal(props.stalling, false)
  assert.deepEqual(graph.liftSamples.value.at(-1), { aoa: 4, cl: 0.4 })
})
