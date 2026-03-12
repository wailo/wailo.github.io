export type { C172FlapSelector,
  B747FlapSelector,
  C172GearSelector,
  B747GearSelector } from "../flightsimulator_exec";
import  { type ExtendedMainModule, type SimulationProperties, type FlightModelInstance} from "../../src/siminterfac"
// import { apiMetadata } from "../flightsimulator_exec_meta";

// export declare const simProps : Record<keyof typeof apiMetadata, SimulationProperties>;
export declare let simControls : ExtendedMainModule;
export declare function plotView(simPropitem: SimulationProperties, state: boolean): void;
export declare function dataView(simPropitem: SimulationProperties, state: boolean): void;
export declare function dataDisplayReset(): void;
export declare function notifyUser(title: string, body?: string, timeOut?: number): void
export declare function checkPoint(content: string): void;

// Create a global singleton cache
const globalScope = globalThis as any;
if (!globalScope.__myAppTimeoutCache) {
  globalScope.__myAppTimeoutCache = [];
}
const cache: number[] = globalScope.__myAppTimeoutCache;

export async function repositionWithAutopilot(flightModel : FlightModelInstance, target_altitude: number, target_speed: number,
     target_heading: number, timeOut :number = 10000, preConfiguration? : Function ) : Promise<boolean> {

  // Reset the simulation
  //  simControls.simulation.reset_simulation();

  // Reinitialize the flight model reference after reset
  const flight_model_type = simControls.simulation.flight_model;
  if (flight_model_type == simControls.FlightModel.B747) {
    flightModel = simControls.simulation.set_flight_model_b747()
  }
  else if (flight_model_type == simControls.FlightModel.C172) {
    flightModel = simControls.simulation.set_flight_model_c172()
  }

  // Invoke pre configuration function if provided
   if (preConfiguration) {
    preConfiguration();
  };

  // Wait for 1000 ms (1 second)
  await waitFor(1000);

  // Set Simulation speed to 500
  simControls.simulation.set_simulation_speed(500);

  flightModel.set_engine_throttle_position(1);
  // Toggle the autopilot master switch state.
  flightModel.set_autopilot_master_switch(true);
  flightModel.set_autopilot_auto_trim(true);
  flightModel.set_autopilot_speed_indicated_target(target_speed);
  flightModel.set_autopilot_altitude_target(target_altitude);
  flightModel.set_autopilot_heading_target(target_heading);

  let min_takeoff_speed = 0;

  if (flight_model_type == simControls.FlightModel.B747) {
    min_takeoff_speed = 180; // Minimum takeoff speed for B747 in knots (approximate)
  }
  else if (flight_model_type == simControls.FlightModel.C172) {
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
  if (flight_model_type == simControls.FlightModel.B747) {
    flightModel.set_landing_gear_selector_position(simControls.B747GearSelector.UP);
  }

  // Wait until the altitude crosses 300
  const success = await waitForCondition(() => {
    return Math.abs(flightModel.altitude_ft - target_altitude) < 2 &&
    Math.abs(flightModel.speed_indicated_knots - target_speed) < 0.1 &&
    Math.abs(flightModel.heading_deg - target_heading) < 0.1 &&
    Math.abs(flightModel.elevator_position) < 0.005;
  }, 400, 40, timeOut);

  if (!success) {
    notifyUser("Reposition Failed", `Failed to reposition to altitude: ${target_altitude} ft, speed: ${target_speed} knots, heading: ${target_heading}° within ${timeOut / 1000} seconds.`);
    simControls.simulation.set_simulation_speed(1);
    simControls.simulation.set_simulation_pause(true);
    return false;
  }

  // Restore Simulation speed to 1
  simControls.simulation.set_simulation_speed(1);
  await waitFor(100);

  // Turn off autopilot
  flightModel.set_autopilot_master_switch(false);
  flightModel.set_autopilot_auto_trim(false);
  flightModel.set_autopilot_altitude_hold(false);
  flightModel.set_autopilot_speed_indicated_hold(false );
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
export const waitForCondition = (
  conditionFunction: () => boolean,
  confirmation_ms: number = 0,
  pollInterval_ms: number = 400,
  hardTimeout_ms: number | null = null,
  throwOnTimeout: boolean = false
): Promise<boolean> => {
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
      timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (throwOnTimeout) {
            reject(new Error("Condition not met within timeout."));
          } else {
            resolve(false); // Safe failure
          }
        }
      }, hardTimeout_ms);
    }
    poll(resolve, reject);
  });
};




// Wait for a given time in ms without interrupting the simulation
export const waitFor = (ms: number) => {
  const poll = (resolve : any) => {
      setTimeout((_) => resolve(), ms)
  }
  return new Promise(poll)
}

const _set = window.setTimeout; // save original reference
const _clear = window.clearTimeout; // save original reference

// Wrap original setTimeout with a function
const setTimeout = function (
  callback: (...args: any[]) => void,
  duration?: number,
  ...args: any[]
): number {
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
const clearTimeout = (id: number, timeOutCache : number[]) => {
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
