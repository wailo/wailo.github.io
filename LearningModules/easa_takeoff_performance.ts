import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type TakeoffTrial = {
  id: string
  condition: string
  mass: number
  density: number
  windSpeed: number
  targetIas: number
  finalTas: number
  elapsedSeconds: number
  distanceMetres: number
  averageAcceleration: number
}

const groundDistanceMetres = (
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) => {
  const earthRadiusMetres = 6_371_000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(endLatitude - startLatitude)
  const longitudeDelta = toRadians(endLongitude - startLongitude)
  const startLatitudeRadians = toRadians(startLatitude)
  const endLatitudeRadians = toRadians(endLatitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadiusMetres * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simulation = simControls.simulation
  const simProps: C172SimProps = context.props
  const targetTakeoffSpeed = 55

  context.resetPanels()
  simulation.reset_simulation()
  let flightModel = simulation.set_flight_model_c172()
  simControls.flightModel = flightModel

  context.setLayout(context.layoutTypes.PILOT)
  context.setVisuals(true)
  context.setMap(false)
  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.speed_indicated_knots, simProps.speed_true_knots], true)
  context.plotView([simProps.engine_throttle_position, simProps.thrust], true)

  await context.notifyUser(
    'Take-off performance laboratory',
    `Four ground runs will accelerate the C172 to the same **${targetTakeoffSpeed} kt indicated airspeed**. The lesson measures **simulation time** and **ground distance** from brake release to the target speed.

Only one factor changes at a time:

1. Baseline condition
2. Increased mass
3. Reduced air density
4. Tailwind

These are simulator experiments, not approved take-off figures. Operational planning must use current POH data, runway information and applicable safety factors.`,
  )

  const factorsAnswer = await context.askQuestion({
    id: 'easa-takeoff-performance-factors',
    type: 'multiple-choice',
    title: 'Factors affecting take-off',
    question: 'Which combination normally increases take-off distance required?',
    choices: [
      { id: 'lighter-headwind', label: 'Lower mass and a headwind' },
      { id: 'cold-dense', label: 'Cold, dense air and a dry level runway' },
      {
        id: 'heavy-low-density-tailwind',
        label: 'Higher mass, lower air density and a tailwind',
      },
      { id: 'lower-speed-only', label: 'Selecting a lower heading value' },
    ],
    correctAnswer: 'heavy-low-density-tailwind',
    correctFeedback:
      'Correct. These conditions reduce acceleration or increase the ground distance needed to reach the required aerodynamic state.',
    incorrectFeedback:
      'Consider acceleration, lift, propeller performance and groundspeed separately.',
  })
  context.checkPoint(`Take-off factors answered in ${factorsAnswer.attempts} attempt(s)`)

  simulation.reset_flightmodel()
  flightModel = simControls.flightModel as typeof flightModel
  const referenceEmptyMass = flightModel.empty_mass
  const referenceSeaLevelDensity = flightModel.atmosphere_sea_level_density
  const trials: TakeoffTrial[] = []

  const runTrial = async (options: {
    id: string
    condition: string
    massFactor?: number
    densityFactor?: number
    tailwindKnots?: number
  }) => {
    simulation.set_simulation_speed(1)
    simulation.set_simulation_pause(false)
    simulation.reset_flightmodel()
    flightModel = simControls.flightModel as typeof flightModel

    const runwayHeading = flightModel.yaw_deg
    const massFactor = options.massFactor ?? 1
    const densityFactor = options.densityFactor ?? 1
    const tailwindKnots = options.tailwindKnots ?? 0

    flightModel.set_empty_mass(referenceEmptyMass * massFactor)
    flightModel.set_atmosphere_sea_level_density(referenceSeaLevelDensity * densityFactor)
    flightModel.set_atmosphere_wind_speed(tailwindKnots)
    flightModel.set_atmosphere_wind_direction((runwayHeading + 180) % 360)
    flightModel.set_engine_fuel_switch_state(true)
    flightModel.set_engine_mixture_position(1)
    flightModel.set_engine_throttle_position(0.2)
    flightModel.set_flaps_selector_position(simControls.C172FlapSelector.TEN)
    flightModel.set_elevator_position(0)
    flightModel.set_rudder_position(0)
    flightModel.set_aileron_position(0)
    flightModel.set_parking_brake(true)

    const configured = await context.waitForCondition(
      () =>
        Math.abs(flightModel.flaps_position - 10) < 0.1 &&
        Math.abs(
          flightModel.atmosphere_sea_level_density - referenceSeaLevelDensity * densityFactor,
        ) < 0.01 &&
        Math.abs(flightModel.atmosphere_wind_speed - tailwindKnots) < 0.1,
      500,
      100,
      30_000,
      false,
    )
    if (!configured) {
      context.checkPoint(`${options.condition} configuration not reached`)
      return false
    }

    await context.notifyUser(
      options.condition,
      `The brakes are held while full power stabilizes. The run ends at **${targetTakeoffSpeed} kt IAS**; no rotation input will be applied.`,
    )

    flightModel.set_engine_throttle_position(1)
    const powerStabilized = await context.waitForCondition(
      () => flightModel.engine_rpm >= 2_000,
      500,
      100,
      20_000,
      false,
    )
    if (!powerStabilized) {
      context.checkPoint(`${options.condition} take-off power not stabilized`)
      return false
    }

    simulation.set_simulation_speed(2)
    const startTime = simulation.simulation_time
    const startLatitude = flightModel.latitude
    const startLongitude = flightModel.longitude
    flightModel.set_parking_brake(false)

    const targetReached = await context.waitForCondition(
      () => flightModel.speed_indicated_knots >= targetTakeoffSpeed,
      100,
      25,
      45_000,
      false,
    )
    const endTime = simulation.simulation_time
    const endLatitude = flightModel.latitude
    const endLongitude = flightModel.longitude
    simulation.set_simulation_speed(1)

    flightModel.set_engine_throttle_position(0.2)
    flightModel.set_parking_brake(true)

    if (!targetReached) {
      context.checkPoint(`${options.condition} did not reach ${targetTakeoffSpeed} kt`)
      return false
    }

    const elapsedSeconds = Math.max(0.01, endTime - startTime)
    const distanceMetres = groundDistanceMetres(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    )
    const targetMetresPerSecond = targetTakeoffSpeed * 0.514444
    const trial: TakeoffTrial = {
      id: options.id,
      condition: options.condition,
      mass: flightModel.empty_mass,
      density: flightModel.atmosphere_density,
      windSpeed: tailwindKnots,
      targetIas: flightModel.speed_indicated_knots,
      finalTas: flightModel.speed_true_knots,
      elapsedSeconds,
      distanceMetres,
      averageAcceleration: targetMetresPerSecond / elapsedSeconds,
    }
    trials.push(trial)

    const parameterValue = options.massFactor
      ? `Empty mass: **${trial.mass.toFixed(0)} kg**`
      : options.densityFactor
        ? `Air density: **${trial.density.toFixed(3)} kg/m³**`
        : options.tailwindKnots
          ? `Tailwind: **${trial.windSpeed.toFixed(1)} kt**`
          : `Reference values: **${trial.mass.toFixed(0)} kg**, **${trial.density.toFixed(3)} kg/m³**, wind **${trial.windSpeed.toFixed(1)} kt**`

    await context.notifyUser(
      `${options.condition} result`,
      `${parameterValue}

- Time to ${targetTakeoffSpeed} kt IAS: **${trial.elapsedSeconds.toFixed(1)} s**
- Approximate ground distance: **${trial.distanceMetres.toFixed(0)} m**
- Average acceleration: **${trial.averageAcceleration.toFixed(2)} m/s²**`,
    )
    context.checkPoint(`${options.condition} take-off roll measured`)
    return true
  }

  await context.waitForUser({
    title: 'Baseline run',
    message:
      'Continue to establish the reference time and distance. Later runs will change one condition while retaining the same target IAS and flap setting.',
    buttonLabel: 'Run baseline',
  })
  if (!(await runTrial({ id: 'baseline', condition: 'Baseline' }))) return

  const massPrediction = await context.askQuestion({
    id: 'easa-takeoff-mass-prediction',
    type: 'multiple-choice',
    title: 'Predict the mass effect',
    question: 'With the same thrust and target IAS, what should a 15% increase in empty mass do?',
    choices: [
      { id: 'shorter', label: 'Increase acceleration and shorten the ground roll' },
      {
        id: 'longer',
        label: 'Reduce acceleration and increase the time and distance to target speed',
      },
      { id: 'no-effect', label: 'Have no effect on acceleration or distance' },
      { id: 'wind-change', label: 'Automatically create a headwind' },
    ],
    correctAnswer: 'longer',
    correctFeedback:
      'Correct. More mass produces less acceleration for the same net force and requires more lift for take-off.',
    incorrectFeedback: 'Apply acceleration = net force / mass.',
  })
  context.checkPoint(`Mass prediction answered in ${massPrediction.attempts} attempt(s)`)
  if (
    !(await runTrial({
      id: 'heavy',
      condition: 'Mass +15%',
      massFactor: 1.15,
    }))
  )
    return

  const densityPrediction = await context.askQuestion({
    id: 'easa-takeoff-density-prediction',
    type: 'multiple-choice',
    title: 'Predict the density effect',
    question: 'What should happen when sea-level air density is reduced by 5%?',
    choices: [
      {
        id: 'degraded',
        label: 'Propeller thrust and aerodynamic performance degrade, increasing the ground roll',
      },
      { id: 'improved', label: 'Thrust and acceleration necessarily increase' },
      { id: 'mass-lower', label: 'Aircraft mass falls by the same 15%' },
      { id: 'braking-only', label: 'Only wheel braking is affected' },
    ],
    correctAnswer: 'degraded',
    correctFeedback:
      'Correct. Lower density reduces propeller effectiveness and requires a higher true speed for the same indicated aerodynamic condition.',
    incorrectFeedback: 'Consider both the engine-propeller system and the lift equation.',
  })
  context.checkPoint(`Density prediction answered in ${densityPrediction.attempts} attempt(s)`)
  if (
    !(await runTrial({
      id: 'low-density',
      condition: 'Air density −5%',
      densityFactor: 0.95,
    }))
  )
    return

  const windPrediction = await context.askQuestion({
    id: 'easa-takeoff-tailwind-prediction',
    type: 'multiple-choice',
    title: 'Predict the wind effect',
    question: 'Why does a tailwind increase ground distance to a given take-off IAS?',
    choices: [
      { id: 'ias-lower', label: 'The required indicated airspeed becomes zero' },
      { id: 'mass-higher', label: 'The wind increases aircraft mass' },
      {
        id: 'groundspeed-higher',
        label: 'The aircraft must reach a higher groundspeed for the same speed through the air',
      },
      { id: 'more-braking', label: 'The tailwind applies wheel braking' },
    ],
    correctAnswer: 'groundspeed-higher',
    correctFeedback:
      'Correct. Lift depends on airspeed, but runway distance is covered at groundspeed.',
    incorrectFeedback:
      'Separate motion relative to the air mass from motion relative to the runway.',
  })
  context.checkPoint(`Tailwind prediction answered in ${windPrediction.attempts} attempt(s)`)
  if (
    !(await runTrial({
      id: 'tailwind',
      condition: '15 kt tailwind',
      tailwindKnots: 15,
    }))
  )
    return

  const resultRows = trials
    .map(
      (trial) =>
        `| ${trial.condition} | ${trial.mass.toFixed(0)} kg | ${trial.density.toFixed(3)} kg/m³ | ${trial.windSpeed.toFixed(0)} kt | ${trial.targetIas.toFixed(1)} kt | ${trial.finalTas.toFixed(1)} kt | ${trial.elapsedSeconds.toFixed(1)} s | ${trial.distanceMetres.toFixed(0)} m | ${trial.averageAcceleration.toFixed(2)} m/s² |`,
    )
    .join('\n')

  await context.notifyUser(
    'Take-off performance results',
    `| Condition | Empty mass | Density | Tailwind | Final IAS | Final TAS | Time | Distance | Avg acceleration |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${resultRows}

All trials used the same **${targetTakeoffSpeed} kt IAS** target and **Flaps 10**. Differences arise from acceleration, true/ground speed and the changed environment—not from changing the success criterion.`,
  )

  const indicatedSpeedAnswer = await context.askQuestion({
    id: 'easa-takeoff-ias-distance',
    type: 'multiple-choice',
    title: 'Same IAS, different runway distance',
    question: 'How can two trials reach the same IAS but require different ground distances?',
    choices: [
      { id: 'impossible', label: 'They cannot; equal IAS guarantees equal distance' },
      {
        id: 'acceleration-groundspeed',
        label:
          'Acceleration and groundspeed can differ even when the final aerodynamic indication is equal',
      },
      { id: 'wing-area', label: 'The wing area must have changed automatically' },
      { id: 'clock-error', label: 'Only a clock error can cause the difference' },
    ],
    correctAnswer: 'acceleration-groundspeed',
    correctFeedback:
      'Correct. IAS describes the aerodynamic state; runway use depends on the entire acceleration history and groundspeed.',
    incorrectFeedback:
      'The final speed does not describe how quickly it was reached or distance covered over the ground.',
  })
  context.checkPoint(`IAS and distance answered in ${indicatedSpeedAnswer.attempts} attempt(s)`)

  const safetyAnswer = await context.askQuestion({
    id: 'easa-takeoff-runway-margin',
    type: 'multiple-choice',
    title: 'From experiment to planning',
    question: 'How should a pilot use calculated take-off distance?',
    choices: [
      { id: 'exact-limit', label: 'Treat it as an exact limit with no additional margin' },
      { id: 'ignore-conditions', label: 'Ignore changes in runway and weather conditions' },
      {
        id: 'approved-data-margin',
        label:
          'Use approved data, apply required corrections and safety factors, then verify adequate runway margin',
      },
      { id: 'sim-only', label: 'Replace POH data with a single simulator run' },
    ],
    correctAnswer: 'approved-data-margin',
    correctFeedback:
      'Correct. Performance planning must preserve margin for actual conditions and uncertainty.',
    incorrectFeedback:
      'A calculated result is the beginning of a runway-suitability decision, not the whole decision.',
  })
  context.checkPoint(`Runway-margin question answered in ${safetyAnswer.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-takeoff-performance-reflection',
    type: 'essay',
    title: 'Performance analysis',
    question:
      'Use the measured table to identify which changed condition had the largest effect, explain the aerodynamic or mechanical reason, and describe how the result should influence a take-off decision.',
    placeholder: 'Compare time, distance, acceleration, IAS and TAS across the four runs…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(
    `Take-off performance lesson completed · reflection ${reflection.answer.length} chars`,
  )

  await context.notifyUser(
    'Lesson complete',
    `Take-off performance depends on more than reaching a target airspeed. The aircraft must accelerate through the prevailing air mass, cover a finite runway distance, lift its actual weight and retain adequate obstacle-clearance margin.

The experiment isolates individual effects. Real conditions combine them, which is why approved performance data, conservative corrections and a clear margin between distance required and distance available are essential.`,
  )
}
