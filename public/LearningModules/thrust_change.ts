import {repositionWithAutopilot, simControls, waitFor, dataDisplayReset, notifyUser} from "./core"
// =========================
// 📘 Introduction
// =========================
notifyUser(
    "📘 Lesson: Thrust and Aircraft Response",
    "✈️ In this lesson, you will learn how changes in engine thrust affect the aircraft's speed and pitch.\n\n" +
    "🎯 Objectives:\n" +
    "• Stabilize the aircraft in level flight\n" +
    "• 🔼 Increase and 🔽 reduce thrust manually\n" +
    "• 👀 Observe resulting changes in speed and pitch\n\n" +
    "📢 Watch carefully, as you'll be asked questions at the end!"
  );
  
  dataDisplayReset();

  const flightModel = simControls.simulation.set_flight_model_b747()

  // ✈️ Reposition and stabilize at level flight
  await repositionWithAutopilot(flightModel, 10000, 280, 270);
  notifyUser("⚙️ Thrust Adjustment", "We will now increase and reduce thrust to observe effects.");
  
  // 🧪 Capture initial cruise throttle setting
  const initialThrottle = flightModel.engine_throttle_position;
  
  // 🔓 Disable autopilot controls to allow natural response to thrust changes
  flightModel.set_autopilot_speed_indicated_hold(false);
  flightModel.set_autopilot_altitude_hold(false);
  
  // ⏳ Wait briefly before adjustments
  await waitFor(2000);
  
  // 🧭 Helper to show current speed and pitch
  const notifyFlightData = () => {
    const speed = flightModel.speed_indicated_knots.toFixed(1);
    const pitch = flightModel.pitch_deg.toFixed(1);
    notifyUser("📈 Live Data", `💨 Speed: ${speed} knots\n🧭 Pitch: ${pitch}°`);
  };
  
  // 🔼 Increase thrust to max
  flightModel.set_engine_throttle_position(1);
  notifyUser("🔼 Increasing Thrust", "Throttle set to maximum. Observe speed and pitch.");
  for (let i = 0; i < 5; i++) {
    await waitFor(2000);
    notifyFlightData();
  }
  
  // 🔽 Reduce thrust to idle
  flightModel.set_engine_throttle_position(0);
  notifyUser("🔽 Reducing Thrust", "Throttle set to idle. Observe descent or deceleration.");
  for (let i = 0; i < 5; i++) {
    await waitFor(2000);
    notifyFlightData();
  }
  
  // 🔁 Restore original cruise throttle
  notifyUser("🔁 Cruise Thrust Restored", `Throttle reset to initial value (${(initialThrottle * 100).toFixed(0)}%). Aircraft will stabilize.`);
  flightModel.set_engine_throttle_position(initialThrottle);
  
  // =========================
  // 🧠 Post-Lesson Assessment
  // =========================
  
  // ❓ Question 1
  await waitFor(2000);
  notifyUser(
    "🧠 Assessment - Q1",
    "📊 What happened to the aircraft's pitch and speed when thrust was increased?\n" +
    "A. Pitch increased, speed increased\n" +
    "B. Pitch decreased, speed decreased\n" +
    "C. No change\n" +
    "D. Pitch increased, speed decreased"
  );
  
  // ❓ Question 2
  await waitFor(8000);
  notifyUser(
    "🧠 Assessment - Q2",
    "🧪 What happened when the throttle was reduced to idle?\n" +
    "A. Aircraft maintained altitude\n" +
    "B. Aircraft accelerated\n" +
    "C. Aircraft pitched down and slowed\n" +
    "D. Aircraft climbed"
  );
  
  // ❓ Question 3
  await waitFor(8000);
  notifyUser(
    "🧠 Assessment - Q3",
    "⚙️ Why did we disable speed and altitude hold before changing throttle?\n" +
    "A. They would override the throttle setting\n" +
    "B. They only work during landing\n" +
    "C. They reduce drag\n" +
    "D. No reason, it was just a demo"
  );
  
  // ❓ Question 4
  await waitFor(8000);
  notifyUser(
    "🧠 Assessment - Q4",
    "📈 How does increased thrust affect flight in level attitude?\n" +
    "A. Increases speed and possibly causes climb\n" +
    "B. Reduces lift\n" +
    "C. Has no effect on pitch\n" +
    "D. Increases drag and makes aircraft sink"
  );
  
