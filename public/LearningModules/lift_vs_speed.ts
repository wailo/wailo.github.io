// 📘 Lesson 2: Increase Airspeed and Observe Lift Changes
simControls.notifyUser(
    "📘 Lesson: Airspeed Effects on Lift",
    "💨 In this lesson, we'll observe how lift (Cl) and angle of attack (AoA) change with airspeed.\n\n" +
    "📌 The autopilot will maintain altitude, and we'll adjust airspeed across a range.\n" +
    "🎯 Watch how the aircraft compensates to maintain level flight.\n\n" +
    "▶️ Click resume to begin."
  );
  
  // 📊 Snapshot Storage
  let normalSpeedSnapshot, lowSpeedSnapshot, highSpeedSnapshot;
  
  // Snapshot function
  const getAirspeedLiftSnapshot = async () => {
    const cl = simData.api_cl.toFixed(3);
    const aoa = simData.api_aoa_deg.toFixed(1);
    const pitch = simData.api_pitch_deg.toFixed(1);
    const speed = simData.api_ias_speed_knots.toFixed(1);
    const snapshot = `💨 Speed: ${speed} knots\n🧭 Pitch: ${pitch}°\n🎯 AoA: ${aoa}°\n🪂 Cl: ${cl}`;
  
    simControls.notifyUser("📊 Airspeed Snapshot", snapshot);
    simControls.api_set_simulation_pause(true);
    await waitFor(1000);
    simControls.notifyUser("📊 Snapshot Paused", `${snapshot}\n\n⏸ Review the values. Resume when ready.`);
    await waitForCondition(() => simData.api_simulation_pause === false);
  
    return snapshot;
  };
  
  // 🔁 Setup: reset and position at 6000 ft and 230 knots
  simControls.api_set_simulation_reset();
  simControls.api_set_simulation_speed(100);
  await reposition_with_autopilot(6000, 230, 90);
  
  // 🛫 Initial Setup
  simControls.api_set_altitude_hold(true);
  simControls.api_set_speed_hold(true);
  simControls.api_set_simulation_speed(1);
  simControls.notifyUser("🛫 Level Flight", "Holding level flight at 230 knots and 6000 ft.");
  normalSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 🐢 Reduce speed to 170 knots
  simControls.notifyUser("🐢 Slowing Down", "Reducing speed to 170 knots. Watch how AoA changes.");
  simControls.api_set_target_speed(170);
  simControls.api_set_simulation_speed(4);
  await waitForCondition(() => Math.abs(simData.api_ias_speed_knots - 170) < 0.5);
  simControls.api_set_simulation_speed(1);
  lowSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 💨 Increase speed to 290 knots
  simControls.notifyUser("💨 Speeding Up", "Now increasing speed to 290 knots. Observe the AoA and Cl.");
  simControls.api_set_target_speed(290);
  simControls.api_set_simulation_speed(4);
  await waitForCondition(() => Math.abs(simData.api_ias_speed_knots - 290) < 0.5);
  simControls.api_set_simulation_speed(1);
  highSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 🧠 Quiz Time
  simControls.notifyUser(
    "🧠 Quiz Time!",
    "❓ How did angle of attack change as speed decreased?\n" +
    "❓ What about as speed increased?\n" +
    "💡 Why does the aircraft adjust AoA to maintain altitude when speed changes?\n" +
    "📘 Consider how lift (Cl) is affected by airspeed and AoA.\n\n" +
    "📊 Review your snapshots:\n\n" +
    `📊 Normal Speed (230 knots):\n${normalSpeedSnapshot}\n\n` +
    `📊 Low Speed (170 knots):\n${lowSpeedSnapshot}\n\n` +
    `📊 High Speed (290 knots):\n${highSpeedSnapshot}\n\n`
  );

  