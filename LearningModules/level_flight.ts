// ✈️ Level Flight Demonstration with Dynamic Changes

const targetAltitude = 4000; // feet
const targetSpeed = 280;     // knots
const targetHeading = 270;   // degrees

// 🧭 Initial Setup
simControls.notifyUser(
  "🧭 Level Flight Setup",
  `Establishing level flight at:\n• Altitude: ${targetAltitude} ft\n• Speed: ${targetSpeed} KT\n• Heading: ${targetHeading}°\n\n` +
  "We'll observe aerodynamic forces during steady flight."
);
await waitFor(5000);

// 📊 Display Key Aerodynamic Forces
simControls.notifyUser("📊 Monitoring Live Data", "Displaying aerodynamic forces: Lift, Weight, Thrust, Drag...");
await waitFor(2000);

displayData.api_lift.visible = true;
await waitFor(300);
displayData.api_weight.visible = true;
await waitFor(300);
displayData.api_thrust.visible = true;
await waitFor(300);
displayData.api_drag.visible = true;
await waitFor(1000);

// 🛫 Reposition and Configure Autopilot
simControls.notifyUser("🛫 Takeoff and Setup", "Repositioning and setting autopilot for level flight...");
await waitFor(3000);

await reposition_with_autopilot(targetAltitude, targetSpeed, targetHeading);

simControls.notifyUser(
  "🛠️ Configuring Autopilot",
  `Setting autopilot:\n• Altitude: ${targetAltitude} ft\n• Speed: ${targetSpeed} KT\n• Heading: ${targetHeading}°`
);
await waitFor(4000);

// 🛠 Set target values
simControls.api_set_autopilot(true);
await waitFor(500);
simControls.api_set_target_speed(targetSpeed);
await waitFor(500);
simControls.api_set_target_altitude(targetAltitude);
await waitFor(500);
simControls.api_set_target_heading_deg(targetHeading);
await waitFor(500);

// ✅ Now explicitly engage hold modes!
simControls.api_set_altitude_hold(true);
await waitFor(500);
simControls.api_set_speed_hold(true);
await waitFor(500);
// (Optional) Heading hold
simControls.api_set_heading_hold(true);
await waitFor(2000);

// 👀 Observation Mode
simControls.notifyUser(
  "👀 Observing Level Flight",
  "The aircraft is now maintaining stable, trimmed level flight.\n\n" +
  "Lift ≈ Weight\nThrust ≈ Drag"
);
await waitFor(5000);

/////////////////////////
// 🚀 Accelerate by 10 knots
/////////////////////////

const acceleratedSpeed = targetSpeed + 10;

simControls.notifyUser(
  "🚀 Speed Increase",
  `Now, we will increase the airspeed by 10 knots (from ${targetSpeed} KT to ${acceleratedSpeed} KT).\n\n` +
  "Observe the change in Thrust vs Drag."
);
await waitFor(6000);

// 🎯 Focus only on Thrust and Drag
displayData.api_lift.visible = false;
displayData.api_weight.visible = false;
await waitFor(500);

displayData.api_thrust.visible = true;
displayData.api_drag.visible = true;
await waitFor(1000);

// 🔧 Set new target speed
simControls.api_set_target_speed(acceleratedSpeed);

// ✅ Engage speed hold again to control the new speed
simControls.api_set_speed_hold(true);

// 🕐 Wait until speed is reached
simControls.notifyUser(
  "🕐 Waiting for New Speed",
  `Waiting until indicated airspeed reaches ${acceleratedSpeed} knots...`
);
await waitFor(3000);
await waitForCondition(() => simData.api_ias_speed_knots >= acceleratedSpeed - 0.01); // small buffer
await waitFor(2000);

// 🛠️ Stabilize at New Speed
simControls.notifyUser(
  "🛠️ Stabilized",
  "The aircraft has now stabilized at the new speed.\n\nNotice how thrust temporarily increased to overcome drag during acceleration!"
);
await waitFor(6000);

/////////////////////////
// 📈 Climb 500 feet
/////////////////////////

const climbAltitude = targetAltitude + 500;

simControls.notifyUser(
  "📈 Climb 500 Feet",
  `Now, we will initiate a climb from ${targetAltitude} ft to ${climbAltitude} ft.\n\n` +
  "Observe the change in Lift vs Weight."
);
await waitFor(6000);

// 🎯 Focus only on Lift and Weight
displayData.api_thrust.visible = false;
displayData.api_drag.visible = false;
await waitFor(500);

displayData.api_lift.visible = true;
displayData.api_weight.visible = true;
await waitFor(1000);

// 🔧 Set new target altitude
simControls.api_set_target_altitude(climbAltitude);

// ✅ Engage altitude hold again after setting new altitude
simControls.api_set_altitude_hold(true);

// 🕐 Wait until altitude is reached
simControls.notifyUser(
  "🕐 Waiting for New Altitude",
  `Waiting until the aircraft climbs to ${climbAltitude} ft... Observe the change in Lift vs Weight.`
);
await waitFor(3000);
await waitForCondition(() => simData.api_altitude >= climbAltitude - 5); // allow a 50 ft buffer
await waitFor(2000);

// 🛠️ Stabilize at New Altitude
simControls.notifyUser(
  "🛠️ Stabilized at New Altitude",
  "The aircraft has now reached the new cruising altitude.\n\nNotice that Lift temporarily increased to overcome Weight during the climb!"
);
await waitFor(6000);

// 🎉 End of Demo
simControls.notifyUser(
  "🎉 End of Level Flight Demo\n" +
  "We have observed how lift, weight, thrust, and drag changes during level flight, acceleration, and climbing.\n\n"
);
await waitFor(5000);
