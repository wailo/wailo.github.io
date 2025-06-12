// Auto generated file from export file, do not change manually.

// @editor-extract-start

export interface SimulationProperties {
  id: string;
  label: string;
  inputValue?: number;
  stateValue?: boolean;
  toggleFunc?: Function;
  setterFunc?: Function;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  group: "autopilot" | "atmosphere" | "aerodynamics" | "controls" | "simulation" | "flight" | "systems"| "airframe" | "propulsion";
  icon?: string;
}

function round(value: number, decimals: number) {
  return Number(Math.round(Number(`${value}e${decimals}`)) + `e-${decimals}`);
}

// @editor-extract-end
let ptr_api_aileron_position: number = 0;
let ptr_api_aileron_trim_position: number = 0;
let ptr_api_altitude: number = 0;
let ptr_api_aoa: number = 0;
let ptr_api_aoa_deg: number = 0;
let ptr_api_atmosphere_density: number = 0;
let ptr_api_atmosphere_sea_level_density: number = 0;
let ptr_api_atmosphere_sea_level_temperature: number = 0;
let ptr_api_atmosphere_temperature: number = 0;
let ptr_api_atmosphere_turbulence_intervals: number = 0;
let ptr_api_atmosphere_turbulence_level: number = 0;
let ptr_api_atmosphere_wind_direction_deg: number = 0;
let ptr_api_atmosphere_wind_speed_knots: number = 0;
let ptr_api_autopilot: number = 0;
let ptr_api_autopilot_altitude_hold: number = 0;
let ptr_api_autopilot_altitude_target: number = 0;
let ptr_api_autopilot_bank_hold: number = 0;
let ptr_api_autopilot_bank_target: number = 0;
let ptr_api_autopilot_heading_hold: number = 0;
let ptr_api_autopilot_heading_target: number = 0;
let ptr_api_autopilot_ias_speed_hold: number = 0;
let ptr_api_autopilot_ias_speed_target: number = 0;
let ptr_api_autopilot_mach_speed_hold: number = 0;
let ptr_api_autopilot_mach_speed_target: number = 0;
let ptr_api_autopilot_pitch_hold: number = 0;
let ptr_api_autopilot_pitch_target: number = 0;
let ptr_api_autopilot_true_speed_hold: number = 0;
let ptr_api_autopilot_true_speed_target: number = 0;
let ptr_api_autopilot_turn_coordinator: number = 0;
let ptr_api_autopilot_vertical_speed_hold: number = 0;
let ptr_api_autopilot_vertical_speed_target: number = 0;
let ptr_api_autopilot_yaw_damper: number = 0;
let ptr_api_bank: number = 0;
let ptr_api_bank_deg: number = 0;
let ptr_api_bank_dot: number = 0;
let ptr_api_bank_dot_deg: number = 0;
let ptr_api_cdi: number = 0;
let ptr_api_cdo: number = 0;
let ptr_api_cl: number = 0;
let ptr_api_dcl: number = 0;
let ptr_api_drag: number = 0;
let ptr_api_elevator_position: number = 0;
let ptr_api_elevator_trim_position: number = 0;
let ptr_api_empty_weight: number = 0;
let ptr_api_engine_throttle_position: number = 0;
let ptr_api_flaps_selector_position: number = 0;
let ptr_api_fps: number = 0;
let ptr_api_ground_collision: number = 0;
let ptr_api_heading: number = 0;
let ptr_api_heading_deg: number = 0;
let ptr_api_heading_dot: number = 0;
let ptr_api_heading_dot_deg: number = 0;
let ptr_api_ias_speed_knots: number = 0;
let ptr_api_landing_gear_selector_position: number = 0;
let ptr_api_latitude: number = 0;
let ptr_api_lift: number = 0;
let ptr_api_longitude: number = 0;
let ptr_api_mach: number = 0;
let ptr_api_pitch: number = 0;
let ptr_api_pitch_deg: number = 0;
let ptr_api_pitch_dot: number = 0;
let ptr_api_pitch_dot_deg: number = 0;
let ptr_api_rudder_position: number = 0;
let ptr_api_rudder_trim_position: number = 0;
let ptr_api_sideslip: number = 0;
let ptr_api_sideslip_deg: number = 0;
let ptr_api_simulation_pause: number = 0;
let ptr_api_simulation_speed: number = 0;
let ptr_api_thrust: number = 0;
let ptr_api_true_speed_knots: number = 0;
let ptr_api_ups: number = 0;
let ptr_api_vertical_speed: number = 0;
let ptr_api_vstall_speed_knots: number = 0;
let ptr_api_weight: number = 0;
let ptr_api_wing_area: number = 0;

// @editor-extract-start
export class SimData {
  api_aileron_position: number = 0;
  api_aileron_trim_position: number = 0;
  api_altitude: number = 0;
  api_aoa: number = 0;
  api_aoa_deg: number = 0;
  api_atmosphere_density: number = 0;
  api_atmosphere_sea_level_density: number = 0;
  api_atmosphere_sea_level_temperature: number = 0;
  api_atmosphere_temperature: number = 0;
  api_atmosphere_turbulence_intervals: number = 0;
  api_atmosphere_turbulence_level: number = 0;
  api_atmosphere_wind_direction_deg: number = 0;
  api_atmosphere_wind_speed_knots: number = 0;
  api_autopilot: boolean = false;
  api_autopilot_altitude_hold: boolean = false;
  api_autopilot_altitude_target: number = 0;
  api_autopilot_bank_hold: boolean = false;
  api_autopilot_bank_target: number = 0;
  api_autopilot_heading_hold: boolean = false;
  api_autopilot_heading_target: number = 0;
  api_autopilot_ias_speed_hold: boolean = false;
  api_autopilot_ias_speed_target: number = 0;
  api_autopilot_mach_speed_hold: boolean = false;
  api_autopilot_mach_speed_target: number = 0;
  api_autopilot_pitch_hold: boolean = false;
  api_autopilot_pitch_target: number = 0;
  api_autopilot_true_speed_hold: boolean = false;
  api_autopilot_true_speed_target: number = 0;
  api_autopilot_turn_coordinator: boolean = false;
  api_autopilot_vertical_speed_hold: boolean = false;
  api_autopilot_vertical_speed_target: number = 0;
  api_autopilot_yaw_damper: boolean = false;
  api_bank: number = 0;
  api_bank_deg: number = 0;
  api_bank_dot: number = 0;
  api_bank_dot_deg: number = 0;
  api_cdi: number = 0;
  api_cdo: number = 0;
  api_cl: number = 0;
  api_dcl: number = 0;
  api_drag: number = 0;
  api_elevator_position: number = 0;
  api_elevator_trim_position: number = 0;
  api_empty_weight: number = 0;
  api_engine_throttle_position: number = 0;
  api_flaps_selector_position: number = 0;
  api_fps: number = 0;
  api_ground_collision: boolean = false;
  api_heading: number = 0;
  api_heading_deg: number = 0;
  api_heading_dot: number = 0;
  api_heading_dot_deg: number = 0;
  api_ias_speed_knots: number = 0;
  api_landing_gear_selector_position: number = 0;
  api_latitude: number = 0;
  api_lift: number = 0;
  api_longitude: number = 0;
  api_mach: number = 0;
  api_pitch: number = 0;
  api_pitch_deg: number = 0;
  api_pitch_dot: number = 0;
  api_pitch_dot_deg: number = 0;
  api_rudder_position: number = 0;
  api_rudder_trim_position: number = 0;
  api_sideslip: number = 0;
  api_sideslip_deg: number = 0;
  api_simulation_pause: boolean = false;
  api_simulation_speed: number = 0;
  api_thrust: number = 0;
  api_true_speed_knots: number = 0;
  api_ups: number = 0;
  api_vertical_speed: number = 0;
  api_vstall_speed_knots: number = 0;
  api_weight: number = 0;
  api_wing_area: number = 0;
};

