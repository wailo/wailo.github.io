 async function reposition_with_autopilot(target_altitude, target_speed,
     target_heading) {
  // Reset the simulation
  simControls.api_set_simulation_reset();

  // Wait for 1000 ms (1 second)
  await waitFor(1000);

  // Set Simulation speed to 100
  simControls.api_set_simulation_speed(100);

  simControls.api_set_engine_throttle_value(1);
  // Toggle the autopilot master switch state.
  simControls.api_set_autopilot(true);
  simControls.api_set_target_speed(target_speed);
  simControls.api_set_target_altitude(target_altitude);
  simControls.api_set_target_heading_deg(target_heading);

  // Wait for speed to cross 180 knots
  await waitForCondition(() => {
    return simData.api_ias_speed_knots > 180;
  });

  // Toggle vertical speed hold
  // xsimControls.api_set_vertical_speed_hold(true)
  simControls.api_set_altitude_hold(true);

  // Toggle speed hold
  simControls.api_set_speed_hold(true);

  // Toggle Heading hold
  simControls.api_set_heading_hold(true);

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
  simControls.api_set_altitude_hold(false);
  simControls.api_set_speed_hold(false );
  simControls.api_set_heading_hold(false);

  // Restore Simulation speed to 1
  simControls.api_set_simulation_speed(1);
}


// Function to wait for a condition to be true after a given confirmation time in ms
// This function will poll the conditionFunction every pollInterval ms
// confirmation_ms is the time to wait before checking the condition again
// pollInterval_ms is the time to wait between each check of the condition
// hardTimeout_ms is the maximum time to wait for the condition to be true
// throwOnTimeout will throw an error if the condition is not met within the timeout
const waitForCondition = (conditionFunction, confirmation_ms = 0, pollInterval_ms = 400, hardTimeout_ms = null, throwOnTimeout = false) => {
  const maxAttempts = Math.ceil(confirmation_ms / pollInterval_ms);
  let attempts = 0;
  let resolved = false;
  let timeoutHandle = null;

  const poll = (resolve, reject) => {
      if (resolved) return;

      if (conditionFunction() === true) {
          attempts++;
          if (attempts >= maxAttempts) {
              clearTimeout(timeoutHandle);
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

  return new Promise((resolve, reject) => {
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
const waitFor = (ms) => {
  const poll = (resolve) => {
      setTimeout((_) => resolve(), ms)
  }
  return new Promise(poll)
}

const _set = window.setTimeout; // save original reference
const _clear = window.clearTimeout; // save original reference

// Wrap original setTimeout with a function
const setTimeout = function (callback, duration, arg) {
  // also, wrap the callback, so the cache reference will be removed
  // when the timeout has reached (fired the callback)
  const id = _set(
      function () {
          callback.apply(null, arguments);
          removeCacheItem(id);
      },
      duration || 0,
      arg,
  );

  // store reference in the cache array
  window.cache.push(id);

  // id reference must be returned to be able to clear it
  return id;
};

// Wrap original clearTimeout with a function
const clearTimeout = (id) => {
  _clear(id);
  removeCacheItem(id);
};

// Add a custom function named "clearTimeouts" to the "window" object
const resetTimeouts = () => {
  window.cache.forEach((n) => _clear(n));
  // Clear the cache array
  window.cache.length = 0;
};

// removes a specific id from the cache array
const removeCacheItem = (id) => {
  const idx = cache.indexOf(id);
  if (idx > -1) {
      window.cache = window.cache.filter((n) => n != id);
  }
}