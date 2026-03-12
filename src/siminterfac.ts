import MainModuleFactory, { b747, c172, graphics, type MainModule} from "../public/flightsimulator_exec"
export { getFlightModelParameters, getSimulationControlsParameters, getAutopilotProperties, fetchSimData, type SimulationProperties } from "../public/flightsimulator_exec_meta"
export type FlightModelInstance = b747 | c172;
export type ExtendedMainModule = MainModule  & { fm : FlightModelInstance} & {simulation : graphics};
export async function initializeModule(options: any): Promise<ExtendedMainModule> {
  const module: MainModule = await MainModuleFactory(options); 
  const simulation = module.graphics.getContext();
  let  fm : FlightModelInstance  = simulation.set_flight_model_b747();
  const extendedModule = Object.assign(module, {fm, simulation});
  return extendedModule as ExtendedMainModule;
}


// Precompute factors
const roundFactors = Object.freeze([1, 10, 100, 1000, 10000, 100000] as const);

// Supported factors
export type RoundDecimal = 0 | 1 | 2 | 3 | 4 | 5;

// Rounding function
export function SimRound(value: number, decimals: RoundDecimal): number {
  const factor = roundFactors[decimals];
  return Math.round(value * factor) / factor;
}
