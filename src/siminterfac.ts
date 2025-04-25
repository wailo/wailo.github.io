import MainModuleFactory, { MainModule } from "../public/flightsimulator_exec";

let FlapSelectorKeys: { [key: number]: string } = {};
let GearSelectorKeys: { [key: number]: string } = {};

export class SimData {
  api_version: string = "";
  api_fps: number = 0;
  api_ups: number = 0;
  api_simulation_speed: number = 0;
  api_weight: number = 0;
  api_empty_weight: number = 0;
  api_altitude: number = 0;
  api_vertical_speed: number = 0;
  api_alpha_tail: number = 0;
  api_alpha_aileron: number = 0;
  api_landing_gear_selector_position :number = 0
  api_landing_gear_selector_position_name :string = "";
  api_flaps_selector_position :number = 0;
  api_flaps_selector_position_name :string = "";
  api_rudder_position: number = 0;
  api_aileron_trim_position: number = 0;
  api_elevator_trim_position: number = 0;
  api_rudder_trim_position: number = 0;
  api_throttle: number = 0;
  api_ias_speed_knots: number = 0;
  api_heading_deg: number = 0;
  api_pitch_deg: number = 0;
  api_bank_deg: number = 0;
  api_simulation_pause: boolean = false;
  api_autopilot: boolean = false;
  api_heading_hold: boolean = false;
  api_pitch_hold: boolean = false;
  api_bank_hold: boolean = false;
  // api_level_hold: boolean = false;
  api_speed_hold: boolean = false;
  api_true_speed_hold: boolean = false;
  api_mach_speed_hold: boolean = false;
  api_altitude_hold: boolean = false;
  api_vertical_speed_hold: boolean = false;
  api_target_heading_deg: number = 0;
  api_target_pitch_deg: number = 0;
  api_target_bank_deg: number = 0;
  api_target_altitude: number = 0;
  api_target_vertical_speed: number = 0;
  api_target_speed: number = 0;
  api_target_true_speed: number = 0;
  api_target_mach_speed: number = 0;
  api_atmosphere_sea_level_temperature: number = 0;
  api_atmosphere_sea_level_density: number = 0;
  api_thrust_to_weight: number = 0;
  api_cl0: number = 0;
  api_cdo: number = 0;
  api_wing_area: number = 0;
  api_true_speed_knots: number = 0;
  api_mach: number = 0;
  api_vstall_speed_knots: number = 0;
  api_atmosphere_temperature: number = 0;
  api_atmosphere_density: number = 0;
  api_total_drag: number = 0;
  api_cl: number = 0;
  api_aoa_deg: number = 0;
  api_cdi: number = 0;
  api_ground_collision: boolean = false;
  api_latitude : number = 0;
  api_longitude : number = 0;
}

export type SimDataKeys = keyof SimData;

export type SimulationDataDisplay = {
  [key in SimDataKeys]: {
    api: key;
    label: string;
    visible: boolean;
  };
};


