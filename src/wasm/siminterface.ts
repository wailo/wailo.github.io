import MainModuleFactory, {
  b747,
  c172,
  graphics,
  EmbindModule,
  airport_world,
  type MainModule,
} from './generated/flightsimulator_exec'

export {
  getFlightModelParameters,
  getSimulationControlsParameters,
  getAutopilotProperties,
  fetchSimData,
  type SimulationProperties,
  type AutopilotProperties,
} from './generated/flightsimulator_exec_meta'
export type FlightModelInstance = b747 | c172
export { type b747, type c172 } from './generated/flightsimulator_exec'
export type ExtendedMainModule = { flightModel: FlightModelInstance } & {
  simulation: graphics
} & { world: airport_world } & EmbindModule
export { type graphics } from './generated/flightsimulator_exec'

export enum LayoutTypes {
  INSTRUCTOR = 'instructor',
  PILOT = 'pilot',
}

export async function initializeModule(options: any): Promise<[MainModule, ExtendedMainModule]> {
  const module: MainModule = await MainModuleFactory(options)
  const simulation: graphics = module.graphics.getContext()
  const world = simulation.world
  if (!world) {
    throw new Error('Failed to initialize simulation world')
  }
  let flightModel: FlightModelInstance = simulation.set_flight_model_b747()
  const extendedModule = Object.assign(module, { flightModel, simulation, world })
  return [module, extendedModule as ExtendedMainModule]
}
