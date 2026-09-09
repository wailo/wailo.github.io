import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type Observation = {
  altitude: number
  density: number
  indicatedSpeed: number
  trueSpeed: number
  aoa: number
  cl: number
  lift: number
  weight: number
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
    'Airspeed, lift and altitude',
    'This lesson compares level flight at two altitudes while indicated airspeed remains **105 kt**. Observe how air density and true airspeed change while lift continues to balance weight.',
  )

  const liftEquation = await context.askQuestion({
    id: 'easa-airspeed-altitude-lift-equation',
    type: 'multiple-choice',
    title: 'Factors affecting lift',
    question: 'Which combination identifies the principal quantities in the lift equation?',
    choices: [
      {
        id: 'density-speed-area-cl',
        label: 'Air density, true airspeed, wing area and lift coefficient',
      },
      {
        id: 'altitude-heading-time',
        label: 'Altitude, heading and elapsed time',
      },
      {
        id: 'rpm-fuel-bank',
        label: 'Engine RPM, fuel quantity and bank angle only',
      },
      {
        id: 'pressure-temperature-only',
        label: 'Static pressure and temperature only',
      },
    ],
    correctAnswer: 'density-speed-area-cl',
    correctFeedback: 'Correct. Lift depends on dynamic pressure, wing area and lift coefficient.',
    incorrectFeedback:
      'Consider the airflow properties, the wing geometry and the coefficient representing its aerodynamic state.',
  })
  context.checkPoint(`Lift-equation question answered in ${liftEquation.attempts} attempt(s)`)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView(simProps.altitude_ft, true)
  context.plotView(simProps.atmosphere_density, true)
  context.plotView([simProps.speed_indicated_knots, simProps.speed_true_knots], true)
  context.plotView([simProps.lift, simProps.weight], true)
  context.plotView(simProps.aoa_deg, true)
  context.plotView(simProps.cl, true)

  const stabilizeAt = async (altitude: number): Promise<boolean> => {
    const repositioned = await context.repositionWithAutopilot(context, altitude, 105, 270, 30_000)
    if (!repositioned) return false

    flightModel.set_autopilot_master_switch(true)
    flightModel.set_autopilot_auto_trim(true)
    flightModel.set_autopilot_altitude_target(altitude)
    flightModel.set_autopilot_altitude_hold(true)
    flightModel.set_autopilot_speed_indicated_target(105)
    flightModel.set_autopilot_speed_indicated_hold(true)
    flightModel.set_autopilot_heading_target(270)
    flightModel.set_autopilot_heading_hold(true)

    return context.waitForCondition(
      () =>
        Math.abs(flightModel.altitude_ft - altitude) < 75 &&
        Math.abs(flightModel.speed_indicated_knots - 105) < 2,
      1_000,
      200,
      30_000,
    )
  }

  const observe = (): Observation => ({
    altitude: flightModel.altitude_ft,
    density: flightModel.atmosphere_density,
    indicatedSpeed: flightModel.speed_indicated_knots,
    trueSpeed: flightModel.speed_true_knots,
    aoa: flightModel.aoa_deg,
    cl: flightModel.cl,
    lift: flightModel.lift,
    weight: flightModel.weight,
  })

  await context.notifyUser(
    'Lower-altitude observation',
    'First, the C172 will stabilize at **2,000 ft** and **105 kt indicated airspeed**.',
  )

  if (!(await stabilizeAt(2_000))) {
    context.checkPoint('Lower-altitude condition not reached')
    return
  }

  const low = observe()
  context.checkPoint('Lower-altitude observation recorded')

  const prediction = await context.askQuestion({
    id: 'easa-airspeed-altitude-prediction',
    type: 'multiple-choice',
    title: 'Predict the higher-altitude condition',
    question:
      'At 8,000 ft, if the aircraft maintains the same indicated airspeed and level flight, what should happen?',
    choices: [
      {
        id: 'tas-higher-lift-balanced',
        label: 'True airspeed increases while lift remains close to weight',
      },
      {
        id: 'tas-lower-no-lift',
        label: 'True airspeed decreases and lift falls to zero',
      },
      {
        id: 'density-increases',
        label: 'Air density increases and true airspeed remains unchanged',
      },
      {
        id: 'weight-doubles',
        label: 'Aircraft weight doubles because altitude increases',
      },
    ],
    correctAnswer: 'tas-higher-lift-balanced',
    correctFeedback:
      'Correct. Lower density requires a higher true airspeed for approximately the same indicated airspeed, while level-flight lift still balances weight.',
    incorrectFeedback:
      'Separate the airflow speed through the air mass from the lift required to maintain altitude.',
  })
  context.checkPoint(`Altitude prediction answered in ${prediction.attempts} attempt(s)`)

  await context.waitForUser({
    title: 'Compare altitude effects',
    message:
      'Continue when the density, indicated-speed, true-speed, lift and weight plots are visible. The aircraft will then reposition to 8,000 ft.',
    buttonLabel: 'Climb to 8,000 ft',
  })

  if (!(await stabilizeAt(8_000))) {
    context.checkPoint('Higher-altitude condition not reached')
    return
  }

  const high = observe()
  context.checkPoint('Higher-altitude observation recorded')

  await context.notifyUser(
    'Compare the observations',
    `| Condition | Density | IAS | TAS | AoA | CL | Lift / Weight |
|---|---:|---:|---:|---:|---:|---:|
| ${low.altitude.toFixed(0)} ft | ${low.density.toFixed(3)} kg/m³ | ${low.indicatedSpeed.toFixed(1)} kt | ${low.trueSpeed.toFixed(1)} kt | ${low.aoa.toFixed(1)}° | ${low.cl.toFixed(2)} | ${low.lift.toFixed(0)} / ${low.weight.toFixed(0)} N |
| ${high.altitude.toFixed(0)} ft | ${high.density.toFixed(3)} kg/m³ | ${high.indicatedSpeed.toFixed(1)} kt | ${high.trueSpeed.toFixed(1)} kt | ${high.aoa.toFixed(1)}° | ${high.cl.toFixed(2)} | ${high.lift.toFixed(0)} / ${high.weight.toFixed(0)} N |

At the higher altitude, lower density is accompanied by a higher true airspeed for a similar indicated airspeed. In both stabilized conditions, lift remains close to weight because the aircraft is in level flight.`,
  )

  const interpretation = await context.askQuestion({
    id: 'easa-airspeed-altitude-interpretation',
    type: 'multiple-choice',
    title: 'Interpret the instruments',
    question: 'Why can IAS remain similar while TAS changes with altitude?',
    choices: [
      {
        id: 'ias-dynamic-pressure',
        label: 'IAS reflects aerodynamic pressure, while TAS is speed through the air mass',
      },
      {
        id: 'instruments-unrelated',
        label: 'IAS and TAS are unrelated arbitrary indications',
      },
      {
        id: 'wing-area-changes',
        label: 'The wing area automatically increases with altitude',
      },
      {
        id: 'weight-causes-tas',
        label: 'TAS is determined only by aircraft weight',
      },
    ],
    correctAnswer: 'ias-dynamic-pressure',
    correctFeedback:
      'Correct. For the same aerodynamic pressure in less-dense air, the aircraft travels faster through the air mass.',
    incorrectFeedback: 'Compare the density, IAS and TAS columns in the observation table.',
  })
  context.checkPoint(`Airspeed interpretation answered in ${interpretation.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-airspeed-altitude-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Explain how density and true airspeed changed between the two observations, and why lift still remained close to weight.',
    placeholder: 'Relate density, IAS, TAS and level-flight force balance…',
    submitLabel: 'Complete Lesson',
  })

  context.checkPoint(
    `Airspeed, lift and altitude lesson completed · reflection ${reflection.answer.length} chars`,
  )
  await context.notifyUser(
    'Lesson complete',
    'Altitude changes air density and therefore the relationship between indicated and true airspeed. In steady level flight, the wing still produces the lift required to balance aircraft weight.',
  )
}