export const simulationDataDisplay:  SimulationDataDisplay = {
  api_version : {api: "api_version", label: "Flight Model Version", visible: false},
  api_fps: { api: "api_fps", label: "Frames Per Second", visible: false },
  api_ups: { api: "api_ups", label: "Update Per Second", visible: false },
  api_simulation_speed: { api: "api_simulation_speed", label: "Simulation Speed", visible: false },
  api_ground_collision: { api: "api_ground_collision", label: "Ground Collision", visible: false },
  api_weight: { api: "api_weight", label: "Weight", visible: false },
  api_empty_weight: { api: "api_empty_weight", label: "Empty Weight", visible: false },
  api_altitude: { api: "api_altitude", label: "Altitude", visible: false },
  api_vertical_speed: { api: "api_vertical_speed", label: "Vertical Speed", visible: false },
  api_alpha_tail: { api: "api_alpha_tail", label: "Elevator", visible: false },
  api_alpha_aileron: { api: "api_alpha_aileron", label: "Aileron", visible: false },
  api_throttle: { api: "api_throttle", label: "Throttle", visible: false },
  api_landing_gear_selector_position : { api: "api_landing_gear_selector_position", label: "Landing Gear Selector Position", visible: false },
  api_landing_gear_selector_position_name : { api: "api_landing_gear_selector_position_name", label: "Landing Gear Selector Position Name", visible: false },
  api_flaps_selector_position : { api: "api_flaps_selector_position", label: "Flap Selector Position", visible: false },
  api_flaps_selector_position_name : { api: "api_flaps_selector_position_name", label: "Flap Selector Position Name", visible: false },
  api_rudder_position: { api: "api_rudder_position", label: "Rudder Position", visible: false },
  api_aileron_trim_position: { api: "api_aileron_trim_position", label: "Aileron Trim Position", visible: false },
  api_elevator_trim_position: { api: "api_elevator_trim_position", label: "Elevator Trim Position", visible: false },
  api_rudder_trim_position:  { api: "api_rudder_trim_position", label: "Rudder Trim Position", visible: false },
  api_ias_speed_knots: { api: "api_ias_speed_knots", label: "IAS Speed", visible: false },
  api_heading_deg: { api: "api_heading_deg", label: "Heading", visible: false },
  api_pitch_deg: { api: "api_pitch_deg", label: "Pitch", visible: false },
  api_bank_deg: { api: "api_bank_deg", label: "Bank", visible: false },
  api_simulation_pause: { api: "api_simulation_pause", label: "Simulation Pause", visible: false },
  api_autopilot: { api: "api_autopilot", label: "Autopilot Master Switch", visible: false },
  api_heading_hold: { api: "api_heading_hold", label: "Heading Hold", visible: false },
  api_bank_hold: { api: "api_bank_hold", label: "Bank Hold", visible: false },
  api_pitch_hold: { api: "api_pitch_hold", label: "Pitch Hold", visible: false },
  api_speed_hold: { api: "api_speed_hold", label: "Speed Hold", visible: false },
  api_true_speed_hold: { api: "api_true_speed_hold", label: "True Speed Hold", visible: false },
  api_mach_speed_hold: { api: "api_mach_speed_hold", label: "Mach Speed Hold", visible: false },
  api_altitude_hold: { api: "api_altitude_hold", label: "Altitude Hold", visible: false },
  api_vertical_speed_hold: { api: "api_vertical_speed_hold", label: "Vertical Speed Hold", visible: false },
  api_target_heading_deg: { api: "api_target_heading_deg", label: "Target Heading", visible: false },
  api_target_bank_deg: { api: "api_target_bank_deg", label: "Target Bank", visible: false },
  api_target_pitch_deg: { api: "api_target_pitch_deg", label: "Target Pitch", visible: false },
  api_target_altitude: { api: "api_target_altitude", label: "Target Altitude", visible: false },
  api_target_vertical_speed: { api: "api_target_vertical_speed", label: "Target Vertical Speed", visible: false },
  api_target_speed: { api: "api_target_speed", label: "Target Speed", visible: false },
  api_target_true_speed: { api: "api_target_true_speed", label: "Target True Speed", visible: false },
  api_target_mach_speed: { api: "api_target_mach_speed", label: "Target Mach Speed", visible: false },
  api_atmosphere_sea_level_temperature: {
    api: "api_atmosphere_sea_level_temperature",
    label: "Sea Level Temperature",
    visible: false,
  },
  api_atmosphere_sea_level_density: {
    api: "api_atmosphere_sea_level_density",
    label: "Sea Level Density",
    visible: false,
  },
  api_thrust_to_weight: { api: "api_thrust_to_weight", label: "Thrust To Weight", visible: false },
  api_wing_area: { api: "api_wing_area", label: "Wing Area", visible: false },
  api_true_speed_knots: { api: "api_true_speed_knots", label: "True Airspeed", visible: false },
  api_mach: { api: "api_mach", label: "Mach", visible: false },
  api_vstall_speed_knots: { api: "api_vstall_speed_knots", label: "Vstall Speed", visible: false },
  api_atmosphere_temperature: {
    api: "api_atmosphere_temperature",
    label: "Atmosphere Temperature",
    visible: false,
  },
  api_atmosphere_density: { api: "api_atmosphere_density", label: "Atmosphere Density", visible: false },
  api_total_drag: { api: "api_total_drag", label: "Total Drag", visible: false },
  api_cl: { api: "api_cl", label: "Lift Coefficient", visible: false },
  api_aoa_deg: { api: "api_aoa_deg", label: "Angle of Attack", visible: false },
  api_cdi: { api: "api_cdi", label: "Drag Coefficient", visible: false },
  api_cl0:  {api: 'api_cl0', label: 'Cl0', visible: false},
  api_latitude: { api: "api_latitude", label: "Latitude", visible: false },
  api_longitude: { api: "api_longitude", label: "Longitude", visible: false },
  api_cdo: { api: "api_cdo", label: "Drag Coefficient", visible: false },
};


