import type { EmbindModule } from "../flightsimulator_exec"
import type { SimulationProperties, SimData, getSimulationParameters} from "../../src/siminterfac"
import { apiMetadata } from "../flightsimulator_exec_meta";

export declare const simProps : Record<string, SimulationProperties>;
export declare let simControls :EmbindModule;
export declare let simData : SimData;
export declare function plotView(simPropitem: SimulationProperties, state: boolean): void;
export declare function dataView(simPropitem: SimulationProperties, state: boolean): void;
export declare function notifyUser(title: string, body: string, timeOut?: number): void

// Create a global singleton cache
const globalScope = globalThis as any;
if (!globalScope.__myAppTimeoutCache) {
  globalScope.__myAppTimeoutCache = [];
}
const cache: number[] = globalScope.__myAppTimeoutCache;

export async function repositionWithAutopilot(target_altitude: number, target_speed: number,
     target_heading: number) {
  // Reset the simulation
  simControls.api_set_simulation_reset();

  // Wait for 1000 ms (1 second)
  await waitFor(1000);

  // Set Simulation speed to 100
  simControls.api_set_simulation_speed(100);

  simControls.api_set_engine_throttle_position(1);
  // Toggle the autopilot master switch state.
  simControls.api_set_autopilot(true);
  simControls.api_set_autopilot_ias_speed_target(target_speed);
  simControls.api_set_autopilot_altitude_target(target_altitude);
  simControls.api_set_autopilot_heading_target(target_heading);

  // Wait for speed to cross 180 knots
  await waitForCondition(() => {
    return simData.api_ias_speed_knots > 180;
  });

  // Toggle vertical speed hold
  // xsimControls.api_set_autopilot_vertical_speed_hold(true)
  simControls.api_set_autopilot_altitude_hold(true);

  // Toggle speed hold
  simControls.api_set_autopilot_ias_speed_hold(true);

  // Toggle Heading hold
  simControls.api_set_autopilot_heading_hold(true);

  // Wait until the altitude crosses 300
  await waitForCondition(() => {
    return simData.api_altitude > 300;
  });

  // Landing gear up
  simControls.api_set_landing_gear_selector_position(simControls.GearSelector.UP.value);

  // Wait until the altitude crosses 300
  await waitForCondition(() => {
    return Math.abs(simData.api_altitude - target_altitude) < 0.01 &&
    Math.abs(simData.api_ias_speed_knots - target_speed) < 0.01 &&
    Math.abs(simData.api_heading_deg - target_heading) < 0.1;
  });

  await waitFor(1000);

  simControls.api_set_autopilot(false);
  simControls.api_set_autopilot_altitude_hold(false);
  simControls.api_set_autopilot_ias_speed_hold(false );
  simControls.api_set_autopilot_heading_hold(false);

  // Restore Simulation speed to 1
  simControls.api_set_simulation_speed(1);
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
