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

// ---------- HELPERS ----------
function splitNumStr(val: string) {
  const [int, frac = ""] = val.split(".");
  return { int, frac };
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "");
}

function pad(str: string, width: number, align: "left" | "right" = "right") {
  return align === "right" ? str.padStart(width, " ") : str.padEnd(width, " ");
}

function colorize(text: string, type: "good" | "warn" | "bad") {
  const colors = {
    good: "#22c55e",
    warn: "#f59e0b",
    bad: "#ef4444",
  };

  return `<span style="color:${colors[type]}; font-weight:600">${text}</span>`;
}

function generateRawTable(results: FlightSnapshot[]): string {
  if (!results.length) {
    return `<pre style="
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      margin: 0;
    ">No results available
</pre>`;
  }

  const snapshotKeys = Object.keys(results[0]) as (keyof FlightSnapshot)[];

  const rawHeaders = ["#", ...snapshotKeys];

  const rawWidths = rawHeaders.map((h, i) => {
    if (i === 0) return 4;

    const key = snapshotKeys[i - 1];

    return (
      Math.max(h.length, ...results.map((r) => r[key].toFixed(3).length)) + 2
    );
  });

  let output = `<pre style="
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.35;
    margin: 0;
  ">`;

  //  output += "📋 RAW\n\n";

  // Header
  output +=
    rawHeaders.map((h, i) => pad(h, rawWidths[i], "left")).join("") + "\n";

  // Separator
  output += rawWidths.map((w) => "-".repeat(w)).join("") + "\n";

  // Rows
  results.forEach((r, i) => {
    const row = [
      pad(String(i), rawWidths[0], "left"),
      ...snapshotKeys.map((key, idx) =>
        pad(r[key].toFixed(3), rawWidths[idx + 1], "left"),
      ),
    ];

    output += row.join("") + "\n";
  });

  output += "</pre>";

  return output;
}

