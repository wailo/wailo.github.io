import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type FlapObservation = {
  flap: number
  speed: number
  aoa: number
  cl: number
  drag: number
  pitch: number
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
    'Flaps and lift augmentation',
    'Observe how trailing-edge flaps change wing camber. The C172 will maintain **70 kt** and **4,000 ft** while flap settings are compared.',
  )

  const prediction = await context.askQuestion({
    id: 'easa-flap-augmentation-prediction',
    type: 'multiple-choice',
    title: 'Flap deployment',
    question: 'What is the principal aerodynamic effect of extending trailing-edge flaps?',
    choices: [
      {
        id: 'camber-lift-drag',
        label: 'Increased camber produces more lift capability and more drag',
      },
      { id: 'area-zero', label: 'Wing area and lift both become zero' },
      { id: 'drag-only', label: 'Drag increases without changing the wing lift characteristics' },
      { id: 'weight-lower', label: 'Aircraft weight decreases as the flaps extend' },
    ],
    correctAnswer: 'camber-lift-drag',
    correctFeedback:
      'Correct. Flaps reshape the aerofoil, increasing lift capability while also increasing drag.',
    incorrectFeedback: 'Think about how a more highly cambered aerofoil changes lift and drag.',
  })
  context.checkPoint(`Flap prediction answered in ${prediction.attempts} attempt(s)`)

  const repositioned = await context.repositionWithAutopilot(context, 4_000, 70, 270, 30_000)
  if (!repositioned) return

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_auto_trim(true)
  flightModel.set_autopilot_altitude_target(4_000)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_speed_indicated_target(70)
  flightModel.set_autopilot_speed_indicated_hold(true)
  flightModel.set_autopilot_heading_target(270)
  flightModel.set_autopilot_heading_hold(true)

  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.flaps_selector_position, simProps.flaps_position], true)
  context.plotView([simProps.aoa_deg, simProps.cl], true)
  context.plotView([simProps.lift, simProps.drag], true)
  context.plotView([simProps.pitch_deg, simProps.elevator_trim_position], true)

  await context.waitForUser({
    title: 'Compare flap settings',
    message:
      'Continue to cycle through **0°, 10°, 20° and 30°**. Watch the aerofoil geometry, AoA, lift coefficient, drag, pitch and trim response.',
    buttonLabel: 'Begin flap comparison',
  })

  const observations: FlapObservation[] = []
  const flapSettings = [
    simControls.C172FlapSelector.ZERO,
    simControls.C172FlapSelector.TEN,
    simControls.C172FlapSelector.TWENTY,
    simControls.C172FlapSelector.THIRTY,
  ]

  simulation.set_simulation_speed(10)
  try {
    for (const flap of flapSettings) {
      await context.notifyUser(
        `Flaps ${flap}°`,
        `Selecting **${flap}°** flap. The autopilot will compensate to preserve the same altitude and indicated airspeed.`,
      )
      flightModel.set_flaps_selector_position(flap)

      const stable = await context.waitForCondition(
        () =>
          Math.abs(flightModel.flaps_position - flap) < 0.1 &&
          Math.abs(flightModel.altitude_ft - 4_000) < 120 &&
          Math.abs(flightModel.speed_indicated_knots - 70) < 0.1,
        1_500,
        200,
        45_000,
      )
      if (!stable) return

      observations.push({
        flap,
        speed: flightModel.speed_indicated_knots,
        aoa: flightModel.aoa_deg,
        cl: flightModel.cl,
        drag: flightModel.drag,
        pitch: flightModel.pitch_deg,
      })
      context.checkPoint(`Flaps ${flap}° observation recorded`)
    }
  } finally {
    simulation.set_simulation_speed(1)
  }

  const rows = observations
    .map(
      (item) =>
        `| ${item.flap}° | ${item.speed.toFixed(1)} kt | ${item.aoa.toFixed(1)}° | ${item.cl.toFixed(3)} | ${item.drag.toFixed(0)} N | ${item.pitch.toFixed(1)}° |`,
    )
    .join('\n')

  await context.notifyUser(
    'Measured flap comparison',
    `| Flap | IAS | AoA | CL | Drag | Pitch |
|---:|---:|---:|---:|---:|---:|
${rows}

At a common speed and altitude, the required lift remains close to aircraft weight. Flap deployment changes the camber, so the same lift condition can occur with a different AoA and pitch attitude, while drag generally rises.`,
  )

  const interpretation = await context.askQuestion({
    id: 'easa-flap-observation-interpretation',
    type: 'multiple-choice',
    title: 'Interpreting the comparison',
    question: 'Why does the autopilot change pitch and trim after flap extension?',
    choices: [
      {
        id: 'new-equilibrium',
        label: 'The changed camber and pitching moment require a new trimmed equilibrium',
      },
      { id: 'weight-change', label: 'Flap extension greatly increases aircraft mass' },
      { id: 'gravity-change', label: 'Gravity changes direction when flaps move' },
      { id: 'no-effect', label: 'The movement is unrelated to flap deployment' },
    ],
    correctAnswer: 'new-equilibrium',
    correctFeedback:
      'Correct. Flaps alter lift, drag and pitching moment, so attitude and trim must readjust.',
    incorrectFeedback: 'Compare the pitch and AoA columns as flap angle changes.',
  })
  context.checkPoint(`Flap interpretation answered in ${interpretation.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-flap-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'Explain why flaps are useful for take-off and landing, and identify the performance penalty that accompanies lift augmentation.',
    placeholder: 'Relate camber, low-speed lift capability, drag and aircraft attitude…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(`Flap lesson completed · reflection ${reflection.answer.length} chars`)

  flightModel.set_flaps_selector_position(simControls.C172FlapSelector.ZERO)
  await context.notifyUser(
    'Lesson complete',
    'Flaps increase low-speed lift capability by changing wing camber, but they also increase drag and alter the aircraft’s pitching and trim requirements.',
  )
}
