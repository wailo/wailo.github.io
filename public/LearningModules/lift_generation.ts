import {repositionWithAutopilot, simControls, simProps, waitFor, waitForCondition, dataDisplayReset, notifyUser } from "./core"
// 📘 Lesson 1: Monitor Lift Generation in Flight
notifyUser(
  "📘 Lesson: Monitor Lift Generation",
  "🪂 In this lesson, you'll monitor how lift (Cl) changes with pitch and angle of attack.\n\n" +
  "We'll begin with straight and level flight, then introduce pitch changes for climb and descent.\n" +
  "⏱ Simulation speed will slow when needed to help you observe clearly.\n\n" +
  "👀 Interact: The simulation will pause after each observation.\n" +
  "▶️ Click resume when ready to continue."
);

// 📊 Snapshot Storage
let levelMetrics = { pitch: "", aoa: "", speed: "", cl: "" };
let climbMetrics = { pitch: "", aoa: "", speed: "", cl: "" };
let descentMetrics = { pitch: "", aoa: "", speed: "", cl: "" };

// Snapshot function
const getLiftSnapshot = async () => {
  const cl = simControls.fm.cl.toFixed(3);
  const pitch = simControls.fm.pitch_deg.toFixed(1);
  const aoa = simControls.fm.aoa_deg.toFixed(1);
  const speed = simControls.fm.speed_indicated_knots.toFixed(1);

  notifyUser(
    "📊 Snapshot",
    `| **Metric** | **Value** |\n|------------|-----------|\n| 🧭 **Pitch** | ${pitch}° |\n| 🎯 **AoA** | ${aoa}° |\n| 💨 **Speed** | ${speed} knots |\n| 🪂 **Cl** | ${cl} |`
  );
  simControls.simulation.set_simulation_pause(true);
  await waitFor(500);
  await waitForCondition(() => simControls.simulation.simulation_pause === false);

  return { pitch, aoa, speed, cl };
};

// 🔁 Setup: Reset and reposition at 15,000 ft and 250 knots
const targetVerticalSpeed = 3000; // feet per minute

dataDisplayReset();
await repositionWithAutopilot(simControls.fm, 15000, 250, 90);

simControls.fm.set_autopilot_master_switch(true);
simControls.fm.set_autopilot_speed_indicated_hold(true);
simControls.fm.set_autopilot_altitude_hold(true);

notifyUser("🛫 Level Flight", "We are now stabilized in straight and level flight.\nObserve Cl, pitch, and AoA.");
await waitFor(3000);
levelMetrics = await getLiftSnapshot();
await waitFor(2000);

// 🔼 Begin Climb
simControls.fm.set_autopilot_vertical_speed_target(targetVerticalSpeed);
simControls.fm.set_autopilot_vertical_speed_hold(true);
notifyUser("🔼 Climbing", "We're increasing pitch. Watch how Cl and AoA respond.");

await waitForCondition(() => Math.abs(simControls.fm.vertical_speed - targetVerticalSpeed) < 500);
await waitFor(3000);
climbMetrics = await getLiftSnapshot();
await waitFor(5000);

// 🔽 Begin Descent
notifyUser("🔽 Descending", "Pitching down. Watch how Cl and AoA change.");
simControls.fm.set_autopilot_vertical_speed_target(-targetVerticalSpeed);
await waitForCondition(() => Math.abs(simControls.fm.vertical_speed + targetVerticalSpeed) < 500);
descentMetrics = await getLiftSnapshot();
await waitFor(5000);

// 🔁 Return to Level Flight
notifyUser("🔁 Returning to Level Flight", "Resetting vertical speed to 0.");
simControls.simulation.set_simulation_speed(10);
simControls.fm.set_autopilot_vertical_speed_target(0);
waitForCondition(() => Math.abs(simControls.fm.vertical_speed) < 1).then(() => simControls.simulation.set_simulation_speed(1));

const combinedTable = `
| **Metric**       | **Level Flight**       | **Climb**             | **Descent**           |
|-------------------|------------------------|------------------------|-----------------------|
| 🧭 **Pitch**      | ${levelMetrics.pitch}° | ${climbMetrics.pitch}° | ${descentMetrics.pitch}° |
| 🎯 **AoA**        | ${levelMetrics.aoa}°   | ${climbMetrics.aoa}°   | ${descentMetrics.aoa}°   |
| 💨 **Speed**      | ${levelMetrics.speed} knots | ${climbMetrics.speed} knots | ${descentMetrics.speed} knots |
| 🪂 **Cl**         | ${levelMetrics.cl}     | ${climbMetrics.cl}     | ${descentMetrics.cl}     |
`;


notifyUser(
  "🧠 Quiz Time!",
  "❓ What happens to lift (Cl) when pitch increases? When it decreases?\n" +
  "❓ How does this relate to angle of attack and airspeed?\n" +
  "💡 What's the difference between pitch angle and angle of attack (AoA)? Why do they differ?\n\n" +
  "📊 Use the table below to help explain:\n\n" +
  combinedTable
);
