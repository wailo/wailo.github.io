import { FlightModelInstance, ScriptContext } from "../../src/core";

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------

function pad(str: string, width: number, align: "left" | "right" = "right") {
  return align === "right" ? str.padStart(width, " ") : str.padEnd(width, " ");
}

const TABLE_STYLE = `
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.35;
  margin: 0;
`;

// ---------------------------------------------------
// Generic single table
// ---------------------------------------------------

function generateRawTable(results: any[]): string {
  if (!results.length) {
    return `<pre style="${TABLE_STYLE}">No results available</pre>`;
  }

  const snapshotKeys = Object.keys(results[0]);

  const headers = ["#", ...snapshotKeys];

  const widths = headers.map((h, i) => {
    if (i === 0) return 4;

    const key = snapshotKeys[i - 1];

    return (
      Math.max(
        h.length,
        ...results.map((r) =>
          typeof r[key] === "number"
            ? r[key].toFixed(3).length
            : String(r[key]).length,
        ),
      ) + 3
    );
  });

  let output = `<pre style="${TABLE_STYLE}">`;

  // Header
  output += headers.map((h, i) => pad(h, widths[i], "left")).join("") + "\n";

  // Separator
  output += widths.map((w) => "-".repeat(w)).join("") + "\n";

  // Rows
  results.forEach((r, i) => {
    const row = [
      pad(String(i + 1), widths[0], "left"),

      ...snapshotKeys.map((key, idx) => {
        const value =
          typeof r[key] === "number" ? r[key].toFixed(3) : String(r[key]);

        return pad(value, widths[idx + 1], "left");
      }),
    ];

    output += row.join("") + "\n";
  });

  output += "</pre>";

  return output;
}

// ---------------------------------------------------
// Side-by-side comparison table
// ---------------------------------------------------

function generateComparisonTable(
  yawDamperOn: any[],
  yawDamperOff: any[],
): string {
  const leftTitle = "Yaw Damper OFF";
  const rightTitle = "Yaw Damper ON";

  const rightColor = "#16a34a";
  const leftColor = "#dc2626";

  const headers = ["#", "Time", "Yaw Rate °/s"];

  const widths = [4, 10, 14];

  const rowCount = Math.max(yawDamperOn.length, yawDamperOff.length);

  const formatRow = (r: any, i: number) => {
    if (!r) {
      return widths.map((w) => pad("", w, "left")).join("");
    }

    return [
      pad(String(i + 1), widths[0], "left"),
      pad(r.time.toFixed(3), widths[1], "left"),
      pad(r.yaw_rate_deg.toFixed(3), widths[2], "left"),
    ].join("");
  };

  const columnWidth = widths.reduce((a, b) => a + b, 0);

  let output = `<pre style="${TABLE_STYLE}">`;

  // Titles
  output +=
    `<span style="color:${leftColor}; font-weight:bold;">` +
    pad(leftTitle, columnWidth, "left") +
    `</span>| ` +
    `<span style="color:${rightColor}; font-weight:bold;">` +
    pad(rightTitle, columnWidth, "left") +
    `</span>\n`;

  // Headers
  output +=
    headers.map((h, i) => pad(h, widths[i], "left")).join("") +
    "| " +
    headers.map((h, i) => pad(h, widths[i], "left")).join("") +
    "\n";

  // Separator
  output += "-".repeat(columnWidth) + "|" + "-".repeat(columnWidth) + "\n";

  // Rows
  for (let i = 0; i < rowCount; i++) {
    const left = formatRow(yawDamperOn[i], i);
    const right = formatRow(yawDamperOff[i], i);

    output +=
      `<span style="color:${leftColor};">${left}</span>| ` +
      `<span style="color:${rightColor};">${right}</span>\n`;
  }

  output += "</pre>";

  return output;
}

// ---------------------------------------------------
// Natural frequency helpers
// ---------------------------------------------------

// Average oscillation period from peaks
const calculateNaturalFrequency = (
  peaks: { time: number; yaw_rate_deg: number }[],
) => {
  if (peaks.length < 2) {
    return {
      period: null,
      omega_n: null,
      frequency_hz: null,
    };
  }

  // Time differences between successive peaks
  const periods: number[] = [];

  for (let i = 1; i < peaks.length; i++) {
    periods.push(peaks[i].time - peaks[i - 1].time);
  }

  // Average damped period
  const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;

  // Damped natural frequency
  const omega_d = (2 * Math.PI) / avgPeriod;

  // Frequency in Hz
  const frequencyHz = 1 / avgPeriod;

  return {
    period: avgPeriod,
    omega_n: omega_d,
    frequency_hz: frequencyHz,
  };
};

