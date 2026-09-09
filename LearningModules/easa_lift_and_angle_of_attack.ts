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
    'Lift and angle of attack',
    'This lesson examines how a wing maintains lift as airspeed changes. The C172 will remain at a constant altitude while its target airspeed is reduced.',
  )

  const definitionAnswer = await context.askQuestion({
    id: 'ground-lift-aoa-definition',
    type: 'multiple-choice',
    title: 'Angle of attack',
    question: 'What does angle of attack describe?',
    choices: [
      {
        id: 'chord-relative-airflow',
        label: 'The angle between the wing chord and the relative airflow',
      },
      { id: 'pitch-horizon', label: 'The angle between the aircraft nose and the horizon' },
      { id: 'bank-horizon', label: 'The angle between the wings and the horizon' },
      { id: 'track-heading', label: 'The difference between heading and ground track' },
    ],
    correctAnswer: 'chord-relative-airflow',
    correctFeedback:
      'Correct. Pitch attitude and angle of attack are related, but they are not the same quantity.',
    incorrectFeedback:
      'Consider the direction of the wing chord relative to the air approaching it.',
  })
  context.checkPoint(`AoA definition answered in ${definitionAnswer.attempts} attempt(s)`)

  await context.notifyUser(
    'Initial condition',
    'Repositioning to **6,000 ft**, **105 kt**, heading **270°** before establishing level flight.',
  )

  const repositioned = await context.repositionWithAutopilot(context, 6_000, 105, 270, 30_000)
  if (!repositioned) {
    context.checkPoint('Lift and AoA reposition failed')
    return
  }

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(6_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(105)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_heading_target(270)
  flightModel.set_autopilot_heading_hold(true)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView(simProps.speed_indicated_knots, true)
  context.plotView(simProps.aoa_deg, true)
  context.plotView(simProps.cl, true)
  context.plotView([simProps.lift, simProps.weight], true)

  await context.waitFor(2_000)

  const initial = {
    speed: flightModel.speed_indicated_knots,
    aoa: flightModel.aoa_deg,
    cl: flightModel.cl,
    lift: flightModel.lift,
  }

  const prediction = await context.askQuestion({
    id: 'ground-lift-aoa-prediction',
    type: 'multiple-choice',
    title: 'Predict the response',
    question:
      'If altitude and weight remain approximately constant while airspeed decreases, what should happen?',
    choices: [
      {
        id: 'aoa-cl-increase',
        label: 'Angle of attack and lift coefficient increase to maintain lift',
      },
      {
        id: 'aoa-cl-decrease',
        label: 'Angle of attack and lift coefficient both decrease',
      },
      { id: 'lift-zero', label: 'Lift immediately falls to zero' },
      { id: 'no-change', label: 'No aerodynamic quantity changes' },
    ],
    correctAnswer: 'aoa-cl-increase',
    correctFeedback:
      'Correct. At lower dynamic pressure, the wing requires a greater lift coefficient to support the same weight.',
    incorrectFeedback: 'The aircraft still needs approximately the same lift to maintain altitude.',
  })
  context.checkPoint(`Low-speed prediction answered in ${prediction.attempts} attempt(s)`)

  await context.waitForUser({
    title: 'Observe the plots',
    message:
      'Continue when the airspeed, AoA, lift coefficient, lift and weight plots are visible. The target speed will then reduce from 105 kt to 90 kt.',
    buttonLabel: 'Reduce Airspeed',
  })

  context.checkPoint('Airspeed reduction started')
  flightModel.set_autopilot_speed_indicated_target(90)
  simulation.set_simulation_speed(4)

  const reachedLowSpeed = await context.waitForCondition(
    () => Math.abs(flightModel.speed_indicated_knots - 90) < 2,
    1_000,
    200,
    45_000,
  )
  simulation.set_simulation_speed(1)

  if (!reachedLowSpeed) {
    await context.notifyUser(
      'Observation incomplete',
      'The aircraft did not stabilize near 90 kt within the observation period.',
    )
    context.checkPoint('Low-speed condition not reached')
    return
  }

  const lowSpeed = {
    speed: flightModel.speed_indicated_knots,
    aoa: flightModel.aoa_deg,
    cl: flightModel.cl,
    lift: flightModel.lift,
  }

  await context.notifyUser(
    'Compare the conditions',
    `| Condition | Airspeed | AoA | CL | Lift |
|---|---:|---:|---:|---:|
| Initial | ${initial.speed.toFixed(1)} kt | ${initial.aoa.toFixed(1)}° | ${initial.cl.toFixed(2)} | ${initial.lift.toFixed(0)} N |
| Reduced speed | ${lowSpeed.speed.toFixed(1)} kt | ${lowSpeed.aoa.toFixed(1)}° | ${lowSpeed.cl.toFixed(2)} | ${lowSpeed.lift.toFixed(0)} N |

The aircraft required a different AoA and lift coefficient because dynamic pressure changed, while the lift required for level flight remained close to the aircraft weight.`,
  )

  const interpretation = await context.askQuestion({
    id: 'ground-lift-aoa-interpretation',
    type: 'multiple-choice',
    title: 'Interpret the observation',
    question: 'Why did lift remain approximately steady even though airspeed decreased?',
    choices: [
      {
        id: 'higher-cl',
        label: 'The increased AoA produced a higher lift coefficient',
      },
      { id: 'weight-disappeared', label: 'The aircraft weight became zero' },
      { id: 'drag-created-lift', label: 'Drag replaced the lift force' },
      { id: 'airspeed-no-effect', label: 'Airspeed has no relationship to lift' },
    ],
    correctAnswer: 'higher-cl',
    correctFeedback:
      'Correct. Lift depends on dynamic pressure and lift coefficient; increasing CL compensated for lower airspeed.',
    incorrectFeedback: 'Compare the AoA and CL values in the two conditions.',
  })
  context.checkPoint(`Lift interpretation answered in ${interpretation.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'ground-lift-aoa-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Briefly explain why maintaining altitude at progressively lower airspeed moves an aircraft closer to its critical angle of attack.',
    placeholder: 'Relate airspeed, required lift coefficient and angle of attack…',
    submitLabel: 'Complete Lesson',
  })

  context.checkPoint(`Lift and AoA lesson completed · reflection ${reflection.answer.length} chars`)
  await context.notifyUser(
    'Lesson complete',
    'Angle of attack controls the wing’s lift coefficient within its normal operating range. As airspeed decreases in level flight, the required coefficient and AoA increase until the critical AoA becomes the limiting condition.',
  )
}
