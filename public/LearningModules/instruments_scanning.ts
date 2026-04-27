import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const { controls, repositionWithAutopilot, waitFor, notifyUser } = context;
  const simulation = controls.simulation;

  simulation.reset_simulation();
  simulation.set_flight_model_c172();
  simulation.set_pfd_display(false);

  repositionWithAutopilot(context, 3000, 100, 45);
  await waitFor(1000);

  // -----------------------------
  // INTRO (minimal)
  // -----------------------------
  notifyUser(
    "Instrument Scan",
    "Follow the rhythm: 1–2 / 3–4 / 5–6.\nAlways return to center."
  );
  await waitFor(3000);

  // -----------------------------
  // VISUAL T-DIAGRAM
  // -----------------------------
  function render(active: string) {
    const on = (name: string) => (name === active ? "●" : "○");

    return `
  ${on("spd")} ${on("att")} ${on("alt")}
  ${on("-")} ${on("hdg")} ${on("-")}
`;
  }

  // -----------------------------
  // PULSE CONTROL
  // -----------------------------
  async function pulse(
    name: "att" | "spd" | "alt" | "hdg",
    setter: (v: boolean) => void,
    delay: number
  ) {
    notifyUser("Scan", render(name));

    setter(false);
    await waitFor(delay * 0.15);
    setter(true);

    await waitFor(delay);
  }

  async function pair(
    a: () => Promise<void>,
    b: () => Promise<void>,
    pause: number
  ) {
    await a(); // beat 1
    await b(); // beat 2
    await waitFor(pause);
  }

  // -----------------------------
  // TRAINING LOOP
  // -----------------------------
  const cycles = 20;

  for (let i = 0; i < cycles; i++) {
    const pace = Math.max(0.2, 1 - i * 0.03);

    const beat = 900 * pace;
    const pause = 250 * pace;

    // introduce disturbance
    if (i === 10) {
      const fm = context.controls.flightModel;
      fm.set_autopilot_pitch_target(fm.pitch_deg - 2);
      fm.set_autopilot_bank_target(10);
      fm.set_autopilot_speed_indicated_target(60);
      fm.set_autopilot_master_switch(true);
      fm.set_autopilot_pitch_hold(true);
      fm.set_autopilot_bank_hold(true);
      fm.set_autopilot_speed_indicated_hold(true);
    }

    // 1–2 (Attitude ↔ Airspeed)
    await pair(
      () =>
        pulse(
          "att",
          simulation.set_analog_attitude_indicator_visible,
          beat
        ),
      () =>
        pulse(
          "spd",
          simulation.set_analog_speed_indicator_visible,
          beat / 2
        ),
      pause
    );

    // 3–4 (Attitude ↔ Altimeter)
    await pair(
      () =>
        pulse(
          "att",
          simulation.set_analog_attitude_indicator_visible,
          beat
        ),
      () =>
        pulse(
          "alt",
          simulation.set_analog_altimeter_visible,
          beat / 2
        ),
      pause
    );

    // 5–6 (Attitude ↔ Heading)
    await pair(
      () =>
        pulse(
          "att",
          simulation.set_analog_attitude_indicator_visible,
          beat
        ),
      () =>
        pulse(
          "hdg",
          simulation.set_analog_heading_indicator_visible,
          beat / 2
        ),
      pause
    );
  }

  // -----------------------------
  // END
  // -----------------------------
  notifyUser(
    "Complete",
    "Keep the scan continuous.\nCenter → Cross-check → Center."
  );
}