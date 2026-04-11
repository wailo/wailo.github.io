// Generated TypeScript definitions
  
interface b747 extends ClassHandle {
  readonly name: string;
  readonly wing_area: number;
  readonly cl: number;
  readonly aoa_deg: number;
  readonly aoa: number;
  readonly max_aoa_deg: number;
  readonly cdo: number;
  readonly cdi: number;
  readonly drag: number;
  readonly lift: number;
  readonly thrust: number;
  readonly weight: number;
  readonly density: number;
  readonly empty_weight: number;
  readonly altitude_ft: number;
  readonly speed_mach: number;
  readonly speed_true_knots: number;
  readonly speed_true_dot_ms: number;
  readonly pitch_deg: number;
  readonly pitch: number;
  readonly pitch_dot_deg: number;
  readonly pitch_dot: number;
  readonly heading_deg: number;
  readonly heading: number;
  readonly heading_dot_deg: number;
  readonly heading_dot: number;
  readonly bank_deg: number;
  readonly bank: number;
  readonly bank_dot_deg: number;
  readonly bank_dot: number;
  readonly sideslip: number;
  readonly sideslip_deg: number;
  readonly max_speed: number;
  readonly stall_speed: number;
  readonly vertical_speed: number;
  readonly vertical_speed_ftmin: number;
  readonly speed_indicated_knots: number;
  readonly is_ground_collision: boolean;
  readonly autopilot_master_switch: boolean;
  readonly autopilot_heading_target: number;
  readonly autopilot_pitch_target: number;
  readonly autopilot_heading_hold: boolean;
  readonly autopilot_pitch_hold: boolean;
  readonly autopilot_altitude_hold: boolean;
  readonly autopilot_speed_indicated_hold: boolean;
  readonly autopilot_speed_true_hold: boolean;
  readonly autopilot_speed_mach_hold: boolean;
  readonly autopilot_vertical_speed_hold: boolean;
  readonly autopilot_bank_hold: boolean;
  readonly autopilot_yaw_damper: boolean;
  readonly autopilot_turn_coordinator: boolean;
  readonly autopilot_auto_trim: boolean;
  readonly autopilot_altitude_target: number;
  readonly autopilot_speed_indicated_target: number;
  readonly autopilot_speed_true_target: number;
  readonly autopilot_speed_mach_target: number;
  readonly autopilot_vertical_speed_target: number;
  readonly autopilot_bank_target: number;
  readonly aileron_position: number;
  readonly elevator_position: number;
  readonly rudder_position: number;
  readonly aileron_trim_position: number;
  readonly elevator_trim_position: number;
  readonly rudder_trim_position: number;
  readonly engine_throttle_position: number;
  readonly engine_1_fuel_switch_state: boolean;
  readonly engine_2_fuel_switch_state: boolean;
  readonly engine_3_fuel_switch_state: boolean;
  readonly engine_4_fuel_switch_state: boolean;
  readonly stalling: boolean;
  readonly atmosphere_temperature: number;
  readonly atmosphere_density: number;
  readonly atmosphere_sea_level_temperature: number;
  readonly atmosphere_sea_level_density: number;
  readonly atmosphere_wind_speed: number;
  readonly atmosphere_wind_direction: number;
  readonly atmosphere_turbulence_level: number;
  readonly atmosphere_turbulence_intervals: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly landing_gear_selector_position: B747GearSelector;
  readonly flaps_selector_position: B747FlapSelector;
  set_empty_weight(_0: number): boolean;
  set_wing_area(_0: number): boolean;
  set_engine_throttle_position(_0: number): boolean;
  set_engine_1_fuel_switch_state(_0: boolean): boolean;
  set_engine_2_fuel_switch_state(_0: boolean): boolean;
  set_engine_3_fuel_switch_state(_0: boolean): boolean;
  set_engine_4_fuel_switch_state(_0: boolean): boolean;
  set_aileron_position(_0: number): void;
  set_elevator_position(_0: number): void;
  set_rudder_position(_0: number): void;
  set_aileron_trim_position(_0: number): void;
  set_elevator_trim_position(_0: number): void;
  set_rudder_trim_position(_0: number): void;
  set_autopilot_master_switch(_0: boolean): void;
  set_autopilot_heading_target(_0: number): void;
  set_autopilot_heading_hold(_0: boolean): void;
  set_autopilot_altitude_hold(_0: boolean): void;
  set_autopilot_speed_indicated_hold(_0: boolean): void;
  set_autopilot_speed_true_hold(_0: boolean): void;
  set_autopilot_speed_mach_hold(_0: boolean): void;
  set_autopilot_vertical_speed_hold(_0: boolean): void;
  set_autopilot_bank_hold(_0: boolean): void;
  set_autopilot_pitch_hold(_0: boolean): void;
  set_autopilot_yaw_damper(_0: boolean): void;
  set_autopilot_turn_coordinator(_0: boolean): void;
  set_autopilot_auto_trim(_0: boolean): void;
  set_autopilot_altitude_target(_0: number): void;
  set_autopilot_speed_indicated_target(_0: number): void;
  set_autopilot_speed_true_target(_0: number): void;
  set_autopilot_speed_mach_target(_0: number): void;
  set_autopilot_vertical_speed_target(_0: number): void;
  set_autopilot_bank_target(_0: number): void;
  set_autopilot_pitch_target(_0: number): void;
  set_latitude(_0: number): boolean;
  set_longitude(_0: number): boolean;
  set_atmosphere_sea_level_temperature(_0: number): void;
  set_atmosphere_sea_level_density(_0: number): void;
  set_atmosphere_wind_speed(_0: number): void;
  set_atmosphere_wind_direction(_0: number): void;
  set_atmosphere_turbulence_level(_0: number): void;
  set_atmosphere_turbulence_intervals(_0: number): void;
  set_landing_gear_selector_position(_0: B747GearSelector): boolean;
  set_flaps_selector_position(_0: B747FlapSelector): boolean;
}



