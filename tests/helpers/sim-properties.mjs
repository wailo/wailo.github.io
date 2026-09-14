import { computed, ref, shallowRef, nextTick } from 'vue'
import * as metadata from '../../src/wasm/generated/flightsimulator_exec_meta.ts'
import { trackSimulationValues } from '../../src/SimulationValues.ts'
import { componentScript, declarations, evaluate } from './vue-script.mjs'

export function model(name = 'b747') {
  return {
    name,
    altitude_ft: 1000,
    aoa_deg: 3,
    pitch_deg: 5,
    speed_indicated_knots: 100,
    autopilot_altitude_hold: false,
    autopilot_altitude_target: 2000,
    engine_throttle_position: 0.5,
    set_autopilot_altitude_hold(value) {
      this.autopilot_altitude_hold = value
    },
    set_autopilot_altitude_target(value) {
      this.autopilot_altitude_target = value
    },
    set_engine_throttle_position(value) {
      this.engine_throttle_position = value
    },
  }
}

export function simPropertiesFixture() {
  const counts = { aircraft: 0, simulation: 0, autopilot: 0 }
  const deps = {
    computed,
    ref,
    shallowRef,
    nextTick,
    trackSimulationValues,
    getFlightModelParameters: (...args) => {
      counts.aircraft++
      return metadata.getFlightModelParameters(...args)
    },
    getSimulationControlsParameters: (...args) => {
      counts.simulation++
      return metadata.getSimulationControlsParameters(...args)
    },
    getAutopilotProperties: (...args) => {
      counts.autopilot++
      return metadata.getAutopilotProperties(...args)
    },
    FlightSimModule: {
      flightModel: model(),
      simulation: { simulation_pause: false, flight_model_id: 1, flight_model: 1 },
      GRAPHICSEFlightModel: { B747: 1, C172: 0 },
    },
    LayoutTypes: { INSTRUCTOR: 'instructor', PILOT: 'pilot', FOCUS: 'focus' },
    layout: ref('instructor'),
    isDarkMode: ref(false),
    isVisuals: ref(true),
    openLayersMapRef: ref(null),
    dataDisplayRef: ref(null),
    simFunctions: {
      setLayout(value) {
        deps.layout.value = value
      },
      setVisuals(value) {
        deps.isVisuals.value = value
      },
    },
    toggleFullscreen() {},
    toggleTheme() {
      deps.isDarkMode.value = !deps.isDarkMode.value
    },
    fetchSimData(_module, onChange) {
      onChange()
    },
  }
  const source = componentScript('Sim')
  const names = [
    'renderSignal',
    'activeAircraftType',
    'layoutControls',
    'flightModelProps',
    'simulationProperties',
    'simulationControlsProps',
    'allSimProps',
    'simulationPanelControls',
    'autopilotControls',
    'groupedSimProps',
    'flightModelFilter',
    'filteredGroupedSimProps',
    'computedJoystickInputs',
    'computedJoystickOptions',
    'metadataModel',
    'metadataSimulation',
    'metadataModelId',
    'initFlightModelParams',
    'simDisposed',
    'updateSim',
  ]
  const api = evaluate(
    `${declarations(source, names)}; return {
    ${names.filter((name) => !['simDisposed', 'metadataModel', 'metadataSimulation', 'metadataModelId'].includes(name)).join(',')},
    dispose() { simDisposed = true },
  }`,
    deps,
  )
  return { ...api, deps, counts }
}
