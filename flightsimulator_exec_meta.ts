// Auto generated file from export file, do not change manually.

// @editor-extract-start

export interface SimulationProperties {
  readonly id: string;
  readonly type: "number" | "boolean" | "void";
  readonly label: string;
  readonly inputValue?: number;
  readonly stateValue?: boolean;
  readonly setterFunc?: Function;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly precision?: number;
  readonly group: "autopilot" | "atmosphere" | "aerodynamics" | "controls" | "simulation" | "flight" | "systems"| "airframe" | "propulsion";
  readonly icon?: string;
}

interface AutopilotState {
  readonly value: boolean;
  readonly setterFunc: Function;
}

interface AutopilotCommand {
  readonly value: number;
  readonly setterFunc: Function;
  readonly unit?: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly precision?: number;
}


 interface AutopilotProperties {
  readonly id: string
  readonly label: string;
  readonly stateCommand: AutopilotState,
  readonly targetCommand?: AutopilotCommand
  readonly icon?: string;
}

// Precompute factors
const roundFactors = Object.freeze([1, 10, 100, 1000, 10000, 100000] as const);

// Supported factors
type RoundDecimal = 0 | 1 | 2 | 3 | 4 | 5;

function round(value: number, decimals: RoundDecimal): number {
  const factor = roundFactors[decimals];
  return Math.round(value * factor) / factor;
}

