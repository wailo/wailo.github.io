// 📘 Configurations
const initialAltitude_ft = 4000;
const initialSpeed_knots = 210;
const initialHeading_deg = 0;

const flapStages = [
  { angle: 0, label: "Flaps Up (Clean)", pause: true },
  { angle: 10, label: "Flaps 10°", pause: true },
  { angle: 20, label: "Flaps 20°", pause: true },
  { angle: 30, label: "Flaps Full", pause: true },
];

// 📘 Step 1: Introduction
simControls.notifyUser("📘 Flap Effect", "Observe how changing flap settings affects airspeed, lift, and drag.");
await waitFor(4000);

await reposition_with_autopilot(initialAltitude_ft, initialSpeed_knots, initialHeading_deg);
await waitFor(2000);

// 📘 Step 2: Enable Key Visuals
displayData.api_altitude.visible = true;
displayData.api_ias_speed_knots.visible = true;
displayData.api_flaps_selector_position_name.visible = true;
displayData.api_lift.visible = true;
displayData.api_drag.visible = true;
displayData.api_thrust.visible = true;
displayData.api_aoa_deg.visible = true;
await waitFor(500);

// 📘 Step 3: Iterate Through Flap Stages
for (const stage of flapStages) {
  simControls.notifyUser(`🔧 ${stage.label}`, `Deploying flaps to ${stage.angle}°...`);
  simControls.api_set_flaps_selector_position(stage.angle);
  await waitFor(3000);

  simControls.notifyUser(
    "📊 Observe Changes",
    `Flap: ${stage.angle}°\nLook at airspeed, lift, drag, and AoA.\nHow did the aircraft pitch and speed change?`
  );

  if (stage.pause) {
    await waitFor(7000);
  }
}

// 📘 Step 4: Engagement Pause
simControls.notifyUser(
  "🤔 Think About It",
  "Why does increasing flap angle increase lift **and** drag?\nWhat happens to stall speed?"
);
await waitFor(8000);

// 📘 Step 5: Summarize Behavior
simControls.notifyUser(
  "📋 Summary Table",
  "Here's how different flap settings affect performance:\n\n" +
  "0°  ➤ High stall speed, low drag\n" +
  "10° ➤ Increased lift, moderate drag\n" +
  "20° ➤ Lower stall speed, high drag\n" +
  "30° ➤ Max lift & drag, nose pitch up\n"
);
await waitFor(8000);

// 📘 Step 6: Replay or Instructor Wrap-Up
simControls.notifyUser(
  "🔁 Replay or Discuss",
  "Instructor may replay this sequence or use paused frames for discussion.\nYou can also run this demo again later."
);
await waitFor(4000);

// 📘 Step 7: Cleanup and Re-engage Autopilot
simControls.api_set_flaps_selector_position(0);
await waitFor(1000);

simControls.api_set_autopilot(true);
simControls.api_set_altitude_hold(true);
simControls.api_set_speed_hold(true);
simControls.api_set_heading_hold(true);

simControls.notifyUser(
  "🛑 Module Complete",
  "You’ve completed the Flap Effects demonstration.\nThis module can be repeated anytime from the main panel."
);

