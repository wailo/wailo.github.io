import MainModuleFactory, { b747, c172, EmbindModule, graphics, type MainModule} from "../public/flightsimulator_exec"

export { getFlightModelParameters, getSimulationControlsParameters, getAutopilotProperties, fetchSimData, type SimulationProperties } from "../public/flightsimulator_exec_meta"
export type FlightModelInstance = b747 | c172;
export type ExtendedMainModule = { flightModel : FlightModelInstance} & {simulation : graphics} & EmbindModule;

export async function initializeModule(options: any): Promise<[MainModule, ExtendedMainModule]> {
  const module: MainModule = await MainModuleFactory(options); 
  const simulation = module.graphics.getContext();
  let  flightModel : FlightModelInstance  = simulation.set_flight_model_b747();
  const extendedModule = Object.assign(module, {flightModel, simulation});
  return [module, extendedModule as ExtendedMainModule];
}