let ptrApiFps: number = 0;
let ptrApiUps: number = 0;
let ptrApiWeight: number = 0;
let ptrApiEmptyWeight: number = 0;
let ptrApiAltitude: number = 0;
let ptrApiVerticalSpeed: number = 0;
let ptrApiAlphaTail: number = 0;
let ptrApiAlphaAileron: number = 0;
let ptrApiLandingGearSelectorPosition: number = 0;
let ptrApiFlapSelectorPosition: number = 0;
let ptrApiRudderPosition: number = 0;
let ptrApiAileronTrimPosition: number = 0;
let ptrApiElevatorTrimPosition: number = 0;
let ptrApiRudderTrimPosition: number = 0;
let ptrApiThrottle: number = 0;
let ptrApiIasSpeedKnots: number = 0;
let ptrApiHeadingDeg: number = 0;
let ptrApiPitchDeg: number = 0;
let ptrApiBankDeg: number = 0;
let ptrApiAutopilot: number = 0;
let ptrApiHeadingHold: number = 0;
let ptrApiPitchHold: number = 0;
let ptrApiBankHold: number = 0;
// let ptrApiLevelHold: number = 0;
let ptrApiSpeedHold: number = 0;
let ptrApiTrueSpeedHold: number = 0;
let ptrApiMachSpeedHold: number = 0;
let ptrApiAltitudeHold: number = 0;
let ptrApiVerticalSpeedHold: number = 0;
let ptrApiTargetHeadingDeg: number = 0;
let ptrApiTargetPitchDeg: number = 0;
let ptrApiTargetBankDeg: number = 0;
let ptrApiTargetAltitude: number = 0;
let ptrApiTargetVerticalSpeed: number = 0;
let ptrApiTargetSpeed: number = 0;
let ptrApiTargetTrueSpeed: number = 0;
let ptrApiTargetMachSpeed: number = 0;
let ptrApiAtmosphereSeaLevelTemperature: number = 0;
let ptrApiAtmosphereSeaLevelDensity: number = 0;
let ptrApiSimulationPause: number = 0;
let ptrApiSimulationSpeed: number = 0;
let ptrApiThrustToWeight: number = 0;
let ptrApiCl0: number = 0;
let ptrApiCdo: number = 0;
let ptrApiWingArea: number = 0;
let ptrApiTrueSpeedKnots: number = 0;
let ptrApiVstallSpeedKnots: number = 0;
let ptrApiAtmosphereTemperature: number = 0;
let ptrApiAtmosphereDensity: number = 0;
let ptrApiMach: number = 0;
let PtrApiTotalDrag: number = 0;
let ptrApiCl: number = 0;
let ptrApiAoaDeg: number = 0;
let ptrApiCdi: number = 0;
let ptrApiGroundCollision: number = 0;
let ptrApiLatitude: number = 0;
let ptrApiLongitude: number = 0;


export type ExtendedMainModule = MainModule & { simData: SimData; simDataDisplay: SimulationDataDisplay;
  simulationProperties: {[key: string]: SimulationProperties[]}; autopilotProperties: SimulationProperties[]} & {
 };
