import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const simProps = context.props
  const simulation = simControls.simulation
  const waitFor = context.waitFor
  const waitForCondition = context.waitForCondition
  const stageDuration = 10_000
  const stepDelay = 500
  const accent = (text: string) =>
    `<span style="color: rgb(var(--color-panelActive)); font-weight: 600">${text}</span>`

  const stage = async (
    title: string,
    message: string,
    action?: () => void | Promise<void>,
    checkpoint?: string,
    fillTimeSlot = true,
  ) => {
    const startedAt = Date.now()
    await context.notifyUser(title, message)
    if (action) await action()
    if (checkpoint) context.checkPoint(checkpoint)
    if (fillTimeSlot) await waitFor(Math.max(0, stageDuration - (Date.now() - startedAt)))
  }

  const step = async (action: () => unknown) => {
    action()
    await waitFor(stepDelay)
  }

  context.setLayout(context.layoutTypes.INSTRUCTOR)
  context.resetPanels()
  simulation.reset_simulation()
  const flightModel = simulation.set_flight_model_b747()
  simControls.flightModel = flightModel
  await waitFor(300)

  let rotationSpeed = 0

  await stage(
    '1 · Flight Simulation and Training',
    `This environment combines flight simulation, live analysis, guided lessons and instructor-led classroom management. A B747 take-off will run in the background while ${accent('10 capabilities')} are demonstrated. The aircraft will now be configured one system at a time.`,
    async () => {
      await step(() => flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TWENTY))
      await step(() => flightModel.set_autopilot_master_switch(true))
      await step(() => flightModel.set_autopilot_auto_trim(true))
      await step(() => flightModel.set_autopilot_speed_indicated_target(210))
      await step(() => flightModel.set_autopilot_altitude_target(3000))
      await step(() => flightModel.set_autopilot_heading_target(290))
      await step(() => flightModel.set_autopilot_vertical_speed_target(1500))
      await step(() => flightModel.set_autopilot_pitch_target(10))
    },
    'Demonstration started',
  )

  await stage(
    '2 · Direct Flight Controls',
    `The ${accent('Joystick')} view exposes throttle, primary flight controls and trim. It remains visible so scripted commands and automatic control responses can be observed directly.`,
    async () => {
      context.setTab('flight-model', 'Joystick')
      await waitFor(stepDelay)
    },
  )

  await stage(
    '3 · Realtime Monitoring',
    `The Realtime panel can combine live values with independent plots. Flap and landing-gear state will be displayed as data, followed by separate plots for ${accent('throttle, airspeed and altitude')}.`,
    async () => {
      context.setTab('realtime', 'Real-Time-Data')
      await step(() => context.dataView(simProps.flaps_selector_position, true))
      await step(() => context.dataView(simProps.landing_gear_selector_position, true))
      await step(() => context.plotView(simProps.engine_throttle_position, true))
      await step(() => context.plotView(simProps.ias_speed_knots, true))
      await step(() => context.plotView(simProps.altitude, true))
    },
  )

  await stage(
    '4 · Take-off and Scenario Orchestration',
    `Thrust will advance to ${accent('90%')} and the scenario will observe the aircraft continuously. In operational terms, **V1** is the take-off decision speed, **VR** is the commanded rotation speed, and **V2** provides the target safety margin for the initial climb. For this demonstration, reaching **150 kt** acts as the rotation event. The scripting engine can coordinate the next action from live aircraft state while the rest of the presentation continues independently.`,
    async () => {
      flightModel.set_engine_throttle_position(0.9)
      const rotationReady = await waitForCondition(
        () => flightModel.speed_indicated_knots >= 150,
        0,
        100,
      )
      if (!rotationReady) return

      rotationSpeed = flightModel.speed_indicated_knots
      flightModel.set_elevator_position(-0.25)
      context.checkPoint(`Rotation initiated at ${rotationSpeed.toFixed(0)} kt`)

      await waitForCondition(
        () => flightModel.vertical_speed_ftmin > 400 && !flightModel.weight_on_wheel,
        800,
        200,
      )
      await step(() => flightModel.set_autopilot_pitch_hold(true))
      await step(() =>
        flightModel.set_landing_gear_selector_position(simControls.B747GearSelector.UP),
      )
      flightModel.set_engine_throttle_position(0.85)
      context.checkPoint('Positive climb confirmed — gear retracted')
    },
    undefined,
    false,
  )

  await stage(
    '5 · Visual Scene and Workspace',
    `The airborne phase will introduce the ${accent('3D world')} and ${accent('2D navigation map')}. The interface will then cycle through its layouts and both themes, demonstrating how the same live simulation can support different workflows.`,
    async () => {
      await step(() => context.setVisuals(true))
      await step(() => context.setMap(true))
      await step(() => context.setLayout(context.layoutTypes.FOCUS))
      await step(() => context.setLayout(context.layoutTypes.PILOT))
      await step(() => context.setLayout(context.layoutTypes.CLASSROOM))
      await step(() => context.setLayout(context.layoutTypes.INSTRUCTOR))
      await step(() => context.setTheme(false))
      await step(() => context.setTheme(true))
    },
  )

  await stage(
    '6 · Flight Instrument Displays',
    `Both instrument systems will start hidden. The ${accent('PFD')} components will appear one by one, followed by the traditional six flight instruments, showing that every display element can be controlled independently.`,
    async () => {
      simulation.set_pfd_display(false)
      simulation.set_six_instruments_display(false)
      const pfdSetters = [
        (state: boolean) => simulation.set_pfd_altimeter_visible(state),
        (state: boolean) => simulation.set_pfd_speed_indicator_visible(state),
        (state: boolean) => simulation.set_pfd_vertical_speed_indicator_visible(state),
        (state: boolean) => simulation.set_pfd_heading_indicator_visible(state),
        (state: boolean) => simulation.set_pfd_attitude_indicator_visible(state),
        (state: boolean) => simulation.set_pfd_turn_coordinator_visible(state),
        (state: boolean) => simulation.set_pfd_horizon_visible(state),
        (state: boolean) => simulation.set_pfd_flight_mode_annunciator_visible(state),
      ]
      pfdSetters.forEach((setter) => setter(false))
      simulation.set_pfd_display(true)
      for (const setter of pfdSetters) await step(() => setter(true))

      const analogSetters = [
        (state: boolean) => simulation.set_analog_altimeter_visible(state),
        (state: boolean) => simulation.set_analog_speed_indicator_visible(state),
        (state: boolean) => simulation.set_analog_vertical_speed_indicator_visible(state),
        (state: boolean) => simulation.set_analog_heading_indicator_visible(state),
        (state: boolean) => simulation.set_analog_attitude_indicator_visible(state),
        (state: boolean) => simulation.set_analog_turn_coordinator_visible(state),
      ]
      analogSetters.forEach((setter) => setter(false))
      simulation.set_six_instruments_display(true)
      for (const setter of analogSetters) await step(() => setter(true))
    },
  )

  await stage(
    '7 · Automatic Flight Guidance',
    `Autopilot commands and aircraft response will be plotted together. The bank target will move to ${accent('30°')} and then return to **0°**, while the actual bank angle follows the command.`,
    async () => {
      context.setTab('realtime', 'Real-Time-Data')
      context.plotView([simProps.autopilot_bank_target, simProps.bank_deg], true)
      flightModel.set_autopilot_pitch_hold(false)
      flightModel.set_autopilot_vertical_speed_hold(true)
      flightModel.set_autopilot_speed_indicated_hold(true)
      flightModel.set_autopilot_bank_hold(true)
      flightModel.set_elevator_position(0)
      await step(() => flightModel.set_autopilot_bank_target(30))
      await waitFor(3000)
      flightModel.set_autopilot_bank_target(0)
      await waitFor(3000)
      context.plotView([simProps.autopilot_bank_target, simProps.bank_deg], false)
    },
    'Automatic flight guidance demonstrated',
  )

  await stage(
    '8 · Atmosphere and Airflow',
    `The aircraft rotated at **${rotationSpeed.toFixed(0)} kt**. Turbulence, motion cues and the ${accent('Airflow')} view will now expose how the autopilot responds through aileron and elevator inputs.`,
    async () => {
      context.setTab('realtime', 'Airflow')
      flightModel.set_atmosphere_turbulence_level(0.2)
      flightModel.set_atmosphere_turbulence_intervals(0.8)
      context.plotView([simProps.aileron_position, simProps.elevator_position], true)
      simulation.set_motion_cues(true)
      await waitFor(3000)
      simulation.set_motion_cues(false)
    },
    'Atmospheric disturbance demonstrated',
  )

  await stage(
    '9 · Simulation Time Control',
    `The scenario will pause and resume before progressing through ${accent('0.5×, 2×, 10× and 30×')} simulation speed. The aircraft model, plots and scripted events remain coordinated as the time scale changes.`,
    async () => {
      simulation.set_simulation_pause(true)
      await waitFor(1000)
      simulation.set_simulation_pause(false)
      await step(() => simulation.set_simulation_speed(0.5))
      await step(() => simulation.set_simulation_speed(2))
      await step(() => simulation.set_simulation_speed(10))
      await step(() => simulation.set_simulation_speed(30))
    },
    'Simulation time controls demonstrated',
  )

  await stage(
    '10 · Classroom and Handoff',
    `The ${accent('Classroom')} workspace supports exercise assignment, checkpoints, completion monitoring, overdue indications and requests for assistance. It will now open while the aircraft returns to stable conditions for further exploration.`,
    async () => {
      context.setLayout(context.layoutTypes.CLASSROOM)
      await waitFor(2000)
      flightModel.set_atmosphere_turbulence_level(0)
      flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ZERO)
      simulation.set_motion_cues(false)
      simulation.set_simulation_speed(1)
      context.plotView([simProps.aileron_position, simProps.elevator_position], false)
      context.setTab('realtime', 'Real-Time-Data')
    },
    'Introductory demonstration completed',
  )
}
