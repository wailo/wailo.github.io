import type { C172SimProps, ScriptContext } from '../../src/ScriptContext'

type ClimbTrial = {
  id: string
  condition: string
  targetIas: number
  averageIas: number
  averageTas: number
  averageRateFtMin: number
  climbAngleDeg: number
  altitudeGainFt: number
  horizontalDistanceMetres: number
  mass: number
  density: number
  flap: number
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

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simulation = simControls.simulation
  const simProps: C172SimProps = context.props
  const testAltitudeFt = 2_000
  const testHeadingDeg = 270
  const sampledSpeeds = [65, 75, 90]

  context.resetPanels()
  simulation.reset_simulation()
  let flightModel = simulation.set_flight_model_c172()
  simControls.flightModel = flightModel

  const referenceEmptyMass = flightModel.empty_mass
  const referenceSeaLevelDensity = flightModel.atmosphere_sea_level_density
  const trials: ClimbTrial[] = []

  context.setLayout(context.layoutTypes.PILOT)
  context.setVisuals(true)
  context.setMap(false)
  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.speed_indicated_knots, simProps.vertical_speed_ftmin], true)
  context.plotView([simProps.altitude_ft, simProps.pitch_deg], true)
  context.plotView([simProps.engine_throttle_position, simProps.thrust], true)

  await context.notifyUser(
    'Climb performance laboratory',
    `This lesson compares full-power C172 climbs at **${sampledSpeeds.join(', ')} kt IAS** and then changes mass, flap and air density one factor at a time.

- **Vx** gives the greatest height gain per horizontal distance: best angle or gradient.
- **Vy** gives the greatest height gain per unit time: best rate.

The results are observations from this simulator and only from the sampled speeds. They are **not approved C172 performance figures**. Use the current POH and actual conditions for flight planning and obstacle clearance.`,
  )

  const vxVyAnswer = await context.askQuestion({
    id: 'easa-climb-vx-vy-purpose',
    type: 'multiple-choice',
    title: 'Vx and Vy',
    question: 'Which statement correctly distinguishes Vx from Vy?',
    choices: [
      {
        id: 'angle-rate',
        label: 'Vx maximizes climb angle; Vy maximizes height gained per unit time',
      },
      { id: 'rate-angle', label: 'Vx maximizes rate; Vy maximizes angle' },
      { id: 'same-purpose', label: 'They are always identical and serve the same purpose' },
      { id: 'wind-speeds', label: 'Vx is for headwinds and Vy is for tailwinds' },
    ],
    correctAnswer: 'angle-rate',
    correctFeedback:
      'Correct. Vx is associated with maximum excess thrust; Vy is associated with maximum excess power.',
    incorrectFeedback:
      'Separate height gained per horizontal distance from height gained per unit time.',
  })
  context.checkPoint(`Vx and Vy answered in ${vxVyAnswer.attempts} attempt(s)`)

  const runTrial = async (options: {
    id: string
    condition: string
    targetIas: number
    massFactor?: number
    densityFactor?: number
    flap?: 0 | 10 | 20 | 30
  }) => {
    simulation.set_simulation_speed(1)
    simulation.set_simulation_pause(false)

    const massFactor = options.massFactor ?? 1
    const densityFactor = options.densityFactor ?? 1
    const flap = options.flap ?? 0
    const flapSelector =
      flap === 20
        ? simControls.C172FlapSelector.TWENTY
        : flap === 10
          ? simControls.C172FlapSelector.TEN
          : flap === 30
            ? simControls.C172FlapSelector.THIRTY
            : simControls.C172FlapSelector.ZERO

    const repositioned = await context.repositionWithAutopilot(
      context,
      testAltitudeFt,
      options.targetIas,
      testHeadingDeg,
      30_000,
      () => {
        const configuredFlightModel = simControls.flightModel as typeof flightModel
        configuredFlightModel.set_empty_mass(referenceEmptyMass * massFactor)
        configuredFlightModel.set_atmosphere_sea_level_density(
          referenceSeaLevelDensity * densityFactor,
        )
        configuredFlightModel.set_atmosphere_wind_speed(0)
        configuredFlightModel.set_atmosphere_turbulence_level(0)
        configuredFlightModel.set_flaps_selector_position(flapSelector)
      },
    )
    if (!repositioned) {
      context.checkPoint(`${options.condition} reposition failed`)
      return false
    }

    flightModel = simControls.flightModel as typeof flightModel
    flightModel.set_empty_mass(referenceEmptyMass * massFactor)
    flightModel.set_atmosphere_sea_level_density(referenceSeaLevelDensity * densityFactor)
    flightModel.set_atmosphere_wind_speed(0)
    flightModel.set_atmosphere_turbulence_level(0)
    flightModel.set_flaps_selector_position(flapSelector)
    flightModel.set_engine_fuel_switch_state(true)
    flightModel.set_engine_mixture_position(1)

    const configured = await context.waitForCondition(
      () =>
        Math.abs(flightModel.flaps_position - flap) < 0.2 &&
        Math.abs(flightModel.empty_mass - referenceEmptyMass * massFactor) < 1 &&
        Math.abs(
          flightModel.atmosphere_sea_level_density - referenceSeaLevelDensity * densityFactor,
        ) < 0.01,
      300,
      100,
      15_000,
      false,
    )
    if (!configured) {
      context.checkPoint(`${options.condition} configuration not reached`)
      return false
    }

    flightModel.set_autopilot_master_switch(true)
    flightModel.set_autopilot_auto_trim(true)
    flightModel.set_autopilot_altitude_hold(false)
    flightModel.set_autopilot_vertical_speed_hold(false)
    flightModel.set_autopilot_speed_indicated_hold(false)
    flightModel.set_autopilot_heading_target(testHeadingDeg)
    flightModel.set_autopilot_heading_hold(true)
    flightModel.set_autopilot_pitch_target(flightModel.pitch_deg)
    flightModel.set_autopilot_pitch_hold(true)
    flightModel.set_engine_throttle_position(1)

    await context.notifyUser(
      options.condition,
      `The C172 will climb at full power while a pitch controller targets **${options.targetIas} kt IAS**. The measurement uses simulation time, altitude gain and horizontal distance.`,
    )

    simulation.set_simulation_speed(4)
    let pitchTarget = flightModel.pitch_deg

    const controlSpeed = async () => {
      const speedError = flightModel.speed_indicated_knots - options.targetIas
      pitchTarget = clamp(pitchTarget + speedError * 0.06, -2, 16)
      flightModel.set_autopilot_pitch_target(pitchTarget)
      await context.waitFor(200)
    }

    for (let index = 0; index < 20; index += 1) await controlSpeed()

    const startTime = simulation.simulation_time
    const startAltitude = flightModel.altitude_ft
    const startLatitude = flightModel.latitude
    const startLongitude = flightModel.longitude
    let indicatedSpeedTotal = 0
    let trueSpeedTotal = 0
    const sampleCount = 30

    for (let index = 0; index < sampleCount; index += 1) {
      await controlSpeed()
      indicatedSpeedTotal += flightModel.speed_indicated_knots
      trueSpeedTotal += flightModel.speed_true_knots
    }

    const elapsedSeconds = Math.max(0.01, simulation.simulation_time - startTime)
    const altitudeGainFt = flightModel.altitude_ft - startAltitude
    const horizontalDistance = groundDistanceMetres(
      startLatitude,
      startLongitude,
      flightModel.latitude,
      flightModel.longitude,
    )
    const horizontalDistanceFt = horizontalDistance * 3.28084
    const averageRateFtMin = (altitudeGainFt / elapsedSeconds) * 60
    const climbAngleDeg =
      (Math.atan2(altitudeGainFt, Math.max(1, horizontalDistanceFt)) * 180) / Math.PI
    const trial: ClimbTrial = {
      id: options.id,
      condition: options.condition,
      targetIas: options.targetIas,
      averageIas: indicatedSpeedTotal / sampleCount,
      averageTas: trueSpeedTotal / sampleCount,
      averageRateFtMin,
      climbAngleDeg,
      altitudeGainFt,
      horizontalDistanceMetres: horizontalDistance,
      mass: flightModel.empty_mass,
      density: flightModel.atmosphere_density,
      flap,
    }
    trials.push(trial)

    simulation.set_simulation_speed(1)
    flightModel.set_autopilot_pitch_hold(false)
    flightModel.set_engine_throttle_position(0.65)

    await context.notifyUser(
      `${options.condition} result`,
      `- Average IAS: **${trial.averageIas.toFixed(1)} kt**
- Average TAS: **${trial.averageTas.toFixed(1)} kt**
- Average climb rate: **${trial.averageRateFtMin.toFixed(0)} ft/min**
- Approximate climb angle: **${trial.climbAngleDeg.toFixed(1)}°**
- Height gained: **${trial.altitudeGainFt.toFixed(0)} ft** over **${trial.horizontalDistanceMetres.toFixed(0)} m** horizontally`,
    )
    context.checkPoint(`${options.condition} climb measured`)
    return true
  }

  await context.waitForUser({
    title: 'Sample the climb-speed range',
    message:
      'Continue to run three clean, reference-condition climbs. Only target IAS changes, so the measurements can reveal why the best sampled angle and best sampled rate need not occur at the same speed.',
    buttonLabel: 'Run speed trials',
  })

  for (const targetIas of sampledSpeeds) {
    if (
      !(await runTrial({
        id: `clean-${targetIas}`,
        condition: `Clean climb at ${targetIas} kt`,
        targetIas,
      }))
    )
      return
  }

  const cleanTrials = trials.filter((trial) => trial.id.startsWith('clean-'))
  const bestAngleTrial = cleanTrials.reduce((best, trial) =>
    trial.climbAngleDeg > best.climbAngleDeg ? trial : best,
  )
  const bestRateTrial = cleanTrials.reduce((best, trial) =>
    trial.averageRateFtMin > best.averageRateFtMin ? trial : best,
  )

  const cleanRows = cleanTrials
    .map(
      (trial) =>
        `| ${trial.targetIas} kt | ${trial.averageIas.toFixed(1)} kt | ${trial.averageTas.toFixed(1)} kt | ${trial.averageRateFtMin.toFixed(0)} ft/min | ${trial.climbAngleDeg.toFixed(1)}° |`,
    )
    .join('\n')

  await context.notifyUser(
    'Speed-trial comparison',
    `| IAS target | Average IAS | Average TAS | Climb rate | Climb angle |
|---:|---:|---:|---:|---:|
${cleanRows}

Among the three sampled speeds, **${bestAngleTrial.targetIas} kt** produced the steepest measured angle and **${bestRateTrial.targetIas} kt** produced the greatest measured rate.

This does not establish certified Vx or Vy: a proper determination requires a finer speed sweep, controlled test conditions and approved manufacturer data.`,
  )

  const factorPrediction = await context.askQuestion({
    id: 'easa-climb-factor-prediction',
    type: 'multiple-choice',
    title: 'Predict degraded climb performance',
    question:
      'At the same full-power climb-speed target, which changes normally reduce maximum climb rate?',
    choices: [
      { id: 'all-three', label: 'Higher mass, extended flap and lower air density' },
      { id: 'none', label: 'None of them; full power fixes the climb rate' },
      { id: 'mass-only', label: 'Higher mass only' },
      { id: 'density-improves', label: 'Lower density and extended flap improve climb rate' },
    ],
    correctAnswer: 'all-three',
    correctFeedback:
      'Correct. Each change reduces excess thrust or excess power available for the climb.',
    incorrectFeedback:
      'Consider the power needed to overcome drag and weight, and the power or thrust still available.',
  })
  context.checkPoint(`Climb factors answered in ${factorPrediction.attempts} attempt(s)`)

  await context.waitForUser({
    title: 'Change one factor at a time',
    message: `The next trials retain the best sampled rate target of **${bestRateTrial.targetIas} kt IAS**. They separately add 15% empty mass, extend 20° flap, and reduce sea-level density by 10%.`,
    buttonLabel: 'Run factor trials',
  })

  if (
    !(await runTrial({
      id: 'heavy',
      condition: 'Empty mass +15%',
      targetIas: bestRateTrial.targetIas,
      massFactor: 1.15,
    }))
  )
    return
  if (
    !(await runTrial({
      id: 'flap-20',
      condition: 'Flap 20°',
      targetIas: bestRateTrial.targetIas,
      flap: 20,
    }))
  )
    return
  if (
    !(await runTrial({
      id: 'low-density',
      condition: 'Sea-level density −10%',
      targetIas: bestRateTrial.targetIas,
      densityFactor: 0.9,
    }))
  )
    return

  const factorTrials = trials.filter((trial) => !trial.id.startsWith('clean-'))
  const factorRows = [bestRateTrial, ...factorTrials]
    .map(
      (trial) =>
        `| ${trial.condition} | ${trial.mass.toFixed(0)} kg | ${trial.density.toFixed(3)} kg/m³ | ${trial.flap.toFixed(0)}° | ${trial.averageRateFtMin.toFixed(0)} ft/min | ${trial.climbAngleDeg.toFixed(1)}° |`,
    )
    .join('\n')

  await context.notifyUser(
    'Climb-factor comparison',
    `| Condition | Empty mass | Air density | Flap | Climb rate | Climb angle |
|---|---:|---:|---:|---:|---:|
${factorRows}

At a given speed, added mass increases the lift and power required, flap adds drag, and lower density reduces engine-propeller performance. The exact measured changes are specific to this simulator run.`,
  )

  const windAnswer = await context.askQuestion({
    id: 'easa-climb-wind-gradient',
    type: 'multiple-choice',
    title: 'Wind and climb gradient',
    question:
      'With the same climb performance relative to the air mass, what does a steady headwind do?',
    choices: [
      {
        id: 'steeper-ground',
        label: 'Makes the climb path steeper relative to the ground by reducing groundspeed',
      },
      { id: 'higher-air-rate', label: 'Necessarily increases rate of climb through the air' },
      { id: 'shallower-ground', label: 'Makes the ground-referenced climb path shallower' },
      { id: 'changes-weight', label: 'Reduces aircraft weight' },
    ],
    correctAnswer: 'steeper-ground',
    correctFeedback:
      'Correct. The aircraft covers less horizontal ground distance during the same height gain.',
    incorrectFeedback:
      'Distinguish performance relative to the surrounding air from the path relative to the ground.',
  })
  context.checkPoint(`Wind and climb gradient answered in ${windAnswer.attempts} attempt(s)`)

  const reflection = await context.askQuestion({
    id: 'easa-climb-performance-reflection',
    type: 'essay',
    title: 'Operational reflection',
    question:
      'Explain when a pilot would choose Vx, Vy or a cruise climb, and identify the aircraft and atmospheric factors that must be checked before relying on predicted climb performance.',
    placeholder:
      'Relate obstacle clearance, time to height, visibility/cooling, mass, configuration and density altitude…',
    submitLabel: 'Complete lesson',
  })
  context.checkPoint(`Climb performance completed · reflection ${reflection.answer.length} chars`)

  await context.notifyUser(
    'Lesson complete',
    'Vx is an angle/gradient objective based on excess thrust; Vy is a rate objective based on excess power. Mass, drag-producing configuration and reduced density all erode the available margin. For real operations, calculate climb performance from the current POH using the actual weight, configuration, pressure altitude, temperature and wind, with appropriate safety margins.',
  )
}