// // Optional runtime check version (uncomment if you want runtime safety)
// function roundSafe(value: number, decimals: number): number {
//   if (!Number.isInteger(decimals) || decimals < 0 || decimals > 5) {
//     throw new RangeError("decimals must be an integer between 0 and 5");
//   }
//   const factor = roundFactors[decimals as RoundDecimal];
//   return Math.round(value * factor) / factor;
// }



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
let ptr_api_autopilot_auto_trim: number = 0;
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
let ptr_api_motion_cues: number = 0;
let ptr_api_pfd_display: number = 0;
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
let ptr_api_six_instruments_display: number = 0;
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
  api_autopilot_auto_trim: boolean = false;
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
  api_motion_cues: boolean = false;
  api_pfd_display: boolean = false;
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
  api_six_instruments_display: boolean = false;
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
  ptr_api_autopilot_auto_trim = module._api_autopilot_auto_trim();
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
  ptr_api_motion_cues = module._api_motion_cues();
  ptr_api_pfd_display = module._api_pfd_display();
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
  ptr_api_six_instruments_display = module._api_six_instruments_display();
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
  module.simData.api_autopilot_auto_trim = module.HEAP8[ptr_api_autopilot_auto_trim] !== 0;
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
  module.simData.api_bank_dot_deg = round(module.HEAPF32[ptr_api_bank_dot_deg], 2);
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
  module.simData.api_heading_dot_deg = round(module.HEAPF32[ptr_api_heading_dot_deg], 2);
  module.simData.api_ias_speed_knots = round(module.HEAPF32[ptr_api_ias_speed_knots], 0);
  module.simData.api_landing_gear_selector_position = module.HEAP32[ptr_api_landing_gear_selector_position];
  module.simData.api_latitude = round(module.HEAPF32[ptr_api_latitude], 5);
  module.simData.api_lift = round(module.HEAPF32[ptr_api_lift], 0);
  module.simData.api_longitude = round(module.HEAPF32[ptr_api_longitude], 5);
  module.simData.api_mach = round(module.HEAPF32[ptr_api_mach], 2);
  module.simData.api_motion_cues = module.HEAP8[ptr_api_motion_cues] !== 0;
  module.simData.api_pfd_display = module.HEAP8[ptr_api_pfd_display] !== 0;
  module.simData.api_pitch = round(module.HEAPF32[ptr_api_pitch], 4);
  module.simData.api_pitch_deg = round(module.HEAPF32[ptr_api_pitch_deg], 0);
  module.simData.api_pitch_dot = round(module.HEAPF32[ptr_api_pitch_dot], 4);
  module.simData.api_pitch_dot_deg = round(module.HEAPF32[ptr_api_pitch_dot_deg], 2);
  module.simData.api_rudder_position = round(module.HEAPF32[ptr_api_rudder_position], 2);
  module.simData.api_rudder_trim_position = round(module.HEAPF32[ptr_api_rudder_trim_position], 2);
  module.simData.api_sideslip = round(module.HEAPF32[ptr_api_sideslip], 4);
  module.simData.api_sideslip_deg = round(module.HEAPF32[ptr_api_sideslip_deg], 0);
  module.simData.api_simulation_pause = module.HEAP8[ptr_api_simulation_pause] !== 0;
  module.simData.api_simulation_speed = round(module.HEAPF32[ptr_api_simulation_speed], 1);
  module.simData.api_six_instruments_display = module.HEAP8[ptr_api_six_instruments_display] !== 0;
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
    type: 'number',
    setterFunc: module.api_set_aileron_position,
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
    type: 'number',
    setterFunc: module.api_set_aileron_trim_position,
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
    type: 'number',
    group: 'flight',
    label: 'Altitude',
    precision: 0,
    unit: 'ft'
  },
  aoa:{
    id: 'aoa',
    inputValue: module.simData.api_aoa,
    type: 'number',
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 4,
    unit: 'rad'
  },
  aoa_deg:{
    id: 'aoa_deg',
    inputValue: module.simData.api_aoa_deg,
    type: 'number',
    group: 'aerodynamics',
    label: 'Angle of Attack',
    precision: 2,
    unit: '°'
  },
  atmosphere_density:{
    id: 'atmosphere_density',
    inputValue: module.simData.api_atmosphere_density,
    type: 'number',
    group: 'atmosphere',
    label: 'Density',
    precision: 3,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_density:{
    id: 'atmosphere_sea_level_density',
    inputValue: module.simData.api_atmosphere_sea_level_density,
    type: 'number',
    setterFunc: module.api_set_atmosphere_sea_level_density,
    group: 'atmosphere',
    label: 'Sea Level Density',
    max: 1.8,
    min: 0.001,
    precision: 3,
    step: 0.001,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_temperature:{
    id: 'atmosphere_sea_level_temperature',
    inputValue: module.simData.api_atmosphere_sea_level_temperature,
    type: 'number',
    setterFunc: module.api_set_atmosphere_sea_level_temperature,
    group: 'atmosphere',
    label: 'Sea Level Temperature',
    max: 672,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'R'
  },
  atmosphere_temperature:{
    id: 'atmosphere_temperature',
    inputValue: module.simData.api_atmosphere_temperature,
    type: 'number',
    group: 'atmosphere',
    label: 'Temperature',
    precision: 0,
    unit: 'Kelvin'
  },
  atmosphere_turbulence_intervals:{
    id: 'atmosphere_turbulence_intervals',
    inputValue: module.simData.api_atmosphere_turbulence_intervals,
    type: 'number',
    setterFunc: module.api_set_atmosphere_turbulence_intervals,
    group: 'atmosphere',
    label: 'Turbulence Intervals',
    max: 0.99,
    min: 0.01,
    precision: 2,
    step: 0.01,
    unit: 'minutes'
  },
  atmosphere_turbulence_level:{
    id: 'atmosphere_turbulence_level',
    inputValue: module.simData.api_atmosphere_turbulence_level,
    type: 'number',
    setterFunc: module.api_set_atmosphere_turbulence_level,
    group: 'atmosphere',
    label: 'Turbulence Level',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01
  },
  atmosphere_wind_direction_deg:{
    id: 'atmosphere_wind_direction_deg',
    inputValue: module.simData.api_atmosphere_wind_direction_deg,
    type: 'number',
    setterFunc: module.api_set_atmosphere_wind_direction_deg,
    group: 'atmosphere',
    label: 'Wind Direction',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  atmosphere_wind_speed_knots:{
    id: 'atmosphere_wind_speed_knots',
    inputValue: module.simData.api_atmosphere_wind_speed_knots,
    type: 'number',
    setterFunc: module.api_set_atmosphere_wind_speed_knots,
    group: 'atmosphere',
    label: 'Wind Speed',
    max: 400,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'knots'
  },
  autopilot:{
    id: 'autopilot',
    inputValue: module.simData.api_autopilot,
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot(!module.simData.api_autopilot),
    group: 'autopilot',
    label: 'Master Switch'
  },
  autopilot_altitude_hold:{
    id: 'autopilot_altitude_hold',
    inputValue: module.simData.api_autopilot_altitude_hold,
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_altitude_hold(!module.simData.api_autopilot_altitude_hold),
    group: 'autopilot',
    label: 'Altitude Hold'
  },
  autopilot_altitude_target:{
    id: 'autopilot_altitude_target',
    inputValue: module.simData.api_autopilot_altitude_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_altitude_target,
    group: 'autopilot',
    label: 'Target Altitude',
    max: 50000,
    min: 0,
    precision: 0,
    step: 100,
    unit: 'ft'
  },
  autopilot_auto_trim:{
    id: 'autopilot_auto_trim',
    inputValue: module.simData.api_autopilot_auto_trim,
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_auto_trim(!module.simData.api_autopilot_auto_trim),
    group: 'autopilot',
    label: 'Auto Trim'
  },
  autopilot_bank_hold:{
    id: 'autopilot_bank_hold',
    inputValue: module.simData.api_autopilot_bank_hold,
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_bank_hold(!module.simData.api_autopilot_bank_hold),
    group: 'autopilot',
    label: 'Bank Angle Hold'
  },
  autopilot_bank_target:{
    id: 'autopilot_bank_target',
    inputValue: module.simData.api_autopilot_bank_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_bank_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_heading_hold(!module.simData.api_autopilot_heading_hold),
    group: 'autopilot',
    label: 'Heading Angle Hold'
  },
  autopilot_heading_target:{
    id: 'autopilot_heading_target',
    inputValue: module.simData.api_autopilot_heading_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_heading_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_ias_speed_hold(!module.simData.api_autopilot_ias_speed_hold),
    group: 'autopilot',
    label: 'IAS Speed Hold'
  },
  autopilot_ias_speed_target:{
    id: 'autopilot_ias_speed_target',
    inputValue: module.simData.api_autopilot_ias_speed_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_ias_speed_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_mach_speed_hold(!module.simData.api_autopilot_mach_speed_hold),
    group: 'autopilot',
    label: 'Mach Speed Hold'
  },
  autopilot_mach_speed_target:{
    id: 'autopilot_mach_speed_target',
    inputValue: module.simData.api_autopilot_mach_speed_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_mach_speed_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_pitch_hold(!module.simData.api_autopilot_pitch_hold),
    group: 'autopilot',
    label: 'Pitch Angle Hold'
  },
  autopilot_pitch_target:{
    id: 'autopilot_pitch_target',
    inputValue: module.simData.api_autopilot_pitch_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_pitch_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_true_speed_hold(!module.simData.api_autopilot_true_speed_hold),
    group: 'autopilot',
    label: 'True Airspeed Hold'
  },
  autopilot_true_speed_target:{
    id: 'autopilot_true_speed_target',
    inputValue: module.simData.api_autopilot_true_speed_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_true_speed_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_turn_coordinator(!module.simData.api_autopilot_turn_coordinator),
    group: 'autopilot',
    label: 'Turn Coordinator'
  },
  autopilot_vertical_speed_hold:{
    id: 'autopilot_vertical_speed_hold',
    inputValue: module.simData.api_autopilot_vertical_speed_hold,
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_vertical_speed_hold(!module.simData.api_autopilot_vertical_speed_hold),
    group: 'autopilot',
    label: 'Vertical Speed Hold'
  },
  autopilot_vertical_speed_target:{
    id: 'autopilot_vertical_speed_target',
    inputValue: module.simData.api_autopilot_vertical_speed_target,
    type: 'number',
    setterFunc: module.api_set_autopilot_vertical_speed_target,
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
    type: 'boolean',
    setterFunc: () => module.api_set_autopilot_yaw_damper(!module.simData.api_autopilot_yaw_damper),
    group: 'autopilot',
    label: 'Yaw Damper'
  },
  bank:{
    id: 'bank',
    inputValue: module.simData.api_bank,
    type: 'number',
    group: 'flight',
    label: 'Bank Angle',
    precision: 4,
    unit: 'rad'
  },
  bank_deg:{
    id: 'bank_deg',
    inputValue: module.simData.api_bank_deg,
    type: 'number',
    group: 'flight',
    label: 'Bank Angle',
    precision: 0,
    unit: '°'
  },
  bank_dot:{
    id: 'bank_dot',
    inputValue: module.simData.api_bank_dot,
    type: 'number',
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  bank_dot_deg:{
    id: 'bank_dot_deg',
    inputValue: module.simData.api_bank_dot_deg,
    type: 'number',
    group: 'flight',
    label: 'Bank Angle Change Rate',
    precision: 2,
    unit: '°/sec'
  },
  cdi:{
    id: 'cdi',
    inputValue: module.simData.api_cdi,
    type: 'number',
    group: 'aerodynamics',
    label: 'Induced Drag Coefficient',
    precision: 4
  },
  cdo:{
    id: 'cdo',
    inputValue: module.simData.api_cdo,
    type: 'number',
    group: 'aerodynamics',
    label: 'Parasite Drag Coefficient',
    precision: 4
  },
  cl:{
    id: 'cl',
    inputValue: module.simData.api_cl,
    type: 'number',
    group: 'aerodynamics',
    label: 'Lift Coefficient',
    precision: 4
  },
  dcl:{
    id: 'dcl',
    inputValue: module.simData.api_dcl,
    type: 'number',
    setterFunc: module.api_set_dcl,
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
    type: 'number',
    group: 'aerodynamics',
    label: 'Drag',
    precision: 0,
    unit: 'N'
  },
  elevator_position:{
    id: 'elevator_position',
    inputValue: module.simData.api_elevator_position,
    type: 'number',
    setterFunc: module.api_set_elevator_position,
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
    type: 'number',
    setterFunc: module.api_set_elevator_trim_position,
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
    type: 'number',
    setterFunc: module.api_set_empty_weight,
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
    type: 'number',
    setterFunc: module.api_set_engine_throttle_position,
    group: 'controls',
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
    type: 'number',
    setterFunc: module.api_set_flaps_selector_position,
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
    type: 'number',
    group: 'simulation',
    label: 'Frames per second',
    precision: 0,
    unit: 'hz'
  },
  ground_collision:{
    id: 'ground_collision',
    inputValue: module.simData.api_ground_collision,
    type: 'boolean',
    group: 'simulation',
    label: 'Ground Collision'
  },
  heading:{
    id: 'heading',
    inputValue: module.simData.api_heading,
    type: 'number',
    group: 'flight',
    label: 'Heading Angle',
    precision: 4,
    unit: 'rad'
  },
  heading_deg:{
    id: 'heading_deg',
    inputValue: module.simData.api_heading_deg,
    type: 'number',
    group: 'flight',
    label: 'Heading Angle',
    precision: 0,
    unit: '°'
  },
  heading_dot:{
    id: 'heading_dot',
    inputValue: module.simData.api_heading_dot,
    type: 'number',
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  heading_dot_deg:{
    id: 'heading_dot_deg',
    inputValue: module.simData.api_heading_dot_deg,
    type: 'number',
    group: 'flight',
    label: 'Heading Angle Change Rate',
    precision: 2,
    unit: '°/sec'
  },
  ias_speed_knots:{
    id: 'ias_speed_knots',
    inputValue: module.simData.api_ias_speed_knots,
    type: 'number',
    group: 'flight',
    label: 'IAS Speed',
    precision: 0,
    unit: 'knots'
  },
  landing_gear_selector_position:{
    id: 'landing_gear_selector_position',
    inputValue: module.simData.api_landing_gear_selector_position,
    type: 'number',
    setterFunc: module.api_set_landing_gear_selector_position,
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
    type: 'number',
    setterFunc: module.api_set_latitude,
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
    type: 'number',
    group: 'aerodynamics',
    label: 'Lift',
    precision: 0,
    unit: 'N'
  },
  longitude:{
    id: 'longitude',
    inputValue: module.simData.api_longitude,
    type: 'number',
    setterFunc: module.api_set_longitude,
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
    type: 'number',
    group: 'flight',
    label: 'Mach Speed',
    precision: 2,
    unit: 'M'
  },
  motion_cues:{
    id: 'motion_cues',
    inputValue: module.simData.api_motion_cues,
    type: 'boolean',
    setterFunc: () => module.api_set_motion_cues(!module.simData.api_motion_cues),
    group: 'simulation',
    label: 'Motion Cues'
  },
  pfd_display:{
    id: 'pfd_display',
    inputValue: module.simData.api_pfd_display,
    type: 'boolean',
    setterFunc: () => module.api_set_pfd_display(!module.simData.api_pfd_display),
    group: 'simulation',
    label: 'PFD'
  },
  pitch:{
    id: 'pitch',
    inputValue: module.simData.api_pitch,
    type: 'number',
    group: 'flight',
    label: 'Pitch Angle',
    precision: 4,
    unit: 'rad'
  },
  pitch_deg:{
    id: 'pitch_deg',
    inputValue: module.simData.api_pitch_deg,
    type: 'number',
    group: 'flight',
    label: 'Pitch Angle',
    precision: 0,
    unit: '°'
  },
  pitch_dot:{
    id: 'pitch_dot',
    inputValue: module.simData.api_pitch_dot,
    type: 'number',
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 4,
    unit: 'rad/sec'
  },
  pitch_dot_deg:{
    id: 'pitch_dot_deg',
    inputValue: module.simData.api_pitch_dot_deg,
    type: 'number',
    group: 'flight',
    label: 'Pitch Angle Change Rate',
    precision: 2,
    unit: '°/sec'
  },
  rudder_position:{
    id: 'rudder_position',
    inputValue: module.simData.api_rudder_position,
    type: 'number',
    setterFunc: module.api_set_rudder_position,
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
    type: 'number',
    setterFunc: module.api_set_rudder_trim_position,
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
    type: 'number',
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 4,
    unit: 'rad'
  },
  sideslip_deg:{
    id: 'sideslip_deg',
    inputValue: module.simData.api_sideslip_deg,
    type: 'number',
    group: 'flight',
    label: 'Side Slip Angle (Beta)',
    precision: 0,
    unit: '°'
  },
  simulation_pause:{
    id: 'simulation_pause',
    inputValue: module.simData.api_simulation_pause,
    type: 'boolean',
    setterFunc: () => module.api_set_simulation_pause(!module.simData.api_simulation_pause),
    group: 'simulation',
    label: 'Simulation Pause'
  },
  simulation_reset:{
    id: 'simulation_reset',
    type: 'void',
    setterFunc: () => module.api_set_simulation_reset(),
    group: 'simulation',
    label: 'Simulation Reset'
  },
  simulation_speed:{
    id: 'simulation_speed',
    inputValue: module.simData.api_simulation_speed,
    type: 'number',
    setterFunc: module.api_set_simulation_speed,
    group: 'simulation',
    label: 'Simulation Speed',
    max: 100,
    min: 0.5,
    precision: 1,
    step: 0.5,
    unit: 'x'
  },
  six_instruments_display:{
    id: 'six_instruments_display',
    inputValue: module.simData.api_six_instruments_display,
    type: 'boolean',
    setterFunc: () => module.api_set_six_instruments_display(!module.simData.api_six_instruments_display),
    group: 'simulation',
    label: 'Six Instruments'
  },
  thrust:{
    id: 'thrust',
    inputValue: module.simData.api_thrust,
    type: 'number',
    group: 'flight',
    label: 'Thrust',
    precision: 2,
    unit: 'N'
  },
  true_speed_knots:{
    id: 'true_speed_knots',
    inputValue: module.simData.api_true_speed_knots,
    type: 'number',
    group: 'flight',
    label: 'True Airspeed',
    precision: 0,
    unit: 'knots'
  },
  ups:{
    id: 'ups',
    inputValue: module.simData.api_ups,
    type: 'number',
    group: 'simulation',
    label: 'Update per second',
    precision: 0,
    unit: 'hz'
  },
  vertical_speed:{
    id: 'vertical_speed',
    inputValue: module.simData.api_vertical_speed,
    type: 'number',
    group: 'flight',
    label: 'Vertical Speed',
    precision: 0,
    unit: 'ft/min'
  },
  vstall_speed_knots:{
    id: 'vstall_speed_knots',
    inputValue: module.simData.api_vstall_speed_knots,
    type: 'number',
    group: 'flight',
    label: 'Stall Speed',
    precision: 0,
    unit: 'knots'
  },
  weight:{
    id: 'weight',
    inputValue: module.simData.api_weight,
    type: 'number',
    group: 'airframe',
    label: 'Weight',
    precision: 0,
    unit: 'kg'
  },
  wing_area:{
    id: 'wing_area',
    inputValue: module.simData.api_wing_area,
    type: 'number',
    setterFunc: module.api_set_wing_area,
    group: 'airframe',
    label: 'Wing Area',
    max: 7000,
    min: 10,
    precision: 0,
    step: 1,
    unit: 'Ft²'
  }}
};
export function getAutopilotProperties(module: any): AutopilotProperties[] {
return [
  {
    stateCommand: {
    value: module.simData.api_autopilot,
    setterFunc: () => module.api_set_autopilot(!module.simData.api_autopilot)
    },
    id: 'autopilot',
    label: 'Master Switch'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_altitude_hold,
    setterFunc: () => module.api_set_autopilot_altitude_hold(!module.simData.api_autopilot_altitude_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_altitude_target,
    setterFunc: module.api_set_autopilot_altitude_target,
    max: 50000,
    min: 0,
    precision: 0,
    step: 100,
    },
    id: 'autopilot_altitude_hold',
    label: 'Altitude Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_auto_trim,
    setterFunc: () => module.api_set_autopilot_auto_trim(!module.simData.api_autopilot_auto_trim)
    },
    id: 'autopilot_auto_trim',
    label: 'Auto Trim'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_bank_hold,
    setterFunc: () => module.api_set_autopilot_bank_hold(!module.simData.api_autopilot_bank_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_bank_target,
    setterFunc: module.api_set_autopilot_bank_target,
    max: 60,
    min: -60,
    precision: 0,
    step: 1,
    },
    id: 'autopilot_bank_hold',
    label: 'Bank Angle Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_heading_hold,
    setterFunc: () => module.api_set_autopilot_heading_hold(!module.simData.api_autopilot_heading_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_heading_target,
    setterFunc: module.api_set_autopilot_heading_target,
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    },
    id: 'autopilot_heading_hold',
    label: 'Heading Angle Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_ias_speed_hold,
    setterFunc: () => module.api_set_autopilot_ias_speed_hold(!module.simData.api_autopilot_ias_speed_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_ias_speed_target,
    setterFunc: module.api_set_autopilot_ias_speed_target,
    max: 450,
    min: 0,
    precision: 0,
    step: 1,
    },
    id: 'autopilot_ias_speed_hold',
    label: 'IAS Speed Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_mach_speed_hold,
    setterFunc: () => module.api_set_autopilot_mach_speed_hold(!module.simData.api_autopilot_mach_speed_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_mach_speed_target,
    setterFunc: module.api_set_autopilot_mach_speed_target,
    max: 1.5,
    min: 0,
    precision: 2,
    step: .01,
    },
    id: 'autopilot_mach_speed_hold',
    label: 'Mach Speed Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_pitch_hold,
    setterFunc: () => module.api_set_autopilot_pitch_hold(!module.simData.api_autopilot_pitch_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_pitch_target,
    setterFunc: module.api_set_autopilot_pitch_target,
    max: 40,
    min: -40,
    precision: 0,
    step: 1,
    },
    id: 'autopilot_pitch_hold',
    label: 'Pitch Angle Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_true_speed_hold,
    setterFunc: () => module.api_set_autopilot_true_speed_hold(!module.simData.api_autopilot_true_speed_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_true_speed_target,
    setterFunc: module.api_set_autopilot_true_speed_target,
    max: 800,
    min: 0,
    precision: 0,
    step: 1,
    },
    id: 'autopilot_true_speed_hold',
    label: 'True Airspeed Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_turn_coordinator,
    setterFunc: () => module.api_set_autopilot_turn_coordinator(!module.simData.api_autopilot_turn_coordinator)
    },
    id: 'autopilot_turn_coordinator',
    label: 'Turn Coordinator'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_vertical_speed_hold,
    setterFunc: () => module.api_set_autopilot_vertical_speed_hold(!module.simData.api_autopilot_vertical_speed_hold)
    },
targetCommand: {
    value: module.simData.api_autopilot_vertical_speed_target,
    setterFunc: module.api_set_autopilot_vertical_speed_target,
    max: 6000,
    min: -6000,
    precision: 0,
    step: 100,
    },
    id: 'autopilot_vertical_speed_hold',
    label: 'Vertical Speed Hold'
  },
  {
    stateCommand: {
    value: module.simData.api_autopilot_yaw_damper,
    setterFunc: () => module.api_set_autopilot_yaw_damper(!module.simData.api_autopilot_yaw_damper)
    },
    id: 'autopilot_yaw_damper',
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
    label: 'Density',
    precision: 3,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_density: {
    id: 'atmosphere_sea_level_density',
    group: 'atmosphere',
    label: 'Sea Level Density',
    max: 1.8,
    min: 0.001,
    precision: 3,
    step: 0.001,
    unit: 'kg/m³'
  },
  atmosphere_sea_level_temperature: {
    id: 'atmosphere_sea_level_temperature',
    group: 'atmosphere',
    label: 'Sea Level Temperature',
    max: 672,
    min: 0,
    precision: 0,
    step: 1.0,
    unit: 'R'
  },
  atmosphere_temperature: {
    id: 'atmosphere_temperature',
    group: 'atmosphere',
    label: 'Temperature',
    precision: 0,
    unit: 'Kelvin'
  },
  atmosphere_turbulence_intervals: {
    id: 'atmosphere_turbulence_intervals',
    group: 'atmosphere',
    label: 'Turbulence Intervals',
    max: 0.99,
    min: 0.01,
    precision: 2,
    step: 0.01,
    unit: 'minutes'
  },
  atmosphere_turbulence_level: {
    id: 'atmosphere_turbulence_level',
    group: 'atmosphere',
    label: 'Turbulence Level',
    max: 1,
    min: 0,
    precision: 2,
    step: 0.01
  },
  atmosphere_wind_direction_deg: {
    id: 'atmosphere_wind_direction_deg',
    group: 'atmosphere',
    label: 'Wind Direction',
    max: 360,
    min: 0,
    precision: 0,
    step: 1,
    unit: '°'
  },
  atmosphere_wind_speed_knots: {
    id: 'atmosphere_wind_speed_knots',
    group: 'atmosphere',
    label: 'Wind Speed',
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
  autopilot_auto_trim: {
    id: 'autopilot_auto_trim',
    group: 'autopilot',
    label: 'Auto Trim'
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
    precision: 2,
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
    group: 'controls',
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
    precision: 2,
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
  motion_cues: {
    id: 'motion_cues',
    group: 'simulation',
    label: 'Motion Cues'
  },
  pfd_display: {
    id: 'pfd_display',
    group: 'simulation',
    label: 'PFD'
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
    precision: 2,
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
  six_instruments_display: {
    id: 'six_instruments_display',
    group: 'simulation',
    label: 'Six Instruments'
  },
  thrust: {
    id: 'thrust',
    group: 'flight',
    label: 'Thrust',
    precision: 2,
    unit: 'N'
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
