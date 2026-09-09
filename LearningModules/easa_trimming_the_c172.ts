import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type TrimObservation = {
  condition: string
  speed: number
  pitch: number
  aoa: number
  elevator: number
  trim: number
}

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simulation = simControls.simulation
  const simProps: C172SimProps = context.props

  context.resetPanels()
  simulation.reset_simulation()
  const flightModel = simulation.set_flight_model_c172()
  simControls.flightModel = flightModel

  await context.notifyUser(
    'Trimming the C172',
    'Trim establishes a control equilibrium for a chosen flight condition. Compare the C172 trimmed at **100 kt** and **80 kt**, then observe what happens when trim is deliberately displaced.',
  )

  const trimPurpose = await context.askQuestion({
    id: 'easa-trim-purpose',
    type: 'multiple-choice',
    title: 'Purpose of trim',
    question: 'What is the primary purpose of elevator trim?',
    choices: [
      {
        id: 'relieve-force',
        label: 'Relieve the sustained control force required for a selected condition',
      },
      { id: 'lock-altitude', label: 'Guarantee that altitude can never change' },
      { id: 'increase-weight', label: 'Increase aircraft weight for stability' },
      { id: 'replace-controls', label: 'Replace all primary flight controls' },
    ],
    correctAnswer: 'relieve-force',
    correctFeedback:
      'Correct. Trim reduces the continuous control effort; it is not an altitude-hold system.',
    incorrectFeedback: 'Think about control force rather than automatic flight-path control.',
  })
  context.checkPoint(`Trim purpose answered in ${trimPurpose.attempts} attempt(s)`)

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

  context.setTab('flight-model', 'Joystick')
  context.plotView([simProps.elevator_position, simProps.elevator_trim_position], true)
  context.plotView([simProps.pitch_deg, simProps.aoa_deg], true)
  context.plotView([simProps.speed_indicated_knots, simProps.altitude_ft], true)

  const observations: TrimObservation[] = []
  const observe = (condition: string) =>
    observations.push({
      condition,
      speed: flightModel.speed_indicated_knots,
      pitch: flightModel.pitch_deg,
      aoa: flightModel.aoa_deg,
      elevator: flightModel.elevator_position,
      trim: flightModel.elevator_trim_position,
    })

  const stabilizeAt = async (speed: number) => {
    flightModel.set_autopilot_speed_indicated_target(speed)
    return context.waitForCondition(
      () =>
        Math.abs(flightModel.speed_indicated_knots - speed) < 2 &&
        Math.abs(flightModel.altitude_ft - 4_000) < 100,
      1_000,
      200,
      45_000,
    )
  }

  if (!(await stabilizeAt(100))) return
  observe('100 kt trim')
  context.checkPoint('100 kt trim condition recorded')

  await context.waitForUser({
    title: 'Change the trimmed condition',
    message:
      'Continue to reduce the target speed to **80 kt** while maintaining altitude. Watch the elevator act during the transition and the trim settle at a new value.',
    buttonLabel: 'Trim for 80 kt',
  })

  if (!(await stabilizeAt(80))) return
  observe('80 kt trim')
  context.checkPoint('80 kt trim condition recorded')

  const rows = observations
    .map(
      (item) =>
        `| ${item.condition} | ${item.speed.toFixed(1)} kt | ${item.pitch.toFixed(1)}° | ${item.aoa.toFixed(1)}° | ${item.elevator.toFixed(2)} | ${item.trim.toFixed(2)} |`,
    )
    .join('\n')

  await context.notifyUser(
    'Two trimmed conditions',
    `| Condition | IAS | Pitch | AoA | Elevator | Elevator trim |
|---|---:|---:|---:|---:|---:|
${rows}

The slower level-flight condition requires a different attitude and AoA. Trim changes to establish the corresponding control equilibrium.`,
  )

  const technique = await context.askQuestion({
    id: 'easa-trim-technique',
    type: 'multiple-choice',
    title: 'Trimming technique',
    question: 'Which sequence best describes normal trimming technique?',
    choices: [
      {
        id: 'attitude-power-trim',
        label: 'Set attitude and power, allow the condition to stabilize, then trim away the force',
      },
      { id: 'trim-manoeuvre', label: 'Use trim as the primary control to perform the manoeuvre' },
      { id: 'random-trim', label: 'Move trim randomly until altitude happens to remain constant' },
      { id: 'never-retrim', label: 'Trim once before take-off and never adjust it again' },
    ],
    correctAnswer: 'attitude-power-trim',
    correctFeedback:
      'Correct. Fly the desired condition with the primary controls, then trim to relieve the force.',
    incorrectFeedback:
      'The primary controls establish the condition; trim removes sustained effort.',
  })
  context.checkPoint(`Trim technique answered in ${technique.attempts} attempt(s)`)

  await context.notifyUser(
    'Trim is not an autopilot',
    'The autopilot will disengage and the trim will be deliberately offset. No elevator input will be held. Observe that the flight path changes rather than remaining locked.',
  )
  const originalTrim = flightModel.elevator_trim_position
  const offsetTrim = Math.min(1, originalTrim + 0.15)
  const altitudeBeforeOffset = flightModel.altitude_ft
  flightModel.set_autopilot_master_switch(false)
  flightModel.set_autopilot_altitude_hold(false)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_heading_hold(false)
  flightModel.set_autopilot_auto_trim(false)
  flightModel.set_elevator_position(0)
  flightModel.set_elevator_trim_position(offsetTrim)
  await context.waitFor(6_000)

  const altitudeChange = flightModel.altitude_ft - altitudeBeforeOffset
  await context.notifyUser(
    'Response to a trim offset',
    `The trim changed from **${originalTrim.toFixed(2)}** to **${offsetTrim.toFixed(2)}**. With no altitude hold, altitude changed by **${altitudeChange.toFixed(0)} ft** during the observation.

Trim creates an aerodynamic command. It does not sense and correct altitude like an autopilot.`,
  )

  flightModel.set_elevator_trim_position(originalTrim)
  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(100)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_bank_target(0)
  flightModel.set_autopilot_bank_hold(true)

  const reflection = await context.askQuestion({
    id: 'easa-trim-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Explain why a change of speed or configuration normally requires retrimming, and why trim must not be treated as an autopilot.',
    placeholder: 'Relate equilibrium, control force, attitude and flight path…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(`C172 trim lesson completed · reflection ${reflection.answer.length} chars`)
  await context.notifyUser(
    'Lesson complete',
    'Fly the desired attitude and power setting first, allow the aircraft to settle, then trim away the sustained control force. Recheck and refine as the condition changes.',
  )
}
