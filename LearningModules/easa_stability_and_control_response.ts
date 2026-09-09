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
    'Stability and control response',
    'Short elevator and aileron inputs will disturb a trimmed C172. Watch the immediate **control response** and the aircraft’s subsequent **stability response** after each control returns to neutral.',
  )

  const concepts = await context.askQuestion({
    id: 'easa-stability-control-distinction',
    type: 'multiple-choice',
    title: 'Control and stability',
    question: 'Which statement correctly distinguishes control response from stability?',
    choices: [
      {
        id: 'response-and-tendency',
        label:
          'Control response follows an input; stability describes the tendency after disturbance',
      },
      { id: 'same-concept', label: 'Control response and stability are identical concepts' },
      { id: 'engine-only', label: 'Stability depends only on engine power' },
      { id: 'no-motion', label: 'A stable aircraft cannot change attitude' },
    ],
    correctAnswer: 'response-and-tendency',
    correctFeedback:
      'Correct. Controllability concerns commanded motion; stability concerns what follows a disturbance.',
    incorrectFeedback: 'Separate the pilot-commanded response from the aircraft’s later tendency.',
  })
  context.checkPoint(`Stability concept answered in ${concepts.attempts} attempt(s)`)

  const repositioned = await context.repositionWithAutopilot(context, 4_000, 100, 270, 30_000)
  if (!repositioned) return

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(100)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_heading_target(270)
  flightModel.set_autopilot_heading_hold(true)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.elevator_position, simProps.pitch_deg], true)
  context.plotView([simProps.aoa_deg, simProps.vertical_speed_ftmin], true)
  context.plotView([simProps.aileron_position, simProps.bank_deg], true)
  context.plotView([simProps.yaw_dot_deg, simProps.rudder_position], true)

  await context.waitForUser({
    title: 'Observe an open-loop response',
    message:
      'Continue to disengage the autopilot. Each control will receive a short pulse and then return to neutral; no further command will be applied during the observation period.',
    buttonLabel: 'Begin response test',
  })

  flightModel.set_autopilot_master_switch(false)
  flightModel.set_autopilot_altitude_hold(false)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_heading_hold(false)
  flightModel.set_autopilot_auto_trim(false)
  flightModel.set_elevator_position(0)
  flightModel.set_aileron_position(0)
  flightModel.set_rudder_position(0)
  await context.waitFor(1_000)

  const initialPitch = flightModel.pitch_deg
  await context.notifyUser(
    'Longitudinal response',
    'A brief **nose-up elevator pulse** will change pitch and angle of attack. The elevator then returns to neutral so the natural longitudinal response remains visible.',
  )
  flightModel.set_elevator_position(-0.1)
  await context.waitFor(1_000)
  flightModel.set_elevator_position(0)
  await context.waitFor(8_000)
  const pitchAfterPulse = flightModel.pitch_deg
  const verticalSpeedAfterPulse = flightModel.vertical_speed_ftmin
  context.checkPoint('Longitudinal control pulse completed')

  const longitudinal = await context.askQuestion({
    id: 'easa-longitudinal-response',
    type: 'multiple-choice',
    title: 'Longitudinal response',
    question: 'Why does motion continue after the elevator pulse has returned to neutral?',
    choices: [
      {
        id: 'dynamic-response',
        label:
          'Aircraft inertia and aerodynamic restoring forces produce a dynamic response over time',
      },
      { id: 'elevator-stuck', label: 'The elevator must still be stuck at full deflection' },
      { id: 'gravity-off', label: 'Gravity was temporarily switched off' },
      { id: 'mass-zero', label: 'Aircraft mass became zero during the pulse' },
    ],
    correctAnswer: 'dynamic-response',
    correctFeedback:
      'Correct. The state continues to evolve after the input as inertia and aerodynamic forces interact.',
    incorrectFeedback:
      'The plotted elevator is neutral; consider the aircraft’s momentum and restoring forces.',
  })
  context.checkPoint(`Longitudinal response answered in ${longitudinal.attempts} attempt(s)`)

  await context.notifyUser(
    'Lateral-directional response',
    'A brief **right-aileron pulse** will establish roll. After the aileron returns to neutral, observe bank, yaw rate and any coupled motion.',
  )
  flightModel.set_aileron_position(0.12)
  await context.waitFor(1_000)
  flightModel.set_aileron_position(0)
  await context.waitFor(8_000)
  const bankAfterPulse = flightModel.bank_deg
  const yawRateAfterPulse = flightModel.yaw_dot_deg
  context.checkPoint('Lateral control pulse completed')

  await context.notifyUser(
    'Observed response',
    `| Observation | Value |
|---|---:|
| Initial pitch | ${initialPitch.toFixed(1)}° |
| Pitch after elevator pulse | ${pitchAfterPulse.toFixed(1)}° |
| Vertical speed after elevator pulse | ${verticalSpeedAfterPulse.toFixed(0)} ft/min |
| Bank after aileron pulse | ${bankAfterPulse.toFixed(1)}° |
| Yaw rate after aileron pulse | ${yawRateAfterPulse.toFixed(1)}°/s |

The exact amplitudes depend on the simulated state. The important distinction is between the immediate motion caused by the input and the motion that follows after the control is neutral.`,
  )

  const coupling = await context.askQuestion({
    id: 'easa-lateral-directional-coupling',
    type: 'multiple-choice',
    title: 'Coupled response',
    question: 'Why can an aileron input produce both roll and yaw motion?',
    choices: [
      {
        id: 'aerodynamic-coupling',
        label: 'Changes in wing lift and drag couple lateral and directional motion',
      },
      { id: 'weight-sideways', label: 'Weight permanently turns sideways' },
      { id: 'elevator-roll', label: 'The elevator becomes the primary roll control' },
      { id: 'no-coupling', label: 'The plotted yaw response cannot be related to roll' },
    ],
    correctAnswer: 'aerodynamic-coupling',
    correctFeedback:
      'Correct. Differential lift and drag, sideslip and directional stability couple roll and yaw.',
    incorrectFeedback:
      'Consider the different lift and drag changes produced across the two wings.',
  })
  context.checkPoint(`Coupled response answered in ${coupling.attempts} attempt(s)`)

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(100)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_bank_target(0)
  flightModel.set_autopilot_bank_hold(true)

  const reflection = await context.askQuestion({
    id: 'easa-stability-response-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Describe one immediate control response and one subsequent stability response that you observed.',
    placeholder:
      'Refer to the input trace and the aircraft motion after the input returned to neutral…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(`Stability lesson completed · reflection ${reflection.answer.length} chars`)
  await context.notifyUser(
    'Lesson complete',
    'Control inputs initiate motion; stability determines how the aircraft state develops after the disturbance. The two qualities are related, but they are not the same.',
  )
}
