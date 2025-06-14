import {repositionWithAutopilot, simControls, simData, simProps, waitFor, waitForCondition, dataView, dataDisplayReset, notifyUser } from "./core"
dataDisplayReset();
simControls.api_set_simulation_pause(true);
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
await waitForCondition(() => simData.api_simulation_pause === false);

const cl = simData.api_cl.toFixed(3);
const aoa = simData.api_aoa_deg.toFixed(1);
const pitch = simData.api_pitch_deg.toFixed(1);
const speed = simData.api_true_speed_knots.toFixed(1);
const mach = simData.api_mach.toFixed(2);
const altitude = simData.api_altitude.toFixed(0);

// 📊 Snapshot Storage
let lowAltSnapshot, midAltSnapshot, highAltSnapshot;

// Function to capture and return snapshot
const getAltitudeLiftSnapshot = async () => {
  const cl = simData.api_cl.toFixed(3);
  const aoa = simData.api_aoa_deg.toFixed(1);
  const pitch = simData.api_pitch_deg.toFixed(1);
  const speed = simData.api_true_speed_knots.toFixed(1);
  const mach = simData.api_mach.toFixed(2);
  const altitude = simData.api_altitude.toFixed(0);

  const snapshot = `📍 Altitude: ${altitude} ft\n🧭 Pitch: ${pitch}°\n🎯 AoA: ${aoa}°\n💨 TAS: ${speed} knots\n⚖️ Mach: ${mach}\n🪂 Cl: ${cl}`;
  notifyUser("📊 Altitude Snapshot", snapshot);

  simControls.api_set_simulation_pause(true);
  await waitFor(1000);
  notifyUser(
    "📊 Altitude Snapshot",
    `${snapshot}\n\n⏸ Paused: Review the values above. Resume to continue.`,
  );
  await waitForCondition(() => simData.api_simulation_pause === false);

  return snapshot;
};

// Function to stabilize at target altitude and Mach
async function stabilizeAtAltitude(targetAltitude, targetMach) {
  simControls.api_set_autopilot(true);
  simControls.api_set_autopilot_altitude_target(targetAltitude);
  simControls.api_set_autopilot_mach_speed_target(targetMach);
  simControls.api_set_autopilot_mach_speed_hold(true);
  simControls.api_set_autopilot_altitude_hold(true);
  await waitFor(2000);
  simControls.api_set_simulation_speed(100);

  await waitForCondition(
    () =>
      Math.abs(simData.api_mach - targetMach) < 0.001 &&
      Math.abs(simData.api_altitude - targetAltitude) < 50,
  );

  simControls.api_set_simulation_speed(1);
  await waitFor(2000);
}

// ⚙️ Configuration
let targetMach = 0.6;
// Reposition and start
await repositionWithAutopilot(10000, 330, 90);


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
