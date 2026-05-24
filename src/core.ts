export type {
  FlightModelInstance,
  b747,
  c172,
  graphics,
  ExtendedMainModule,
} from './wasm/siminterface'

import { SimulationProperties } from '../src/wasm/generated/flightsimulator_exec_meta'
export type { SimulationProperties } from '../src/wasm/generated/flightsimulator_exec_meta'

import type { ScriptContext } from './ScriptContext'
import type { b747, c172 } from './wasm/siminterface'
export type { ScriptContext } from './ScriptContext'

// Plot a graph of simulation property.
export declare function plotView(simPropitem: SimulationProperties, state: boolean): void
// Display data of a simulation property
export declare function dataView(simPropitem: SimulationProperties, state: boolean): void
// Reset All simulation displays
export declare function dataDisplayReset(): void
// Send a prompt that is visible to the user
export declare function notifyUser(title: string, body?: string, timeOut?: number): void
// Create a checkpoint to inform the instructor about the progress of the a script
export declare function checkPoint(content: string): void

// Helper function to calculate the difference between two angles in degrees, normalized to the range [-180, 180]
function angleDiffDeg(aDeg: number, bDeg: number): number {
  return ((aDeg - bDeg + 180) % 360) - 180
}

function getTypedFlightModel(
  controls: ScriptContext['controls'],
  flight_model_type: number,
): b747 | c172 {
  if (flight_model_type === controls.GRAPHICSEFlightModel.B747) {
    return controls.flightModel as b747
  }

  if (flight_model_type === controls.GRAPHICSEFlightModel.C172) {
    return controls.flightModel as c172
  }

  return controls.flightModel as b747 | c172
}

/**
 * Re‑positions the aircraft to a specified altitude, speed and heading using the autopilot.
 *
 * The function performs the following steps:
 * 1. Resets the simulation and selects the proper flight‑model instance.
 * 2. (Optional) Executes a user‑supplied `preConfiguration` function before any changes.
 * 3. Fast‑forwards the simulation to 500× speed, powers up the engines and activates the autopilot.
 * 4. Commands the autopilot to reach the target altitude, speed and heading, then holds those values.
 * 5. Waits until the aircraft has crossed a minimal altitude (300 ft or the target altitude) and the
 *    indicated speed has reached the desired value.
 * 6. After reaching the target state (within tight tolerances) it restores the simulation speed,
 *    disables the autopilot, and returns `true`. If the target state is not reached within the
 *    configured `timeOut`, the function logs a notification, pauses the simulation and returns `false`.
 *
 * @param {ScriptContext} context            - The simulation context containing controls, simulation and
 *                                            flight‑model helpers.
 * @param {number}       target_altitude     - Desired altitude in feet (e.g. 5000).
 * @param {number}       target_speed        - Desired airspeed in knots.
 * @param {number}       target_heading      - Desired heading in degrees (0–360).
 * @param {number}       [timeOut=10000]     - Maximum time to wait for the aircraft to reach the target
 *                                            state (in milliseconds). Default is 10 s.
 * @param {Function}     [preConfiguration]  - Optional callback that can modify the simulation or flight
 *                                            model before the autopilot is engaged.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the aircraft reached the target
 *                              altitude, speed, heading and elevator trim within the timeout, otherwise
 *                              `false`. In the failure case the function also shows a user notification
 *                              and pauses the simulation.
 *
 * @throws {Error} If the function fails to set up the simulation or the flight‑model and throws an
 *                 error (these are re‑thrown to the caller).
 *
 * @example
 * // Bring the B747 to 10 000 ft at 250 kt heading 90°
 * await repositionWithAutopilot(context, 10000, 250, 90);
 */
