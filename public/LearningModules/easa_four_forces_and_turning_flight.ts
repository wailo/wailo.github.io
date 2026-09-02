import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type ForceObservation = {
  condition: string
  bank: number
  lift: number
  weight: number
  thrust: number
  drag: number
  gForce: number
  idealLoadFactor: number
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
    'Four forces and turning flight',
    'Compare **lift, weight, thrust and drag** in straight flight and in level turns at **30°** and **45°** of bank.',
  )

  const equilibrium = await context.askQuestion({
    id: 'easa-four-forces-equilibrium',
    type: 'multiple-choice',
    title: 'Straight-flight equilibrium',
    question: 'Which simplified force balance applies in steady, straight and level flight?',
    choices: [
      { id: 'correct', label: 'Lift balances weight, and thrust balances drag' },
      { id: 'crossed', label: 'Lift balances thrust, and weight balances drag' },
      { id: 'lift-only', label: 'Only lift acts on the aircraft' },
      { id: 'same-direction', label: 'All four forces act in the same direction' },
    ],
    correctAnswer: 'correct',
    correctFeedback: 'Correct. With no acceleration, each opposing force pair is in equilibrium.',
    incorrectFeedback: 'Separate the vertical forces from those acting along the flight path.',
  })
  context.checkPoint(`Four-force equilibrium answered in ${equilibrium.attempts} attempt(s)`)

  const repositioned = await context.repositionWithAutopilot(context, 4_000, 100, 270, 30_000)
  if (!repositioned) return

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(100)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_heading_hold(false)
  flightModel.set_autopilot_bank_target(0)
  flightModel.set_autopilot_bank_hold(true)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.lift, simProps.weight], true)
  context.plotView([simProps.thrust, simProps.drag], true)
  context.plotView([simProps.bank_deg, simProps.g_force], true)
  context.plotView([simProps.speed_indicated_knots, simProps.altitude_ft], true)

  const observations: ForceObservation[] = []
  const record = (condition: string) => {
    const bank = Math.abs(flightModel.bank_deg)
    observations.push({
      condition,
      bank,
      lift: flightModel.lift,
      weight: flightModel.weight,
      thrust: flightModel.thrust,
      drag: flightModel.drag,
      gForce: flightModel.g_force,
      idealLoadFactor: 1 / Math.cos((bank * Math.PI) / 180),
    })
  }

  const waitUntilStable = (targetBank: number) =>
    context.waitForCondition(
      () =>
        Math.abs(flightModel.bank_deg - targetBank) < 1.5 &&
        Math.abs(flightModel.altitude_ft - 4_000) < 120 &&
        Math.abs(flightModel.speed_indicated_knots - 100) < 3,
      1_000,
      200,
      45_000,
    )

  if (!(await waitUntilStable(0))) return
  record('Straight')
  context.checkPoint('Straight-flight forces recorded')

  const turnPrediction = await context.askQuestion({
    id: 'easa-turn-lift-vector',
    type: 'multiple-choice',
    title: 'The banked lift vector',
    question: 'Why must total lift increase in a banked, level turn?',
    choices: [
      {
        id: 'components',
        label: 'It must provide a vertical component and a horizontal turning component',
      },
      { id: 'weight-gone', label: 'Weight disappears during the turn' },
      { id: 'drag-turns', label: 'Drag alone turns the aircraft' },
      { id: 'mass-rises', label: 'The aircraft mass increases with bank angle' },
    ],
    correctAnswer: 'components',
    correctFeedback:
      'Correct. The vertical lift component supports weight and the horizontal component turns the aircraft.',
    incorrectFeedback: 'Consider how banking tilts the total lift vector.',
  })
  context.checkPoint(`Lift-vector question answered in ${turnPrediction.attempts} attempt(s)`)

  await context.waitForUser({
    title: 'Begin turning-flight comparison',
    message:
      'Continue to enter a **30° level turn**. Speed and altitude hold remain active so the force changes can be observed.',
    buttonLabel: 'Enter 30° turn',
  })

  for (const targetBank of [30, 45]) {
    await context.notifyUser(
      `${targetBank}° level turn`,
      `The bank target is now **${targetBank}°**. Watch total lift, drag and G-force while altitude and speed remain approximately constant.`,
    )
    flightModel.set_autopilot_bank_target(targetBank)
    if (!(await waitUntilStable(targetBank))) return
    record(`${targetBank}° turn`)
    context.checkPoint(`${targetBank}° turning-flight forces recorded`)
  }

  flightModel.set_autopilot_bank_target(0)
  await waitUntilStable(0)

  const rows = observations
    .map(
      (item) =>
        `| ${item.condition} | ${item.bank.toFixed(1)}° | ${item.lift.toFixed(0)} N | ${item.weight.toFixed(0)} N | ${item.thrust.toFixed(0)} N | ${item.drag.toFixed(0)} N | ${item.gForce.toFixed(2)} G | ${item.idealLoadFactor.toFixed(2)} |`,
    )
    .join('\n')

  await context.notifyUser(
    'Measured force comparison',
    `| Condition | Bank | Lift | Weight | Thrust | Drag | Measured G | Ideal load factor |
|---|---:|---:|---:|---:|---:|---:|---:|
${rows}

Weight remains essentially constant. Increasing bank requires more total lift, and the associated increase in induced drag requires more thrust to maintain speed.`,
  )

  const loadFactor = await context.askQuestion({
    id: 'easa-turn-load-factor',
    type: 'multiple-choice',
    title: 'Load factor',
    question: 'What is the approximate ideal load factor in a 45° level turn?',
    choices: [
      { id: '1', label: '1.00 G' },
      { id: '1.15', label: '1.15 G' },
      { id: '1.41', label: '1.41 G' },
      { id: '2', label: '2.00 G' },
    ],
    correctAnswer: '1.41',
    correctFeedback: 'Correct. The ideal value is 1 / cos(45°), approximately 1.41.',
    incorrectFeedback: 'Compare the 45° row with the calculated Ideal load factor column.',
  })
  context.checkPoint(`Load-factor question answered in ${loadFactor.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-four-forces-turn-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Explain how the lift vector produces a level turn and why lift, drag, thrust and load factor increase with bank angle.',
    placeholder: 'Relate the vertical and horizontal components of lift to the measured forces…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(`Four forces lesson completed · reflection ${reflection.answer.length} chars`)

  await context.notifyUser(
    'Lesson complete',
    'Banking redirects lift. Its vertical component supports weight, while its horizontal component provides the inward acceleration that changes the aircraft’s direction.',
  )
}
