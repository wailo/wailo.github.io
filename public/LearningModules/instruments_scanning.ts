import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const notifyUser = context.notifyUser;

  const simulation = simControls.simulation;

  simulation.reset_simulation();
  const flightModel = simulation.set_flight_model_b747();
  simulation.set_pfd_display(false);
  repositionWithAutopilot(context, 3000, 200, 45);
  await waitFor(1000);

  // ---------------------------------
  // INTRODUCTION
  // ---------------------------------

  notifyUser(
    'Instrument Scan Training',
    'Instrument flying requires a continuous scan. You do not stare at one instrument—you move your eyes in a controlled pattern.'
  );
  await waitFor(4000);

  notifyUser(
    'Core Concept',
    'The Attitude Indicator is your primary reference. All other instruments support and confirm what you see there.'
  );
  await waitFor(4000);

  notifyUser(
    'Scan Structure',
    'You will follow a repeating rhythm: 1–2, 3–4, 5–6. Always returning to center.'
  );
  await waitFor(4000);

 

  // ---------------------------------
  // INSTRUMENT INTRODUCTION
  // ---------------------------------

  async function showInstrument(
    title: string,
    description: string,
    setter: (v: boolean) => void
  ) {
    notifyUser(title, description);
    setter(false);
    await waitFor(500);
    setter(true);
    await waitFor(2500);
  }

  await showInstrument(
    'Attitude Indicator (Center)',
    'Shows pitch and bank. This is your primary control reference.',
    simulation.set_analog_attitude_indicator_visible
  );

  await showInstrument(
    'Airspeed Indicator (Left)',
    'Shows speed in knots. Helps you maintain performance.',
    simulation.set_analog_speed_indicator_visible
  );

  await showInstrument(
    'Altimeter (Right)',
    'Shows altitude in feet. Confirms vertical stability.',
    simulation.set_analog_altimeter_visible
  );

  await showInstrument(
    'Heading Indicator (Bottom)',
    'Shows direction. Keeps you on your assigned heading.',
    simulation.set_analog_heading_indicator_visible
  );

  // ---------------------------------
  // LESSON EXPECTATION
  // ---------------------------------

  notifyUser(
    'Lesson Objective',
    'You will build a smooth, repeatable scan pattern using rhythm and flow.'
  );
  await waitFor(3500);

  notifyUser(
    'Expected Outcome',
    'By the end, your scan should feel automatic, continuous, and evenly paced—without fixation.'
  );
  await waitFor(4000);

  // ---------------------------------
  // RHYTHM SYSTEM
  // ---------------------------------

  let sequence: string[] = [];
  let stepCounter = 1;

  function resetSequence() {
    sequence = [];
    stepCounter = 1;
  }

  function addStep(label: string) {
    sequence.push(`→ ${stepCounter} ${label}`);
    stepCounter++;
    return sequence.join("\n");
  }

  async function pulse(setter: (v: boolean) => void, delay: number) {
    setter(false);
    await waitFor(delay * 0.1);
    setter(true);
    await waitFor(delay);
  }

  async function scanStep(
    title: string,
    label: string,
    setter: (v: boolean) => void,
    delay: number
  ) {
    const flow = addStep(label);

    notifyUser(title, flow);

    await pulse(setter, delay);
    await waitFor(delay * 0.4);
  }

  async function scanPair(
    step1: () => Promise<void>,
    step2: () => Promise<void>,
    pairPause: number
  ) {
    await step2();
    await step1();
    // await step1();
    await waitFor(pairPause);
  }

  // ---------------------------------
  // TRAINING LOOP
  // ---------------------------------
  const nCycles = 30
  for (let i = 1; i <= nCycles; i++) {
    const paceFactor = Math.max(0.35, 1 - i * 0.035);

    const mainDelay = 1400 * paceFactor;
    const shortDelay = 800 * paceFactor;
    const pairPause = 300 * paceFactor;

    resetSequence();
    if (i % 3 == 0) {
    await notifyUser(
      `Scan Cycle ${i} of ${nCycles}`,
      i === 0
        ? 'Start slow. Count: 1–2, 3–4, 5–6.'
        : i === 3
        ? 'You should begin to feel the rhythm.'
        : i === 6
        ? 'Keep the flow steady. Avoid fixation.'
        : i === 15
        ? 'This should feel natural.'
        : i === 21
        ? 'Final cycle. Smooth and continuous.'
        : 'Continue scanning.', 2000
    );
  }
  // Move the aicraft
  if (i == 10) {
    flightModel.set_autopilot_pitch_target(flightModel.pitch_deg - 2);
    flightModel.set_autopilot_bank_target(10);

    flightModel.set_autopilot_master_switch(true);
    flightModel.set_autopilot_pitch_hold(true);
    flightModel.set_autopilot_bank_hold(true);
  }
    // 1–2
    await scanPair(
      () =>
        scanStep(
          'Attitude (Center)',
          'Attitude',
          simulation.set_analog_attitude_indicator_visible,
          shortDelay
        ),
      () =>
        scanStep(
          'Airspeed (Left)',
          'Airspeed',
          simulation.set_analog_speed_indicator_visible,
          shortDelay
        ),
      pairPause
    );

    // 3–4
    await scanPair(
      () =>
        scanStep(
          'Back to Attitude',
          'Attitude',
          simulation.set_analog_attitude_indicator_visible,
          shortDelay
        ),
      () =>
        scanStep(
          'Altimeter (Right)',
          'Altimeter',
          simulation.set_analog_altimeter_visible,
          shortDelay
        ),
      pairPause
    );

    // 5–6
    await scanPair(
      () =>
        scanStep(
          'Back to Attitude',
          'Attitude',
          simulation.set_analog_attitude_indicator_visible,
          shortDelay
        ),
      () =>
        scanStep(
          'Heading (Bottom)',
          'Heading',
          simulation.set_analog_heading_indicator_visible,
          shortDelay
        ),
      pairPause
    );

    // Reset anchor
    notifyUser(
      'Reset (Center)',
      sequence.join("\n") + '\n→ Center'
    );

    await pulse(
      simulation.set_six_instruments_display,
      mainDelay
    );
  }

  // ---------------------------------
  // COMPLETION
  // ---------------------------------

  notifyUser(
    'Training Complete',
    'Maintain this scan in all instrument flight. Keep it continuous, rhythmic, and centered on attitude.'
  );
}