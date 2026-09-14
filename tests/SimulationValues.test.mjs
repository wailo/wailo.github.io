import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, ref, shallowReactive, watchEffect, nextTick } from 'vue'
import Fuse from 'fuse.js'
import { trackSimulationValues } from '../src/SimulationValues.ts'
import { PlotBuffer } from '../src/PlotBuffer.ts'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'
import { model, simPropertiesFixture } from './helpers/sim-properties.mjs'

test('linking metadata preserves getters, setters, enumerability and reads no values eagerly', () => {
  const tick = ref(0)
  let reads = 0
  let value = 1
  const property = {
    id: 'value',
    type: 'number',
    label: 'Value',
    group: 'test',
    get inputValue() {
      reads++
      assert.equal(this, property)
      return value
    },
    setterFunc(next) {
      value = next
    },
  }
  const props = {
    value: property,
    reset: { id: 'reset', type: 'void', label: 'Reset', group: 'test' },
  }
  assert.equal(trackSimulationValues(props, tick), props)
  assert.equal(reads, 0)
  assert.equal(Object.getOwnPropertyDescriptor(property, 'inputValue').enumerable, true)
  const displayed = computed(() => property.inputValue)
  assert.equal(displayed.value, 1)
  property.setterFunc(2)
  assert.equal(property.inputValue, 2, 'script reads stay live, even between UI ticks')
  assert.equal(displayed.value, 1)
  tick.value++
  assert.equal(displayed.value, 2)
})

test('100 live ticks retain catalog, autopilot, groups, search index and joystick option identities', () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  const props = shallowReactive({ simProps: f.allSimProps.value })
  const { fuse } = evaluate(
    `${declarations(componentScript('DataDisplay'), ['fuse'])}; return {fuse}`,
    { computed, Fuse, props },
  )
  const refs = [
    f.flightModelProps,
    f.simulationControlsProps,
    f.allSimProps,
    f.autopilotControls,
    f.groupedSimProps,
    f.filteredGroupedSimProps,
    f.computedJoystickOptions,
    f.simulationPanelControls,
    fuse,
  ]
  const initial = refs.map((r) => r.value)
  const reading = computed(() => f.flightModelProps.value.altitude_ft.inputValue)
  assert.equal(reading.value, 1000)
  for (let tick = 1; tick <= 100; tick++) {
    f.deps.FlightSimModule.flightModel.altitude_ft = 1000 + tick
    f.renderSignal.value++
    f.initFlightModelParams() // Duplicate notifications must not rebuild this instance.
    props.simProps = f.allSimProps.value
    refs.forEach((r, i) => assert.equal(r.value, initial[i]))
    assert.equal(reading.value, 1000 + tick)
  }
  assert.deepEqual(f.counts, { aircraft: 1, simulation: 1, autopilot: 1 })
  f.flightModelFilter.value = 'altitude'
  assert.notEqual(f.filteredGroupedSimProps.value, initial[5])
  assert.equal(f.groupedSimProps.value, initial[4])
  assert.ok(
    f.filteredGroupedSimProps.value
      .flatMap(([, controls]) => controls)
      .every((c) => /altitude/i.test(c.id + c.label)),
  )
})

test('stable data and airflow props still notify live consumers and sample current plots', async () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  const props = shallowReactive({ simProps: f.allSimProps.value })
  const source = componentScript('Airflow')
  const airflow = evaluate(
    `${declarations(source, ['readNumber', 'angleOfAttack', 'pitchAngle', 'gammaAngle', 'airspeed'])}; return {angleOfAttack, gammaAngle, airspeed}`,
    { props, computed },
  )
  const displayed = []
  const stop = watchEffect(() => displayed.push(props.simProps.altitude_ft.inputValue))
  assert.equal(airflow.gammaAngle.value, 2)
  const aircraft = f.deps.FlightSimModule.flightModel
  aircraft.altitude_ft = 1500
  aircraft.aoa_deg = 6
  aircraft.pitch_deg = 9
  aircraft.speed_indicated_knots = 120
  f.renderSignal.value++
  await nextTick()
  assert.deepEqual(displayed, [1000, 1500])
  assert.equal(airflow.angleOfAttack.value, 6)
  assert.equal(airflow.gammaAngle.value, 3)
  assert.equal(airflow.airspeed.value, 120)
  const plot = new PlotBuffer(['altitude_ft'], 5)
  plot.sample((id) => Number(props.simProps[id].inputValue))
  assert.deepEqual(Array.from(plot.data()[1]), [1500])
  stop()
})

