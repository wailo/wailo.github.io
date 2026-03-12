import {repositionWithAutopilot, simControls, simProps, waitFor, waitForCondition, dataView, dataDisplayReset, notifyUser } from "./core"
// ✈️ Level Flight Demonstration with Dynamic Changes

dataDisplayReset();
const targetAltitude = 4000; // feet
const targetSpeed = 280;     // knots
const targetHeading = 270;   // degrees

// 🧭 Initial Setup
notifyUser(
  "🧭 Level Flight Setup",
  `Establishing level flight at:\n• Altitude: ${targetAltitude} ft\n• Speed: ${targetSpeed} KT\n• Heading: ${targetHeading}°\n\n` +
  "We'll observe aerodynamic forces during steady flight."
);
await waitFor(5000);

// 📊 Display Key Aerodynamic Forces
notifyUser("📊 Monitoring Live Data", "Displaying aerodynamic forces: Lift, Weight, Thrust, Drag...");
await waitFor(2000);

dataView(simProps.lift, true);
await waitFor(300);
dataView(simProps.weight, true);
await waitFor(300);
dataView(simProps.thrust, true);
await waitFor(300);
dataView(simProps.drag, true);
await waitFor(1000);

// 🛫 Reposition and Configure Autopilot
notifyUser("🛫 Takeoff and Setup", "Repositioning and setting autopilot for level flight...");
await waitFor(3000);

await repositionWithAutopilot(simControls.fm, targetAltitude, targetSpeed, targetHeading);

notifyUser(
  "🛠️ Configuring Autopilot",
  `Setting autopilot:\n• Altitude: ${targetAltitude} ft\n• Speed: ${targetSpeed} KT\n• Heading: ${targetHeading}°`
);
await waitFor(4000);

// 🛠 Set target values
simControls.fm.set_autopilot_master_switch(true);
await waitFor(500);
simControls.fm.set_autopilot_speed_indicated_target(targetSpeed);
await waitFor(500);
simControls.fm.set_autopilot_altitude_target(targetAltitude);
await waitFor(500);
simControls.fm.set_autopilot_heading_target(targetHeading);
await waitFor(500);

// ✅ Now explicitly engage hold modes!
simControls.fm.set_autopilot_altitude_hold(true);
await waitFor(500);
simControls.fm.set_autopilot_speed_indicated_hold(true);
await waitFor(500);
// (Optional) Heading hold
simControls.fm.set_autopilot_heading_hold(true);
await waitFor(2000);

// 👀 Observation Mode
notifyUser(
  "👀 Observing Level Flight",
  "The aircraft is now maintaining stable, trimmed level flight.\n\n" +
  "Lift ≈ Weight\nThrust ≈ Drag"
);
await waitFor(5000);

/////////////////////////
// 🚀 Accelerate by 10 knots
/////////////////////////

const acceleratedSpeed = targetSpeed + 10;

notifyUser(
  "🚀 Speed Increase",
  `Now, we will increase the airspeed by 10 knots (from ${targetSpeed} KT to ${acceleratedSpeed} KT).\n\n` +
  "Observe the change in Thrust vs Drag."
);
await waitFor(6000);

// 🎯 Focus only on Thrust and Drag
dataView(simProps.lift, false);
dataView(simProps.weight, false);
await waitFor(500);

dataView(simProps.thrust, true);
dataView(simProps.drag, true);
await waitFor(1000);

// 🔧 Set new target speed
simControls.fm.set_autopilot_speed_indicated_target(acceleratedSpeed);

// ✅ Engage speed hold again to control the new speed
simControls.fm.set_autopilot_speed_indicated_hold(true);

// 🕐 Wait until speed is reached
notifyUser(
  "🕐 Waiting for New Speed",
  `Waiting until indicated airspeed reaches ${acceleratedSpeed} knots...`
);
await waitFor(3000);
await waitForCondition(() => simControls.fm.speed_indicated_knots >= acceleratedSpeed - 0.01); // small buffer
await waitFor(2000);

// 🛠️ Stabilize at New Speed
notifyUser(
  "🛠️ Stabilized",
  "The aircraft has now stabilized at the new speed.\n\nNotice how thrust temporarily increased to overcome drag during acceleration!"
);
await waitFor(6000);

/////////////////////////
// 📈 Climb 500 feet
/////////////////////////

const climbAltitude = targetAltitude + 500;

notifyUser(
  "📈 Climb 500 Feet",
  `Now, we will initiate a climb from ${targetAltitude} ft to ${climbAltitude} ft.\n\n` +
  "Observe the change in Lift vs Weight."
);
await waitFor(6000);

// 🎯 Focus only on Lift and Weight
dataView(simProps.thrust, false);
dataView(simProps.drag, false);
await waitFor(500);

dataView(simProps.lift, true);
dataView(simProps.weight, true);
await waitFor(1000);

// 🔧 Set new target altitude
simControls.fm.set_autopilot_altitude_target(climbAltitude);

// ✅ Engage altitude hold again after setting new altitude
simControls.fm.set_autopilot_altitude_hold(true);

// 🕐 Wait until altitude is reached
notifyUser(
  "🕐 Waiting for New Altitude",
  `Waiting until the aircraft climbs to ${climbAltitude} ft... Observe the change in Lift vs Weight.`
);
await waitFor(3000);
await waitForCondition(() => simControls.fm.altitude_ft >= climbAltitude - 5); // allow a 50 ft buffer
await waitFor(2000);

// 🛠️ Stabilize at New Altitude
notifyUser(
  "🛠️ Stabilized at New Altitude",
  "The aircraft has now reached the new cruising altitude.\n\nNotice that Lift temporarily increased to overcome Weight during the climb!"
);
await waitFor(6000);

// 🎉 End of Demo
notifyUser(
  "🎉 End of Level Flight Demo\n",
  "We have observed how lift, weight, thrust, and drag changes during level flight, acceleration, and climbing.\n\n"
);
await waitFor(5000);
