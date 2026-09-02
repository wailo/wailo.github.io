import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simulation = simControls.simulation
  const simProps: C172SimProps = context.props

  context.resetPanels()
  simulation.reset_simulation()
  const flightModel = simulation.set_flight_model_c172()
  simControls.flightModel = flightModel

  await context.notifyUser(
    'Stall recognition and recovery',
    'The C172 will decelerate in clean configuration while the autopilot attempts to maintain altitude. Identify the developing stall from **airspeed, AoA, pitch, lift coefficient and airflow**, then observe an immediate recovery.',
  )

  const recognition = await context.askQuestion({
    id: 'easa-stall-recognition',
    type: 'multiple-choice',
    title: 'Recognizing a developing stall',
    question: 'Which trend is consistent with an approaching stall during level deceleration?',
    choices: [
      {
        id: 'speed-down-aoa-up',
        label: 'Airspeed decreases while pitch and angle of attack increase',
      },
      { id: 'speed-up-aoa-down', label: 'Airspeed increases while angle of attack decreases' },
      { id: 'heading-only', label: 'Only heading changes while AoA remains constant' },
      { id: 'weight-zero', label: 'Aircraft weight falls to zero' },
    ],
    correctAnswer: 'speed-down-aoa-up',
    correctFeedback:
      'Correct. Maintaining lift as speed falls requires increasing lift coefficient and AoA until the critical condition is reached.',
    incorrectFeedback: 'Consider how the wing compensates for reducing dynamic pressure.',
  })
  context.checkPoint(`Stall recognition answered in ${recognition.attempts} attempt(s)`)

  const recoveryPriority = await context.askQuestion({
    id: 'easa-stall-recovery-priority',
    type: 'multiple-choice',
    title: 'Recovery priority',
    question: 'What is the first aerodynamic priority in stall recovery?',
    choices: [
      { id: 'reduce-aoa', label: 'Reduce angle of attack below the critical value' },
      { id: 'hold-altitude', label: 'Maintain altitude at all costs' },
      { id: 'raise-nose', label: 'Raise the nose further' },
      { id: 'bank-steeply', label: 'Enter a steep turn' },
    ],
    correctAnswer: 'reduce-aoa',
    correctFeedback: 'Correct. Restoring attached airflow begins by reducing AoA.',
    incorrectFeedback: 'Remove the aerodynamic condition that caused flow separation.',
  })
  context.checkPoint(`Recovery priority answered in ${recoveryPriority.attempts} attempt(s)`)

  const repositioned = await context.repositionWithAutopilot(context, 4_000, 90, 270, 30_000)
  if (!repositioned) return

  flightModel.set_flaps_selector_position(simControls.C172FlapSelector.ZERO)
  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_heading_target(270)
  flightModel.set_autopilot_heading_hold(true)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_altitude_hold(false)
  flightModel.set_autopilot_vertical_speed_target(0)
  flightModel.set_autopilot_vertical_speed_hold(true)

  context.setTab('realtime', 'Airflow')
  context.plotView([simProps.speed_indicated_knots, simProps.vertical_speed_ftmin], true)
  context.plotView(simProps.aoa_deg, true)
  context.plotView([simProps.cl, simProps.lift], true)
  context.plotView([simProps.pitch_deg, simProps.elevator_position], true)

  await context.waitForUser({
    title: 'Begin stall demonstration',
    message:
      'Continue to reduce power. The vertical-speed controller will progressively raise AoA while trying to maintain level flight. Recovery will begin automatically as soon as the stall flag is confirmed.',
    buttonLabel: 'Reduce power',
  })

  const entryAltitude = flightModel.altitude_ft
  flightModel.set_engine_mixture_position(1)
  flightModel.set_engine_throttle_position(0.2)
  context.checkPoint('Stall entry initiated')

  const stalled = await context.waitForCondition(
    () => flightModel.stalling,
    500,
    100,
    90_000,
    false,
  )

  if (!stalled) {
    context.checkPoint('Stall condition not reached')
    await context.notifyUser(
      'Stall not reached',
      'The stall flag was not confirmed during the observation period. Run the lesson again and watch the AoA and airspeed trends.',
    )
    return
  }

  const stallSpeed = flightModel.speed_indicated_knots
  const stallAoa = flightModel.aoa_deg
  const stallCl = flightModel.cl
  const stallPitch = flightModel.pitch_deg
  context.checkPoint('Stall recognized')

  flightModel.set_autopilot_vertical_speed_hold(false)
  flightModel.set_autopilot_master_switch(false)
  flightModel.set_autopilot_auto_trim(false)
  flightModel.set_elevator_position(0.25)
  flightModel.set_engine_throttle_position(1)

  const airflowRestored = await context.waitForCondition(
    () => !flightModel.stalling && flightModel.aoa_deg < flightModel.max_aoa_deg - 1,
    500,
    100,
    20_000,
    false,
  )

  flightModel.set_elevator_position(0)
  const speedRecovered = await context.waitForCondition(
    () => flightModel.speed_indicated_knots > Math.max(65, stallSpeed + 10),
    500,
    100,
    30_000,
    false,
  )

  const recoveryAltitude = flightModel.altitude_ft
  const recoveryAoa = flightModel.aoa_deg
  context.checkPoint(
    airflowRestored && speedRecovered ? 'Stall recovery completed' : 'Stall recovery incomplete',
  )

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(90)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_bank_target(0)
  flightModel.set_autopilot_bank_hold(true)
  flightModel.set_engine_throttle_position(0.7)

  await context.notifyUser(
    'Stall and recovery observations',
    `| Observation | Value |
|---|---:|
| Stall IAS | ${stallSpeed.toFixed(1)} kt |
| Stall AoA | ${stallAoa.toFixed(1)}° |
| Maximum-AoA reference | ${flightModel.max_aoa_deg.toFixed(1)}° |
| Lift coefficient at recognition | ${stallCl.toFixed(2)} |
| Pitch at recognition | ${stallPitch.toFixed(1)}° |
| AoA after unloading | ${recoveryAoa.toFixed(1)}° |
| Altitude change | ${(recoveryAltitude - entryAltitude).toFixed(0)} ft |

The recovery accepted altitude loss in order to reduce AoA, restore attached airflow and regain airspeed.`,
  )

  const sequence = await context.askQuestion({
    id: 'easa-stall-recovery-sequence',
    type: 'multiple-choice',
    title: 'Recovery sequence',
    question: 'Which sequence best matches the demonstrated aerodynamic recovery?',
    choices: [
      {
        id: 'unload-power-stabilize',
        label: 'Reduce AoA, apply power, regain airspeed, then stabilize the flight path',
      },
      {
        id: 'hold-altitude-first',
        label: 'Hold altitude first, even if AoA remains beyond critical',
      },
      { id: 'pitch-up', label: 'Increase pitch until the stall flag clears' },
      { id: 'turn', label: 'Use a steep bank to accelerate recovery' },
    ],
    correctAnswer: 'unload-power-stabilize',
    correctFeedback:
      'Correct. Unload the wing first, then use power and controlled flight-path recovery.',
    incorrectFeedback:
      'The critical AoA must be removed before altitude recovery becomes the priority.',
  })
  context.checkPoint(`Recovery sequence answered in ${sequence.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-stall-recovery-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Identify the stall cues visible in the plots and explain why accepting some altitude loss supports a safe aerodynamic recovery.',
    placeholder: 'Relate airspeed, AoA, airflow separation, pitch, power and recovery priorities…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(
    `Stall recovery lesson completed · reflection ${reflection.answer.length} chars`,
  )
  await context.notifyUser(
    'Lesson complete',
    'Recognize the developing trend, reduce AoA promptly, apply power as appropriate, regain flying speed and only then restore the desired flight path without causing a secondary stall.',
  )
}