// ---------------------------------------------------
// Configure AP for Dutch roll
// ---------------------------------------------------

const configureAutoPilotForDutchRoll = (
  flightModel: FlightModelInstance,
  targetSpeed: number,
  targetAltitude: number,
) => {
  flightModel.set_autopilot_master_switch(true);

  // Maintain longitudinal stability
  flightModel.set_autopilot_speed_indicated_hold(true);
  flightModel.set_autopilot_speed_indicated_target(targetSpeed);

  flightModel.set_autopilot_altitude_hold(true);
  flightModel.set_autopilot_altitude_target(targetAltitude);

  // Allow natural lateral-directional dynamics
  flightModel.set_autopilot_bank_hold(false);
};

// ---------------------------------------------------
// Measures damping characteristics
// ---------------------------------------------------

const measureDamping = async (
  label: string,
  measurementPeriod: number,
  context: ScriptContext,
) => {
  let prev = 0;
  let rising = false;

  let lastPeakTime = -999;

  const MIN_PEAK = 0.03; // ignore tiny oscillations
  const MIN_DELTA = 0.01; // hysteresis
  const MIN_PERIOD = 0.2; // sec between peaks

  const peaks: {
    time: number;
    yaw_rate_deg: number;
  }[] = [];

  const startTime = context.controls.simulation.simulation_time;

  const endTime = startTime + measurementPeriod;

  await context.waitForCondition(
    () => {
      const now = context.controls.simulation.simulation_time;

      const r = Math.abs(context.controls.flightModel.yaw_dot_deg);

      // ----------------------------------------
      // Rising edge detection with hysteresis
      // ----------------------------------------

      if (r > prev + MIN_DELTA) {
        rising = true;
      }

      // ----------------------------------------
      // Peak detection
      // ----------------------------------------
      else if (r < prev - MIN_DELTA && rising) {
        const peakValue = prev;
        const peakTime = now - startTime;

        // Reject tiny/noisy peaks
        const validAmplitude = peakValue > MIN_PEAK;

        // Reject duplicate peaks
        const validSpacing = peakTime - lastPeakTime > MIN_PERIOD;

        if (validAmplitude && validSpacing) {
          peaks.push({
            time: peakTime,
            yaw_rate_deg: peakValue,
          });

          lastPeakTime = peakTime;
        }

        rising = false;
      }

      prev = r;

      context.notifyUser(
        "Oscillations",
        `
${label}: ${(endTime - now).toFixed(0)}s remaining

${generateRawTable(peaks)}
`,
      );

      return now >= endTime;
    },
    0,
    40,
  );

  if (peaks.length < 2) {
    await context.notifyUser(
      `**Damping Result: ${label}**`,
      `Not enough peaks detected.`,
      4000,
    );

    return null;
  }

  // Reference peak
  const refPeak = peaks[1];

  // Half amplitude peak
  const halfPeak = peaks.find(
    (p, i) => i > 1 && p.yaw_rate_deg <= refPeak.yaw_rate_deg * 0.5,
  );

  const halfTime = halfPeak ? halfPeak.time - refPeak.time : null;

  // Log decrement
  let deltas: number[] = [];

  for (let i = 1; i < peaks.length; i++) {
    const ratio = peaks[i - 1].yaw_rate_deg / peaks[i].yaw_rate_deg;

    if (ratio > 1) {
      deltas.push(Math.log(ratio));
    }
  }

  const logDec =
    deltas.length > 0
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : null;

  // Damping ratio
  let zeta: number | null = null;

  if (logDec !== null) {
    zeta = logDec / Math.sqrt(4 * Math.PI * Math.PI + logDec * logDec);
  }

  // Natural frequency
  const naturalFrequency = calculateNaturalFrequency(peaks);

  // Peak summary
  const peakValues = peaks.map((p) => p.yaw_rate_deg);
  const maxPeak = Math.max(...peakValues);

  await context.notifyUser(
    `**Damping Result: ${label}**`,
    `${generateRawTable(peaks)}

Peaks detected: **${peaks.length}**
Max peak: **${maxPeak.toFixed(3)}**
Time to half amplitude: **${halfTime?.toFixed(2) ?? "N/A"} sec**
Log decrement: **${logDec?.toFixed(3) ?? "N/A"}**
Damping ratio ζ: **${zeta?.toFixed(3) ?? "N/A"}**
Natural frequency ωₙ: **${naturalFrequency.omega_n?.toFixed(3) ?? "N/A"} rad/s**
Frequency: **${naturalFrequency.frequency_hz?.toFixed(3) ?? "N/A"} Hz**
Oscillation period: **${naturalFrequency.period?.toFixed(3) ?? "N/A"} sec**`,
    5500,
  );

  return { peaks, halfTime, logDec, zeta, naturalFrequency };
};

