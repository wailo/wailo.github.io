
// 📘 Lesson 1: Monitor Lift Generation in Flight
simControls.notifyUser(
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
  const cl = simData.api_cl.toFixed(3);
  const pitch = simData.api_pitch_deg.toFixed(1);
  const aoa = simData.api_aoa_deg.toFixed(1);
  const speed = simData.api_ias_speed_knots.toFixed(1);

  simControls.notifyUser(
    "📊 Snapshot",
    `| **Metric** | **Value** |\n|------------|-----------|\n| 🧭 **Pitch** | ${pitch}° |\n| 🎯 **AoA** | ${aoa}° |\n| 💨 **Speed** | ${speed} knots |\n| 🪂 **Cl** | ${cl} |`
  );
  simControls.api_set_simulation_pause(true);
  await waitFor(500);
  await waitForCondition(() => simData.api_simulation_pause === false);

  return { pitch, aoa, speed, cl };
};

// 🔁 Setup: Reset and reposition at 15,000 ft and 250 knots
const targetVerticalSpeed = 3000; // feet per minute

simControls.api_set_simulation_reset();
simControls.api_set_simulation_speed(100);
await reposition_with_autopilot(15000, 250, 90);


simControls.api_set_autopilot(true);
simControls.api_set_speed_hold(true);
simControls.api_set_altitude_hold(true);

simControls.notifyUser("🛫 Level Flight", "We are now stabilized in straight and level flight.\nObserve Cl, pitch, and AoA.");
await waitFor(3000);
levelMetrics = await getLiftSnapshot();
await waitFor(2000);

// 🔼 Begin Climb
simControls.api_set_target_vertical_speed(targetVerticalSpeed);
simControls.api_set_vertical_speed_hold(true);
simControls.notifyUser("🔼 Climbing", "We're increasing pitch. Watch how Cl and AoA respond.");

await waitForCondition(() => Math.abs(simData.api_vertical_speed - targetVerticalSpeed) < 500);
await waitFor(3000);
climbMetrics = await getLiftSnapshot();
await waitFor(5000);

// 🔽 Begin Descent
simControls.notifyUser("🔽 Descending", "Pitching down. Watch how Cl and AoA change.");
simControls.api_set_target_vertical_speed(-targetVerticalSpeed);
await waitForCondition(() => Math.abs(simData.api_vertical_speed + targetVerticalSpeed) < 500);
descentMetrics = await getLiftSnapshot();
await waitFor(5000);

// 🔁 Return to Level Flight
simControls.notifyUser("🔁 Returning to Level Flight", "Resetting vertical speed to 0.");
simControls.api_set_simulation_speed(10);
simControls.api_set_target_vertical_speed(0);
waitForCondition(() => Math.abs(simData.api_vertical_speed) < 1).then(() => simControls.api_set_simulation_speed(1));

const combinedTable = `
| **Metric**       | **Level Flight**       | **Climb**             | **Descent**           |
|-------------------|------------------------|------------------------|-----------------------|
| 🧭 **Pitch**      | ${levelMetrics.pitch}° | ${climbMetrics.pitch}° | ${descentMetrics.pitch}° |
| 🎯 **AoA**        | ${levelMetrics.aoa}°   | ${climbMetrics.aoa}°   | ${descentMetrics.aoa}°   |
| 💨 **Speed**      | ${levelMetrics.speed} knots | ${climbMetrics.speed} knots | ${descentMetrics.speed} knots |
| 🪂 **Cl**         | ${levelMetrics.cl}     | ${climbMetrics.cl}     | ${descentMetrics.cl}     |
`;


simControls.notifyUser(
  "🧠 Quiz Time!",
  "❓ What happens to lift (Cl) when pitch increases? When it decreases?\n" +
  "❓ How does this relate to angle of attack and airspeed?\n" +
  "💡 What's the difference between pitch angle and angle of attack (AoA)? Why do they differ?\n\n" +
  "📊 Use the table below to help explain:\n\n" +
  combinedTable
);