export async function initializeModule(options: any): Promise<ExtendedMainModule> {
  const module: MainModule = await MainModuleFactory(options);
  const simData = new SimData();
  const simDataDisplay = simulationDataDisplay;
  const simulationProperties = getSimulationParameters(module, simData, () => {});
  const autopilotProperties = getAutopilotProperties(module, simData);
  // Extend the module with additional properties
  const extendedModule = Object.assign(module, { simData, simDataDisplay, simulationProperties, autopilotProperties});

  // Convert to value - string for quick lookup.
  FlapSelectorKeys = Object.entries(module.FlapSelector).slice(2).reduce((acc: { [key: number]: string }, v: [string, { value: number }]) => {
    acc[v[1].value] = v[0];
    return acc;
  }, {} as { [key: number]: string });
  GearSelectorKeys = Object.entries(module.GearSelector).slice(2).reduce((acc: { [key: number]: string }, v: [string, { value: number }]) => {
    acc[v[1].value] = v[0];
    return acc;
  }, {} as { [key: number]: string });
  return extendedModule as ExtendedMainModule;
}

interface SimulationProperties {
  id?: string;
  label: string;
  inputValue?: number;
  stateValue?: boolean;
  toggleFunc?: Function;
  toggleFuncStr?: () => string;
  setterFunc?: Function;
  setterFuncStr?: (val: string) => string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  icon?: string;
}

function init(module: MainModule) {
  ptrApiFps = module._api_fps() >> 2;
  ptrApiUps = module._api_ups() >> 2;
  ptrApiWeight = module._api_weight() >> 2;
  ptrApiEmptyWeight = module._api_empty_weight() >> 2;
  ptrApiAltitude = module._api_altitude() >> 2;
  ptrApiVerticalSpeed = module._api_vertical_speed() >> 2;
  ptrApiAlphaTail = module._api_alpha_tail() >> 2;
  ptrApiAlphaAileron = module._api_alpha_aileron() >> 2;
  ptrApiLandingGearSelectorPosition = module._api_landing_gear_selector_position() >> 2;
  ptrApiFlapSelectorPosition = module._api_flaps_selector_position() >> 2;
  ptrApiRudderPosition = module._api_rudder_position() >> 2;
  ptrApiAileronTrimPosition = module._api_aileron_trim_position() >> 2;
  ptrApiElevatorTrimPosition = module._api_elevator_trim_position() >> 2;
  ptrApiRudderTrimPosition = module._api_rudder_trim_position() >> 2;
  ptrApiThrottle = module._api_throttle() >> 2;
  ptrApiIasSpeedKnots = module._api_ias_speed_knots() >> 2;
  ptrApiHeadingDeg = module._api_heading_deg() >> 2;
  ptrApiPitchDeg = module._api_pitch_deg() >> 2;
  ptrApiBankDeg = module._api_bank_deg() >> 2;
  ptrApiAutopilot = module._api_autopilot();
  ptrApiHeadingHold = module._api_heading_hold();
  ptrApiPitchHold = module._api_pitch_hold();
  ptrApiBankHold = module._api_bank_hold();
  // ptrApiLevelHold = module._api_level_hold();
  ptrApiSpeedHold = module._api_speed_hold();
  ptrApiTrueSpeedHold = module._api_true_speed_hold();
  ptrApiMachSpeedHold = module._api_mach_speed_hold();
  ptrApiAltitudeHold = module._api_altitude_hold();
  ptrApiVerticalSpeedHold = module._api_vertical_speed_hold();
  ptrApiTargetHeadingDeg = module._api_target_heading_deg() >> 2;
  ptrApiTargetPitchDeg = module._api_target_pitch_deg() >> 2;
  ptrApiTargetBankDeg = module._api_target_bank_deg() >> 2;
  ptrApiTargetAltitude = module._api_target_altitude() >> 2;
  ptrApiTargetVerticalSpeed = module._api_target_vertical_speed() >> 2;
  ptrApiTargetSpeed = module._api_target_speed() >> 2;
  ptrApiTargetTrueSpeed = module._api_target_true_speed() >> 2;
  ptrApiTargetMachSpeed = module._api_target_mach_speed() >> 2;
  ptrApiAtmosphereSeaLevelTemperature =
    module._api_atmosphere_sea_level_temperature() >> 2;
  ptrApiAtmosphereSeaLevelDensity =
    module._api_atmosphere_sea_level_density() >> 2;
  ptrApiSimulationPause = module._api_simulation_pause();
  ptrApiSimulationSpeed = module._api_simulation_speed() >> 2;
  ptrApiThrustToWeight = module._api_thrust_to_weight() >> 2;
  ptrApiCl0 = module._api_dcl() >> 2;
  ptrApiCdo = module._api_cdo() >> 2;
  ptrApiWingArea = module._api_wing_area() >> 2;
  ptrApiTrueSpeedKnots = module._api_true_speed_knots() >> 2;
  ptrApiMach = module._api_mach() >> 2;
  ptrApiVstallSpeedKnots = module._api_vstall_speed_knots() >> 2;
  ptrApiAtmosphereTemperature = module._api_atmosphere_temperature() >> 2;
  ptrApiAtmosphereDensity = module._api_atmosphere_density() >> 2;
  PtrApiTotalDrag = module._api_total_drag() >> 2;
  ptrApiCl = module._api_cl() >> 2;
  ptrApiAoaDeg = module._api_aoa_deg () >> 2;
  ptrApiCdi = module._api_cdi() >> 2;
  ptrApiGroundCollision = module._api_ground_collision();
  ptrApiLatitude = module._api_latitude() >> 2;
  ptrApiLongitude = module._api_longitude() >> 2;
}

