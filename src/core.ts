
export type { FlightModelInstance, ExtendedMainModule } from "./siminterfac"

import { SimulationProperties } from "../public/flightsimulator_exec_meta"
export type { SimulationProperties } from "../public/flightsimulator_exec_meta"

import type { ScriptContext } from "./ScriptContext";
export type { ScriptContext } from "./ScriptContext"

// Plot a graph of simulation property.
export declare function plotView(simPropitem: SimulationProperties, state: boolean): void;
// Display data of a simulation property
export declare function dataView(simPropitem: SimulationProperties, state: boolean): void;
// Reset All simulation displays
export declare function dataDisplayReset(): void;
// Send a prompt that is visible to the user
export declare function notifyUser(title: string, body?: string, timeOut?: number): void
// Create a checkpoint to inform the instructor about the progress of the a script
export declare function checkPoint(content: string): void;

// Create a global singleton cache
const globalScope = globalThis as any;
if (!globalScope.__myAppTimeoutCache) {
  globalScope.__myAppTimeoutCache = [];
}
const cache: number[] = globalScope.__myAppTimeoutCache;

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
export async function repositionWithAutopilot(context: ScriptContext, target_altitude: number, target_speed: number,
  target_heading: number, timeOut: number = 10000, preConfiguration?: Function): Promise<boolean> {

  const simulation = context.controls.simulation;
  const flightModel = context.controls.flightModel;

  // Reinitialize the flight model reference after reset
  const flight_model_type = simulation.flight_model;

  // Invoke pre configuration function if provided
  if (preConfiguration) {
    preConfiguration();
  };

  // Wait for 1000 ms (1 second)
  await waitFor(1000);

  // Set Simulation speed to 500
  simulation.set_simulation_speed(500);

  flightModel.set_engine_throttle_position(1);
  // Toggle the autopilot master switch state.
  flightModel.set_autopilot_master_switch(true);
  flightModel.set_autopilot_auto_trim(true);
  flightModel.set_autopilot_speed_indicated_target(target_speed);
  flightModel.set_autopilot_altitude_target(target_altitude);
  flightModel.set_autopilot_heading_target(target_heading);

  let min_takeoff_speed = 0;

  if (flight_model_type == context.controls.GRAPHICSEFlightModel.B747) {
    min_takeoff_speed = 180; // Minimum takeoff speed for B747 in knots (approximate)
  }
  else if (flight_model_type == context.controls.GRAPHICSEFlightModel.C172) {
    min_takeoff_speed = 80; // Minimum takeoff speed for C172 in knots (approximate)
  }

  // Wait for speed to cross minimum takeoff speed in knots
  await waitForCondition(() => {
    return flightModel.speed_indicated_knots > Math.max(min_takeoff_speed, target_speed);
  });

  // Toggle vertical speed hold
  // xsimControls.simulation.set_autopilot_vertical_speed_hold(true)
  flightModel.set_autopilot_altitude_hold(true);

  // Toggle speed hold
  flightModel.set_autopilot_speed_indicated_hold(true);

  // Toggle Heading hold
  flightModel.set_autopilot_heading_hold(true);

  // Wait until the altitude crosses 300
  await waitForCondition(() => {
    return flightModel.altitude_ft >= Math.min(300, target_altitude);
  });

  // Landing gear up
  if (flight_model_type == context.controls.GRAPHICSEFlightModel.B747) {
    // Workaround until reposition is exported.
    simulation.set_flight_model_b747().set_landing_gear_selector_position(context.controls.B747GearSelector.UP);
  }

  // Wait until all condition are met.
  const success = await waitForCondition(() => {
    return Math.abs(flightModel.altitude_ft - target_altitude) < 2 &&
      Math.abs(flightModel.speed_indicated_knots - target_speed) < 0.1 &&
      Math.abs(flightModel.heading_deg - target_heading) < 0.1 &&
      Math.abs(flightModel.elevator_position) < 0.005;
  }, 400, 40, timeOut);

  if (!success) {
    notifyUser("Reposition Failed", `Failed to reposition to altitude: ${target_altitude} ft, speed: ${target_speed} knots, heading: ${target_heading}° within ${timeOut / 1000} seconds.`);
    simulation.set_simulation_speed(1);
    simulation.set_simulation_pause(true);
    return false;
  }

  // Restore Simulation speed to 1
  simulation.set_simulation_speed(1);
  await waitFor(100);

  // Turn off autopilot
  flightModel.set_autopilot_master_switch(false);
  flightModel.set_autopilot_auto_trim(false);
  flightModel.set_autopilot_altitude_hold(false);
  flightModel.set_autopilot_speed_indicated_hold(false);
  flightModel.set_autopilot_heading_hold(false);

  await waitFor(100);
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
  throwOnTimeout: boolean = false
): Promise<boolean> {
  const maxAttempts = Math.ceil(confirmation_ms / pollInterval_ms);
  let attempts = 0;
  let resolved = false;
  let timeoutHandle: number;

  const poll = (resolve: (value: boolean) => void, reject: (reason?: any) => void) => {
    if (resolved) return;

    if (conditionFunction() === true) {
      attempts++;
      if (attempts >= maxAttempts) {
        clearTimeout(timeoutHandle, cache);
        resolved = true;
        resolve(true); // Condition confirmed
      } else {
        setTimeout(() => poll(resolve, reject), pollInterval_ms);
      }
    } else {
      attempts = 0; // reset if fails
      setTimeout(() => poll(resolve, reject), pollInterval_ms);
    }
  };

  return new Promise<boolean>((resolve, reject) => {
    if (hardTimeout_ms !== null) {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (throwOnTimeout) {
            reject(new Error("Condition not met within timeout."));
          } else {
            resolve(false); // Safe failure
          }
        }
      }, hardTimeout_ms).then((id) => {
        timeoutHandle = id;
      });
    }
    poll(resolve, reject);
  });
};

// Wait for a given time in ms without interrupting the simulation
export async function waitFor(ms: number): Promise<void> {
  const poll = (resolve: any) => {
    setTimeout((_) => resolve(), ms)
  }
  return new Promise(poll)
}

const _set = window.setTimeout; // save original reference
const _clear = window.clearTimeout; // save original reference

// Wrap original setTimeout with a function
export async function setTimeout(
  callback: (...args: any[]) => void,
  duration?: number,
  ...args: any[]
): Promise<number> {
  // also, wrap the callback, so the cache reference will be removed
  // when the timeout has reached (fired the callback)
  const id = _set(
    function (...cbArgs: any[]) {
      callback.apply(null, cbArgs);
      removeCacheItem(id, cache);
    },
    duration || 0,
    ...args,
  );

  // store reference in the cache array
  cache.push(id);

  // id reference must be returned to be able to clear it
  return id;
};

// Wrap original clearTimeout with a function
const clearTimeout = (id: number, timeOutCache: number[]) => {
  _clear(id);
  removeCacheItem(id, timeOutCache);
};

// Add a custom function named "clearTimeouts" to the "window" object
export const resetTimeouts = () => {
  cache.forEach((n) => _clear(n));
  // Clear the cache array
  cache.length = 0;
};

// removes a specific id from the cache array
const removeCacheItem = (id: number, timeOutCache: number[]) => {
  const idx = timeOutCache.indexOf(id);
  if (idx > -1) {
    timeOutCache.splice(idx, 1); // This mutates the array in place
  }
};
