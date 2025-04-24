// 📜 Simulator Demo Script
simControls.api_set_simulation_reset();

// 📘 Demo Introduction
simControls.notifyUser(
    "📘 Simulator Demo",
    "🎬 This is a demo!\n\nIn this lesson, we’ll demonstrate how a scripted lesson can control the simulator dynamically. " +
    "This includes: pausing/resuming, controlling time, setting autopilot, performing takeoff, and using logical condition to control the execution of the lesson.\n\n" +
    "The simulation will start soon"
  );
  await waitFor(5000);


  // 🔊 Throttle Up & Takeoff Roll
  simControls.notifyUser("🛫 Starting Takeoff", "Begin takeoff roll by setting throttle to 90%.\n\nCommand:\n`simControls.api_set_engine_throttle_value(90)`");
  await waitFor(2000);
  simControls.api_set_engine_throttle_value(0.90);
  
  // Watch key data. Altitude, mach, speed, Pitch Angle, Angle of Attack (AoA), lift coefficient (Cl)
  simControls.notifyUser("Viewing live data", "Altitude, Speeds, Pitch Angle, Bank Angle, elevator position, and AoA are displayed on the screen.\n\n");
  await waitFor(2000);
  displayData.api_altitude.visible = true;
  await waitFor(300);
  displayData.api_ias_speed_knots.visible = true;
  await waitFor(300);
  displayData.api_true_speed_knots.visible = true;
  await waitFor(300);
  displayData.api_mach.visible = true;
  await waitFor(300);
  displayData.api_pitch_deg.visible = true;
  await waitFor(300);
  displayData.api_bank_deg.visible = true;
  await waitFor(300);
  displayData.api_aoa_deg.visible = true;
  await waitFor(300);
  displayData.api_alpha_tail.visible = true;
  await waitFor(300);
  displayData.api_throttle.visible = true;


  // 🧭 Enable Autopilot
simControls.notifyUser("🔧 Enabling Autopilot", "We’ll now activate and configure the autopilot to begin managing the climb.\n\nCommand:\n`simControls.api_set_autopilot(true)`\n\n" +
  "Set key autopilot parameters:\n• Target Speed: 280 KT\n• Target Altitude: FL180\n• Vertical Speed: 2500 ft/min\n• Heading: 270°\n\n" +
  "These inputs reflect how lessons control the aircraft state.\n" +
    "Each setting is sent as an API call.");
  await waitFor(2000);
  simControls.api_set_autopilot(true);
  await waitFor(300);
  simControls.api_set_target_speed(180);
  await waitFor(300);
  simControls.api_set_target_altitude(18000);
  await waitFor(300);
  simControls.api_set_target_heading_deg(270);
  await waitFor(300);
  simControls.api_set_target_vertical_speed(2500);
  await waitFor(300);
  simControls.api_set_target_pitch_deg(12);
  
  // ⏳ Wait for Takeoff Conditions
  simControls.notifyUser(
    "⌛ Monitoring Takeoff Progress",
    "We'll wait for indicated airspeed to exceed 150 KT before continuing.\n\n" +
    "✅ This shows how wait conditions allow scripted lessons to flow automatically based on real aircraft data."
  );
//   await waitFor(6000);
  await waitForCondition(() => simData.api_ias_speed_knots >= 150);
  
  // ✅ Lock in Controls
  simControls.notifyUser("✅ Engaging Autopilot Modes", "Now enabling pitch angle and speed hold modes.");
  await waitFor(1000);
  simControls.api_set_elevator_position(-0.25)
  simControls.api_set_speed_hold(true);
  await waitFor(3000);
  
  // 🛬 Gear Up
  simControls.notifyUser("🛬 Gear Retraction", "Monitoring positibe climb rate, once confirmed, landing gear will be retracted.");
//   await waitFor(5000);
await waitForCondition(() => simData.api_vertical_speed > 400, 3000); 
  // await waitForCondition(() => simData.api_altitude > 200);
  simControls.notifyUser("🛬 Gear Retraction", "Positive climb rate, retacting landing gear and increasing speed.");
   simControls.api_set_pitch_hold(true);
  simControls.api_set_landing_gear_selector_position(simControls.GearSelector.UP);
  simControls.api_set_target_speed(210);
  await waitFor(3000);
  
  // 📐 Heading Hold Activation
  simControls.notifyUser("🧭 Waiting to cross 1000 ft", "At 1000 ft, heading hold will be activated.");
  await waitForCondition(() => simData.api_altitude > 1000);
  simControls.notifyUser("🧭 Heading Hold", "Crossed 1000 ft, activating heading hold, vertical speed hold");

  simControls.api_set_pitch_hold(false);
  simControls.api_set_vertical_speed_hold(true);
  simControls.api_set_heading_hold(true);
  await waitFor(5000);
  
  // 🕐 Wait for Climb Stabilization
  simControls.notifyUser(
    "⌛ Monitoring Stable Climb",
    "Waiting for altitude > 3000 ft and confirm heading 270°.\n\n" +
    "To fast-forward the climb phase, the simulation speed will be set to 2x, thats mean the simulation is moving 2 times faster.\n\n" +
    "⏱️ Speed control is great for skipping uninteresting segments during a lesson to keep engagement high.\n\n" +
    "Command:\n`simControls.api_set_simulation_speed(2)`"
  );
    await waitFor(2000);
    simControls.api_set_simulation_speed(2);
  
  await waitForCondition(() => simData.api_altitude >= 3000 && simData.api_heading_deg === 270);
  
  // 🛑 Lock Altitude
  simControls.notifyUser("🛑 Switching to Altitude Hold", "Disabling pitch hold and engaging altitude hold, set target speed to 250");
  await waitFor(1000);
  simControls.api_set_vertical_speed_hold(false);
  simControls.api_set_altitude_hold(true);
  simControls.api_set_target_speed(250);
  await waitFor(4000);
  
  
  // 🚀 Fast-Forward to Cruise
  simControls.notifyUser(
    "🚀 Accelerating to Cruise Altitude",
    "Let’s jump ahead quickly to cruise using 100x simulation speed.\n\n" +
    "`simControls.api_set_simulation_speed(100)`"
  );
  await waitFor(5000);
  simControls.api_set_simulation_speed(100);
  
  // ⏳ Wait for Cruise
  simControls.notifyUser("⏳ Climbing to FL180", "Waiting for aircraft to reach 18,000 ft...");
  await waitForCondition(() => simData.api_altitude >= 18000);
  simControls.notifyUser("⏳ Climbing to FL180", "Reacehd to 18,000 ft");
  await waitFor(5000);
  
  // ⏱️ Return to Normal Simulation Speed
  simControls.notifyUser("⏱️ Back to Normal Simulation speed", "Returning simulation speed to real-time.\n\nCommand:\n`simControls.api_set_simulation_speed(1)`");
  await waitFor(3000);
  simControls.api_set_simulation_speed(1);
  simControls.api_set_autopilot(false);
  
  
  // ✅ Wrap-up
  simControls.notifyUser(
    "✅ Demo Complete!",
    "We have just demonstrated the following capabilities:\n" +
    "• Full autopilot control\n• Smart timing with conditions\n• Simulation speed adjustments\n• Takeoff and climb procedures\n\n" +
    "💡 There more tools ls to build engaging, automated training lessons." + 
    "\n\nYou may now try to fly the simulator, using ASDW or arrow keys to control the aircraft.\n\n"
  );
  
