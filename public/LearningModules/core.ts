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
  simControls.api_set_landing_gear_selector_position(simControls.GearSelector.UP);

  // Wait until the altitude crosses 300
  await waitForCondition(() => {
    return Math.abs(simData.api_altitude - target_altitude) < 0.1 && 
    Math.abs(simData.api_ias_speed_knots - target_speed) < 0.1 &&
    Math.abs(simData.api_heading_deg - target_heading) < 0.1; 
  });

  // Restore Simulation speed to 1
  simControls.api_set_simulation_speed(1);
}