function round(value: number, decimals: number) {
  return Number(Math.round(Number(`${value}e${decimals}`)) + `e-${decimals}`);
}

export async function fetchSimData(module: MainModule, payload: SimData) {
  if (!payload || !module) {
    return;
  }
  // Detect sim reset and update memory addresses
  if (ptrApiWeight !== module._api_weight() >> 2) {
    payload.api_version = module.VERSION_STRING.toString();
    init(module);
  }

  payload.api_fps = round(module.HEAP32[ptrApiFps], 0);
  payload.api_ups = round(module.HEAP32[ptrApiUps], 0);
  payload.api_simulation_speed = round(
    module.HEAPF32[ptrApiSimulationSpeed],
    1,
  );
  payload.api_weight = round(module.HEAPF32[ptrApiWeight], 2);
  payload.api_empty_weight = round(module.HEAPF32[ptrApiEmptyWeight], 2);
  payload.api_altitude = round(module.HEAPF32[ptrApiAltitude], 0);
  payload.api_vertical_speed = round(module.HEAPF32[ptrApiVerticalSpeed], 0);
  payload.api_alpha_tail = round(module.HEAPF32[ptrApiAlphaTail], 3);
  payload.api_landing_gear_selector_position = module.HEAP32[ptrApiLandingGearSelectorPosition]
  payload.api_landing_gear_selector_position_name = GearSelectorKeys[module.HEAP32[ptrApiLandingGearSelectorPosition]]
  payload.api_flaps_selector_position = module.HEAP32[ptrApiFlapSelectorPosition];
  payload.api_flaps_selector_position_name = FlapSelectorKeys[module.HEAP32[ptrApiFlapSelectorPosition]];
  payload.api_rudder_position = round(module.HEAPF32[ptrApiRudderPosition], 2);
  payload.api_aileron_trim_position = round(module.HEAPF32[ptrApiAileronTrimPosition], 2);
  payload.api_elevator_trim_position = round(module.HEAPF32[ptrApiElevatorTrimPosition], 2);
  payload.api_rudder_trim_position = round(module.HEAPF32[ptrApiRudderTrimPosition], 2);
  payload.api_alpha_aileron = round(module.HEAPF32[ptrApiAlphaAileron], 3);
  payload.api_throttle = round(module.HEAPF32[ptrApiThrottle], 3);
  payload.api_ias_speed_knots = round(module.HEAPF32[ptrApiIasSpeedKnots], 0);
  payload.api_heading_deg = round(module.HEAPF32[ptrApiHeadingDeg], 0);
  payload.api_pitch_deg = round(module.HEAPF32[ptrApiPitchDeg], 0);
  payload.api_bank_deg = round(module.HEAPF32[ptrApiBankDeg], 0);
  payload.api_simulation_pause = module.HEAP8[ptrApiSimulationPause] !== 0;
  payload.api_autopilot = module.HEAP8[ptrApiAutopilot] !== 0;
  payload.api_heading_hold = module.HEAP8[ptrApiHeadingHold] !== 0;
  payload.api_pitch_hold = module.HEAP8[ptrApiPitchHold] !== 0;
  payload.api_bank_hold = module.HEAP8[ptrApiBankHold] !== 0;
  // payload.api_level_hold = module.HEAP8[ptrApiLevelHold] !== 0;
  payload.api_speed_hold = module.HEAP8[ptrApiSpeedHold] !== 0;
  payload.api_true_speed_hold = module.HEAP8[ptrApiTrueSpeedHold] !== 0;
  payload.api_mach_speed_hold = module.HEAP8[ptrApiMachSpeedHold] !== 0;
  payload.api_altitude_hold = module.HEAP8[ptrApiAltitudeHold] !== 0;
  payload.api_vertical_speed_hold = module.HEAP8[ptrApiVerticalSpeedHold] !== 0;
  payload.api_target_heading_deg = module.HEAP32[ptrApiTargetHeadingDeg];
  payload.api_target_pitch_deg = module.HEAP32[ptrApiTargetPitchDeg];
  payload.api_target_bank_deg = module.HEAP32[ptrApiTargetBankDeg];
  payload.api_target_altitude = module.HEAP32[ptrApiTargetAltitude];
  payload.api_target_vertical_speed = module.HEAP32[ptrApiTargetVerticalSpeed];
  payload.api_target_speed = module.HEAP32[ptrApiTargetSpeed]
  payload.api_target_true_speed = module.HEAP32[ptrApiTargetTrueSpeed]
  payload.api_target_mach_speed = module.HEAP32[ptrApiTargetMachSpeed]
  payload.api_atmosphere_sea_level_temperature = round(
    module.HEAPF32[ptrApiAtmosphereSeaLevelTemperature],
    2,
  );
  payload.api_atmosphere_sea_level_density = round(
    module.HEAPF32[ptrApiAtmosphereSeaLevelDensity],
    6,
  );
  payload.api_thrust_to_weight = round(module.HEAPF32[ptrApiThrustToWeight], 2);
  payload.api_cl0 = round(module.HEAPF32[ptrApiCl0], 4);
  payload.api_cdo = round(module.HEAPF32[ptrApiCdo], 4);
  payload.api_wing_area = round(module.HEAPF32[ptrApiWingArea], 0);
  payload.api_true_speed_knots = round(module.HEAPF32[ptrApiTrueSpeedKnots], 0);
  payload.api_mach = round(module.HEAPF32[ptrApiMach], 2);
  payload.api_vstall_speed_knots = round(
    module.HEAPF32[ptrApiVstallSpeedKnots],
    2,
  );
  payload.api_atmosphere_temperature = round(
    module.HEAPF32[ptrApiAtmosphereTemperature],
    2,
  );
  payload.api_atmosphere_density = round(
    module.HEAPF32[ptrApiAtmosphereDensity],
    6,
  );
  payload.api_total_drag = round(module.HEAPF32[PtrApiTotalDrag], 2);
  payload.api_cl = round(module.HEAPF32[ptrApiCl], 4);
  payload.api_aoa_deg = round(module.HEAPF32[ptrApiAoaDeg], 2);
  payload.api_cdi = round(module.HEAPF32[ptrApiCdi], 4);
  payload.api_ground_collision = module.HEAP8[ptrApiGroundCollision] !== 0;

  payload.api_latitude =  module.HEAPF32[ptrApiLatitude];
  payload.api_longitude =  module.HEAPF32[ptrApiLongitude];
}