test('cached autopilot state and target controls share live readings and working setters', () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  const altitude = f.autopilotControls.value.find((c) => c.id === 'autopilot_altitude')
  assert.equal(altitude.stateCommand, f.flightModelProps.value.autopilot_altitude_hold)
  assert.equal(altitude.targetCommand, f.flightModelProps.value.autopilot_altitude_target)
  const state = computed(() => altitude.stateCommand.inputValue)
  const target = computed(() => altitude.targetCommand.inputValue)
  assert.equal(state.value, false)
  assert.equal(target.value, 2000)
  altitude.stateCommand.setterFunc()
  altitude.targetCommand.setterFunc(3500)
  f.renderSignal.value++
  assert.equal(state.value, true)
  assert.equal(target.value, 3500)
  assert.equal(f.deps.FlightSimModule.flightModel.autopilot_altitude_target, 3500)
})

test('UI-only changes keep catalogs stable while layout, theme, map and visual readings update', () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  const catalog = f.allSimProps.value
  const group = f.groupedSimProps.value
  const layout = computed(() => catalog.layout.inputValue)
  const theme = computed(() => catalog.toggle_theme.inputValue)
  const map = computed(() => catalog.toggle_map.inputValue)
  assert.equal(layout.value, 'instructor')
  assert.equal(theme.value, false)
  assert.equal(map.value, false)
  catalog.layout.setterFunc('pilot')
  catalog.toggle_theme.setterFunc()
  catalog.toggle_visuals.setterFunc()
  f.deps.openLayersMapRef.value = { showNavMap: true }
  assert.equal(layout.value, 'pilot')
  assert.equal(theme.value, true)
  assert.equal(map.value, true)
  assert.equal(catalog.toggle_visuals.inputValue, false)
  assert.equal(f.allSimProps.value, catalog)
  assert.equal(f.groupedSimProps.value, group)
})

test('aircraft switch and same-type reset replace catalogs and bind controls to the new instance', () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  const b747 = f.flightModelProps.value
  assert.equal(f.activeAircraftType.value, 'B747')
  assert.equal(f.computedJoystickOptions.value.gear.length, 3)
  assert.equal(f.computedJoystickInputs.value.throttle, 0.5)
  const oldModel = f.deps.FlightSimModule.flightModel
  f.deps.FlightSimModule.flightModel = { ...model('c172'), engine_throttle_position: 0.1 }
  f.deps.FlightSimModule.simulation.flight_model = 0
  f.deps.FlightSimModule.simulation.flight_model_id++
  f.initFlightModelParams()
  const c172 = f.flightModelProps.value
  assert.notEqual(c172, b747)
  assert.ok(c172.engine_mixture_position)
  assert.equal(c172.engine_4_n1, undefined)
  assert.equal(f.activeAircraftType.value, 'C172')
  assert.equal(f.computedJoystickOptions.value.gear.length, 1)
  assert.equal(f.computedJoystickInputs.value.throttle, 0.1)
  c172.engine_throttle_position.setterFunc(0.7)
  assert.equal(oldModel.engine_throttle_position, 0.5)
  assert.equal(f.deps.FlightSimModule.flightModel.engine_throttle_position, 0.7)
  const previous = f.deps.FlightSimModule.flightModel
  f.deps.FlightSimModule.flightModel = model('c172')
  f.deps.FlightSimModule.simulation.flight_model_id++
  f.initFlightModelParams()
  const reset = f.flightModelProps.value
  assert.notEqual(reset, c172)
  reset.engine_throttle_position.setterFunc(0.9)
  assert.equal(previous.engine_throttle_position, 0.7)
  assert.equal(f.deps.FlightSimModule.flightModel.engine_throttle_position, 0.9)
  // A generation change must also rebuild if the bridge reuses its wrapper object.
  f.deps.FlightSimModule.simulation.flight_model_id++
  f.initFlightModelParams()
  assert.notEqual(f.flightModelProps.value, reset)
})

test('update loop propagates a replacement catalog before plotting and skips deferred work after unmount', async () => {
  const f = simPropertiesFixture()
  f.initFlightModelParams()
  let childSources
  const stop = watchEffect(() => {
    childSources = f.allSimProps.value
  })
  const samples = []
  f.deps.dataDisplayRef.value = {
    tickPlot() {
      samples.push(childSources.altitude_ft.inputValue)
    },
  }
  f.deps.FlightSimModule.flightModel = { ...model('c172'), altitude_ft: 999 }
  await f.updateSim()
  assert.deepEqual(samples, [999])
  const pending = f.updateSim()
  f.dispose()
  await pending
  assert.deepEqual(samples, [999])
  stop()
})