// Apply a controlled rudder impulse
const applyRudderImpulse = async (
  flightModel: FlightModelInstance,
  context: ScriptContext,
) => {
  flightModel.set_rudder_position(-0.5);
  await context.waitFor(5000);

  flightModel.set_rudder_position(0.5);
  await context.waitFor(5000);

  flightModel.set_rudder_position(0.0);
  await context.waitFor(100);
};

// Helper function to run the disturbance
const runDutchRollTest = async (
  label: string,
  yawDamperOn: boolean,
  measurementPeriod: number,
  context: ScriptContext,
  isFirstTest: boolean,
) => {
  if (isFirstTest) {
    await context.notifyUser(
      `**${label}**`,
      `Yaw damper is **${yawDamperOn ? "ENGAGED" : "DISENGAGED"}**.

A controlled rudder input will now be applied to initiate lateral-directional oscillations.

Observe the resulting oscillations in yaw and roll.
Note how the amplitude changes over time and whether the motion damps out quickly or persists.`,
      5000,
    );
  } else {
    // Shortened second intro (keeps context, removes repetition)
    await context.notifyUser(
      `**${label}**`,
      `Now repeat the same test with the yaw damper <span style="color: ${
        yawDamperOn ? "#16a34a" : "#dc2626"
      };">**${yawDamperOn ? "ENGAGED" : "DISENGAGED"}**</span>.

Compare how quickly the oscillations decay.`,
      2500,
    );
  }

  const flightModel = context.controls.flightModel;

  // Reset controls
  flightModel.set_aileron_position(0.0);
  flightModel.set_rudder_position(0.0);

  await applyRudderImpulse(flightModel, context);
  flightModel.set_autopilot_yaw_damper(yawDamperOn);
  return await measureDamping(label, measurementPeriod, context);
};

