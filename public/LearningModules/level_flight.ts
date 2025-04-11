
// Perform takeoff and configure autopilot
const targetAltitude = 12000;
const targetSpeed = 280;
const targetHeading = 270

simControls.api_set_engine_throttle_value(1);
simControls.api_set_autopilot(true);
simControls.api_set_target_speed(280);
simControls.api_set_target_altitude(targetAltitude);
simControls.api_set_target_vertical_speed(3000);
simControls.api_set_target_heading_deg(270);

await reposition_with_autopilot(targetAltitude, targetSpeed, targetHeading);


console.log("Observe the aircraft maintaining stable flight level.");
