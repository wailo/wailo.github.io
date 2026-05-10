import { FlightModelInstance, ScriptContext } from "../../src/core";

// Helper function, formatting
function pad(str: string, width: number, align: "left" | "right" = "right") {
  return align === "right" ? str.padStart(width, " ") : str.padEnd(width, " ");
}

function generateRawTable(results: any[]): string {
  if (!results.length) {
    return `<pre style="
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      margin: 0;
    ">No results available
</pre>`;
  }

  const snapshotKeys = Object.keys(results[0]);

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
      pad(String(i+1), rawWidths[0], "left"),
      ...snapshotKeys.map((key, idx) =>
        pad(r[key].toFixed(3), rawWidths[idx + 1], "left"),
      ),
    ];

    output += row.join("") + "\n";
  });

  output += "</pre>";

  return output;
}

// Helper function to configure autopilot for dutch roll mode
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

// Measures damping characteristics
const measureDamping = async (label: string, context: ScriptContext) => {
  let prev = 0;
  let rising = false;

  const peaks: { time: number; value: number }[] = [];

  const startTime = context.controls.simulation.simulation_time;
  const endTime = startTime + 30;

  await context.waitForCondition(
    () => {
      const now = context.controls.simulation.simulation_time;
      const r = Math.abs(context.controls.flightModel.heading_dot_deg);

      // --- Peak detection ---
      if (r > prev) {
        rising = true;
      } else if (r < prev && rising) {
        // local maximum
        peaks.push({ time: now, value: prev });

        context.notifyUser(`Oscillations: ${label}`, generateRawTable(peaks));

        //         let markdown_table = `| # | Magnitude | Time |
        // |---|-----------|------|
        // `;

        //         let i = 1;
        //         for (let peak of peaks) {
        //           markdown_table += `| ${i} | ${peak.value.toFixed(3)} | ${(peak.time - startTime).toFixed(2)} |\n`;
        //           i++;
        //         }
        //         context.notifyUser("Peaks", markdown_table)
        rising = false;
      }

      prev = r;

      return now >= endTime;
    },
    0,
    40,
  );

  // --- Need at least 2 peaks ---
  if (peaks.length < 2) {
    await context.notifyUser(
      `**Damping Result: ${label}**`,
      `Not enough peaks detected.`,
      4000,
    );
    return null;
  }

  // --- Use 2nd peak as reference (more robust) ---
  const refPeak = peaks[1];

  // --- Find half-amplitude peak ---
  const halfPeak = peaks.find(
    (p, i) => i > 1 && p.value <= refPeak.value * 0.5,
  );

  const halfTime = halfPeak ? halfPeak.time - refPeak.time : null;

  // --- Log decrement (average over multiple peaks) ---
  let deltas: number[] = [];

  for (let i = 1; i < peaks.length; i++) {
    const ratio = peaks[i - 1].value / peaks[i].value;
    if (ratio > 1) {
      deltas.push(Math.log(ratio));
    }
  }

  const logDec =
    deltas.length > 0
      ? deltas.reduce((a, b) => a + b, 0) / deltas.length
      : null;

  // --- Damping ratio ζ ---
  let zeta: number | null = null;
  if (logDec !== null) {
    zeta = logDec / Math.sqrt(4 * Math.PI * Math.PI + logDec * logDec);
  }

  // --- Peak summary ---
  const peakValues = peaks.map((p) => p.value);
  const maxPeak = Math.max(...peakValues);

  await context.notifyUser(
    `**Damping Result: ${label}**`,
    `Peaks detected: **${peaks.length}**
Max peak: **${maxPeak.toFixed(3)}**
Time to half amplitude: **${halfTime?.toFixed(2) ?? "N/A"} sec**
Log decrement: **${logDec?.toFixed(3) ?? "N/A"}**
Damping ratio ζ: **${zeta?.toFixed(3) ?? "N/A"}**`,
    5500,
  );

  return { peaks, halfTime, logDec, zeta };
};

// Apply a controlled rudder impulse
const applyRudderImpulse = async (
  flightModel: FlightModelInstance,
  context: ScriptContext,
) => {
  flightModel.set_atmosphere_wind_direction(flightModel.heading_deg + 90);
  flightModel.set_atmosphere_wind_speed(20);
  // flightModel.set_rudder_position(-0.5);
  await context.waitFor(7000);

  flightModel.set_atmosphere_wind_direction(flightModel.heading_deg - 90);
  flightModel.set_atmosphere_wind_speed(-20);
  // flightModel.set_rudder_position(0.5);
  await context.waitFor(7000);

  flightModel.set_atmosphere_wind_direction(0);
  flightModel.set_atmosphere_wind_speed(0);
  // flightModel.set_rudder_position(0.0);
  await context.waitFor(100);
};