function generateReportTable(
  results: FlightSnapshot[],
  tolerances: Record<keyof FlightSnapshot, number>,
  units: Record<keyof FlightSnapshot, string>,
): string {
  if (!results.length) {
    return `<pre style="
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      margin: 0;
    ">📊 REPORT

No results available
</pre>`;
  }

  const snapshotKeys = Object.keys(results[0]) as (keyof FlightSnapshot)[];

  const headers = [
    "Metric",
    "Mean",
    "Std",
    "Min",
    "Max",
    "±2σ",
    "Tol",
    "Status",
  ];

  const numericCols = [1, 2, 3, 4, 5, 6];

  const rows = snapshotKeys.map((key) => {
    const values = results.map((r) => r[key]);
    const stats = computeStats(values);

    const tolerance = tolerances[key];
    const unit = units[key];
    const ci95 = 2 * stats.std;

    let status: string;

    if (ci95 < tolerance * 0.5) {
      status = colorize("STABLE", "good");
    } else if (ci95 < tolerance) {
      status = colorize("MARGINAL", "warn");
    } else {
      status = colorize("FAIL", "bad");
    }

    return [
      `${key}(${unit})`,
      stats.mean.toFixed(3),
      stats.std.toFixed(3),
      stats.min.toFixed(3),
      stats.max.toFixed(3),
      ci95.toFixed(3),
      tolerance.toFixed(3),
      status,
    ];
  });

  const colMeta = headers.map((_, colIdx) => {
    if (!numericCols.includes(colIdx)) return null;

    let maxInt = 0;
    let maxFrac = 0;

    rows.forEach((r) => {
      const raw = stripHtml(r[colIdx]);
      const { int, frac } = splitNumStr(raw);

      maxInt = Math.max(maxInt, int.length);
      maxFrac = Math.max(maxFrac, frac.length);
    });

    return { maxInt, maxFrac };
  });

  const widths = headers.map((h, colIdx) => {
    if (!numericCols.includes(colIdx)) {
      return (
        Math.max(h.length, ...rows.map((r) => stripHtml(r[colIdx]).length)) + 2
      );
    }

    const meta = colMeta[colIdx]!;

    return meta.maxInt + 1 + meta.maxFrac + 2;
  });

  function formatCell(val: string, colIdx: number): string {
    if (!numericCols.includes(colIdx)) {
      return pad(val, widths[colIdx], "left");
    }

    const meta = colMeta[colIdx]!;
    const raw = stripHtml(val);

    const { int, frac } = splitNumStr(raw);

    const paddedInt = int.padStart(meta.maxInt, " ");
    const paddedFrac = frac.padEnd(meta.maxFrac, " ");

    return pad(`${paddedInt}.${paddedFrac}`, widths[colIdx], "left");
  }

  let output = `<pre style="
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.35;
    margin: 0;
  ">`;

  output += "📊 REPORT\n\n";

  // Header
  output += headers.map((h, i) => pad(h, widths[i], "left")).join("") + "\n";

  // Separator
  output += widths.map((w) => "-".repeat(w)).join("") + "\n";

  // Rows
  rows.forEach((row) => {
    output += row.map((cell, i) => formatCell(cell, i)).join("") + "\n";
  });

  output += "</pre>";

  return output;
}

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

  simControls.simulation.set_flight_model_b747();

  const flightModel = simControls.flightModel;

  const initial_altitude = Math.floor(Math.random() * 15000) + 1500;
  const initial_speed = Math.floor(Math.random() * 120) + 180;
  const initial_heading = Math.floor(Math.random() * 359);

  const waitTimeSeconds = Math.floor(Math.random() * 4) + 1;
  const simulationSpeed = Math.floor(Math.random() * 2) + 0.5;

  const testCounts = 3;

  const results: FlightSnapshot[] = [];

  let reposition_status = true;

  for (let i = 0; i < testCounts; ++i) {
    const rawDateReport =
      `<pre>Initial Altitude: ${initial_altitude.toLocaleString()} ft\n` +
      `Initial Speed: ${initial_speed} knots\n` +
      `Initial Heading: ${initial_heading}°\n` +
      `Wait Time: ${waitTimeSeconds}s\n` +
      `Simulation Speed: ${simulationSpeed}x\n` +
      `Run Iterations: ${testCounts}</pre>\n` +
      `${results.length > 0 ? generateRawTable(results) : ""}`;

    notifyUser(`Run ${i + 1} of ${testCounts}`, rawDateReport);

    simulation.reset_simulation();
    simulation.set_pfd_display(false);

    reposition_status = await repositionWithAutopilot(
      context,
      initial_altitude,
      initial_speed,
      initial_heading,
    );

    if (!reposition_status) {
      break;
    }

    await waitFor(500);

    simulation.set_simulation_speed(simulationSpeed);

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

    await waitFor(waitTimeSeconds * 1000);

    simulation.set_simulation_speed(1);
    simulation.set_simulation_pause(true);

    const snapshot: FlightSnapshot = {
      ALT: flightModel.altitude_ft,
      SPD: flightModel.speed_indicated_knots,
      VSP: flightModel.vertical_speed,
      THETA: flightModel.pitch,
      PHI: flightModel.bank,
      PSI: flightModel.yaw,
      BETA: flightModel.sideslip,
    };

    results.push(snapshot);
  }

  if (!reposition_status) {
    notifyUser("Reposition failed", "Test aborted");
    return;
  }

  // ---------- USE FORMATTER ----------
  const rawDateReport =
    `<pre>Initial Altitude: ${initial_altitude.toLocaleString()} ft\n` +
    `Initial Speed: ${initial_speed} knots\n` +
    `Initial Heading: ${initial_heading}°\n` +
    `Wait Time: ${waitTimeSeconds}s\n` +
    `Simulation Speed: ${simulationSpeed}x\n` +
    `Run Iterations: ${testCounts}</pre>\n` +
    `${results.length > 0 ? generateRawTable(results) : ""}`;

  // ---------- USE FORMATTER ----------
  const formattedOutput = generateReportTable(results, tolerances, units);

  notifyUser("Results", `${rawDateReport}\n\n${formattedOutput}`);

  metrics.push({
    data: results,
  });
}
