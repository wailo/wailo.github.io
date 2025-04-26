
// Perform takeoff and configure autopilot
const targetAltitude = 4000;
const targetSpeed = 280;
const targetHeading = 270

// Watch key data. Altitude, mach, speed, Pitch Angle, Angle of Attack (AoA), lift coefficient (Cl)
simControls.notifyUser("Viewing live data", "Lift, weight, thrust and drag.\n\n");
await waitFor(2000);
displayData.api_lift.visible = true;
await waitFor(300);
displayData.api_weight.visible = true;
await waitFor(300);
displayData.api_thrust.visible = true;
await waitFor(300);
displayData.api_drag.visible = true;



await reposition_with_autopilot(targetAltitude, targetSpeed, targetHeading);

simControls.api_set_autopilot(true);
simControls.api_set_altitude_hold(true);
simControls.api_set_altitude_hold(true);
simControls.api_set_target_speed(targetSpeed);
simControls.api_set_target_altitude(targetAltitude);
simControls.api_set_target_heading_deg(targetHeading);

console.log("Observe the aircraft maintaining stable flight level.");
