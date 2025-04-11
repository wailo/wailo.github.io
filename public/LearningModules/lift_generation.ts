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
let levelSnapshot, climbSnapshot, descentSnapshot;

// Snapshot function
const getLiftSnapshot = async () => {
  const cl = simData.api_cl.toFixed(3);
  const pitch = simData.api_pitch_deg.toFixed(1);
  const aoa = simData.api_aoa_deg.toFixed(1);
  const speed = simData.api_ias_speed_knots.toFixed(1);
  const snapshot = `🧭 Pitch: ${pitch}°\n🎯 AoA: ${aoa}°\n💨 Speed: ${speed} knots\n🪂 Cl: ${cl}`;

  simControls.notifyUser("📊 Lift Snapshot", snapshot);
  simControls.api_set_simulation_pause(true);
  await waitFor(1000);
  simControls.notifyUser("📊 Lift Snapshot", `${snapshot}\n\n⏸ Paused: Review the data. Resume to continue.`);
  await waitForCondition(() => simData.api_simulation_pause === false);

  return snapshot;
};

// 🔁 Setup: Reset and reposition at 15,000 ft and 250 knots
const targetVerticalSpeed = 3000; // feet per minute

simControls.api_set_simulation_reset();
simControls.api_set_simulation_speed(100);
await reposition_with_autopilot(15000, 250, 90);

// 🛫 Level Flight
simControls.api_set_simulation_speed(10);
simControls.notifyUser("🛫 Level Flight", "We are now stabilized in straight and level flight.\nObserve Cl, pitch, and AoA.");
simControls.api_set_simulation_speed(1);
levelSnapshot = await getLiftSnapshot();
await waitFor(2000);

// 🔼 Begin Climb
simControls.api_set_altitude_hold(false);
simControls.api_set_target_vertical_speed(targetVerticalSpeed);
simControls.api_set_vertical_speed_hold(true);
simControls.notifyUser("🔼 Climbing", "We're increasing pitch. Watch how Cl and AoA respond.");

await waitForCondition(() => Math.abs(simData.api_vertical_speed - targetVerticalSpeed) < 500);
await waitFor(3000);
climbSnapshot = await getLiftSnapshot();
await waitFor(2000);

// 🔁 Return to Level Flight
simControls.notifyUser("🔁 Returning to Level Flight", "Resetting vertical speed to 0.");
simControls.api_set_target_vertical_speed(0);
await waitForCondition(() => Math.abs(simData.api_vertical_speed) < 50);
await waitFor(3000);

// 🔽 Begin Descent
simControls.notifyUser("🔽 Descending", "Pitching down. Watch how Cl and AoA change.");
simControls.api_set_target_vertical_speed(-targetVerticalSpeed);
await waitForCondition(() => Math.abs(simData.api_vertical_speed + targetVerticalSpeed) < 500);
descentSnapshot = await getLiftSnapshot();
await waitFor(2000);

// 🔁 Return to Level Flight
simControls.notifyUser("🔁 Returning to Level Flight", "Resetting vertical speed to 0.");
simControls.api_set_simulation_speed(10);
simControls.api_set_target_vertical_speed(0);
await waitForCondition(() => Math.abs(simData.api_vertical_speed) < 50);
await waitFor(3000);

// 🧠 Quiz Time
simControls.notifyUser(
  "🧠 Quiz Time!",
  "❓ What happens to lift (Cl) when pitch increases? When it decreases?\n" +
  "❓ How does this relate to angle of attack and airspeed?\n" +
  "💡 What's the difference between pitch angle and angle of attack (AoA)? Why do they differ?\n\n" +
  "📊 Use the snapshots below to help explain:\n\n" +
  `📊 Level Flight:\n${levelSnapshot}\n\n` +
  `📊 Climb:\n${climbSnapshot}\n\n` +
  `📊 Descent:\n${descentSnapshot}\n\n`
);
