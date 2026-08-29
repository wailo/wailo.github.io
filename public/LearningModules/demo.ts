import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simProps = context.props
  const simulation = simControls.simulation
  const waitFor = context.waitFor
  const waitForCondition = context.waitForCondition
  const frameDuration = 10_000
  const stepDelay = 500
  const accent = (text: string) =>
    `<span style="color: rgb(var(--color-panelActive)); font-weight: 600">${text}</span>`

  context.resetPanels()
  context.setLayout(context.layoutTypes.INSTRUCTOR)
  context.setVisuals(false)
  context.setMap(false)
  simulation.reset_simulation()

  const flightModel = simulation.set_flight_model_b747()
  simControls.flightModel = flightModel
  await waitFor(300)

  const demonstrationStartedAt = Date.now()
  const backgroundTasks: Promise<void>[] = []
  let takeoffSequence: Promise<void> = Promise.resolve()
  let rotationSpeed = 0
  let resolveN1Stable: () => void = () => {}
  const n1Stable = new Promise<void>((resolve) => {
    resolveN1Stable = resolve
  })
  let resolveAirborne: () => void = () => {}
  const airborne = new Promise<void>((resolve) => {
    resolveAirborne = resolve
  })

  const takeoffSteps = [
    'Engines stable · N1 ≥ 35%',
    'Take-off thrust · 90%',
    'Airspeed cross-check · 80 kt',
    'V1 · 130 kt',
    'Rotate · 150 kt',
    'Positive climb · 400 ft/min',
    'Climb guidance · 1,000 ft',
    'Flaps 10 · 210 kt',
    'Flaps 5 · 1,500 ft / 220 kt',
    'Flaps 1 · 2,000 ft / 235 kt',
    'Flaps up · 2,500 ft / 245 kt',
  ]
  let takeoffActiveIndex: number | null = 0
  const takeoffProgress = () =>
    takeoffSteps
      .map((label, index) => {
        if (takeoffActiveIndex === null || index < takeoffActiveIndex) return `- ✓ ${label}`
        if (index === takeoffActiveIndex) return `- ${accent(`**▶ ${label}**`)}`
        return `- · ${label}`
      })
      .join('\n')
  const withTakeoffSequence = (subtitle: string, message = '') =>
    `**Take-off sequence**\n${takeoffProgress()}\n\n<br>\n\n---\n\n**${subtitle}**${message ? `\n\n${message}` : ''}`
  let currentPromptTitle = 'Overview'
  let currentPromptMessage = ''
  const announce = (title: string, message = '') => {
    currentPromptTitle = title
    currentPromptMessage = message
    return context.notifyUser('Demonstration', withTakeoffSequence(title, message), 0, {
      replace: true,
    })
  }
  const replacePrompt = announce
  const step = async (action: () => unknown, delay = stepDelay) => {
    action()
    await waitFor(delay)
  }
  const waitUntil = async (elapsedMs: number) => {
    await waitFor(Math.max(0, elapsedMs - (Date.now() - demonstrationStartedAt)))
  }
  const frame = async (
    index: number,
    title: string,
    message: string,
    action?: () => void | Promise<void>,
  ) => {
    await waitUntil(index * frameDuration)
    await announce(title, message)
    await action?.()
  }
  const showTakeoffProgress = async (activeIndex: number | null) => {
    takeoffActiveIndex = activeIndex
    await context.notifyUser(
      'Demonstration',
      withTakeoffSequence(currentPromptTitle, currentPromptMessage),
      0,
      { replace: true },
    )
  }

  const runTakeoff = async () => {
    await showTakeoffProgress(0)
    await waitForCondition(
      () =>
        flightModel.engine_1_n1 >= 35 &&
        flightModel.engine_2_n1 >= 35 &&
        flightModel.engine_3_n1 >= 35 &&
        flightModel.engine_4_n1 >= 35,
      600,
      100,
    )
    resolveN1Stable()

    await showTakeoffProgress(1)
    flightModel.set_engine_throttle_position(0.9)
    context.checkPoint('Take-off thrust set after N1 stabilization')

    await waitForCondition(() => flightModel.speed_indicated_knots >= 80, 300, 100)
    await showTakeoffProgress(2)
    context.checkPoint('80 kt — airspeed cross-check')

    await waitForCondition(() => flightModel.speed_indicated_knots >= 130, 300, 100)
    await showTakeoffProgress(3)
    context.checkPoint('V1 reached')

    await waitForCondition(() => flightModel.speed_indicated_knots >= 150, 300, 100)
    rotationSpeed = flightModel.speed_indicated_knots
    await showTakeoffProgress(4)
    flightModel.set_elevator_position(-0.25)
    context.checkPoint(`Rotation initiated at ${rotationSpeed.toFixed(0)} kt`)

    await waitForCondition(
      () => flightModel.vertical_speed_ftmin > 400 && !flightModel.weight_on_wheel,
      800,
      100,
    )
    resolveAirborne()
    await showTakeoffProgress(5)
    context.plotView(
      [simProps.engine_1_n1, simProps.engine_2_n1, simProps.engine_3_n1, simProps.engine_4_n1],
      false,
    )
    context.plotView(simProps.engine_throttle_position, false)
    context.plotView([simProps.speed_indicated_knots, simProps.altitude_ft], true)
    flightModel.set_autopilot_pitch_hold(true)
    flightModel.set_landing_gear_selector_position(simControls.B747GearSelector.UP)
    flightModel.set_engine_throttle_position(0.85)
    context.checkPoint('Positive climb confirmed — gear retracted')

    await waitForCondition(() => flightModel.altitude_ft >= 1000, 500, 100)
    await showTakeoffProgress(6)
    flightModel.set_autopilot_pitch_hold(false)
    flightModel.set_autopilot_vertical_speed_hold(true)
    flightModel.set_autopilot_heading_hold(true)
    flightModel.set_autopilot_speed_indicated_hold(true)
    flightModel.set_elevator_position(0)
    flightModel.set_engine_throttle_position(0.8)

    await waitForCondition(
      () => flightModel.altitude_ft >= 1000 && flightModel.speed_indicated_knots >= 210,
      400,
      100,
    )
    await showTakeoffProgress(7)
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TEN)

    await waitForCondition(
      () => flightModel.altitude_ft >= 1500 && flightModel.speed_indicated_knots >= 220,
      400,
      100,
    )
    await showTakeoffProgress(8)
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.FIVE)

    await waitForCondition(
      () => flightModel.altitude_ft >= 2000 && flightModel.speed_indicated_knots >= 235,
      400,
      100,
    )
    await showTakeoffProgress(9)
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ONE)

    await waitForCondition(
      () => flightModel.altitude_ft >= 2500 && flightModel.speed_indicated_knots >= 245,
      400,
      100,
    )
    await showTakeoffProgress(10)
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ZERO)
    flightModel.set_autopilot_vertical_speed_hold(false)
    flightModel.set_autopilot_altitude_hold(true)
    context.checkPoint('Take-off and flap-retraction sequence completed')
    await showTakeoffProgress(null)
    context.dataDisplayReset()
    context.plotView(simProps.speed_indicated_knots, true)
    context.plotView(simProps.vertical_speed_ftmin, true)
    context.plotView(simProps.altitude_ft, true)
  }

  await frame(
    0,
    '1 · Flight Simulation and Training',
    `A B747 take-off will demonstrate ${accent('scenario-based training')}, live analysis, configurable displays and classroom tools.`,
    async () => {
      await step(() => flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TWENTY))
      await step(() => flightModel.set_autopilot_master_switch(true))
      await step(() => flightModel.set_autopilot_auto_trim(true))
      await step(() => flightModel.set_autopilot_speed_indicated_target(250))
      await step(() => flightModel.set_autopilot_altitude_target(3000))
      await step(() => flightModel.set_autopilot_heading_target(290))
      await step(() => flightModel.set_autopilot_vertical_speed_target(1500))
      await step(() => flightModel.set_autopilot_pitch_target(10))
      context.checkPoint('Demonstration started — aircraft configured')
    },
  )

  await frame(
    1,
    '2 · Direct Flight Controls',
    `The ${accent('Joystick')} view provides throttle, primary flight controls and trim.`,
    async () => {
      context.setTab('flight-model', 'Joystick')
      await announce(
        'Realtime monitoring',
        'Engine N1, throttle, airspeed and altitude will be plotted.',
      )
      await step(() => context.setTab('realtime', 'Real-Time-Data'))
      await step(() => context.dataView(simProps.flaps_selector_position, true))
      await step(() => context.dataView(simProps.landing_gear_selector_position, true))
      await step(() =>
        context.plotView(
          [simProps.engine_1_n1, simProps.engine_2_n1, simProps.engine_3_n1, simProps.engine_4_n1],
          true,
        ),
      )
      await step(() => context.plotView(simProps.engine_throttle_position, true))
      await step(() => context.plotView(simProps.speed_indicated_knots, true))
      await step(() => context.plotView(simProps.altitude_ft, true))
      await announce(
        'Engine stabilization',
        `Thrust will move to ${accent('40%')} until all four engines are stable.`,
      )
      flightModel.set_engine_throttle_position(0.4)
      takeoffSequence = runTakeoff()
    },
  )

  await frame(
    2,
    '3 · Visual Scene and Layouts',
    `The Focus and Pilot layouts will be shown before returning to ${accent('Instructor')}.`,
    async () => {
      await n1Stable
      const layoutSteps = [
        { name: 'Focus', layout: context.layoutTypes.FOCUS },
        { name: 'Pilot', layout: context.layoutTypes.PILOT },
        { name: 'Instructor', layout: context.layoutTypes.INSTRUCTOR },
      ]
      for (const layoutStep of layoutSteps) {
        const layoutList = layoutSteps
          .map(({ name }) =>
            name === layoutStep.name ? `- ${accent(`**${name}**`)}` : `- ${name}`,
          )
          .join('\n')
        await replacePrompt('Layout demonstration', layoutList)
        await step(() => context.setLayout(layoutStep.layout), 1000)
      }

      const themeSteps = [
        { name: 'Light', dark: false },
        { name: 'Dark', dark: true },
      ]
      for (const themeStep of themeSteps) {
        const themeList = themeSteps
          .map(({ name }) => (name === themeStep.name ? `- ${accent(`**${name}**`)}` : `- ${name}`))
          .join('\n')
        await replacePrompt('Theme demonstration', themeList)
        await step(() => context.setTheme(themeStep.dark), 1000)
      }

      const outsideViewTask = (async () => {
        await airborne
        await announce('Outside view available', 'The 3D scene and map will now open.')
        await announce('3D world')
        await step(() => context.setVisuals(true), 1000)
        await announce('2D navigation map')
        await step(() => context.setMap(true), 1000)
        await announce('Close navigation map')
        await step(() => context.setMap(false), 1000)
      })()
      backgroundTasks.push(outsideViewTask)
    },
  )

  await frame(
    3,
    '4 · Instrument Displays',
    `Matching elements of the ${accent('PFD')} and six-instrument view will appear together.`,
    async () => {
      simulation.set_pfd_display(false)
      simulation.set_six_instruments_display(false)
      const instrumentSteps = [
        {
          name: 'Altimeter',
          setters: [
            (state: boolean) => simulation.set_pfd_altimeter_visible(state),
            (state: boolean) => simulation.set_analog_altimeter_visible(state),
          ],
        },
        {
          name: 'Speed indicator',
          setters: [
            (state: boolean) => simulation.set_pfd_speed_indicator_visible(state),
            (state: boolean) => simulation.set_analog_speed_indicator_visible(state),
          ],
        },
        {
          name: 'Vertical-speed indicator',
          setters: [
            (state: boolean) => simulation.set_pfd_vertical_speed_indicator_visible(state),
            (state: boolean) => simulation.set_analog_vertical_speed_indicator_visible(state),
          ],
        },
        {
          name: 'Heading indicator',
          setters: [
            (state: boolean) => simulation.set_pfd_heading_indicator_visible(state),
            (state: boolean) => simulation.set_analog_heading_indicator_visible(state),
          ],
        },
        {
          name: 'Attitude indicator',
          setters: [
            (state: boolean) => simulation.set_pfd_attitude_indicator_visible(state),
            (state: boolean) => simulation.set_analog_attitude_indicator_visible(state),
          ],
        },
        {
          name: 'Turn coordinator',
          setters: [
            (state: boolean) => simulation.set_pfd_turn_coordinator_visible(state),
            (state: boolean) => simulation.set_analog_turn_coordinator_visible(state),
          ],
        },
        {
          name: 'PFD horizon',
          setters: [(state: boolean) => simulation.set_pfd_horizon_visible(state)],
        },
        {
          name: 'PFD flight-mode annunciator',
          setters: [(state: boolean) => simulation.set_pfd_flight_mode_annunciator_visible(state)],
        },
      ]

      instrumentSteps.forEach((instrument) => instrument.setters.forEach((setter) => setter(false)))
      simulation.set_pfd_display(true)
      simulation.set_six_instruments_display(true)
      for (const instrument of instrumentSteps) {
        const instrumentList = instrumentSteps
          .map(({ name }) =>
            name === instrument.name ? `- ${accent(`**${name}**`)}` : `- ${name}`,
          )
          .join('\n')
        await replacePrompt('PFD and six instruments', instrumentList)
        await step(() => instrument.setters.forEach((setter) => setter(true)), 1000)
      }
    },
  )

  await frame(
    4,
    '5 · Flexible Scenario-based Lessons',
    `The ${accent('Learning Modules')} workspace brings lesson planning, progress monitoring and the code editor together.`,
    () => {
      context.setTab('learning-modules', 'Learning-Modules')
    },
  )

  await frame(
    5,
    '6 · Autopilot',
    `Target and actual bank will be plotted while the autopilot commands ${accent('30°')} and returns to wings level.`,
    () => {
      const task = (async () => {
        await airborne
        context.setTab('realtime', 'Real-Time-Data')
        context.plotView([simProps.autopilot_bank_target, simProps.bank_deg], true)
        flightModel.set_autopilot_bank_hold(true)
        flightModel.set_autopilot_bank_target(30)
        await waitForCondition(() => Math.abs(flightModel.bank_deg - 30) < 1, 500, 100)
        flightModel.set_autopilot_bank_target(0)
        await waitForCondition(() => Math.abs(flightModel.bank_deg) < 1, 500, 100)
        await waitFor(1000)
        context.plotView([simProps.autopilot_bank_target, simProps.bank_deg], false)
        context.checkPoint('Autopilot bank guidance demonstrated')
      })()
      backgroundTasks.push(task)
    },
  )

  await frame(
    6,
    '7 · Simulation Time Control',
    `The simulation will pause, resume and cycle through ${accent('three time rates')}.`,
    async () => {
      const timeControlSteps = [
        { label: 'Pause', action: () => simulation.set_simulation_pause(true), delay: 2500 },
        { label: 'Resume', action: () => simulation.set_simulation_pause(false), delay: 1500 },
        { label: 'Speed · 0.5×', action: () => simulation.set_simulation_speed(0.5), delay: 2000 },
        { label: 'Speed · 2×', action: () => simulation.set_simulation_speed(2), delay: 2000 },
        { label: 'Speed · 10×', action: () => simulation.set_simulation_speed(10), delay: 2000 },
        { label: 'Speed · 1×', action: () => simulation.set_simulation_speed(1), delay: 2000 },
      ]
      const showTimeControlProgress = async (activeIndex: number | null) => {
        const progress = timeControlSteps
          .map(({ label }, index) => {
            if (activeIndex === null || index < activeIndex) return `- ✓ ${label}`
            if (index === activeIndex) return `- ${accent(`**▶ ${label}**`)}`
            return `- · ${label}`
          })
          .join('\n')
        await replacePrompt('Simulation time control', progress)
      }

      for (const [index, timeControlStep] of timeControlSteps.entries()) {
        await showTimeControlProgress(index)
        await step(timeControlStep.action, timeControlStep.delay)
      }
      await showTimeControlProgress(null)
      context.checkPoint('Simulation time controls demonstrated')
    },
  )

  await frame(
    7,
    '8 · Classroom and Handoff',
    `The ${accent('Classroom')} view provides exercise assignment, checkpoints, status monitoring and assistance requests.`,
    async () => {
      context.setLayout(context.layoutTypes.CLASSROOM)
      await waitUntil(90_000)
      await takeoffSequence
      await Promise.all(backgroundTasks)
      simulation.set_simulation_pause(false)
      simulation.set_simulation_speed(1)
      context.setTab('realtime', 'Real-Time-Data')
      context.checkPoint(
        `Demonstration completed${rotationSpeed ? ` — rotation ${rotationSpeed.toFixed(0)} kt` : ''}`,
      )
    },
  )
}