export function getAutopilotProperties(
  module: MainModule,
  payload: SimData,
): SimulationProperties[] {
  return [
    {
      id: "masterAP",
      label: "MASTER AP",
      stateValue: payload.api_autopilot,
      toggleFunc: () => module.api_set_autopilot(!payload.api_autopilot),
      toggleFuncStr: () => `api_set_autopilot(${!payload.api_autopilot})`,
    },
    {
      id: "headingHold",
      label: "HEADING",
      inputValue: payload.api_target_heading_deg,
      stateValue: payload.api_heading_hold,
      toggleFunc: () => module.api_set_heading_hold(!payload.api_heading_hold),
      toggleFuncStr: () => `api_set_heading_hold(${!payload.api_heading_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_heading_deg(Number(newVal)),
      setterFuncStr: (newVal: string) =>
        `api_set_target_heading_deg(${newVal})`,
      unit: "°",
      min: 0,
      max: 359,
      step: 1.0,
    },
    {
      id: "bankHold",
      label: "BANK",
      inputValue: payload.api_target_bank_deg,
      stateValue: payload.api_bank_hold,
      toggleFunc: () => module.api_set_bank_hold(!payload.api_bank_hold),
      toggleFuncStr: () => `api_set_bank_hold(${!payload.api_bank_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_bank_deg(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_bank_deg(${newVal})`,
      unit: "°",
      min: -60,
      max: 60,
      step: 1.0,
    },
    {
      id: "pitchHold",
      label: "PITCH",
      inputValue: payload.api_target_pitch_deg,
      stateValue: payload.api_pitch_hold,
      toggleFunc: () => module.api_set_pitch_hold(!payload.api_pitch_hold),
      toggleFuncStr: () => `api_set_pitch_hold(${!payload.api_pitch_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_pitch_deg(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_pitch_deg(${newVal})`,
      unit: "°",
      min: -40,
      max: 40,
      step: 1.0,
    },
    {
      id: "altitudeHold",
      label: "ALTITUDE",
      inputValue: payload.api_target_altitude,
      stateValue: payload.api_altitude_hold,
      toggleFunc: () =>
        module.api_set_altitude_hold(!payload.api_altitude_hold),
      toggleFuncStr: () =>
        `api_set_altitude_hold(${!payload.api_altitude_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_altitude(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_altitude(${newVal})`,
      unit: "ft",
      min: 0,
      max: 50000,
      step: 100.0,
    },
    {
      id: "verticalSpeedHold",
      label: "VERT SPEED",
      inputValue: payload.api_target_vertical_speed,
      stateValue: payload.api_vertical_speed_hold,
      toggleFunc: () =>
        module.api_set_vertical_speed_hold(!payload.api_vertical_speed_hold),
      toggleFuncStr: () =>
        `api_set_vertical_speed_hold(${!payload.api_vertical_speed_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_vertical_speed(Number(newVal)),
      setterFuncStr: (newVal: string) =>
        `api_set_target_vertical_speed(${Number(newVal)})`,
      unit: "fpm",
      min: -6000,
      max: 6000,
      step: 100,
    },
    {
      id: "speedHold",
      label: "SPEED",
      inputValue: payload.api_target_speed,
      stateValue: payload.api_speed_hold,
      toggleFunc: () => module.api_set_speed_hold(!payload.api_speed_hold),
      toggleFuncStr: () => `api_set_speed_hold(${!payload.api_speed_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_speed(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_speed(${newVal})`,
      unit: "kt",
      min: 0,
      max: 350,
      step: 1,
    },
    {
      id: "speedHold",
      label: "TRUE SPEED",
      inputValue: payload.api_target_true_speed,
      stateValue: payload.api_true_speed_hold,
      toggleFunc: () => module.api_set_true_speed_hold(!payload.api_true_speed_hold),
      toggleFuncStr: () => `api_set_speed_hold(${!payload.api_true_speed_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_true_speed(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_true_speed(${newVal})`,
      unit: "kt",
      min: 0,
      max: 350,
      step: 1,
    },
    {
      id: "machHold",
      label: "MACH SPEED",
      inputValue: payload.api_target_mach_speed / 1000,
      stateValue: payload.api_mach_speed_hold,
      toggleFunc: () =>
        module.api_set_mach_speed_hold(!payload.api_mach_speed_hold),
      toggleFuncStr: () =>
        `api_set_mach_speed_hold(${!payload.api_mach_speed_hold})`,
      setterFunc: (newVal: string) =>
        module.api_set_target_mach_speed(Number(newVal)),
      setterFuncStr: (newVal: string) => `api_set_target_mach_speed(${newVal})`,
      unit: "M",
      min: 0,
      max: 1.5,
      step: 0.01,
    },
  ];
}

export function getSimulationParameters(
  module: MainModule,
  payload: SimData,
  resetCallback: () => void
): { [key: string]: SimulationProperties[] } {
  return {
    Simulation: [
      {
        label: payload.api_simulation_pause ? "Resume" : "Pause",
        toggleFunc: () =>
          module.api_set_simulation_pause(!payload.api_simulation_pause),
        toggleFuncStr: () =>
          `api_set_simulation_pause(${!payload.api_simulation_pause})`,
        icon: payload.api_simulation_pause ? "play-fill" : "pause-fill",
        stateValue: payload.api_simulation_pause,
      },
      {
        label: "Reset",
        toggleFunc: () => {
          resetCallback();
          module.api_set_simulation_reset()
        },
        toggleFuncStr: () => `api_set_simulation_reset()`,
        icon: "x-circle",
      },
      {
        label: "Fullscreen",
        toggleFunc: () => module.GLFW.requestFullscreen(false, true),
        icon: "arrows-fullscreen",
      },

      {
        label: "Simulation Speed",
        inputValue: payload.api_simulation_speed,
        setterFunc: (newVal: string) =>
          module.api_set_simulation_speed(Number(newVal)),
        setterFuncStr: (newVal: string) =>
          `api_set_simulation_speed(${newVal})`,
        unit: "x",
        min: 0.5,
        max: 100,
        step: 0.5,
      },
      {
        label: "Update Rate",
        inputValue: 60,
        setterFunc: (newVal: string) =>
          module.api_set_update_rate(Number(newVal)),
        setterFuncStr: (newVal: string) => `api_set_update_rate(${newVal})`,
        unit: "fps",
        min: 1,
        max: 1000,
        step: 1,
      },
    ],
    Aircraft: [
      {
        label: "Empty Weight",
        inputValue: payload.api_empty_weight,
        setterFunc: (newVal: string) =>
          module.api_set_empty_weight(Number(newVal)),
        setterFuncStr: (newVal: string) =>
          `api_set_empty_weight(${newVal})`,
        min: 0.0,
        max: 500000,
        step: 1.0,
      },
      {
        label: "Thrust to Weight Ratio",
        inputValue: payload.api_thrust_to_weight,
        setterFunc: (newVal: string) =>
          module.api_set_thrust_to_weight(Number(newVal)),
        setterFuncStr: (newVal: string) =>
          `api_set_thrust_to_weight(${newVal})`,
        min: 0.1,
        max: 5,
        step: 0.1,
      },
      {
        label: "Wing Area",
        inputValue: payload.api_wing_area,
        setterFunc: (newVal: string) =>
          module.api_set_wing_area(Number(newVal)),
        setterFuncStr: (newVal: string) => `api_set_wing_area(${newVal})`,
        unit: "Ft²",
        min: 10,
        max: 7000,
        step: 1,
      },
    ],
    Aerodynamics: [
      {
        label: "Lift Cofficient Slope",
        inputValue: payload.api_cl0,
        setterFunc: (newVal: string) => module.api_set_dcl(Number(newVal)),
        setterFuncStr: (newVal: string) => `api_set_dcl(${newVal})`,
        min: 0.01,
        max: 5,
        step: 0.01,
      },
      {
        label: "Drag Cofficient",
        inputValue: payload.api_cdo,
        setterFunc: (newVal: string) => module.api_set_cdo(Number(newVal)),
        setterFuncStr: (newVal: string) => `api_set_cdo(${newVal})`,
        min: 0.01,
        max: 1.0,
        step: 0.0001,
      },
    ],
    Atmosphere: [
      {
        label: "Sea Level Temperature",
        unit: "R",
        inputValue: payload.api_atmosphere_sea_level_temperature,
        setterFunc: (newVal: string) =>
          module.api_set_atmosphere_sea_level_temperature(Number(newVal)),
        setterFuncStr: (newVal: string) =>
          `api_set_atmosphere_sea_level_temperature(${newVal})`,
        min: 311,
        max: 672,
        step: 1.0,
      },
      {
        label: "Sea Level Density",
        unit: "Slug/ft³",
        inputValue: payload.api_atmosphere_sea_level_density,
        setterFunc: (newVal: string) =>
          module.api_set_atmosphere_sea_level_density(Number(newVal)),
        setterFuncStr: (newVal: string) =>
          `api_set_atmosphere_sea_level_density(${newVal})`,
        min: 0.001756,
        max: 0.002939,
        step: 0.000001,
      },
    ],
  };
}
