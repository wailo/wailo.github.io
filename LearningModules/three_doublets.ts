import { ScriptContext } from "../../src/core";

// Define types for better type safety
interface FlightSnapshot {
  ALT: number;
  SPD: number;
  VSP: number;
  THETA: number;
  PHI: number;
  PSI: number;
  BETA: number;
}

function computeStats(values: number[]) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;

  const std = Math.sqrt(variance);

  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, std, min, max };
}

// Tolerances
const tolerances: Record<keyof FlightSnapshot, number> = {
  ALT: 2, // ft
  SPD: 0.5, // knots
  VSP: 1, // m/s
  THETA: 0.01, // rad
  PHI: 0.01, // rad
  PSI: 0.01, // rad
  BETA: 0.01, // rad
};

// Units for display
const units: Record<keyof FlightSnapshot, string> = {
  ALT: "ft",
  SPD: "kt",
  VSP: "m/s",
  THETA: "rad",
  PHI: "rad",
  PSI: "rad",
  BETA: "rad",
};

export async function main(context: ScriptContext) {
  const {
    controls: simControls,
    props: simProps,
    repositionWithAutopilot,
    waitFor,
    notifyUser,
    dataDisplayReset,
    plotView,
    metrics,
  } = context;

  const simulation = simControls.simulation;

  dataDisplayReset();
  plotView(simProps.aileron_position, true);
  plotView(simProps.rudder_position, true);
  plotView(simProps.elevator_position, true);

  // Configure Aircraft Model
  simControls.simulation.set_flight_model_b747();
  const flightModel = simControls.flightModel;

  const target_altitude = Math.floor(Math.random() * 38500) + 1500;
  const target_speed = Math.floor(Math.random() * 120) + 180;
  const target_heading = Math.floor(Math.random() * 359);
  const waitTimeSeconds = Math.floor(Math.random() * 4) + 1;
  const simulationSpeed = Math.floor(Math.random() * 2) + 0.5;
  const testCounts = 3;
  const results: FlightSnapshot[] = [];

  // Print all the target values
  for (let i = 0; i < testCounts; ++i) {
    notifyUser(
      `Test ${i + 1} of ${testCounts}`,
      `🎯 Target Altitude: ${target_altitude.toLocaleString()} ft\n` +
        `🎯 Target Speed: ${target_speed} knots\n` +
        `🎯 Target Heading: ${target_heading}°\n` +
        `⏱️  Wait Time: ${waitTimeSeconds}s\n` +
        `🔄 Test Iterations: ${testCounts}\n` +
        `⏱ Wait: ${waitTimeSeconds}s\n` +
        `Simulation Speed: ${simulationSpeed}x`,
    );

    // Reset simulation
    simulation.reset_simulation();

    await repositionWithAutopilot(
      context,
      target_altitude,
      target_speed,
      target_heading,
    );

    await waitFor(500);
    simulation.set_simulation_speed(simulationSpeed);

    // Apply aileron/rudder/elevator doublet
    flightModel.set_aileron_position(0.2);
    flightModel.set_rudder_position(0.5);
    flightModel.set_elevator_position(0.2);
    await waitFor(1000);

    flightModel.set_aileron_position(-0.2);
    flightModel.set_rudder_position(-0.5);
    flightModel.set_elevator_position(-0.2);
    await waitFor(1000);

    flightModel.set_aileron_position(0.0);
    flightModel.set_rudder_position(0.0);
    flightModel.set_elevator_position(0.0);

    // Wait for T time (convert seconds to milliseconds)
    await waitFor(waitTimeSeconds * 1000);

    simulation.set_simulation_speed(1);
    simulation.set_simulation_pause(true);

    // Take a snapshot
    const snapshot: FlightSnapshot = {
      ALT: flightModel.altitude_ft,
      SPD: flightModel.speed_indicated_knots,
      VSP: flightModel.vertical_speed,
      THETA: flightModel.pitch,
      PHI: flightModel.bank,
      PSI: flightModel.heading,
      BETA: flightModel.sideslip,
    };

    results.push(snapshot);
  }

  // ---------- RAW DATA TABLE ----------
  const snapshotKeys = Object.keys(results[0]) as (keyof FlightSnapshot)[];

  let rawTable = "## 📋 Raw\n\n";
  rawTable += "| # | " + snapshotKeys.join(" | ") + " |\n";
  rawTable += "|---|" + snapshotKeys.map(() => "---").join("|") + "|\n";

  results.forEach((r, i) => {
    const row = snapshotKeys.map((key) => r[key].toFixed(3));
    rawTable += `| ${i} | ${row.join(" | ")} |\n`;
  });

  // ---------- STATISTICAL TABLE ----------
  let statsTable = "\n## 📊 Report\n\n";
  statsTable +=
    "| Metric | Mean | Std Dev | Min | Max | ±2σ (95%) | Tolerance | Status |\n";
  statsTable +=
    "|--------|------|---------|-----|-----|------------|-----------|--------|\n";

  snapshotKeys.forEach((key) => {
    const values = results.map((r) => r[key]);
    const stats = computeStats(values);

    const tolerance = tolerances[key];
    const unit = units[key];
    const ci95 = 2 * stats.std;

    // Stability classification
    let status = "";
    if (ci95 < tolerance * 0.5) {
      status = "🟢 STABLE";
    } else if (ci95 < tolerance) {
      status = "🟡 MARGINAL";
    } else {
      status = "🔴 FAIL";
    }

    statsTable += `| ${key} (${unit}) | ${stats.mean.toFixed(
      3,
    )} | ${stats.std.toFixed(3)} | ${stats.min.toFixed(
      3,
    )} | ${stats.max.toFixed(3)} | ±${ci95.toFixed(
      3,
    )} | ±${tolerance} | ${status} |\n`;
  });

  notifyUser("Report", rawTable + "\n" + statsTable);

  // Write to database
  metrics.push({
    data: results,
  });
}
