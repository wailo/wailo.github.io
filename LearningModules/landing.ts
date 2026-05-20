import { b747, ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const {
    controls: simControls,
    props: simProps,
    repositionWithAutopilot,
    waitForCondition,
    waitFor,
    checkPoint,
    notifyUser,
    dataDisplayReset,
    plotView,
  } = context;

  const simulation = simControls.simulation;

  // 🟢 [ACTION] Reset Simulation Environment
  simulation.reset_simulation();
  dataDisplayReset();
  simulation.set_six_instruments_display(false);
  simulation.set_pfd_horizon_visible(false);
  // simulation.set_motion_cues(true);

  // 🟢 [ACTION] Configure Aircraft Model
  simControls.simulation.set_flight_model_b747();
  const flightModel = simControls.flightModel as b747;

  // 🟢 [ACTION] Position Aircraft - Start landing from 1400ft, heading 210, speed 180
  await repositionWithAutopilot(context, 1400, 210, 180);
  flightModel.set_atmosphere_wind_direction(260);
  flightModel.set_atmosphere_wind_speed(8);
  flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TEN);

  // Tokyo approach is typically from the south, so we start with a heading of 210 to set up for the intercept. Initial speed is set to 180 knots for a stable approach profile.
  flightModel.set_latitude(35.5493); // Convert to radians
  flightModel.set_longitude(139.7798); // Convert to radians

  flightModel.set_autopilot_master_switch(true);
  flightModel.set_autopilot_altitude_hold(true);
  flightModel.set_autopilot_altitude_target(1400);

  const CALLSIGN = "Iberia 987"; // Example callsign for ATC communications

  // 📡 Chat history accumulator for ATC/Pilot messages (stacked chat style)
  let atcChatHistory = "";

  // 🟢 [ACTION] Lesson Introduction (START FIRST)
  await notifyUser(
    "Landing Lesson",
    `## Instrument Landing Procedure – B747

This lesson demonstrates a stabilized approach and landing using autopilot assistance.

**Objectives:**
- Execute ATC intercept and handoff procedures
- Configure the aircraft for landing (Flaps 30, Gear Down)
- Maintain a stabilized descent profile at 155 KIAS / -800 ft/min
- Execute a controlled flare and touchdown
- Perform a safe rollout

All actions will follow standard operating procedures.`,
    6000,
  );

  context.setLayout(context.layoutTypes.PILOT);
  checkPoint("Initiating Landing Sequence - 1400ft, HDG 210, 180 KIAS");

  await waitFor(2000);

  // 📡 [ATC TRANSMISSION - Final Vector / Intercept]
  atcChatHistory += `<div style="background-color:#1e3a8a;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>Approach Control:</b><br/>
    ${CALLSIGN}, turn right heading 240, intercept the localizer runway 27.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 5000);

  // 💬 [PILOT RESPONSE - Readback]
  atcChatHistory += `<div style="background-color:#0f766e;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>${CALLSIGN}:</b><br/>
    Turn right heading 240, intercept localizer runway 27, ${CALLSIGN}.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 7000);

  // 🟢 [ACTION] Configure Autopilot for Intercept
  flightModel.set_autopilot_heading_hold(true);
  flightModel.set_autopilot_heading_target(240);

  await waitFor(3000);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Autopilot engaged for intercept.
    <ul style="margin:8px 0 0 0;padding-left:20px">
      <li>Speed: 180 knots (initial approach)</li>
      <li>Altitude: 1400 ft (maintain until established)</li>
    </ul>
    </div>`,
    5000,
  );

  flightModel.set_autopilot_speed_indicated_hold(true);
  flightModel.set_autopilot_speed_indicated_target(180);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Autopilot Final turn to RWY 27.
    <ul style="margin:8px 0 0 0;padding-left:20px">
      <li>Heading: 270° (align with localizer RWY 27)</li>
      <li>Speed: 180 knots (initial approach)</li>
      <li>Altitude: 1400 ft (maintain until established)</li>
    </ul>
    </div>`,
    5000,
  );

  // Final turn to align with localizer
  flightModel.set_autopilot_heading_target(270);

  // 🟢 [ACTION] Wait for Localizer Capture
  await waitForCondition(() => {
    return flightModel.yaw_deg > 265 && flightModel.yaw_deg < 275;
  });

  checkPoint("Established on localizer runway 27");

  // 📡 [ATC TRANSMISSION - Handoff to Tower]
  atcChatHistory += `<div style="background-color:#1e3a8a;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>Approach Control:</b><br/>
    ${CALLSIGN}, contact Tower on 118.7.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 5000);

  // 💬 [PILOT Readback]
  atcChatHistory += `<div style="background-color:#0f766e;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>${CALLSIGN}:</b><br/>
    Contact Tower on 118.7, ${CALLSIGN}.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 7000);

  // 💬 [PILOT → Tower Check-in]
  atcChatHistory += `<div style="background-color:#0f766e;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>${CALLSIGN}:</b><br/>
    Tower, ${CALLSIGN}, established ILS runway 27.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 5000);

  // 📡 [Tower → Landing Clearance]
  atcChatHistory += `<div style="background-color:#1e3a8a;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>Tower:</b><br/>
    ${CALLSIGN}, wind ${context.controls.flightModel.atmosphere_wind_direction} at ${context.controls.flightModel.atmosphere_wind_speed}, runway 27 cleared to land.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 5000);

  // 💬 [PILOT Readback]
  atcChatHistory += `<div style="background-color:#0f766e;color:white;padding:10px;border-radius:6px;margin:4px 0">
    <b>${CALLSIGN}:</b><br/>
    Wind 260 at 8, runway 27 cleared to land, ${CALLSIGN}.
    </div>`;
  await notifyUser("ATC Communications", atcChatHistory, 7000);

  // 🟢 [ACTION] Configure Aircraft for Final Approach
  flightModel.set_flaps_selector_position(simControls.B747FlapSelector.THIRTY);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Flap configuration set to 30°.
    <p style="margin:8px 0 0 0">This increases lift and drag, enabling a lower approach speed.</p>
    </div>`,
    4000,
  );

  // Reduce speed to 155 knots, set vertical speed to -800 ft/min
  flightModel.set_autopilot_speed_indicated_target(155);
  flightModel.set_autopilot_vertical_speed_hold(true);
  flightModel.set_autopilot_vertical_speed_target(-800);

  // Extend landing gear
  flightModel.set_landing_gear_selector_position(
    simControls.B747GearSelector.DOWN,
  );

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Final approach configuration complete.
    <ul style="margin:8px 0 0 0;padding-left:20px">
      <li>Speed: 155 knots</li>
      <li>Vertical speed: -800 ft/min</li>
      <li>Flaps: 30°</li>
      <li>Gear: DOWN</li>
    </ul>
    <p style="margin:8px 0 0 0">Stabilized approach profile established.</p>
    </div>`,
    5000,
  );

  // 🟢 [ACTION] Enable Data Monitoring
  plotView(simProps.speed_indicated_knots, true);
  plotView(simProps.g_force, true);
  plotView(simProps.throttle_position, true);
  plotView(simProps.pitch_deg, true);
  plotView(simProps.altitude_ft, true);
  plotView(simProps.vertical_speed_ftmin, true);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Monitoring primary flight parameters.
    <p style="margin:8px 0 0 0">Maintain awareness of speed, pitch attitude, descent rate, and altitude.</p>
    </div>`,
    4000,
  );

  // 🟢 [ACTION] Altitude Callouts During Descent
  const altitudeCallouts: [number, string][] = [
    [1000, "One thousand"],
    [500, "Five hundred"],
    [400, "Four hundred"],
    [300, "Three hundred"],
    [200, "Two hundred"],
    [100, "One hundred"],
    [50, "Fifty"],
    [30, "Thirty"],
    [20, "Twenty"],
    [10, "Ten"],
  ];

  for (const alt of altitudeCallouts) {
    waitForCondition(
      () => flightModel.altitude_radio_ft <= alt[0],
      0,
      50,
      120000,
    ).then(async () => {
      if (flightModel.altitude_radio_ft > 0 && !flightModel.weight_on_wheel) {
        await notifyUser(
          "Altitude Callout",
          `<div style="background-color:#7c2d12;color:white;padding:10px;border-radius:6px;font-weight:bold">
        🎙️ ${alt[1]}
        </div>`,
          alt[0] <= 100 ? 2000 : 1500,
        );
      }
    });
  }

  // 🟢 [ACTION] Stabilized Approach Monitoring
  checkPoint("Approaching runway - Stabilized approach check");

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Stabilized approach criteria check:
    <ul style="margin:8px 0 0 0;padding-left:20px">
      <li>Speed: ${Math.round(flightModel.speed_indicated_knots)} knots (target: 155)</li>
      <li>Altitude: ${Math.round(flightModel.altitude_ft)} ft</li>
      <li>Vertical speed: ${Math.round(flightModel.vertical_speed_ftmin)} ft/min (target: -800)</li>
      <li>Configuration: Flaps 30, Gear DOWN</li>
    </ul>
    <p style="margin:8px 0 0 0;font-weight:bold">✅ Aircraft within stable limits.</p>
    </div>`,
    4000,
  );

  // 🟢 [ACTION] Final Approach Guidance
  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Final approach.
    <p style="margin:8px 0 0 0">Maintain glide slope and runway alignment. Prepare for flare sequence.</p>
    </div>`,
    3000,
  );

  // 🟢 [ACTION] Flare Preparation
  await waitForCondition(() => flightModel.altitude_radio_ft < 250);
  flightModel.set_autopilot_speed_indicated_target(130);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Flare preparation initiated.
    <p style="margin:8px 0 0 0">Reducing target speed to 130 knots for landing.</p>
    </div>`,
    3000,
  );

  // 🟢 [ACTION] Flare Execution
  await waitForCondition(() => flightModel.altitude_radio_ft < 150);
  flightModel.set_autopilot_vertical_speed_target(-20);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Flare initiated.
    <p style="margin:8px 0 0 0">Descent rate reduced to achieve a smooth touchdown.</p>
    </div>`,
    3000,
  );

  // 🟢 [ACTION] Touchdown Detection
  await waitForCondition(() => flightModel.weight_on_wheel);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[EVENT]</b> Weight on wheels confirmed.
    <p style="margin:8px 0 0 0">Main landing gear has made ground contact.</p>
    </div>`,
    4000,
  );

  // Disengage autopilot
  flightModel.set_autopilot_master_switch(false);
  // Set engine throttle to idle
  flightModel.set_engine_throttle_position(0);
  // 🟢 [ACTION] Apply Braking
  flightModel.set_parking_brake(true);

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Braking applied.
    <p style="margin:8px 0 0 0">Aircraft deceleration in progress. Maintain directional control.</p>
    </div>`,
    3000,
  );

  // 🟢 [ACTION] Rollout Monitoring
  await waitForCondition(() => {
    // Slowly reduce wind speed
    flightModel.set_atmosphere_wind_speed(Math.max(flightModel.atmosphere_wind_speed -1, 0));
    return flightModel.speed_indicated_knots < 30;
  });

  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[ACTION]</b> Rollout phase.
    <p style="margin:8px 0 0 0">Speed reduced below 30 knots. Aircraft exiting active landing phase.</p>
    </div>`,
    3000,
  );

  checkPoint("Landing Complete");

  // 🎓 [FINAL]
  await notifyUser(
    "Landing Procedure",
    `<div style="background-color:#f59e0b;color:#1f2937;padding:10px;border-radius:6px;font-weight:500">
    <b>[COMPLETE]</b> The landing procedure has been successfully completed.
    <ul style="margin:8px 0 0 0;padding-left:20px">
      <li>✅ ATC procedures executed: Intercept → Handoff → Check-in → Clearance</li>
      <li>✅ Aircraft configured: Flaps 30, Gear DOWN</li>
      <li>✅ Stabilized approach: 155 KIAS / -800 ft/min</li>
      <li>✅ Altitude callouts announced</li>
      <li>✅ Flare and touchdown executed per SOP</li>
    </ul>
    <p style="margin:8px 0 0 0;font-weight:bold">All objectives achieved under stabilized conditions.</p>
    </div>`,
    6000,
  );
}
