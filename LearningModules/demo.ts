import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simProps = context.props
  const simulation = simControls.simulation
  // Check mode state during the demo's existing waits; no persistent timer is left behind.
  let syncAutopilotPlots = () => {}
  const waitFor = async (milliseconds: number) => {
    const end = Date.now() + milliseconds
    do {
      syncAutopilotPlots()
      await context.waitFor(Math.min(100, Math.max(0, end - Date.now())))
    } while (Date.now() < end)
    syncAutopilotPlots()
  }
  const waitForCondition: ScriptContext['waitForCondition'] = (condition, ...options) =>
    context.waitForCondition(
      () => {
        syncAutopilotPlots()
        return condition()
      },
      ...options,
    )
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

  const autopilotPlots = [
    {
      engaged: () => flightModel.autopilot_vertical_speed_hold,
      series: [simProps.autopilot_vertical_speed_target, simProps.vertical_speed_ftmin],
      visible: false,
    },
    {
      engaged: () => flightModel.autopilot_bank_hold,
      series: [simProps.autopilot_bank_target, simProps.bank_deg],
      visible: false,
    },
    {
      engaged: () => flightModel.autopilot_speed_indicated_hold,
      series: [simProps.autopilot_speed_indicated_target, simProps.speed_indicated_knots],
      visible: false,
    },
    {
      engaged: () => flightModel.autopilot_altitude_hold,
      series: [simProps.autopilot_altitude_target, simProps.altitude_ft],
      visible: false,
    },
  ]
  syncAutopilotPlots = () => {
    for (const plot of autopilotPlots) {
      const engaged = flightModel.autopilot_master_switch && plot.engaged()
      if (engaged === plot.visible) continue
      // Replace any standalone actual-value plot with its target/actual pair.
      if (engaged) context.plotView(plot.series[1], false)
      context.plotView(plot.series, engaged)
      plot.visible = engaged
    }
  }

  // Keep the introduction separate from checklist entries and tour scheduling.
  simulation.set_simulation_pause(true)
  try {
    context.setTab('prompt', 'Console')
    await context.notifyUser(
      'Flight simulation & training',
      'A C++ flight simulator for exploring aircraft handling, flight instruments, and autopilot behavior. Use interactive lessons, live telemetry, and TypeScript scripts for self-study, classroom instruction, and repeatable experiments.',
      0,
      { replace: true },
    )
    await waitFor(8_000)
    await context.notifyUser(
      'About this demo',
      `Watch an automatic B747 take-off and climb. During the flight, the tour introduces layouts, instruments, airflow, the whiteboard, and autopilot target-versus-actual plots.

No input is required. The checklist tracks flight actions and their conditions; indented entries show simulator features.

*Demonstration settings—not operational flight guidance.*`,
      0,
      { replace: false },
    )
    await waitFor(8_000)
  } finally {
    simulation.set_simulation_pause(false)
  }

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
    { action: 'Engines stable', condition: 'All N1 ≥ 35%' },
    { action: 'Thrust 90%', condition: 'Engines stable' },
    { action: 'Cross-check', condition: 'IAS ≥ 80 kt' },
    { action: 'V1 callout', condition: 'IAS ≥ 130 kt' },
    { action: 'Rotate', condition: 'IAS ≥ 150 kt' },
    { action: 'Gear up', condition: 'Airborne · VS > 400 ft/min' },
    { action: 'Climb guidance', condition: 'ALT ≥ 1,000 ft' },
    { action: 'Flaps 10', condition: 'ALT ≥ 1,000 ft · IAS ≥ 210 kt' },
    { action: 'Flaps 5', condition: 'ALT ≥ 1,500 ft · IAS ≥ 220 kt' },
    { action: 'Flaps 1', condition: 'ALT ≥ 2,000 ft · IAS ≥ 235 kt' },
    { action: 'Flaps up', condition: 'ALT ≥ 2,500 ft · IAS ≥ 245 kt' },
  ]
  let takeoffActiveIndex: number | null = 0
  type TourEntry = { label: string; parent: number; done: boolean }
  const tourEntries: TourEntry[] = []
  let activeTour: TourEntry | undefined
  const tourParent = () => takeoffActiveIndex ?? takeoffSteps.length
  const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const renderTour = (entry: TourEntry) =>
    `<span class="demo-tour-symbol" aria-label="${entry.done ? 'Done' : 'Showing'}">${entry.done ? '✓' : '▸'}</span>${escapeHtml(entry.label)}`
  const renderChildren = (parent: number) => {
    const entries = tourEntries.filter((entry) => entry.parent === parent)
    if (!entries.length) return ''
    if (parent !== tourParent() && entries.every((entry) => entry.done)) {
      return `<tr class="demo-tour-row"><td></td><td colspan="2"><details><summary>✓ ${entries.length} demonstrations</summary>${entries.map((entry) => `<div>${renderTour(entry)}</div>`).join('')}</details></td></tr>`
    }
    return entries
      .map(
        (entry) =>
          `<tr class="demo-tour-row ${entry.done ? '' : 'demo-tour-active'}"><td></td><td colspan="2">${renderTour(entry)}</td></tr>`,
      )
      .join('')
  }
  const takeoffProgress = () =>
    takeoffSteps
      .map(({ action, condition }, index) => {
        const done = takeoffActiveIndex === null || index < takeoffActiveIndex
        const waiting = index === takeoffActiveIndex
        const next = takeoffActiveIndex !== null && index === takeoffActiveIndex + 1
        const state = done ? '✓' : waiting ? '◷' : next ? '→' : '·'
        const stateLabel = done ? 'Done' : waiting ? 'Waiting' : next ? 'Next' : 'Pending'
        const background = waiting
          ? 'panelActive'
          : done
            ? 'panelHeaderBackground'
            : 'panelContentBackground'
        return `<tr class="demo-takeoff-parent ${waiting ? 'demo-takeoff-waiting' : ''}" style="background:rgb(var(--color-${background}));color:${waiting ? '#fff' : 'rgb(var(--color-secondary))'}"><td title="${stateLabel}" aria-label="${stateLabel}">${state}</td><td>${action}</td><td>${condition}</td></tr>${renderChildren(index)}`
      })
      .join('')
  const withTakeoffSequence = () => {
    const afterTakeoff = tourEntries.some((entry) => entry.parent === takeoffSteps.length)
      ? `<tr class="demo-takeoff-parent"><td></td><td colspan="2">After take-off</td></tr>${renderChildren(takeoffSteps.length)}`
      : ''
    return `<table class="demo-takeoff-table"><caption>Take-off &amp; simulator tour · demo settings</caption><thead><tr><th scope="col" aria-label="State"></th><th scope="col">Action</th><th scope="col">Condition</th></tr></thead><tbody>${takeoffProgress()}${afterTakeoff}</tbody></table>`
  }
  const refreshChecklist = () =>
    context.notifyUser('Demonstration', withTakeoffSequence(), 0, {
      replace: true,
    })
  const announce = (title: string, _message = '') => {
    if (activeTour) activeTour.done = true
    activeTour = { label: title, parent: tourParent(), done: false }
    tourEntries.push(activeTour)
    return refreshChecklist()
  }
  const replacePrompt = announce
  const step = async (action: () => unknown, delay = stepDelay) => {
    action()
    await waitFor(delay)
    if (activeTour) {
      activeTour.done = true
      activeTour = undefined
      await refreshChecklist()
    }
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
    // Start these tours as soon as the ground roll allows, without fixed idle gaps.
    if (index !== 2 && index !== 3) await waitUntil(index * frameDuration)
    await announce(title, message)
    await action?.()
  }
  const showTakeoffProgress = async (activeIndex: number | null) => {
    takeoffActiveIndex = activeIndex
    // An unfinished tour item follows the live milestone; completed items stay put.
    tourEntries
      .filter((entry) => !entry.done)
      .forEach((entry) => {
        entry.parent = tourParent()
      })
    await refreshChecklist()
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
    await showTakeoffProgress(1)
    flightModel.set_engine_throttle_position(0.9)
    context.checkPoint('Take-off thrust set after N1 stabilization')
    await showTakeoffProgress(2)
    resolveN1Stable()

    await waitForCondition(() => flightModel.speed_indicated_knots >= 80, 300, 100)
    context.checkPoint('80 kt — airspeed cross-check')
    await showTakeoffProgress(3)

    await waitForCondition(() => flightModel.speed_indicated_knots >= 130, 300, 100)
    context.checkPoint('V1 reached')
    await showTakeoffProgress(4)

    await waitForCondition(() => flightModel.speed_indicated_knots >= 150, 300, 100)
    rotationSpeed = flightModel.speed_indicated_knots
    flightModel.set_elevator_position(-0.25)
    context.checkPoint(`Rotation initiated at ${rotationSpeed.toFixed(0)} kt`)
    await showTakeoffProgress(5)

    await waitForCondition(
      () => flightModel.vertical_speed_ftmin > 400 && !flightModel.weight_on_wheel,
      800,
      100,
    )
    resolveAirborne()
    context.plotView(
      [simProps.engine_1_n1, simProps.engine_2_n1, simProps.engine_3_n1, simProps.engine_4_n1],
      false,
    )
    context.plotView(simProps.engine_throttle_position, false)
    // context.plotView([simProps.speed_indicated_knots, simProps.altitude_ft], true)
    flightModel.set_autopilot_pitch_hold(true)
    flightModel.set_landing_gear_selector_position(simControls.B747GearSelector.UP)
    flightModel.set_engine_throttle_position(0.85)
    context.checkPoint('Positive climb confirmed — gear retracted')
    await showTakeoffProgress(6)

    await waitForCondition(() => flightModel.altitude_ft >= 1000, 500, 100)
    flightModel.set_autopilot_pitch_hold(false)
    flightModel.set_autopilot_vertical_speed_hold(true)
    flightModel.set_autopilot_heading_hold(true)
    flightModel.set_autopilot_speed_indicated_hold(true)
    flightModel.set_elevator_position(0)
    flightModel.set_engine_throttle_position(0.8)
    await showTakeoffProgress(7)

    await waitForCondition(
      () => flightModel.altitude_ft >= 1000 && flightModel.speed_indicated_knots >= 210,
      400,
      100,
    )
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TEN)
    await showTakeoffProgress(8)

    await waitForCondition(
      () => flightModel.altitude_ft >= 1500 && flightModel.speed_indicated_knots >= 220,
      400,
      100,
    )
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.FIVE)
    await showTakeoffProgress(9)

    await waitForCondition(
      () => flightModel.altitude_ft >= 2000 && flightModel.speed_indicated_knots >= 235,
      400,
      100,
    )
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ONE)
    await showTakeoffProgress(10)

    await waitForCondition(
      () => flightModel.altitude_ft >= 2500 && flightModel.speed_indicated_knots >= 245,
      400,
      100,
    )
    flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ZERO)
    flightModel.set_autopilot_vertical_speed_hold(false)
    flightModel.set_autopilot_altitude_hold(true)
    context.checkPoint('Take-off and flap-retraction sequence completed')
    await showTakeoffProgress(null)
    syncAutopilotPlots()
  }

  await frame(
    0,
    '1 · Flight Simulation and Training',
    'B747 take-off · live data · displays · classroom. Automatic tour.',
    async () => {
      await announce('Configuration · flaps 20')
      await step(() => flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TWENTY))
      await announce('Autopilot · master')
      await step(() => flightModel.set_autopilot_master_switch(true))
      await announce('Autopilot · auto trim')
      await step(() => flightModel.set_autopilot_auto_trim(true))
      await announce('Speed target · 250 kt')
      await step(() => flightModel.set_autopilot_speed_indicated_target(250))
      await announce('Altitude target · 3,000 ft')
      await step(() => flightModel.set_autopilot_altitude_target(3000))
      await announce('Heading target · 290°')
      await step(() => flightModel.set_autopilot_heading_target(290))
      await announce('Vertical speed target · 1,500 ft/min')
      await step(() => flightModel.set_autopilot_vertical_speed_target(1500))
      await announce('Pitch target · 10°')
      await step(() => flightModel.set_autopilot_pitch_target(10))
      context.checkPoint('Demonstration started — aircraft configured')
    },
  )

  await frame(
    1,
    '2 · Direct Flight Controls',
    `The ${accent('Joystick')} view provides throttle, primary flight controls and trim.`,
    async () => {
      await announce('Joystick · controls and trim')
      await step(() => context.setTab('flight-model', 'Joystick'), 1000)
      await announce(
        'Realtime monitoring',
        'Engine N1, throttle, airspeed and altitude will be plotted.',
      )
      await step(() => context.setTab('realtime', 'Flight-Data'))
      await announce('Live data · flaps')
      await step(() => context.dataView(simProps.flaps_selector_position, true))
      await announce('Live data · landing gear')
      await step(() => context.dataView(simProps.landing_gear_selector_position, true))
      await announce('Plot · engine N1')
      await step(() =>
        context.plotView(
          [simProps.engine_1_n1, simProps.engine_2_n1, simProps.engine_3_n1, simProps.engine_4_n1],
          true,
        ),
      )
      await announce('Plot · throttle')
      await step(() => context.plotView(simProps.engine_throttle_position, true))
      await announce('Plot · indicated speed')
      await step(() => context.plotView(simProps.speed_indicated_knots, true))
      await announce('Plot · altitude')
      await step(() => context.plotView(simProps.altitude_ft, true))
      await announce(
        'Engine stabilization',
        `Thrust will move to ${accent('40%')} until all four engines are stable.`,
      )
      flightModel.set_engine_throttle_position(0.4)
      if (activeTour) activeTour.done = true
      activeTour = undefined
      takeoffSequence = runTakeoff()
    },
  )

  await n1Stable
  await frame(2, '3 · Visual Scene and Layouts', 'Ground roll · layouts and themes.', async () => {
    const layoutSteps = [
      { name: 'Focus', layout: context.layoutTypes.FOCUS },
      { name: 'Pilot', layout: context.layoutTypes.PILOT },
      { name: 'Instructor', layout: context.layoutTypes.INSTRUCTOR },
    ]
    for (const layoutStep of layoutSteps) {
      await replacePrompt(`Layout · ${layoutStep.name}`)
      await step(() => context.setLayout(layoutStep.layout), 1000)
    }

    const themeSteps = [
      { name: 'Light', dark: false },
      { name: 'Dark', dark: true },
    ]
    for (const themeStep of themeSteps) {
      await replacePrompt(`Theme · ${themeStep.name}`)
      await step(() => context.setTheme(themeStep.dark), 1000)
    }
  })

  await frame(
    3,
    '4 · Instrument Displays',
    'PFD + six instruments · matching displays.',
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
        await replacePrompt(`Instruments · ${instrument.name}`)
        await step(() => instrument.setters.forEach((setter) => setter(true)), 2000)
      }
    },
  )

  // Keep one owner of tour prompts; the take-off task only updates schedule rows.
  await airborne
  await announce('Airflow', 'Live angle of attack · airspeed · pitch · flaps.')
  context.setTab('realtime', 'Airflow')
  try {
    await waitFor(8000)
    context.checkPoint('Airflow view demonstrated during climb')
  } finally {
    context.setTab('realtime', 'Flight-Data')
  }

  // Explain before switching: Whiteboard shares the Console panel.
  await announce('Whiteboard', 'Shared sketches · brush sizes · colors · undo / redo.')
  await waitFor(3000)
  context.setTab('prompt', 'whiteboard')
  try {
    await waitFor(8000)
    context.checkPoint('Whiteboard canvas and drawing tools shown')
  } finally {
    context.setTab('prompt', 'Console')
  }

  await announce('3D world')
  await step(() => context.setVisuals(true), 2000)
  await announce('Navigation map')
  await step(() => context.setMap(true), 2000)
  await announce('Navigation map · close')
  await step(() => context.setMap(false), 1000)

  await frame(
    4,
    '5 · Flexible Scenario-based Lessons',
    'Lessons · TypeScript scripts · progress.',
    () => {
      context.setTab('learning-modules', 'Learning-Modules')
    },
  )

  await frame(5, '6 · Autopilot', 'Bank target vs actual · 30° → level.', () => {
    const task = (async () => {
      await airborne
      const bankEntry: TourEntry = {
        label: 'Autopilot · bank 30°',
        parent: tourParent(),
        done: false,
      }
      tourEntries.push(bankEntry)
      await refreshChecklist()
      context.setTab('realtime', 'Flight-Data')
      flightModel.set_autopilot_bank_hold(true)
      flightModel.set_autopilot_bank_target(30)
      await waitForCondition(() => Math.abs(flightModel.bank_deg - 30) < 1, 500, 100)
      bankEntry.done = true
      const levelEntry: TourEntry = {
        label: 'Autopilot · wings level',
        parent: tourParent(),
        done: false,
      }
      tourEntries.push(levelEntry)
      await refreshChecklist()
      flightModel.set_autopilot_bank_target(0)
      await waitForCondition(() => Math.abs(flightModel.bank_deg) < 1, 500, 100)
      await waitFor(1000)
      levelEntry.done = true
      await refreshChecklist()
      context.checkPoint('Autopilot bank guidance demonstrated')
    })()
    backgroundTasks.push(task)
  })

  await frame(6, '7 · Simulation Time Control', 'Pause · resume · 0.5× / 2× / 10×.', async () => {
    const timeControlSteps = [
      { label: 'Pause', action: () => simulation.set_simulation_pause(true), delay: 2500 },
      { label: 'Resume', action: () => simulation.set_simulation_pause(false), delay: 1500 },
      { label: 'Speed · 0.5×', action: () => simulation.set_simulation_speed(0.5), delay: 2000 },
      { label: 'Speed · 2×', action: () => simulation.set_simulation_speed(2), delay: 2000 },
      { label: 'Speed · 10×', action: () => simulation.set_simulation_speed(10), delay: 2000 },
      { label: 'Speed · 1×', action: () => simulation.set_simulation_speed(1), delay: 2000 },
    ]
    for (const timeControlStep of timeControlSteps) {
      await replacePrompt(`Simulation · ${timeControlStep.label}`)
      await step(timeControlStep.action, timeControlStep.delay)
    }
    context.checkPoint('Simulation time controls demonstrated')
  })

  await frame(
    7,
    '8 · Classroom and Handoff',
    'Assignments · checkpoints · peer status · raised hands.',
    async () => {
      context.setLayout(context.layoutTypes.INSTRUCTOR)
      await waitUntil(90_000)
      await takeoffSequence
      await Promise.all(backgroundTasks)
      simulation.set_simulation_pause(false)
      simulation.set_simulation_speed(1)
      context.setTab('realtime', 'Flight-Data')
      context.checkPoint(
        `Demonstration completed${rotationSpeed ? ` — rotation ${rotationSpeed.toFixed(0)} kt` : ''}`,
      )
    },
  )
  if (activeTour) activeTour.done = true
  activeTour = undefined
  await refreshChecklist()
}
