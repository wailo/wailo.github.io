import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const {
    controls: simControls,
    props: simProps,
    repositionWithAutopilot,
    waitForCondition,
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
  simulation.set_motion_cues(true);

  // 🟢 [ACTION] Configure Aircraft Model
  const flightModel = simControls.simulation.set_flight_model_b747();

  const CALLSIGN = "Atlas 742 Heavy";

  // 🟢 [ACTION] Lesson Introduction (START FIRST)
  await notifyUser(
    "Landing Lesson",
    `## Instrument Landing Procedure – B747

This lesson demonstrates a stabilized approach and landing using autopilot assistance.

**Objectives:**
- Configure the aircraft for landing
- Maintain a stabilized descent profile
- Execute a controlled flare and touchdown
- Perform a safe rollout

All actions will follow standard operating procedures.`,
    6000
  );

  // 🟢 [ACTION] Position Aircraft
  await repositionWithAutopilot(context, 300, 180, 90);
  context.setLayout(context.layoutTypes.PILOT);
  checkPoint("Initiating Landing Sequence");

  // 📡 [ATC TRANSMISSION - STYLED]
  await notifyUser(
    "ATC",
    `<div style="background-color:#1e3a8a;color:white;padding:10px;border-radius:6px">
    <b>Antalya Tower:</b><br/>
    ${CALLSIGN}, wind calm, runway 09 cleared to land.
    </div>`,
    5000
  );

  // 💬 [PILOT RESPONSE - STYLED]
  await notifyUser(
    "Pilot",
    `<div style="background-color:#0f766e;color:white;padding:10px;border-radius:6px">
    <b>${CALLSIGN}:</b><br/>
    Cleared to land runway 09, ${CALLSIGN}.
    </div>`,
    4000
  );

  // 🟢 [ACTION] Configure Aircraft (Flaps)
  flightModel.set_flaps_selector_position(simControls.B747FlapSelector.THIRTY);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Flap configuration set to 30°.

This increases lift and drag, enabling a lower approach speed.`,
    5000
  );

  // 🟢 [ACTION] Configure Autopilot
  flightModel.set_autopilot_master_switch(true);
  flightModel.set_autopilot_speed_indicated_hold(true);
  flightModel.set_autopilot_speed_indicated_target(150);
  flightModel.set_autopilot_vertical_speed_target(-600);
  flightModel.set_autopilot_vertical_speed_hold(true);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Autopilot configured.

- Target speed: 150 knots
- Vertical speed: -600 ft/min

This establishes a stabilized descent profile.`,
    5000
  );

  // 🟢 [ACTION] Extend Landing Gear
  flightModel.set_landing_gear_selector_position(
    simControls.B747GearSelector.DOWN
  );

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Landing gear extended.

Increased aerodynamic drag will require thrust adjustments.`,
    4000
  );

  // 🟢 [ACTION] Enable Data Monitoring
  plotView(simProps.speed_indicated_knots, true);
  plotView(simProps.g_force, true);
  plotView(simProps.throttle_position, true);
  plotView(simProps.pitch_deg, true);
  plotView(simProps.altitude_ft, true);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Monitoring primary flight parameters.

Maintain awareness of speed, pitch attitude, and descent rate.`,
    4000
  );

  // 🟢 [ACTION] Stabilized Approach Monitoring
  await notifyUser(
    "Landing Procedure",
    `[ACTION] Stabilized approach criteria check:

- Speed: ${Math.round(flightModel.speed_indicated_knots)} knots
- Altitude: ${Math.round(flightModel.altitude_ft)} ft
- Vertical speed: ${Math.round(flightModel.vertical_speed_ftmin)} ft/min

Aircraft must remain within stable limits.`,
    5000
  );

  checkPoint("Approaching runway");

  // 🟢 [ACTION] Final Approach Guidance
  await notifyUser(
    "Landing Procedure",
    `[ACTION] Final approach.

Maintain glide slope and runway alignment. Prepare for flare.`,
    4000
  );

  // 🟢 [ACTION] Flare Preparation
  await waitForCondition(() => flightModel.altitude_ft < 250);

  flightModel.set_autopilot_speed_indicated_target(130);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Flare preparation initiated.

Reducing target speed to 130 knots for landing.`,
    4000
  );

  // 🟢 [ACTION] Flare Execution
  await waitForCondition(() => flightModel.altitude_ft < 150);

  flightModel.set_autopilot_vertical_speed_target(-20);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Flare initiated.

Descent rate reduced to achieve a smooth touchdown.`,
    4000
  );

  // 🟢 [ACTION] Touchdown Detection
  await waitForCondition(() => flightModel.weight_on_wheel);

  await notifyUser(
    "Landing Procedure",
    `[EVENT] Touchdown confirmed.

Main landing gear has made ground contact.`,
    5000
  );

  // 🟢 [ACTION] Apply Braking
  flightModel.set_parking_brake(true);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Braking applied.

Aircraft deceleration in progress. Maintain directional control.`,
    4000
  );

  // 🟢 [ACTION] Rollout Monitoring
  await waitForCondition(() => flightModel.speed_indicated_knots < 30);

  await notifyUser(
    "Landing Procedure",
    `[ACTION] Rollout phase.

Speed reduced below 30 knots. Aircraft exiting active landing phase.`,
    4000
  );

  checkPoint("Landing Complete");

  // 🎓 [FINAL]
  await notifyUser(
    "Landing Procedure",
    `[COMPLETE] The landing procedure has been successfully completed.

All objectives achieved under stabilized conditions.`,
    5000
  );
}
