import MainModuleFactory, { type MainModule } from "../public/flightsimulator_exec"
import { SimData, apiMetadata} from "../public/flightsimulator_exec_meta"
export { SimData, getAutopilotProperties, getSimulationParameters, fetchSimData, type SimulationProperties } from "../public/flightsimulator_exec_meta";
export type SimDataKeys = keyof SimData;
export type simPropsKeys = keyof typeof apiMetadata;

export type ExtendedMainModule = MainModule & { simData: SimData} & {
 };
export async function initializeModule(options: any): Promise<ExtendedMainModule> {
  const module: MainModule = await MainModuleFactory(options);
  const simData = new SimData();
  const extendedModule = Object.assign(module, {simData});

  // Convert to value - string for quick lookup.
  return extendedModule as ExtendedMainModule;
}