interface c172 extends ClassHandle {
  readonly name: string;
  readonly wing_area: number;
  readonly cl: number;
  readonly aoa_deg: number;
  readonly aoa: number;
  readonly max_aoa_deg: number;
  readonly cdo: number;
  readonly cdi: number;
  readonly drag: number;
  readonly lift: number;
  readonly thrust: number;
  readonly weight: number;
  readonly density: number;
  readonly empty_weight: number;
  readonly altitude_ft: number;
  readonly speed_mach: number;
  readonly speed_true_knots: number;
  readonly speed_true_dot_ms: number;
  readonly pitch_deg: number;
  readonly pitch: number;
  readonly pitch_dot_deg: number;
  readonly pitch_dot: number;
  readonly heading_deg: number;
  readonly heading: number;
  readonly heading_dot_deg: number;
  readonly heading_dot: number;
  readonly bank_deg: number;
  readonly bank: number;
  readonly bank_dot_deg: number;
  readonly bank_dot: number;
  readonly sideslip: number;
  readonly sideslip_deg: number;
  readonly max_speed: number;
  readonly stall_speed: number;
  readonly vertical_speed: number;
  readonly vertical_speed_ftmin: number;
  readonly speed_indicated_knots: number;
  readonly is_ground_collision: boolean;
  readonly autopilot_master_switch: boolean;
  readonly autopilot_heading_target: number;
  readonly autopilot_pitch_target: number;
  readonly autopilot_heading_hold: boolean;
  readonly autopilot_pitch_hold: boolean;
  readonly autopilot_altitude_hold: boolean;
  readonly autopilot_speed_indicated_hold: boolean;
  readonly autopilot_speed_true_hold: boolean;
  readonly autopilot_speed_mach_hold: boolean;
  readonly autopilot_vertical_speed_hold: boolean;
  readonly autopilot_bank_hold: boolean;
  readonly autopilot_yaw_damper: boolean;
  readonly autopilot_turn_coordinator: boolean;
  readonly autopilot_auto_trim: boolean;
  readonly autopilot_altitude_target: number;
  readonly autopilot_speed_indicated_target: number;
  readonly autopilot_speed_true_target: number;
  readonly autopilot_speed_mach_target: number;
  readonly autopilot_vertical_speed_target: number;
  readonly autopilot_bank_target: number;
  readonly aileron_position: number;
  readonly elevator_position: number;
  readonly rudder_position: number;
  readonly aileron_trim_position: number;
  readonly elevator_trim_position: number;
  readonly rudder_trim_position: number;
  readonly engine_throttle_position: number;
  readonly engine_throttle_position: number;
  readonly engine_1_fuel_switch_state: boolean;
  readonly stalling: boolean;
  readonly atmosphere_temperature: number;
  readonly atmosphere_density: number;
  readonly atmosphere_sea_level_temperature: number;
  readonly atmosphere_sea_level_density: number;
  readonly atmosphere_wind_speed: number;
  readonly atmosphere_wind_direction: number;
  readonly atmosphere_turbulence_level: number;
  readonly atmosphere_turbulence_intervals: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly landing_gear_selector_position: C172GearSelector;
  readonly flaps_selector_position: C172FlapSelector;
  set_empty_weight(_0: number): boolean;
  set_wing_area(_0: number): boolean;
  set_cdo(_0: number): boolean;
  set_engine_throttle_position(_0: number): boolean;
  set_engine_1_fuel_switch_state(_0: boolean): boolean;
  set_aileron_position(_0: number): void;
  set_elevator_position(_0: number): void;
  set_rudder_position(_0: number): void;
  set_aileron_trim_position(_0: number): void;
  set_elevator_trim_position(_0: number): void;
  set_rudder_trim_position(_0: number): void;
  set_autopilot_master_switch(_0: boolean): void;
  set_autopilot_heading_target(_0: number): void;
  set_autopilot_heading_hold(_0: boolean): void;
  set_autopilot_altitude_hold(_0: boolean): void;
  set_autopilot_speed_indicated_hold(_0: boolean): void;
  set_autopilot_speed_true_hold(_0: boolean): void;
  set_autopilot_speed_mach_hold(_0: boolean): void;
  set_autopilot_vertical_speed_hold(_0: boolean): void;
  set_autopilot_bank_hold(_0: boolean): void;
  set_autopilot_pitch_hold(_0: boolean): void;
  set_autopilot_yaw_damper(_0: boolean): void;
  set_autopilot_turn_coordinator(_0: boolean): void;
  set_autopilot_auto_trim(_0: boolean): void;
  set_autopilot_altitude_target(_0: number): void;
  set_autopilot_speed_indicated_target(_0: number): void;
  set_autopilot_speed_true_target(_0: number): void;
  set_autopilot_speed_mach_target(_0: number): void;
  set_autopilot_vertical_speed_target(_0: number): void;
  set_autopilot_bank_target(_0: number): void;
  set_autopilot_pitch_target(_0: number): void;
  set_latitude(_0: number): boolean;
  set_longitude(_0: number): boolean;
  set_atmosphere_sea_level_temperature(_0: number): void;
  set_atmosphere_sea_level_density(_0: number): void;
  set_atmosphere_wind_speed(_0: number): void;
  set_atmosphere_wind_direction(_0: number): void;
  set_atmosphere_turbulence_level(_0: number): void;
  set_atmosphere_turbulence_intervals(_0: number): void;
  set_landing_gear_selector_position(_0: C172GearSelector): boolean;
  set_flaps_selector_position(_0: C172FlapSelector): boolean;
}

