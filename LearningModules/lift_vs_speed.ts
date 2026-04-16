import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  // const simProps = context.props;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const waitForCondition = context.waitForCondition;  
  // const dataView = context.dataView;
  // const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  // const checkPoint = context.checkPoint;

// 📘 Lesson 2: Increase Airspeed and Observe Lift Changes
notifyUser(
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
    const cl = simControls.flightModel.cl.toFixed(3);
    const aoa = simControls.flightModel.aoa_deg.toFixed(1);
    const pitch = simControls.flightModel.pitch_deg.toFixed(1);
    const speed = simControls.flightModel.speed_indicated_knots.toFixed(1);
    const snapshot = `💨 Speed: ${speed} knots\n🧭 Pitch: ${pitch}°\n🎯 AoA: ${aoa}°\n🪂 Cl: ${cl}`;
  
    notifyUser("📊 Airspeed Snapshot", snapshot);
    simControls.simulation.set_simulation_pause(true);
    await waitFor(1000);
    notifyUser("📊 Snapshot Paused", `${snapshot}\n\n⏸ Review the values. Resume when ready.`);
    await waitForCondition(() => simControls.simulation.simulation_pause === false);
  
    return snapshot;
  };
  
  // 🔁 Setup: reset and position at 6000 ft and 230 knots
  dataDisplayReset();
  await repositionWithAutopilot(context, 6000, 230, 90);
  simControls.flightModel.set_autopilot_master_switch(true);
  
  // 🛫 Initial Setup
  simControls.flightModel.set_autopilot_altitude_hold(true);
  simControls.flightModel.set_autopilot_speed_indicated_hold(true);
  simControls.simulation.set_simulation_speed(1);
  notifyUser("🛫 Level Flight", "Holding level flight at 230 knots and 6000 ft.");
  normalSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 🐢 Reduce speed to 170 knots
  notifyUser("🐢 Slowing Down", "Reducing speed to 170 knots. Watch how AoA changes.");
  simControls.flightModel.set_autopilot_speed_indicated_target(170);
  simControls.simulation.set_simulation_speed(4);
  await waitForCondition(() => Math.abs(simControls.flightModel.speed_indicated_knots - 170) < 0.5);
  simControls.simulation.set_simulation_speed(1);
  lowSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 💨 Increase speed to 290 knots
  notifyUser("💨 Speeding Up", "Now increasing speed to 290 knots. Observe the AoA and Cl.");
  simControls.flightModel.set_autopilot_speed_indicated_target(290);
  simControls.simulation.set_simulation_speed(4);
  await waitForCondition(() => Math.abs(simControls.flightModel.speed_indicated_knots - 290) < 0.5);
  simControls.simulation.set_simulation_speed(1);
  highSpeedSnapshot = await getAirspeedLiftSnapshot();
  await waitFor(2000);
  
  // 🧠 Quiz Time
  notifyUser(
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

  
}