export async function repositionWithAutopilot(
  context: ScriptContext,
  target_altitude: number,
  target_speed: number,
  target_heading: number,
  timeOut: number = 10000,
  preConfiguration?: Function,
): Promise<boolean> {
  const simulation = context.controls.simulation
  const flight_model_type = simulation.flight_model

  // Force Reset flight model
  simulation.reset_flightmodel()

  // Reinitialize the flight model reference after reset
  const flightModel = getTypedFlightModel(context.controls, flight_model_type)

  // Set Simulation speed to 100
  simulation.set_simulation_speed(100)
  flightModel.set_freeze_position(true)
  flightModel.set_freeze_fuel(true)
  flightModel.set_engine_throttle_position(1)
  // Toggle the autopilot master switch state.
  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_speed_indicated_target(target_speed)
  flightModel.set_autopilot_altitude_target(target_altitude)
  flightModel.set_autopilot_heading_target(target_heading)

  let min_takeoff_speed = 0
  let climb_rate_fpm = 0
  let positive_climb_altitude_ft = 0

  if (flight_model_type == context.controls.GRAPHICSEFlightModel.B747) {
    min_takeoff_speed = 180 // Minimum takeoff speed for B747 in knots (approximate)
    climb_rate_fpm = 1500 // Climb rate for B747 in feet per minute (approximate)
    positive_climb_altitude_ft = 300 // Minimum altitude to confirm positive climb for B747 in feet
  } else if (flight_model_type == context.controls.GRAPHICSEFlightModel.C172) {
    min_takeoff_speed = 80 // Minimum takeoff speed for C172 in knots (approximate)
    climb_rate_fpm = 100 // Climb rate for C172 in feet per minute (approximate)
    positive_climb_altitude_ft = 100 // Minimum altitude to confirm positive climb for C172 in feet
  }

  // Wait for speed to cross minimum takeoff speed in knots
  await waitForCondition(() => {
    return flightModel.speed_indicated_knots > min_takeoff_speed
  })

  // Set vertical speed target and toggle vertical speed hold to start climbing
  flightModel.set_autopilot_pitch_target(7) // Set an initial pitch target to help with takeoff
  flightModel.set_autopilot_pitch_hold(true)

  // Wait until the aircraft is airborne
  await waitForCondition(() => !flightModel.weight_on_wheel)

  // Toggle vertical speed hold
  flightModel.set_autopilot_vertical_speed_target(climb_rate_fpm)
  flightModel.set_autopilot_vertical_speed_hold(true)

  // Wait until the altitude crosses the positive climb altitude
  await waitForCondition(() => {
    return flightModel.altitude_ft >= Math.min(positive_climb_altitude_ft, target_altitude)
  })

  // Landing gear up
  if (flight_model_type == context.controls.GRAPHICSEFlightModel.B747) {
    // Workaround until reposition is exported.
    const flightModelB747 = context.controls.flightModel as b747
    flightModelB747.set_landing_gear_selector_position(context.controls.B747GearSelector.UP)
  }

  // Toggle vertical speed hold
  flightModel.set_autopilot_altitude_hold(true)

  // Toggle speed hold
  flightModel.set_autopilot_speed_indicated_hold(true)

  // Toggle Heading hold
  flightModel.set_autopilot_heading_hold(true)

  // Invoke pre configuration function if provided
  if (preConfiguration) {
    preConfiguration()
  }

  // Set Simulation speed to 500
  simulation.set_simulation_speed(500)

  // Wait until all condition are met.
  const success = await waitForCondition(
    () => {
      return (
        Math.abs(flightModel.altitude_ft - target_altitude) < 0.5 &&
        Math.abs(flightModel.speed_indicated_knots - target_speed) < 0.05 &&
        angleDiffDeg(flightModel.yaw_deg, target_heading) < 0.01 &&
        Math.abs(flightModel.elevator_position) < 0.005
      )
    },
    400,
    400,
    timeOut,
  )

  // Unfreeze
  flightModel.set_freeze_position(false)
  flightModel.set_freeze_fuel(false)

  if (!success) {
    context.notifyUser(
      'Reposition Failed',
      `Failed to reposition to altitude: ${target_altitude} ft, speed: ${target_speed} knots, heading: ${target_heading}° within ${timeOut / 1000} seconds.`,
    )
    simulation.set_simulation_speed(1)
    simulation.set_simulation_pause(true)
    return false
  }

  // Restore Simulation speed to 1
  simulation.set_simulation_speed(1)
  await waitFor(100)

  // Turn off autopilot
  flightModel.set_autopilot_master_switch(false)
  flightModel.set_autopilot_auto_trim(false)
  flightModel.set_autopilot_altitude_hold(false)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_heading_hold(false)
  flightModel.set_autopilot_pitch_hold(false)

  await waitFor(100)
  return success
}

