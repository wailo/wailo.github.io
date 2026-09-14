import type { JoystickInput } from './components/Joystick.vue'

const fields = {
  aileron: 'aileron_position',
  elevator: 'elevator_position',
  rudder: 'rudder_position',
  throttle: 'engine_throttle_position',
  mixture: 'engine_mixture_position',
  flaps: 'flaps_selector_position',
  gear: 'landing_gear_selector_position',
  aileronTrim: 'aileron_trim_position',
  elevatorTrim: 'elevator_trim_position',
  rudderTrim: 'rudder_trim_position',
} as const

type Field = (typeof fields)[keyof typeof fields]
type JoystickModel = Partial<Record<Field, number>> & {
  set_aileron_position(value: number): unknown
  set_elevator_position(value: number): unknown
  set_rudder_position(value: number): unknown
  set_engine_throttle_position(value: number): unknown
  set_engine_mixture_position?(value: number): unknown
  set_flaps_selector_position(value: number): unknown
  set_landing_gear_selector_position(value: number): unknown
  set_aileron_trim_position(value: number): unknown
  set_elevator_trim_position(value: number): unknown
  set_rudder_trim_position(value: number): unknown
}

/** Apply only the controls the user touched, through the existing mirrored setters. */
export function applyJoystickChanges(model: JoystickModel, changes: Partial<JoystickInput>) {
  for (const key of Object.keys(changes) as Array<keyof JoystickInput>) {
    const field = fields[key]
    const value = changes[key]
    if (!field || value === undefined || !Number.isFinite(value) || value === model[field]) continue
    model[`set_${field}`]?.(value)
  }
}