// Helper function to run the disturbance
const runDutchRollTest = async (
  label: string,
  yawDamperOn: boolean,
  context: ScriptContext,
  isFirstTest: boolean,
) => {
  if (isFirstTest) {
    await context.notifyUser(
      `**${label}**`,
      `Yaw damper is <span style="color: ${yawDamperOn ? "red" : "green"};">**${yawDamperOn ? "ENGAGED" : "DISENGAGED"}**</span>.

A controlled rudder input will now be applied to initiate lateral-directional oscillations.

Observe the resulting oscillations in yaw and roll.
Note how the amplitude changes over time and whether the motion damps out quickly or persists.`,
      5000,
    );
  } else {
    // Shortened second intro (keeps context, removes repetition)
    await context.notifyUser(
      `**${label}**`,
      `Now repeat the same test with the yaw damper <span style="color: ${yawDamperOn ? "red" : "green"};">**${yawDamperOn ? "ENGAGED" : "DISENGAGED"}**</span>.

Compare how quickly the oscillations decay.`,
      2500,
    );
  }

  const flightModel = context.controls.flightModel;

  // Reset control surfaces
  flightModel.set_aileron_position(0.0);
  flightModel.set_rudder_position(0.0);

  flightModel.set_autopilot_yaw_damper(yawDamperOn);
  await applyRudderImpulse(flightModel, context);
  return await measureDamping(label, context);
};

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simProps = context.props;

  const repositionWithAutopilot = context.repositionWithAutopilot;
  const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  const waitFor = context.waitFor;

  const targetAltitude = 5000;
  const targetSpeed = 180;
  const targetHeading = 0;

  dataDisplayReset();
  simControls.simulation.reset_simulation();
  simControls.simulation.set_flight_model_b747();
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

  // --- Narrated lesson introduction ---
  await notifyUser(
    "Introduction",
    `This lesson focuses on the **yaw damper**, a system designed to improve lateral-directional stability and reduce unwanted oscillations.

### Objective: 
Demonstrate how effectively the yaw damper suppresses oscillatory motion and improves dynamic stability.

### Test Setup
1. The aircraft will be stabilized at a constant altitude:${targetAltitude} and airspeed:${targetSpeed}.
2. A rudder doublet input will be used to introduce a disturbance. This consists of a brief deflection in one direction, followed by an equal deflection in the opposite direction, before returning to neutral.
3. Key characteristics like yaw rate and decay of oscillations will be measured and compared.

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
  simControls.simulation.set_pfd_display(false);
  await waitFor(400);
  simControls.simulation.set_motion_cues(true);

  // Plot signals
  plotView(simProps.heading_dot, true);
  plotView(simProps.sideslip, true);
  plotView(simProps.rudder_position, true);
  plotView(simProps.wind_speed, true);

  // --- TEST 1 ---
  let flightModel = context.controls.flightModel;
  configureAutoPilotForDutchRoll(flightModel, targetSpeed, targetAltitude);

  const test1Results = await runDutchRollTest(
    "Test 1: Yaw Damper Disengaged",
    false,
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
    context,
    false,
  );

  const getMaxPeak = (res: any) =>
    res?.peaks?.length ? Math.max(...res.peaks.map((p: any) => p.value)) : null;

  const getPeakCount = (res: any) => res?.peaks?.length ?? 0;

  await notifyUser(
    "Summary",
    `**Damping Comparison**

The following results are measured over a **30-second period** after the disturbance is applied.

| Yaw Damper | Max Peak (deg/s) | Number of Peaks | Damping Ratio (ζ) |
|-----------|------------------|------------------|-------------------|
|  OFF      | ${getMaxPeak(test1Results)?.toFixed(3) ?? "N/A"} | ${getPeakCount(test1Results)} | ${test1Results?.zeta?.toFixed(3) ?? "N/A"} |
|  ON       | ${getMaxPeak(test2Results)?.toFixed(3) ?? "N/A"} | ${getPeakCount(test2Results)} | ${test2Results?.zeta?.toFixed(3) ?? "N/A"} |

**Interpretation**

• A lower peak yaw rate indicates smaller oscillations  
• Fewer peaks within the same time period indicate faster damping  
• A higher damping ratio (ζ) indicates improved stability  

With the yaw damper engaged, the aircraft exhibits reduced oscillation amplitude and improved damping of the Dutch roll motion.`,
    1000,
  );
  simControls.simulation.set_simulation_pause(true);
}