// Function to wait for a condition to be true after a given confirmation time in ms
// This function will poll the conditionFunction every pollInterval ms
// confirmation_ms is the time to wait before checking the condition again
// pollInterval_ms is the time to wait between each check of the condition
// hardTimeout_ms is the maximum time to wait for the condition to be true
// throwOnTimeout will throw an error if the condition is not met within the timeout
export async function waitForCondition(
  conditionFunction: () => boolean,
  confirmation_ms: number = 0,
  pollInterval_ms: number = 400,
  hardTimeout_ms: number | null = null,
  throwOnTimeout: boolean = false,
): Promise<boolean> {
  const maxAttempts = Math.ceil(confirmation_ms / pollInterval_ms)
  let attempts = 0
  let resolved = false
  let timeoutHandle: number

  const poll = (resolve: (value: boolean) => void, reject: (reason?: any) => void) => {
    if (resolved) return

    if (conditionFunction() === true) {
      attempts++
      if (attempts >= maxAttempts) {
        clearTimeout(timeoutHandle)
        resolved = true
        resolve(true) // Condition confirmed
      } else {
        setTimeout(() => poll(resolve, reject), pollInterval_ms)
      }
    } else {
      attempts = 0 // reset if fails
      setTimeout(() => poll(resolve, reject), pollInterval_ms)
    }
  }

  return new Promise<boolean>((resolve, reject) => {
    if (hardTimeout_ms !== null) {
      timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true
          if (throwOnTimeout) {
            reject(new Error('Condition not met within timeout.'))
          } else {
            resolve(false)
          }
        }
      }, hardTimeout_ms) as number // No .then()!
    }
    poll(resolve, reject)
  })
}

// Wait for a given time in ms without interrupting the simulation
export async function waitFor(ms: number): Promise<void> {
  const poll = (resolve: any) => {
    setTimeout((_) => resolve(), ms)
  }
  return new Promise(poll)
}

// Module-level cache
const cache: number[] = []

// Save originals
const _setTimeout = window.setTimeout
const _clearTimeout = window.clearTimeout

// ✅ Synchronous wrapper returning number
export function setTimeout(
  callback: (...args: any[]) => void,
  duration?: number,
  ...args: any[]
): number {
  const wrappedCallback = function (...cbArgs: any[]) {
    try {
      callback.apply(null, cbArgs)
    } finally {
      removeCacheItem(id, cache)
    }
  }

  const id = _setTimeout(wrappedCallback, duration || 0, ...args)
  cache.push(id)
  return id // ✅ Return number synchronously
}

// ✅ Standard signature, optional cache param
export function clearTimeout(id: number, timeOutCache: number[] = cache): void {
  _clearTimeout(id)
  removeCacheItem(id, timeOutCache)
}

export const resetTimeouts = (): void => {
  // Create a copy to avoid mutation during iteration
  ;[...cache].forEach((id) => _clearTimeout(id))
  cache.length = 0
}

const removeCacheItem = (id: number, timeOutCache: number[]): void => {
  const idx = timeOutCache.indexOf(id)
  if (idx > -1) {
    timeOutCache.splice(idx, 1)
  }
}
