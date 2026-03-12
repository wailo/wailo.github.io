import {repositionWithAutopilot, simControls, simProps, waitFor, waitForCondition, dataView, dataDisplayReset, notifyUser } from "./core"
dataDisplayReset();
simControls.simulation.set_simulation_pause(true);
await waitFor(1000);

// 📘 Introduction
notifyUser(
  "📘 Lesson: Effect of Altitude on Lift",
  "🪂 In this lesson, we'll observe how lift changes with altitude, while maintaining constant Mach number.\n\n" +
    "✈️ Autopilot will maintain altitude and Mach.\n" +
    "We'll reposition to three different altitudes and take snapshots.\n\n" +
    "👀 Watch how lift coefficient (Cl) changes, even though speed (Mach) remains constant.\n" +
    "⏱ After each observation, the simulation will pause.\n▶️ Click resume when you're ready to continue.",
);
await waitForCondition(() => simControls.simulation.simulation_pause === false);

const cl = simControls.fm.cl.toFixed(3);
const aoa = simControls.fm.aoa_deg.toFixed(1);
const pitch = simControls.fm.pitch_deg.toFixed(1);
const speed = simControls.fm.speed_true_knots.toFixed(1);
const mach = simControls.fm.speed_mach.toFixed(2);
const altitude = simControls.fm.altitude_ft.toFixed(0);

// 📊 Snapshot Storage
let lowAltSnapshot, midAltSnapshot, highAltSnapshot;

// Function to capture and return snapshot
const getAltitudeLiftSnapshot = async () => {
  const cl = simControls.fm.cl.toFixed(3);
  const aoa = simControls.fm.aoa_deg.toFixed(1);
  const pitch = simControls.fm.pitch_deg.toFixed(1);
  const speed = simControls.fm.speed_true_knots.toFixed(1);
  const mach = simControls.fm.speed_mach.toFixed(2);
  const altitude = simControls.fm.altitude_ft.toFixed(0);

  const snapshot = `📍 Altitude: ${altitude} ft\n🧭 Pitch: ${pitch}°\n🎯 AoA: ${aoa}°\n💨 TAS: ${speed} knots\n⚖️ Mach: ${mach}\n🪂 Cl: ${cl}`;
  notifyUser("📊 Altitude Snapshot", snapshot);

  simControls.simulation.set_simulation_pause(true);
  await waitFor(1000);
  notifyUser(
    "📊 Altitude Snapshot",
    `${snapshot}\n\n⏸ Paused: Review the values above. Resume to continue.`,
  );
  await waitForCondition(() => simControls.simulation.simulation_pause === false);

  return snapshot;
};

// Function to stabilize at target altitude and Mach
async function stabilizeAtAltitude(targetAltitude : number, targetMach: number) {
  simControls.fm.set_autopilot_master_switch(true);
  simControls.fm.set_autopilot_altitude_target(targetAltitude);
  simControls.fm.set_autopilot_speed_mach_target(targetMach);
  simControls.fm.set_autopilot_speed_mach_hold(true);
  simControls.fm.set_autopilot_altitude_hold(true);
  await waitFor(2000);
  simControls.simulation.set_simulation_speed(100);

  await waitForCondition(
    () =>
      Math.abs(simControls.fm.speed_mach - targetMach) < 0.001 &&
      Math.abs(simControls.fm.altitude_ft - targetAltitude) < 50,
  );

  simControls.simulation.set_simulation_speed(1);
  await waitFor(2000);
}

// ⚙️ Configuration
let targetMach = 0.6;
// Reposition and start
await repositionWithAutopilot(simControls.fm, 10000, 330, 90);


// Watch key data. Altitude, mach, speed, Pitch Angle, Angle of Attack (AoA), lift coefficient (Cl)
notifyUser("Watching Key Data", "Watching key data: Altitude, Mach, Speed, Pitch Angle, AoA, Cl");
await waitFor(3000);
dataView(simProps.altitude, true);
await waitFor(1000);
dataView(simProps.pitch_deg, true);
await waitFor(1000);
dataView(simProps.ias_speed_knots, true);
await waitFor(1000);
dataView(simProps.mach, true);
await waitFor(1000);
dataView(simProps.aoa_deg, true);
await waitFor(1000);
dataView(simProps.cl, true);


// 🛬 Low Altitude Snapshot
await stabilizeAtAltitude(10000, targetMach);

lowAltSnapshot = await getAltitudeLiftSnapshot();
await waitFor(2000);

// ✈️ Mid Altitude Snapshot
await stabilizeAtAltitude(20000, targetMach);
midAltSnapshot = await getAltitudeLiftSnapshot();
await waitFor(2000);

// 🛫 High Altitude Snapshot
await stabilizeAtAltitude(30000, targetMach);
highAltSnapshot = await getAltitudeLiftSnapshot();
await waitFor(2000);

// 🧠 Quiz
notifyUser(
  "🧠 Quiz Time!",
  "❓ How did Cl (Lift Coefficient) change with altitude?\n" +
    "❓ Did AoA or pitch change noticeably?\n" +
    "💡 Why does Cl decrease even though Mach is constant?\n\n" +
    "📊 Review the snapshots below to help you answer:\n\n" +
    `📊 Low Altitude\n${lowAltSnapshot}\n\n` +
    `📊 Mid Altitude\n${midAltSnapshot}\n\n` +
    `📊 High Altitude\n${highAltSnapshot}\n\n`,
);