// ---------------------------------------------------
// Main
// ---------------------------------------------------

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simulation = simControls.simulation;
  const simProps = context.props;

  const repositionWithAutopilot = context.repositionWithAutopilot;
  const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  const waitFor = context.waitFor;

  const targetAltitude = 5000;
  const targetSpeed = 180;
  const targetHeading = 0;
  const measurementPeriod = 30; // seconds

  dataDisplayReset();
  simulation.reset_simulation();
  simulation.set_flight_model_b747();
  context.setLayout(context.layoutTypes.FOCUS);

  const preConfiguration = () => {
    simControls.flightModel.set_flaps_selector_position(
      simControls.B747FlapSelector.TWENTY,
    );
  };

  repositionWithAutopilot(
    context,
    targetAltitude,
    targetSpeed,
    targetHeading,
    10000,
    preConfiguration,
  );

  // Introduction
  await notifyUser(
    "Introduction",
    `This lesson focuses on the **yaw damper**, a system designed to improve lateral-directional stability and reduce unwanted oscillations.

### Objective
Demonstrate how effectively the yaw damper suppresses oscillatory motion and improves dynamic stability.

### Test Setup
1. The aircraft will be stabilized at a constant altitude:${targetAltitude} and airspeed:${targetSpeed}.
2. A rudder doublet input will be used to introduce a disturbance.
3. Key characteristics like yaw rate and decay of oscillations will be measured and compared for a period of ${measurementPeriod} seconds.

### What to Observe
The disturbance will excite the aircraft’s natural lateral-directional motion (commonly associated with Dutch roll).`,
    9000,
  );

  // Disable instruments view, only turn coordinator and attitude indicator are vibible
  simControls.simulation.set_analog_altimeter_visible(false);
  await waitFor(400);
  simControls.simulation.set_analog_heading_indicator_visible(false);
  await waitFor(400);
  simControls.simulation.set_analog_vertical_speed_indicator_visible(false);
  await waitFor(400);
  simControls.simulation.set_analog_speed_indicator_visible(false);
  await waitFor(400);
  simControls.simulation.set_pfd_horizon_visible(false);
  await waitFor(400);
  simControls.simulation.set_pfd_altimeter_visible(false);
  await waitFor(400);
  simControls.simulation.set_pfd_speed_indicator_visible(false);
  await waitFor(400);
  simControls.simulation.set_pfd_flight_mode_annunciator_visible(false);
  await waitFor(400);
  simControls.simulation.set_pfd_vertical_speed_indicator_visible(false);
  await waitFor(400);
  simControls.simulation.set_motion_cues(true);

  // Plot signals
  plotView([simProps.yaw_dot_deg, simProps.bank_dot_deg], true);
  plotView([simProps.sideslip_deg, simProps.bank_deg], true);
  plotView(simProps.rudder_position, true);

  // --- TEST 1 ---
  let flightModel = context.controls.flightModel;
  configureAutoPilotForDutchRoll(flightModel, targetSpeed, targetAltitude);

  const test1Results = await runDutchRollTest(
    "Test 1: Yaw Damper Disengaged",
    false,
    measurementPeriod,
    context,
    true,
  );

  // Reset conditions
  await repositionWithAutopilot(
    context,
    targetAltitude,
    targetSpeed,
    targetHeading,
    10000,
    preConfiguration,
  );

  // --- TEST 2 ---
  flightModel = context.controls.flightModel;
  configureAutoPilotForDutchRoll(flightModel, targetSpeed, targetAltitude);

  const test2Results = await runDutchRollTest(
    "Test 2: Yaw Damper Engaged",
    true,
    measurementPeriod,
    context,
    false,
  );

  // ---------------------------------------------------
  // Summary
  // ---------------------------------------------------

  const getMaxPeak = (res: any) =>
    res?.peaks?.length
      ? Math.max(...res.peaks.map((p: any) => p.yaw_rate_deg))
      : null;

  const getPeakCount = (res: any) => res?.peaks?.length ?? 0;

  simulation.set_simulation_pause(true);

  await notifyUser(
    "Summary",
    `**Damping Comparison**

${generateComparisonTable(test1Results?.peaks || [], test2Results?.peaks || [])}

**Damping Results**

${generateRawTable([
  {
    yaw_damper: "OFF",
    max_peak: getMaxPeak(test1Results) ?? 0,
    peaks: getPeakCount(test1Results),
    zeta: test1Results?.zeta ?? 0,
    omega_n: test1Results?.naturalFrequency?.omega_n ?? 0,
    period: test1Results?.naturalFrequency?.period ?? 0,
    freq_hz: test1Results?.naturalFrequency?.frequency_hz ?? 0,
  },
  {
    yaw_damper: "ON",
    max_peak: getMaxPeak(test2Results) ?? 0,
    peaks: getPeakCount(test2Results),
    zeta: test2Results?.zeta ?? 0,
    omega_n: test2Results?.naturalFrequency?.omega_n ?? 0,
    period: test2Results?.naturalFrequency?.period ?? 0,
    freq_hz: test2Results?.naturalFrequency?.frequency_hz ?? 0,
  },
])}

### Interpretation

• With the yaw damper OFF, the aircraft exhibits a lightly damped Dutch-roll oscillation.  
  The yaw rate decreases gradually, allowing several oscillation cycles to remain visible within the observation period.
• With the yaw damper ON, oscillations decay much faster.  
  Only a few measurable peaks remain before the motion becomes negligible, demonstrating improved damping performance.
• The damping ratio ζ increased from **${test1Results?.zeta?.toFixed(3)}** to **${test2Results?.zeta?.toFixed(3)}**, indicating improved lateral-directional stability and faster suppression of oscillatory motion.
• The oscillation period remained approximately constant at **${test1Results?.naturalFrequency?.period?.toFixed(2)} sec**.  
  This means the aircraft completes one Dutch-roll cycle approximately every ${test1Results?.naturalFrequency?.period?.toFixed(2)} seconds.
• The natural frequency remained nearly unchanged at approximately **${test1Results?.naturalFrequency?.omega_n?.toFixed(3)} rad/s** (**${test1Results?.naturalFrequency?.frequency_hz?.toFixed(3)} Hz**).  
  This shows that the yaw damper primarily increases damping rather than significantly changing the aircraft’s natural oscillation speed.
• Dutch roll is a coupled lateral-directional motion involving both yawing and rolling oscillations.  
  As the aircraft yaws, sideslip develops, producing rolling motion that continues the oscillation cycle.

### Further Exploration

• Increase the observation duration beyond 30 seconds to capture additional oscillation cycles and improve damping measurements.
• Try the same experiment using the C172 model and compare:
  - damping ratio
  - oscillation frequency
  - oscillation decay rate
  - number of visible peaks
• Repeat the test using stronger or weaker rudder inputs and observe how oscillation amplitude and damping behavior change.
• Observe how yaw rate and bank angle oscillate together during Dutch roll motion.
• Compare how quickly different aircraft return to coordinated flight after the disturbance.`,
    60000,
  );
  context.setLayout(context.layoutTypes.INSTRUCTOR);
}