// @editor-extract-end
function init(module: any) {
  ptr_api_aileron_position = module._api_aileron_position() >> 2;
  ptr_api_aileron_trim_position = module._api_aileron_trim_position() >> 2;
  ptr_api_altitude = module._api_altitude() >> 2;
  ptr_api_aoa = module._api_aoa() >> 2;
  ptr_api_aoa_deg = module._api_aoa_deg() >> 2;
  ptr_api_atmosphere_density = module._api_atmosphere_density() >> 2;
  ptr_api_atmosphere_sea_level_density = module._api_atmosphere_sea_level_density() >> 2;
  ptr_api_atmosphere_sea_level_temperature = module._api_atmosphere_sea_level_temperature() >> 2;
  ptr_api_atmosphere_temperature = module._api_atmosphere_temperature() >> 2;
  ptr_api_atmosphere_turbulence_intervals = module._api_atmosphere_turbulence_intervals() >> 2;
  ptr_api_atmosphere_turbulence_level = module._api_atmosphere_turbulence_level() >> 2;
  ptr_api_atmosphere_wind_direction_deg = module._api_atmosphere_wind_direction_deg() >> 2;
  ptr_api_atmosphere_wind_speed_knots = module._api_atmosphere_wind_speed_knots() >> 2;
  ptr_api_autopilot = module._api_autopilot();
  ptr_api_autopilot_altitude_hold = module._api_autopilot_altitude_hold();
  ptr_api_autopilot_altitude_target = module._api_autopilot_altitude_target() >> 2;
  ptr_api_autopilot_bank_hold = module._api_autopilot_bank_hold();
  ptr_api_autopilot_bank_target = module._api_autopilot_bank_target() >> 2;
  ptr_api_autopilot_heading_hold = module._api_autopilot_heading_hold();
  ptr_api_autopilot_heading_target = module._api_autopilot_heading_target() >> 2;
  ptr_api_autopilot_ias_speed_hold = module._api_autopilot_ias_speed_hold();
  ptr_api_autopilot_ias_speed_target = module._api_autopilot_ias_speed_target() >> 2;
  ptr_api_autopilot_mach_speed_hold = module._api_autopilot_mach_speed_hold();
  ptr_api_autopilot_mach_speed_target = module._api_autopilot_mach_speed_target() >> 2;
  ptr_api_autopilot_pitch_hold = module._api_autopilot_pitch_hold();
  ptr_api_autopilot_pitch_target = module._api_autopilot_pitch_target() >> 2;
  ptr_api_autopilot_true_speed_hold = module._api_autopilot_true_speed_hold();
  ptr_api_autopilot_true_speed_target = module._api_autopilot_true_speed_target() >> 2;
  ptr_api_autopilot_turn_coordinator = module._api_autopilot_turn_coordinator();
  ptr_api_autopilot_vertical_speed_hold = module._api_autopilot_vertical_speed_hold();
  ptr_api_autopilot_vertical_speed_target = module._api_autopilot_vertical_speed_target() >> 2;
  ptr_api_autopilot_yaw_damper = module._api_autopilot_yaw_damper();
  ptr_api_bank = module._api_bank() >> 2;
  ptr_api_bank_deg = module._api_bank_deg() >> 2;
  ptr_api_bank_dot = module._api_bank_dot() >> 2;
  ptr_api_bank_dot_deg = module._api_bank_dot_deg() >> 2;
  ptr_api_cdi = module._api_cdi() >> 2;
  ptr_api_cdo = module._api_cdo() >> 2;
  ptr_api_cl = module._api_cl() >> 2;
  ptr_api_dcl = module._api_dcl() >> 2;
  ptr_api_drag = module._api_drag() >> 2;
  ptr_api_elevator_position = module._api_elevator_position() >> 2;
  ptr_api_elevator_trim_position = module._api_elevator_trim_position() >> 2;
  ptr_api_empty_weight = module._api_empty_weight() >> 2;
  ptr_api_engine_throttle_position = module._api_engine_throttle_position() >> 2;
  ptr_api_flaps_selector_position = module._api_flaps_selector_position() >> 2;
  ptr_api_fps = module._api_fps() >> 2;
  ptr_api_ground_collision = module._api_ground_collision();
  ptr_api_heading = module._api_heading() >> 2;
  ptr_api_heading_deg = module._api_heading_deg() >> 2;
  ptr_api_heading_dot = module._api_heading_dot() >> 2;
  ptr_api_heading_dot_deg = module._api_heading_dot_deg() >> 2;
  ptr_api_ias_speed_knots = module._api_ias_speed_knots() >> 2;
  ptr_api_landing_gear_selector_position = module._api_landing_gear_selector_position() >> 2;
  ptr_api_latitude = module._api_latitude() >> 2;
  ptr_api_lift = module._api_lift() >> 2;
  ptr_api_longitude = module._api_longitude() >> 2;
  ptr_api_mach = module._api_mach() >> 2;
  ptr_api_pitch = module._api_pitch() >> 2;
  ptr_api_pitch_deg = module._api_pitch_deg() >> 2;
  ptr_api_pitch_dot = module._api_pitch_dot() >> 2;
  ptr_api_pitch_dot_deg = module._api_pitch_dot_deg() >> 2;
  ptr_api_rudder_position = module._api_rudder_position() >> 2;
  ptr_api_rudder_trim_position = module._api_rudder_trim_position() >> 2;
  ptr_api_sideslip = module._api_sideslip() >> 2;
  ptr_api_sideslip_deg = module._api_sideslip_deg() >> 2;
  ptr_api_simulation_pause = module._api_simulation_pause();
  ptr_api_simulation_speed = module._api_simulation_speed() >> 2;
  ptr_api_thrust = module._api_thrust() >> 2;
  ptr_api_true_speed_knots = module._api_true_speed_knots() >> 2;
  ptr_api_ups = module._api_ups() >> 2;
  ptr_api_vertical_speed = module._api_vertical_speed() >> 2;
  ptr_api_vstall_speed_knots = module._api_vstall_speed_knots() >> 2;
  ptr_api_weight = module._api_weight() >> 2;
  ptr_api_wing_area = module._api_wing_area() >> 2;
}
export async function fetchSimData(module: any) {
  if (!module) { return; }
  // Detect sim reset and update memory addresses
  if (ptr_api_weight !== module._api_weight() >> 2) {
    module.simData.api_version = module.VERSION_STRING.toString();
    init(module);
  }
  module.simData.api_aileron_position = round(module.HEAPF32[ptr_api_aileron_position], 2);
  module.simData.api_aileron_trim_position = round(module.HEAPF32[ptr_api_aileron_trim_position], 2);
  module.simData.api_altitude = round(module.HEAPF32[ptr_api_altitude], 0);
  module.simData.api_aoa = round(module.HEAPF32[ptr_api_aoa], 4);
  module.simData.api_aoa_deg = round(module.HEAPF32[ptr_api_aoa_deg], 2);
  module.simData.api_atmosphere_density = round(module.HEAPF32[ptr_api_atmosphere_density], 3);
  module.simData.api_atmosphere_sea_level_density = round(module.HEAPF32[ptr_api_atmosphere_sea_level_density], 3);
  module.simData.api_atmosphere_sea_level_temperature = round(module.HEAPF32[ptr_api_atmosphere_sea_level_temperature], 0);
  module.simData.api_atmosphere_temperature = round(module.HEAPF32[ptr_api_atmosphere_temperature], 0);
  module.simData.api_atmosphere_turbulence_intervals = round(module.HEAPF32[ptr_api_atmosphere_turbulence_intervals], 2);
  module.simData.api_atmosphere_turbulence_level = round(module.HEAPF32[ptr_api_atmosphere_turbulence_level], 2);
  module.simData.api_atmosphere_wind_direction_deg = module.HEAP32[ptr_api_atmosphere_wind_direction_deg];
  module.simData.api_atmosphere_wind_speed_knots = module.HEAP32[ptr_api_atmosphere_wind_speed_knots];
  module.simData.api_autopilot = module.HEAP8[ptr_api_autopilot] !== 0;
  module.simData.api_autopilot_altitude_hold = module.HEAP8[ptr_api_autopilot_altitude_hold] !== 0;
  module.simData.api_autopilot_altitude_target = module.HEAP32[ptr_api_autopilot_altitude_target];
  module.simData.api_autopilot_bank_hold = module.HEAP8[ptr_api_autopilot_bank_hold] !== 0;
  module.simData.api_autopilot_bank_target = module.HEAP32[ptr_api_autopilot_bank_target];
  module.simData.api_autopilot_heading_hold = module.HEAP8[ptr_api_autopilot_heading_hold] !== 0;
  module.simData.api_autopilot_heading_target = module.HEAP32[ptr_api_autopilot_heading_target];
  module.simData.api_autopilot_ias_speed_hold = module.HEAP8[ptr_api_autopilot_ias_speed_hold] !== 0;
  module.simData.api_autopilot_ias_speed_target = module.HEAP32[ptr_api_autopilot_ias_speed_target];
  module.simData.api_autopilot_mach_speed_hold = module.HEAP8[ptr_api_autopilot_mach_speed_hold] !== 0;
  module.simData.api_autopilot_mach_speed_target = module.HEAP32[ptr_api_autopilot_mach_speed_target] / 1000;
  module.simData.api_autopilot_pitch_hold = module.HEAP8[ptr_api_autopilot_pitch_hold] !== 0;
  module.simData.api_autopilot_pitch_target = module.HEAP32[ptr_api_autopilot_pitch_target];
  module.simData.api_autopilot_true_speed_hold = module.HEAP8[ptr_api_autopilot_true_speed_hold] !== 0;
  module.simData.api_autopilot_true_speed_target = module.HEAP32[ptr_api_autopilot_true_speed_target];
  module.simData.api_autopilot_turn_coordinator = module.HEAP8[ptr_api_autopilot_turn_coordinator] !== 0;
  module.simData.api_autopilot_vertical_speed_hold = module.HEAP8[ptr_api_autopilot_vertical_speed_hold] !== 0;
  module.simData.api_autopilot_vertical_speed_target = module.HEAP32[ptr_api_autopilot_vertical_speed_target];
  module.simData.api_autopilot_yaw_damper = module.HEAP8[ptr_api_autopilot_yaw_damper] !== 0;
  module.simData.api_bank = round(module.HEAPF32[ptr_api_bank], 4);
  module.simData.api_bank_deg = round(module.HEAPF32[ptr_api_bank_deg], 0);
  module.simData.api_bank_dot = round(module.HEAPF32[ptr_api_bank_dot], 4);
  module.simData.api_bank_dot_deg = round(module.HEAPF32[ptr_api_bank_dot_deg], 0);
  module.simData.api_cdi = round(module.HEAPF32[ptr_api_cdi], 4);
  module.simData.api_cdo = round(module.HEAPF32[ptr_api_cdo], 4);
  module.simData.api_cl = round(module.HEAPF32[ptr_api_cl], 4);
  module.simData.api_dcl = round(module.HEAPF32[ptr_api_dcl], 4);
  module.simData.api_drag = round(module.HEAPF32[ptr_api_drag], 0);
  module.simData.api_elevator_position = round(module.HEAPF32[ptr_api_elevator_position], 2);
  module.simData.api_elevator_trim_position = round(module.HEAPF32[ptr_api_elevator_trim_position], 2);
  module.simData.api_empty_weight = round(module.HEAPF32[ptr_api_empty_weight], 0);
  module.simData.api_engine_throttle_position = round(module.HEAPF32[ptr_api_engine_throttle_position], 2);
  module.simData.api_flaps_selector_position = module.HEAP32[ptr_api_flaps_selector_position];
  module.simData.api_fps = module.HEAP32[ptr_api_fps];
  module.simData.api_ground_collision = module.HEAP8[ptr_api_ground_collision] !== 0;
  module.simData.api_heading = round(module.HEAPF32[ptr_api_heading], 4);
  module.simData.api_heading_deg = round(module.HEAPF32[ptr_api_heading_deg], 0);
  module.simData.api_heading_dot = round(module.HEAPF32[ptr_api_heading_dot], 4);
  module.simData.api_heading_dot_deg = round(module.HEAPF32[ptr_api_heading_dot_deg], 0);
  module.simData.api_ias_speed_knots = round(module.HEAPF32[ptr_api_ias_speed_knots], 0);
  module.simData.api_landing_gear_selector_position = module.HEAP32[ptr_api_landing_gear_selector_position];
  module.simData.api_latitude = round(module.HEAPF32[ptr_api_latitude], 5);
  module.simData.api_lift = round(module.HEAPF32[ptr_api_lift], 0);
  module.simData.api_longitude = round(module.HEAPF32[ptr_api_longitude], 5);
  module.simData.api_mach = round(module.HEAPF32[ptr_api_mach], 2);
  module.simData.api_pitch = round(module.HEAPF32[ptr_api_pitch], 4);
  module.simData.api_pitch_deg = round(module.HEAPF32[ptr_api_pitch_deg], 0);
  module.simData.api_pitch_dot = round(module.HEAPF32[ptr_api_pitch_dot], 4);
  module.simData.api_pitch_dot_deg = round(module.HEAPF32[ptr_api_pitch_dot_deg], 0);
  module.simData.api_rudder_position = round(module.HEAPF32[ptr_api_rudder_position], 2);
  module.simData.api_rudder_trim_position = round(module.HEAPF32[ptr_api_rudder_trim_position], 2);
  module.simData.api_sideslip = round(module.HEAPF32[ptr_api_sideslip], 4);
  module.simData.api_sideslip_deg = round(module.HEAPF32[ptr_api_sideslip_deg], 0);
  module.simData.api_simulation_pause = module.HEAP8[ptr_api_simulation_pause] !== 0;
  module.simData.api_simulation_speed = round(module.HEAPF32[ptr_api_simulation_speed], 1);
  module.simData.api_thrust = round(module.HEAPF32[ptr_api_thrust], 2);
  module.simData.api_true_speed_knots = round(module.HEAPF32[ptr_api_true_speed_knots], 0);
  module.simData.api_ups = module.HEAP32[ptr_api_ups];
  module.simData.api_vertical_speed = round(module.HEAPF32[ptr_api_vertical_speed], 0);
  module.simData.api_vstall_speed_knots = round(module.HEAPF32[ptr_api_vstall_speed_knots], 0);
  module.simData.api_weight = round(module.HEAPF32[ptr_api_weight], 0);
  module.simData.api_wing_area = round(module.HEAPF32[ptr_api_wing_area], 0);
}
export function getSimulationParameters(module: any): Record<string, SimulationProperties> {
return {
  aileron_position:{
    id: 'aileron_position',
    inputValue: module.simData.api_aileron_position,
    setterFunc: (newVal: string) => module.api_set_aileron_position(Number(newVal)),
    group: 'controls',
    label: 'Aileron',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  aileron_trim_position:{
    id: 'aileron_trim_position',
    inputValue: module.simData.api_aileron_trim_position,
    setterFunc: (newVal: string) => module.api_set_aileron_trim_position(Number(newVal)),
    group: 'controls',
    label: 'Aileron Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '°'
  },
  altitude:{
    id: 'altitude',
    inputValue: module.simData.api_altitude,
    group: 'flight',
    label: 'Altitude',
    precision: 0,
    unit: 'ft'
  },
  aoa:{
    id: 'aoa',
    inputValue: module.simData.api_aoa,
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 4,
    unit: 'rad'
  },
  aoa_deg:{
    id: 'aoa_deg',
    inputValue: module.simData.api_aoa_deg,
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 2,
    unit: '°'
  },
  atmosphere_density:{
    id: 'atmosphere_density',
    inputValue: module.simData.api_atmosphere_density,
    group: 'atmosphere',
    label: 'Atmosphere Density',
    precision: 3,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_density:{
    id: 'atmosphere_sea_level_density',
    inputValue: module.simData.api_atmosphere_sea_level_density,
    setterFunc: (newVal: string) => module.api_set_atmosphere_sea_level_density(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Sea Level Density',
    max: 1.8,
    min: 0.001,
    precision: 3,
    step: 0.001,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_temperature:{
    id: 'atmosphere_sea_level_temperature',
    inputValue: module.simData.api_atmosphere_sea_level_temperature,
    setterFunc: (newVal: string) => module.api_set_atmosphere_sea_level_temperature(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Sea Level Temperature',
    max: 672,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'R'
  },
  atmosphere_temperature:{
    id: 'atmosphere_temperature',
    inputValue: module.simData.api_atmosphere_temperature,
    group: 'atmosphere',
    label: 'Atmosphere Temperature',
    precision: 0,
    unit: 'Kelvin'
  },
  atmosphere_turbulence_intervals:{
    id: 'atmosphere_turbulence_intervals',
    inputValue: module.simData.api_atmosphere_turbulence_intervals,
    setterFunc: (newVal: string) => module.api_set_atmosphere_turbulence_intervals(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Turbulence Intervals',
    max: 0.99,
    min: 0.01,
    precision: 2,
    step: 0.01,
    unit: 'minutes'
  },
  atmosphere_turbulence_level:{
    id: 'atmosphere_turbulence_level',
    inputValue: module.simData.api_atmosphere_turbulence_level,
    setterFunc: (newVal: string) => module.api_set_atmosphere_turbulence_level(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Turbulence Level',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01
  },
  atmosphere_wind_direction_deg:{
    id: 'atmosphere_wind_direction_deg',
    inputValue: module.simData.api_atmosphere_wind_direction_deg,
    setterFunc: (newVal: string) => module.api_set_atmosphere_wind_direction_deg(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Wind Direction',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  atmosphere_wind_speed_knots:{
    id: 'atmosphere_wind_speed_knots',
    inputValue: module.simData.api_atmosphere_wind_speed_knots,
    setterFunc: (newVal: string) => module.api_set_atmosphere_wind_speed_knots(Number(newVal)),
    group: 'atmosphere',
    label: 'Atmosphere Wind Speed',
    max: 400,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'knots'
  },
  autopilot:{
    id: 'autopilot',
    inputValue: module.simData.api_autopilot,
    toggleFunc: () => module.api_set_autopilot(!module.simData.api_autopilot),
    group: 'autopilot',
    label: 'Master Switch'
  },
  autopilot_altitude_hold:{
    id: 'autopilot_altitude_hold',
    inputValue: module.simData.api_autopilot_altitude_hold,
    toggleFunc: () => module.api_set_autopilot_altitude_hold(!module.simData.api_autopilot_altitude_hold),
    group: 'autopilot',
    label: 'Altitude Hold'
  },
  autopilot_altitude_target:{
    id: 'autopilot_altitude_target',
    inputValue: module.simData.api_autopilot_altitude_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_altitude_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Altitude',
    max: 50000,
    min: 0,
    precision: 0,
    step: 100,
    unit: 'ft'
  },
  autopilot_bank_hold:{
    id: 'autopilot_bank_hold',
    inputValue: module.simData.api_autopilot_bank_hold,
    toggleFunc: () => module.api_set_autopilot_bank_hold(!module.simData.api_autopilot_bank_hold),
    group: 'autopilot',
    label: 'Bank Angle Hold'
  },
  autopilot_bank_target:{
    id: 'autopilot_bank_target',
    inputValue: module.simData.api_autopilot_bank_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_bank_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Bank Angle',
    max: 60,
    min: -60,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_heading_hold:{
    id: 'autopilot_heading_hold',
    inputValue: module.simData.api_autopilot_heading_hold,
    toggleFunc: () => module.api_set_autopilot_heading_hold(!module.simData.api_autopilot_heading_hold),
    group: 'autopilot',
    label: 'Heading Angle Hold'
  },
  autopilot_heading_target:{
    id: 'autopilot_heading_target',
    inputValue: module.simData.api_autopilot_heading_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_heading_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Heading Angle',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_ias_speed_hold:{
    id: 'autopilot_ias_speed_hold',
    inputValue: module.simData.api_autopilot_ias_speed_hold,
    toggleFunc: () => module.api_set_autopilot_ias_speed_hold(!module.simData.api_autopilot_ias_speed_hold),
    group: 'autopilot',
    label: 'IAS Speed Hold'
  },
  autopilot_ias_speed_target:{
    id: 'autopilot_ias_speed_target',
    inputValue: module.simData.api_autopilot_ias_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_ias_speed_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target IAS Speed',
    max: 450,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'knot'
  },
  autopilot_mach_speed_hold:{
    id: 'autopilot_mach_speed_hold',
    inputValue: module.simData.api_autopilot_mach_speed_hold,
    toggleFunc: () => module.api_set_autopilot_mach_speed_hold(!module.simData.api_autopilot_mach_speed_hold),
    group: 'autopilot',
    label: 'Mach Speed Hold'
  },
  autopilot_mach_speed_target:{
    id: 'autopilot_mach_speed_target',
    inputValue: module.simData.api_autopilot_mach_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_mach_speed_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Mach Speed',
    max: 1.5,
    min: 0,
    precision: 2,
    step: .01,
    unit: 'M'
  },
  autopilot_pitch_hold:{
    id: 'autopilot_pitch_hold',
    inputValue: module.simData.api_autopilot_pitch_hold,
    toggleFunc: () => module.api_set_autopilot_pitch_hold(!module.simData.api_autopilot_pitch_hold),
    group: 'autopilot',
    label: 'Pitch Angle Hold'
  },
  autopilot_pitch_target:{
    id: 'autopilot_pitch_target',
    inputValue: module.simData.api_autopilot_pitch_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_pitch_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Pitch Angle',
    max: 40,
    min: -40,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_true_speed_hold:{
    id: 'autopilot_true_speed_hold',
    inputValue: module.simData.api_autopilot_true_speed_hold,
    toggleFunc: () => module.api_set_autopilot_true_speed_hold(!module.simData.api_autopilot_true_speed_hold),
    group: 'autopilot',
    label: 'True Airspeed Hold'
  },
  autopilot_true_speed_target:{
    id: 'autopilot_true_speed_target',
    inputValue: module.simData.api_autopilot_true_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_true_speed_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target True Airspeed',
    max: 800,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'knot'
  },
  autopilot_turn_coordinator:{
    id: 'autopilot_turn_coordinator',
    inputValue: module.simData.api_autopilot_turn_coordinator,
    toggleFunc: () => module.api_set_autopilot_turn_coordinator(!module.simData.api_autopilot_turn_coordinator),
    group: 'autopilot',
    label: 'Turn Coordinator'
  },
  autopilot_vertical_speed_hold:{
    id: 'autopilot_vertical_speed_hold',
    inputValue: module.simData.api_autopilot_vertical_speed_hold,
    toggleFunc: () => module.api_set_autopilot_vertical_speed_hold(!module.simData.api_autopilot_vertical_speed_hold),
    group: 'autopilot',
    label: 'Vertical Speed Hold'
  },
  autopilot_vertical_speed_target:{
    id: 'autopilot_vertical_speed_target',
    inputValue: module.simData.api_autopilot_vertical_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_vertical_speed_target(Number(newVal)),
    group: 'autopilot',
    label: 'Target Vertical Speed',
    max: 6000,
    min: -6000,
    precision: 0,
    step: 100,
    unit: 'ft/min'
  },
  autopilot_yaw_damper:{
    id: 'autopilot_yaw_damper',
    inputValue: module.simData.api_autopilot_yaw_damper,
    toggleFunc: () => module.api_set_autopilot_yaw_damper(!module.simData.api_autopilot_yaw_damper),
    group: 'autopilot',
    label: 'Yaw Damper'
  },
  bank:{
    id: 'bank',
    inputValue: module.simData.api_bank,
    group: 'flight',
    label: 'Bank Angle',
    precision: 4,
    unit: 'rad'
  },
  bank_deg:{
    id: 'bank_deg',
    inputValue: module.simData.api_bank_deg,
    group: 'flight',
    label: 'Bank Angle',
    precision: 0,
    unit: '°'
  },
  bank_dot:{
    id: 'bank_dot',
    inputValue: module.simData.api_bank_dot,
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  bank_dot_deg:{
    id: 'bank_dot_deg',
    inputValue: module.simData.api_bank_dot_deg,
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  cdi:{
    id: 'cdi',
    inputValue: module.simData.api_cdi,
    group: 'aerodynamics',
    label: 'Induced Drag Coefficient',
    precision: 4
  },
  cdo:{
    id: 'cdo',
    inputValue: module.simData.api_cdo,
    group: 'aerodynamics',
    label: 'Parasite Drag Coefficient',
    precision: 4
  },
  cl:{
    id: 'cl',
    inputValue: module.simData.api_cl,
    group: 'aerodynamics',
    label: 'Lift Coefficient',
    precision: 4
  },
  dcl:{
    id: 'dcl',
    inputValue: module.simData.api_dcl,
    setterFunc: (newVal: string) => module.api_set_dcl(Number(newVal)),
    group: 'aerodynamics',
    label: 'Lift Coefficient Slop',
    max: 5,
    min: 0.01,
    precision: 4,
    step: 0.01
  },
  drag:{
    id: 'drag',
    inputValue: module.simData.api_drag,
    group: 'aerodynamics',
    label: 'Drag',
    precision: 0,
    unit: 'N'
  },
  elevator_position:{
    id: 'elevator_position',
    inputValue: module.simData.api_elevator_position,
    setterFunc: (newVal: string) => module.api_set_elevator_position(Number(newVal)),
    group: 'controls',
    label: 'Elevator',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  elevator_trim_position:{
    id: 'elevator_trim_position',
    inputValue: module.simData.api_elevator_trim_position,
    setterFunc: (newVal: string) => module.api_set_elevator_trim_position(Number(newVal)),
    group: 'controls',
    label: 'Elevator Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  empty_weight:{
    id: 'empty_weight',
    inputValue: module.simData.api_empty_weight,
    setterFunc: (newVal: string) => module.api_set_empty_weight(Number(newVal)),
    group: 'airframe',
    label: 'Empty Weight',
    max: 500000,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'kg'
  },
  engine_throttle_position:{
    id: 'engine_throttle_position',
    inputValue: module.simData.api_engine_throttle_position,
    setterFunc: (newVal: string) => module.api_set_engine_throttle_position(Number(newVal)),
    group: 'propulsion',
    label: 'Engine Throttle',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  flaps_selector_position:{
    id: 'flaps_selector_position',
    inputValue: module.simData.api_flaps_selector_position,
    setterFunc: (newVal: string) => module.api_set_flaps_selector_position(Number(newVal)),
    group: 'systems',
    label: 'Flaps Selector Position',
    max: 6,
    min: 0,
    precision: 0,
    step: 1
  },
  fps:{
    id: 'fps',
    inputValue: module.simData.api_fps,
    group: 'simulation',
    label: 'Frames per second',
    precision: 0,
    unit: 'hz'
  },
  ground_collision:{
    id: 'ground_collision',
    inputValue: module.simData.api_ground_collision,
    group: 'simulation',
    label: 'Ground Collision'
  },
  heading:{
    id: 'heading',
    inputValue: module.simData.api_heading,
    group: 'flight',
    label: 'Heading Angle',
    precision: 4,
    unit: 'rad'
  },
  heading_deg:{
    id: 'heading_deg',
    inputValue: module.simData.api_heading_deg,
    group: 'flight',
    label: 'Heading Angle',
    precision: 0,
    unit: '°'
  },
  heading_dot:{
    id: 'heading_dot',
    inputValue: module.simData.api_heading_dot,
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  heading_dot_deg:{
    id: 'heading_dot_deg',
    inputValue: module.simData.api_heading_dot_deg,
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  ias_speed_knots:{
    id: 'ias_speed_knots',
    inputValue: module.simData.api_ias_speed_knots,
    group: 'flight',
    label: 'IAS Speed',
    precision: 0,
    unit: 'knots'
  },
  landing_gear_selector_position:{
    id: 'landing_gear_selector_position',
    inputValue: module.simData.api_landing_gear_selector_position,
    setterFunc: (newVal: string) => module.api_set_landing_gear_selector_position(Number(newVal)),
    group: 'systems',
    label: 'Landing Gear',
    max: 2,
    min: 0,
    precision: 0,
    step: 1
  },
  latitude:{
    id: 'latitude',
    inputValue: module.simData.api_latitude,
    setterFunc: (newVal: string) => module.api_set_latitude(Number(newVal)),
    group: 'flight',
    label: 'Latitude',
    max: 90,
    min: -90,
    precision: 5,
    step: 1,
    unit: '°'
  },
  lift:{
    id: 'lift',
    inputValue: module.simData.api_lift,
    group: 'aerodynamics',
    label: 'Lift',
    precision: 0,
    unit: 'N'
  },
  longitude:{
    id: 'longitude',
    inputValue: module.simData.api_longitude,
    setterFunc: (newVal: string) => module.api_set_longitude(Number(newVal)),
    group: 'flight',
    label: 'Longitude',
    max: 180,
    min: -180,
    precision: 5,
    step: 1,
    unit: '°'
  },
  mach:{
    id: 'mach',
    inputValue: module.simData.api_mach,
    group: 'flight',
    label: 'Mach Speed',
    precision: 2,
    unit: 'M'
  },
  pitch:{
    id: 'pitch',
    inputValue: module.simData.api_pitch,
    group: 'flight',
    label: 'Pitch Angle',
    precision: 4,
    unit: 'rad'
  },
  pitch_deg:{
    id: 'pitch_deg',
    inputValue: module.simData.api_pitch_deg,
    group: 'flight',
    label: 'Pitch Angle',
    precision: 0,
    unit: '°'
  },
  pitch_dot:{
    id: 'pitch_dot',
    inputValue: module.simData.api_pitch_dot,
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  pitch_dot_deg:{
    id: 'pitch_dot_deg',
    inputValue: module.simData.api_pitch_dot_deg,
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  rudder_position:{
    id: 'rudder_position',
    inputValue: module.simData.api_rudder_position,
    setterFunc: (newVal: string) => module.api_set_rudder_position(Number(newVal)),
    group: 'controls',
    label: 'Rudder',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  rudder_trim_position:{
    id: 'rudder_trim_position',
    inputValue: module.simData.api_rudder_trim_position,
    setterFunc: (newVal: string) => module.api_set_rudder_trim_position(Number(newVal)),
    group: 'controls',
    label: 'Rudder Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  sideslip:{
    id: 'sideslip',
    inputValue: module.simData.api_sideslip,
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 4,
    unit: 'rad'
  },
  sideslip_deg:{
    id: 'sideslip_deg',
    inputValue: module.simData.api_sideslip_deg,
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 0,
    unit: '°'
  },
  simulation_pause:{
    id: 'simulation_pause',
    inputValue: module.simData.api_simulation_pause,
    toggleFunc: () => module.api_set_simulation_pause(!module.simData.api_simulation_pause),
    group: 'simulation',
    label: 'Simulation Pause'
  },
  simulation_reset:{
    id: 'simulation_reset',
    toggleFunc: () => module.api_set_simulation_reset(),
    group: 'simulation',
    label: 'Simulation Reset'
  },
  simulation_speed:{
    id: 'simulation_speed',
    inputValue: module.simData.api_simulation_speed,
    setterFunc: (newVal: string) => module.api_set_simulation_speed(Number(newVal)),
    group: 'simulation',
    label: 'Simulation Speed',
    max: 100,
    min: 0.5,
    precision: 1,
    step: 0.5,
    unit: 'x'
  },
  thrust:{
    id: 'thrust',
    inputValue: module.simData.api_thrust,
    group: 'flight',
    label: 'Thrust',
    precision: 2
  },
  true_speed_knots:{
    id: 'true_speed_knots',
    inputValue: module.simData.api_true_speed_knots,
    group: 'flight',
    label: 'True Airspeed',
    precision: 0,
    unit: 'knots'
  },
  ups:{
    id: 'ups',
    inputValue: module.simData.api_ups,
    group: 'simulation',
    label: 'Update per second',
    precision: 0,
    unit: 'hz'
  },
  vertical_speed:{
    id: 'vertical_speed',
    inputValue: module.simData.api_vertical_speed,
    group: 'flight',
    label: 'Vertical Speed',
    precision: 0,
    unit: 'ft/min'
  },
  vstall_speed_knots:{
    id: 'vstall_speed_knots',
    inputValue: module.simData.api_vstall_speed_knots,
    group: 'flight',
    label: 'Stall Speed',
    precision: 0,
    unit: 'knots'
  },
  weight:{
    id: 'weight',
    inputValue: module.simData.api_weight,
    group: 'airframe',
    label: 'Weight',
    precision: 0,
    unit: 'kg'
  },
  wing_area:{
    id: 'wing_area',
    inputValue: module.simData.api_wing_area,
    setterFunc: (newVal: string) => module.api_set_wing_area(Number(newVal)),
    group: 'airframe',
    label: 'Wing Area',
    max: 7000,
    min: 10,
    precision: 0,
    step: 1,
    unit: 'Ft²'
  }}
};
export function getAutopilotProperties(module: any): SimulationProperties[] {
return [
  {
    id: 'autopilot',
    stateValue: module.simData.api_autopilot,
    toggleFunc: () => module.api_set_autopilot(!module.simData.api_autopilot),
    group: 'autopilot',
    label: 'Master Switch'
  },
  {
    id: 'autopilot_altitude_hold',
    stateValue: module.simData.api_autopilot_altitude_hold,
    toggleFunc: () => module.api_set_autopilot_altitude_hold(!module.simData.api_autopilot_altitude_hold),
    inputValue: module.simData.api_autopilot_altitude_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_altitude_target(Number(newVal)),
    max: 50000,
    min: 0,
    precision: 0,
    step: 100,
    group: 'autopilot',
    label: 'Altitude Hold'
  },
  {
    id: 'autopilot_bank_hold',
    stateValue: module.simData.api_autopilot_bank_hold,
    toggleFunc: () => module.api_set_autopilot_bank_hold(!module.simData.api_autopilot_bank_hold),
    inputValue: module.simData.api_autopilot_bank_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_bank_target(Number(newVal)),
    max: 60,
    min: -60,
    precision: 0,
    step: 1,
    group: 'autopilot',
    label: 'Bank Angle Hold'
  },
  {
    id: 'autopilot_heading_hold',
    stateValue: module.simData.api_autopilot_heading_hold,
    toggleFunc: () => module.api_set_autopilot_heading_hold(!module.simData.api_autopilot_heading_hold),
    inputValue: module.simData.api_autopilot_heading_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_heading_target(Number(newVal)),
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    group: 'autopilot',
    label: 'Heading Angle Hold'
  },
  {
    id: 'autopilot_ias_speed_hold',
    stateValue: module.simData.api_autopilot_ias_speed_hold,
    toggleFunc: () => module.api_set_autopilot_ias_speed_hold(!module.simData.api_autopilot_ias_speed_hold),
    inputValue: module.simData.api_autopilot_ias_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_ias_speed_target(Number(newVal)),
    max: 450,
    min: 0,
    precision: 0,
    step: 1,
    group: 'autopilot',
    label: 'IAS Speed Hold'
  },
  {
    id: 'autopilot_mach_speed_hold',
    stateValue: module.simData.api_autopilot_mach_speed_hold,
    toggleFunc: () => module.api_set_autopilot_mach_speed_hold(!module.simData.api_autopilot_mach_speed_hold),
    inputValue: module.simData.api_autopilot_mach_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_mach_speed_target(Number(newVal)),
    max: 1.5,
    min: 0,
    precision: 2,
    step: .01,
    group: 'autopilot',
    label: 'Mach Speed Hold'
  },
  {
    id: 'autopilot_pitch_hold',
    stateValue: module.simData.api_autopilot_pitch_hold,
    toggleFunc: () => module.api_set_autopilot_pitch_hold(!module.simData.api_autopilot_pitch_hold),
    inputValue: module.simData.api_autopilot_pitch_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_pitch_target(Number(newVal)),
    max: 40,
    min: -40,
    precision: 0,
    step: 1,
    group: 'autopilot',
    label: 'Pitch Angle Hold'
  },
  {
    id: 'autopilot_true_speed_hold',
    stateValue: module.simData.api_autopilot_true_speed_hold,
    toggleFunc: () => module.api_set_autopilot_true_speed_hold(!module.simData.api_autopilot_true_speed_hold),
    inputValue: module.simData.api_autopilot_true_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_true_speed_target(Number(newVal)),
    max: 800,
    min: 0,
    precision: 0,
    step: 1,
    group: 'autopilot',
    label: 'True Airspeed Hold'
  },
  {
    id: 'autopilot_turn_coordinator',
    stateValue: module.simData.api_autopilot_turn_coordinator,
    toggleFunc: () => module.api_set_autopilot_turn_coordinator(!module.simData.api_autopilot_turn_coordinator),
    group: 'autopilot',
    label: 'Turn Coordinator'
  },
  {
    id: 'autopilot_vertical_speed_hold',
    stateValue: module.simData.api_autopilot_vertical_speed_hold,
    toggleFunc: () => module.api_set_autopilot_vertical_speed_hold(!module.simData.api_autopilot_vertical_speed_hold),
    inputValue: module.simData.api_autopilot_vertical_speed_target,
    setterFunc: (newVal: string) => module.api_set_autopilot_vertical_speed_target(Number(newVal)),
    max: 6000,
    min: -6000,
    precision: 0,
    step: 100,
    group: 'autopilot',
    label: 'Vertical Speed Hold'
  },
  {
    id: 'autopilot_yaw_damper',
    stateValue: module.simData.api_autopilot_yaw_damper,
    toggleFunc: () => module.api_set_autopilot_yaw_damper(!module.simData.api_autopilot_yaw_damper),
    group: 'autopilot',
    label: 'Yaw Damper'
  }]};
// @editor-extract-start
export const apiMetadata = {
  aileron_position: {
    id: 'aileron_position',
    group: 'controls',
    label: 'Aileron',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  aileron_trim_position: {
    id: 'aileron_trim_position',
    group: 'controls',
    label: 'Aileron Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '°'
  },
  altitude: {
    id: 'altitude',
    group: 'flight',
    label: 'Altitude',
    precision: 0,
    unit: 'ft'
  },
  aoa: {
    id: 'aoa',
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 4,
    unit: 'rad'
  },
  aoa_deg: {
    id: 'aoa_deg',
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 2,
    unit: '°'
  },
  atmosphere_density: {
    id: 'atmosphere_density',
    group: 'atmosphere',
    label: 'Atmosphere Density',
    precision: 3,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_density: {
    id: 'atmosphere_sea_level_density',
    group: 'atmosphere',
    label: 'Atmosphere Sea Level Density',
    max: 1.8,
    min: 0.001,
    precision: 3,
    step: 0.001,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_temperature: {
    id: 'atmosphere_sea_level_temperature',
    group: 'atmosphere',
    label: 'Atmosphere Sea Level Temperature',
    max: 672,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'R'
  },
  atmosphere_temperature: {
    id: 'atmosphere_temperature',
    group: 'atmosphere',
    label: 'Atmosphere Temperature',
    precision: 0,
    unit: 'Kelvin'
  },
  atmosphere_turbulence_intervals: {
    id: 'atmosphere_turbulence_intervals',
    group: 'atmosphere',
    label: 'Atmosphere Turbulence Intervals',
    max: 0.99,
    min: 0.01,
    precision: 2,
    step: 0.01,
    unit: 'minutes'
  },
  atmosphere_turbulence_level: {
    id: 'atmosphere_turbulence_level',
    group: 'atmosphere',
    label: 'Atmosphere Turbulence Level',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01
  },
  atmosphere_wind_direction_deg: {
    id: 'atmosphere_wind_direction_deg',
    group: 'atmosphere',
    label: 'Atmosphere Wind Direction',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  atmosphere_wind_speed_knots: {
    id: 'atmosphere_wind_speed_knots',
    group: 'atmosphere',
    label: 'Atmosphere Wind Speed',
    max: 400,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'knots'
  },
  autopilot: {
    id: 'autopilot',
    group: 'autopilot',
    label: 'Master Switch'
  },
  autopilot_altitude_hold: {
    id: 'autopilot_altitude_hold',
    group: 'autopilot',
    label: 'Altitude Hold'
  },
  autopilot_altitude_target: {
    id: 'autopilot_altitude_target',
    group: 'autopilot',
    label: 'Target Altitude',
    max: 50000,
    min: 0,
    precision: 0,
    step: 100,
    unit: 'ft'
  },
  autopilot_bank_hold: {
    id: 'autopilot_bank_hold',
    group: 'autopilot',
    label: 'Bank Angle Hold'
  },
  autopilot_bank_target: {
    id: 'autopilot_bank_target',
    group: 'autopilot',
    label: 'Target Bank Angle',
    max: 60,
    min: -60,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_heading_hold: {
    id: 'autopilot_heading_hold',
    group: 'autopilot',
    label: 'Heading Angle Hold'
  },
  autopilot_heading_target: {
    id: 'autopilot_heading_target',
    group: 'autopilot',
    label: 'Target Heading Angle',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_ias_speed_hold: {
    id: 'autopilot_ias_speed_hold',
    group: 'autopilot',
    label: 'IAS Speed Hold'
  },
  autopilot_ias_speed_target: {
    id: 'autopilot_ias_speed_target',
    group: 'autopilot',
    label: 'Target IAS Speed',
    max: 450,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'knot'
  },
  autopilot_mach_speed_hold: {
    id: 'autopilot_mach_speed_hold',
    group: 'autopilot',
    label: 'Mach Speed Hold'
  },
  autopilot_mach_speed_target: {
    id: 'autopilot_mach_speed_target',
    group: 'autopilot',
    label: 'Target Mach Speed',
    max: 1.5,
    min: 0,
    precision: 2,
    step: .01,
    unit: 'M'
  },
  autopilot_pitch_hold: {
    id: 'autopilot_pitch_hold',
    group: 'autopilot',
    label: 'Pitch Angle Hold'
  },
  autopilot_pitch_target: {
    id: 'autopilot_pitch_target',
    group: 'autopilot',
    label: 'Target Pitch Angle',
    max: 40,
    min: -40,
    precision: 0,
    step: 1,
    unit: '°'
  },
  autopilot_true_speed_hold: {
    id: 'autopilot_true_speed_hold',
    group: 'autopilot',
    label: 'True Airspeed Hold'
  },
  autopilot_true_speed_target: {
    id: 'autopilot_true_speed_target',
    group: 'autopilot',
    label: 'Target True Airspeed',
    max: 800,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'knot'
  },
  autopilot_turn_coordinator: {
    id: 'autopilot_turn_coordinator',
    group: 'autopilot',
    label: 'Turn Coordinator'
  },
  autopilot_vertical_speed_hold: {
    id: 'autopilot_vertical_speed_hold',
    group: 'autopilot',
    label: 'Vertical Speed Hold'
  },
  autopilot_vertical_speed_target: {
    id: 'autopilot_vertical_speed_target',
    group: 'autopilot',
    label: 'Target Vertical Speed',
    max: 6000,
    min: -6000,
    precision: 0,
    step: 100,
    unit: 'ft/min'
  },
  autopilot_yaw_damper: {
    id: 'autopilot_yaw_damper',
    group: 'autopilot',
    label: 'Yaw Damper'
  },
  bank: {
    id: 'bank',
    group: 'flight',
    label: 'Bank Angle',
    precision: 4,
    unit: 'rad'
  },
  bank_deg: {
    id: 'bank_deg',
    group: 'flight',
    label: 'Bank Angle',
    precision: 0,
    unit: '°'
  },
  bank_dot: {
    id: 'bank_dot',
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  bank_dot_deg: {
    id: 'bank_dot_deg',
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  cdi: {
    id: 'cdi',
    group: 'aerodynamics',
    label: 'Induced Drag Coefficient',
    precision: 4
  },
  cdo: {
    id: 'cdo',
    group: 'aerodynamics',
    label: 'Parasite Drag Coefficient',
    precision: 4
  },
  cl: {
    id: 'cl',
    group: 'aerodynamics',
    label: 'Lift Coefficient',
    precision: 4
  },
  dcl: {
    id: 'dcl',
    group: 'aerodynamics',
    label: 'Lift Coefficient Slop',
    max: 5,
    min: 0.01,
    precision: 4,
    step: 0.01
  },
  drag: {
    id: 'drag',
    group: 'aerodynamics',
    label: 'Drag',
    precision: 0,
    unit: 'N'
  },
  elevator_position: {
    id: 'elevator_position',
    group: 'controls',
    label: 'Elevator',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  elevator_trim_position: {
    id: 'elevator_trim_position',
    group: 'controls',
    label: 'Elevator Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  empty_weight: {
    id: 'empty_weight',
    group: 'airframe',
    label: 'Empty Weight',
    max: 500000,
    min: 0,
    precision: 0,
    step: 1,
    unit: 'kg'
  },
  engine_throttle_position: {
    id: 'engine_throttle_position',
    group: 'propulsion',
    label: 'Engine Throttle',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  flaps_selector_position: {
    id: 'flaps_selector_position',
    group: 'systems',
    label: 'Flaps Selector Position',
    max: 6,
    min: 0,
    precision: 0,
    step: 1
  },
  fps: {
    id: 'fps',
    group: 'simulation',
    label: 'Frames per second',
    precision: 0,
    unit: 'hz'
  },
  ground_collision: {
    id: 'ground_collision',
    group: 'simulation',
    label: 'Ground Collision'
  },
  heading: {
    id: 'heading',
    group: 'flight',
    label: 'Heading Angle',
    precision: 4,
    unit: 'rad'
  },
  heading_deg: {
    id: 'heading_deg',
    group: 'flight',
    label: 'Heading Angle',
    precision: 0,
    unit: '°'
  },
  heading_dot: {
    id: 'heading_dot',
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  heading_dot_deg: {
    id: 'heading_dot_deg',
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  ias_speed_knots: {
    id: 'ias_speed_knots',
    group: 'flight',
    label: 'IAS Speed',
    precision: 0,
    unit: 'knots'
  },
  landing_gear_selector_position: {
    id: 'landing_gear_selector_position',
    group: 'systems',
    label: 'Landing Gear',
    max: 2,
    min: 0,
    precision: 0,
    step: 1
  },
  latitude: {
    id: 'latitude',
    group: 'flight',
    label: 'Latitude',
    max: 90,
    min: -90,
    precision: 5,
    step: 1,
    unit: '°'
  },
  lift: {
    id: 'lift',
    group: 'aerodynamics',
    label: 'Lift',
    precision: 0,
    unit: 'N'
  },
  longitude: {
    id: 'longitude',
    group: 'flight',
    label: 'Longitude',
    max: 180,
    min: -180,
    precision: 5,
    step: 1,
    unit: '°'
  },
  mach: {
    id: 'mach',
    group: 'flight',
    label: 'Mach Speed',
    precision: 2,
    unit: 'M'
  },
  pitch: {
    id: 'pitch',
    group: 'flight',
    label: 'Pitch Angle',
    precision: 4,
    unit: 'rad'
  },
  pitch_deg: {
    id: 'pitch_deg',
    group: 'flight',
    label: 'Pitch Angle',
    precision: 0,
    unit: '°'
  },
  pitch_dot: {
    id: 'pitch_dot',
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  pitch_dot_deg: {
    id: 'pitch_dot_deg',
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 0,
    unit: '°/sec'
  },
  rudder_position: {
    id: 'rudder_position',
    group: 'controls',
    label: 'Rudder',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  rudder_trim_position: {
    id: 'rudder_trim_position',
    group: 'controls',
    label: 'Rudder Trim',
    max: 1,
    min: -1,
    precision: 2,
    step: 0.01,
    unit: '%'
  },
  sideslip: {
    id: 'sideslip',
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 4,
    unit: 'rad'
  },
  sideslip_deg: {
    id: 'sideslip_deg',
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 0,
    unit: '°'
  },
  simulation_pause: {
    id: 'simulation_pause',
    group: 'simulation',
    label: 'Simulation Pause'
  },
  simulation_reset: {
    id: 'simulation_reset',
    group: 'simulation',
    label: 'Simulation Reset'
  },
  simulation_speed: {
    id: 'simulation_speed',
    group: 'simulation',
    label: 'Simulation Speed',
    max: 100,
    min: 0.5,
    precision: 1,
    step: 0.5,
    unit: 'x'
  },
  thrust: {
    id: 'thrust',
    group: 'flight',
    label: 'Thrust',
    precision: 2
  },
  true_speed_knots: {
    id: 'true_speed_knots',
    group: 'flight',
    label: 'True Airspeed',
    precision: 0,
    unit: 'knots'
  },
  ups: {
    id: 'ups',
    group: 'simulation',
    label: 'Update per second',
    precision: 0,
    unit: 'hz'
  },
  vertical_speed: {
    id: 'vertical_speed',
    group: 'flight',
    label: 'Vertical Speed',
    precision: 0,
    unit: 'ft/min'
  },
  vstall_speed_knots: {
    id: 'vstall_speed_knots',
    group: 'flight',
    label: 'Stall Speed',
    precision: 0,
    unit: 'knots'
  },
  weight: {
    id: 'weight',
    group: 'airframe',
    label: 'Weight',
    precision: 0,
    unit: 'kg'
  },
  wing_area: {
    id: 'wing_area',
    group: 'airframe',
    label: 'Wing Area',
    max: 7000,
    min: 10,
    precision: 0,
    step: 1,
    unit: 'Ft²'
  }};

// @editor-extract-end
