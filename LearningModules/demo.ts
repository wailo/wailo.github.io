// 📜 Simulator Demo Script
simControls.api_set_simulation_reset();

// 📘 Demo Introduction
simControls.notifyUser(
    "📘 Simulator Demo",
    "🎬 Welcome to the simulator demo!\n\nIn this experience, we’ll demonstrate how a scripted lesson can control the simulator dynamically. " +
    "This includes: pausing/resuming, controlling time, setting autopilot, performing takeoff, and using intelligent wait conditions.\n\n" +
    "Sit back and watch the scenario unfold step-by-step!"
  );
  await waitFor(7000);
  
  // 🔊 Throttle Up & Takeoff Roll
  simControls.notifyUser("🛫 Starting Takeoff", "Let's begin with a takeoff roll by setting throttle to 100%.\n\nCommand:\n`simControls.api_set_engine_throttle_value(1)`");
  await waitFor(5000);
  simControls.api_set_engine_throttle_value(1);
  
  // 🧭 Enable Autopilot
  simControls.notifyUser("🧭 Enabling Autopilot", "We’ll now activate the autopilot to begin managing our climb.\n\nCommand:\n`simControls.api_set_autopilot(true)`");
  await waitFor(5000);
  simControls.api_set_autopilot(true);
  
  // 🔧 Configure Autopilot Settings (Grouped)
  simControls.notifyUser(
    "🔧 Configuring Autopilot Targets",
    "We’ll now set key autopilot parameters:\n• Target Speed: 280 KT\n• Target Altitude: FL330\n• Heading: 270°\n\n" +
    "These inputs reflect how lessons control the aircraft state.\n" +
    "Each setting is sent as an API call."
  );
  await waitFor(6000);
  
  simControls.api_set_target_speed(280);
  await waitFor(1000);
  simControls.api_set_target_altitude(33000);
  await waitFor(1000);
  simControls.api_set_target_heading_deg(270);
  await waitFor(1000);
  
  // 📈 Set Climb Rate
  simControls.notifyUser("📈 Climb Rate", "Now we define our climb performance by setting vertical speed to 3000 ft/min.\n\nCommand:\n`simControls.api_set_target_vertical_speed(3000)`");
  await waitFor(5000);
  simControls.api_set_target_vertical_speed(3000);
  
  // ⏳ Wait for Takeoff Conditions
  simControls.notifyUser(
    "⌛ Monitoring Takeoff Progress",
    "We'll wait for indicated airspeed to exceed 180 KT before continuing.\n\n" +
    "✅ This shows how wait conditions allow scripted lessons to flow automatically based on real aircraft data."
  );
//   await waitFor(6000);
  await waitForCondition(() => simData.api_ias_speed_knots > 180);
  
  // ✅ Lock in Controls
  simControls.notifyUser("✅ Engaging Autopilot Modes", "Now enabling vertical speed and speed hold modes.");
  await waitFor(1000);
  simControls.api_set_vertical_speed_hold(true);
  simControls.api_set_speed_hold(true);
  await waitFor(4000);
  
  // 🛬 Gear Up
  simControls.notifyUser("🛬 Gear Retraction", "At 300 ft, we’ll retract the landing gear.");
//   await waitFor(5000);
  await waitForCondition(() => simData.api_altitude > 300);
  simControls.notifyUser("🛬 Gear Retraction", "Crossed 300 ft, Retacting landing gear");
  simControls.api_set_landing_gear_position(simControls.GearSelector.UP.value);
  await waitFor(3000);
  
  // 📐 Heading Hold Activation
  simControls.notifyUser("🧭 Heading Hold", "At 1000 ft, we’ll activate heading hold for a stable flight path.");
//   await waitFor(5000);
  await waitForCondition(() => simData.api_altitude > 1000);
  simControls.notifyUser("🧭 Heading Hold", "Crossed 1000 ft, activating heading hold.");
  simControls.api_set_heading_hold(true);
  await waitFor(5000);
  
  // ⏩ Accelerate Simulation
  simControls.notifyUser(
    "⏩ Speeding Up Simulation",
    "To fast-forward the climb phase, we’ll double the simulation speed.\n\n" +
    "⏱️ Speed control is great for skipping uninteresting segments during a lesson."
  );
  await waitFor(6000);
  simControls.api_set_simulation_speed(2);
  
  // 🕐 Wait for Climb Stabilization
  simControls.notifyUser(
    "⌛ Monitoring Stable Climb",
    "We'll now wait for altitude > 3000 ft and confirm heading 270°.\n\n" +
    "🧠 These conditions help automate lessons with precise control over when steps occur."
  );
  await waitFor(6000);
  await waitForCondition(() => simData.api_altitude > 3000 && simData.api_heading_deg === 270);
  
  // 🛑 Lock Altitude
  simControls.notifyUser("🛑 Switching to Altitude Hold", "Disabling vertical speed and engaging altitude hold.");
  await waitFor(1000);
  simControls.api_set_vertical_speed_hold(false);
  simControls.api_set_altitude_hold(true);
  await waitFor(4000);
  
  // 🚀 Fast-Forward to Cruise
  simControls.notifyUser(
    "🚀 Accelerating to Cruise Altitude",
    "Let’s jump ahead quickly to cruise using 100x simulation speed.\n\n" +
    "`simControls.api_set_simulation_speed(100)`"
  );
  await waitFor(6000);
  simControls.api_set_simulation_speed(100);
  
  // ⏳ Wait for Cruise
  simControls.notifyUser("⏳ Climbing to FL330", "Waiting for aircraft to reach 33,000 ft...");
  await waitForCondition(() => simData.api_altitude > 33000);
  simControls.notifyUser("⏳ Climbing to FL330", "Reacehd to 33,000 ft");
  await waitFor(6000);
  
  // ⏱️ Return to Normal Speed
  simControls.notifyUser("⏱️ Back to Normal Time", "Returning simulation speed to real-time.\n\nCommand:\n`simControls.api_set_simulation_speed(1)`");
  await waitFor(5000);
  simControls.api_set_simulation_speed(1);
  
  // 🔁 Reset Simulation (Now Visible)
  simControls.notifyUser("🔁 Full Reset", "Let’s now show how to completely reset the simulation state.\n\nCommand:\n`simControls.api_set_simulation_reset()`");
  await waitFor(5000);
  simControls.api_set_simulation_reset();
  
  // ✅ Wrap-up
  simControls.notifyUser(
    "✅ Demo Complete!",
    "🎉 That’s a wrap on the simulator demo!\n\nYou’ve just seen how powerful and flexible the scripting engine is:\n" +
    "• Full autopilot control\n• Smart timing with conditions\n• Simulation speed adjustments\n• Takeoff and climb procedures\n\n" +
    "💡 Use these tools to build engaging, automated training lessons.\n\n🛫 Ready for your next mission?"
  );
  