function checkPoint(content: string): void;

function dataDisplayReset(): void;

function dataView(simPropitem: SimulationProperties, state: boolean): void;



interface EmbindModule {
  b747: {};
  B747GearSelector: {OFF: 2, UP: 1, DOWN: 0};
  B747FlapSelector: {ZERO: 0, ONE: 1, FIVE: 5, TEN: 10, TWENTY: 20, TWENTFIVE: 25, THIRTY: 30};
  c172: {};
  C172GearSelector: {DOWN: 0};
  C172FlapSelector: {ZERO: 0, TEN: 10, TWENTY: 20, THIRTY: 30};
  FLIGHTMODEL_VERSION: EmbindString;
  check_licence(_0: EmbindString, _1: EmbindString): boolean;
  graphics: {
    getContext(): graphics;
  };
  GRAPHICSEFlightModel: {C172: 0, B747: 1};
}


type ExtendedMainModule = { flightModel : FlightModelInstance} & {simulation : graphics} & EmbindModule;


type FlightModelInstance = b747 | c172;

 {
    getContext(): graphics;
  }

 {simulation : graphics}

function notifyUser(title: string, body?: string, timeOut?: number): void

 {OFF: 2, UP: 1, DOWN: 0}

function plotView(simPropitem: SimulationProperties, state: boolean): void;

async function repositionWithAutopilot(context: ScriptContext, target_altitude: number, target_speed: number,
  target_heading: number, timeOut: number = 10000, preConfiguration?: Function): Promise<boolean>;

 resetTimeouts = () => {
  cache.forEach((n) => _clear(n));
  // Clear the cache array
  cache.length = 0;
}



interface ScriptContext {
  controls: ExtendedMainModule;
  props: any;
  repositionWithAutopilot: typeof repositionWithAutopilot;
  waitFor: (ms: number) => Promise<void>;
  waitForCondition: (
    condition: () => boolean,
    confirmationMs?: number,
    pollIntervalMs?: number,
    hardTimeoutMs?: number | null,
    throwOnTimeout?: boolean,
  ) => Promise<boolean>;

  notifyUser: (title: string, body?: string, timeout?: number) => void;
  dataView: (prop: SimulationProperties, state: boolean) => void;
  plotView: (prop: SimulationProperties, state: boolean) => void;
  dataDisplayReset: () => void;

  checkPoint: (content: string) => void;
  metrics: any[];
}

async function setTimeout(
  callback: (...args: any[]) => void,
  duration?: number,
  ...args: any[]
): Promise<number>;



interface SimulationProperties {
  readonly id: string;
  readonly type: 'number' | 'boolean' | 'string' | 'enum' | 'void';
  readonly label: string;
  readonly description?: string;
  readonly inputValue?: PropertyType;
  readonly setterFunc?: Function;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly precision?: number;
  readonly group: string;
  readonly enumValues?: { enumName: string; enumValue: number }[];
}

 { enumName: string; enumValue: number }

async function waitFor(ms: number): Promise<void>;

async function waitForCondition(
  conditionFunction: () => boolean,
  confirmation_ms: number = 0,
  pollInterval_ms: number = 400,
  hardTimeout_ms: number | null = null,
  throwOnTimeout: boolean = false
): Promise<boolean>;