import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type DragObservation = {
  targetSpeed: number
  indicatedSpeed: number
  aoa: number
  parasiteCoefficient: number
  inducedCoefficient: number
  drag: number
  lift: number
  liftToDrag: number
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
    'Drag and lift-to-drag ratio',
    'This lesson compares three level-flight conditions. Observe how **parasite drag**, **induced drag**, total drag and the measured **lift-to-drag ratio** change with airspeed.',
  )

  const dragPrediction = await context.askQuestion({
    id: 'easa-drag-speed-prediction',
    type: 'multiple-choice',
    title: 'Drag and airspeed',
    question: 'Which statement best describes the two principal forms of drag?',
    choices: [
      {
        id: 'induced-low-parasite-high',
        label: 'Induced drag is greatest at low speed; parasite drag grows as speed increases',
      },
      {
        id: 'both-fall',
        label: 'Both induced and parasite drag continuously decrease as speed increases',
      },
      {
        id: 'both-fixed',
        label: 'Both forms of drag remain constant whenever altitude is held',
      },
      {
        id: 'parasite-low-induced-high',
        label: 'Parasite drag is greatest at low speed; induced drag grows as speed increases',
      },
    ],
    correctAnswer: 'induced-low-parasite-high',
    correctFeedback:
      'Correct. The opposing trends create a minimum-total-drag region between the speed extremes.',
    incorrectFeedback:
      'Consider the high angle of attack needed at low speed and the increasing dynamic pressure at high speed.',
  })
  context.checkPoint(`Drag prediction answered in ${dragPrediction.attempts} attempt(s)`)

  const repositioned = await context.repositionWithAutopilot(context, 4_000, 105, 270, 30_000)
  if (!repositioned) {
    context.checkPoint('Initial drag observation condition not reached')
    return
  }

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_heading_target(270)
  flightModel.set_autopilot_heading_hold(true)
  flightModel.set_autopilot_speed_indicated_hold(true)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView(simProps.speed_indicated_knots, true)
  context.plotView(simProps.drag, true)
  context.plotView([simProps.lift, simProps.weight], true)
  context.plotView([simProps.cdo, simProps.cdi], true)
  context.plotView(simProps.aoa_deg, true)

  await context.waitForUser({
    title: 'Observe the drag balance',
    message:
      'The plots show total drag together with the parasite and induced drag coefficients. Continue when you are ready to compare **105 kt**, **90 kt** and **75 kt**.',
    buttonLabel: 'Begin comparison',
  })

  const observations: DragObservation[] = []

  const observeAt = async (targetSpeed: number) => {
    await context.notifyUser(
      `${targetSpeed} kt observation`,
      `The autopilot will stabilize the C172 at **${targetSpeed} kt** while maintaining **4,000 ft**.`,
    )

    flightModel.set_autopilot_speed_indicated_target(targetSpeed)
    const stable = await context.waitForCondition(
      () =>
        Math.abs(flightModel.speed_indicated_knots - targetSpeed) < 2 &&
        Math.abs(flightModel.altitude_ft - 4_000) < 100,
      1_000,
      200,
      45_000,
    )

    if (!stable) {
      context.checkPoint(`${targetSpeed} kt drag condition not reached`)
      return
    }

    const drag = flightModel.drag
    const lift = flightModel.lift
    observations.push({
      targetSpeed,
      indicatedSpeed: flightModel.speed_indicated_knots,
      aoa: flightModel.aoa_deg,
      parasiteCoefficient: flightModel.cdo,
      inducedCoefficient: flightModel.cdi,
      drag,
      lift,
      liftToDrag: drag > 0 ? lift / drag : 0,
    })
    context.checkPoint(`${targetSpeed} kt drag observation recorded`)
  }

  await observeAt(105)
  await observeAt(90)
  await observeAt(75)

  if (observations.length !== 3) {
    await context.notifyUser(
      'Comparison incomplete',
      'One or more stable conditions could not be recorded. Run the lesson again to complete the three-speed comparison.',
    )
    return
  }

  const best = observations.reduce((currentBest, observation) =>
    observation.liftToDrag > currentBest.liftToDrag ? observation : currentBest,
  )

  const tableRows = observations
    .map(
      (observation) =>
        `| ${observation.indicatedSpeed.toFixed(1)} kt | ${observation.aoa.toFixed(1)}° | ${observation.parasiteCoefficient.toFixed(3)} | ${observation.inducedCoefficient.toFixed(3)} | ${observation.drag.toFixed(0)} N | ${observation.liftToDrag.toFixed(1)} |`,
    )
    .join('\n')

  await context.notifyUser(
    'Compare the observations',
    `| IAS | AoA | Parasite coefficient | Induced coefficient | Total drag | Lift / Drag |
|---:|---:|---:|---:|---:|---:|
${tableRows}

The highest measured lift-to-drag ratio occurred near **${best.indicatedSpeed.toFixed(1)} kt**. This is the most aerodynamically efficient of the three observed conditions, not necessarily the aircraft's exact published best-glide speed.`,
  )

  const efficiencyAnswer = await context.askQuestion({
    id: 'easa-drag-best-observed-ratio',
    type: 'multiple-choice',
    title: 'Observed aerodynamic efficiency',
    question: 'Which measured condition produced the highest lift-to-drag ratio?',
    choices: observations.map((observation) => ({
      id: `${observation.targetSpeed}-kt`,
      label: `${observation.targetSpeed} kt — L/D ${observation.liftToDrag.toFixed(1)}`,
    })),
    correctAnswer: `${best.targetSpeed}-kt`,
    correctFeedback:
      'Correct. That condition produced the most lift for each unit of drag in this comparison.',
    incorrectFeedback: 'Compare the final Lift / Drag column in the observation table.',
  })
  context.checkPoint(
    `Best observed lift-to-drag ratio identified in ${efficiencyAnswer.attempts} attempt(s)`,
  )

  const meaningAnswer = await context.askQuestion({
    id: 'easa-drag-ratio-meaning',
    type: 'multiple-choice',
    title: 'Meaning of lift-to-drag ratio',
    question: 'What does a larger lift-to-drag ratio indicate?',
    choices: [
      {
        id: 'more-lift-per-drag',
        label: 'More lift is produced for each unit of drag',
      },
      {
        id: 'more-drag-per-lift',
        label: 'More drag is produced for each unit of lift',
      },
      {
        id: 'higher-weight',
        label: 'The aircraft has become heavier',
      },
      {
        id: 'higher-altitude-only',
        label: 'The aircraft must be flying at a higher altitude',
      },
    ],
    correctAnswer: 'more-lift-per-drag',
    correctFeedback: 'Correct. A larger L/D value represents greater aerodynamic efficiency.',
    incorrectFeedback: 'The ratio divides the measured lift force by the measured drag force.',
  })
  context.checkPoint(`Lift-to-drag meaning answered in ${meaningAnswer.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-drag-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Describe how the parasite and induced drag contributions changed across the three speeds, and explain why the best lift-to-drag ratio occurred between the speed extremes.',
    placeholder: 'Relate airspeed, angle of attack, drag contributions and aerodynamic efficiency…',
    submitLabel: 'Complete lesson',
  })

  context.checkPoint(
    `Drag and lift-to-drag lesson completed · reflection ${reflection.answer.length} chars`,
  )
  await context.notifyUser(
    'Lesson complete',
    `The measured comparison showed the best lift-to-drag ratio near **${best.indicatedSpeed.toFixed(1)} kt**. Total drag reflects the combined effects of induced drag at lower speeds and parasite drag at higher speeds.`,
  )
}
