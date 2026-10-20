import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  // Illustrative scenario value, not calculated B747 performance data.
  const v1Knots = 130
  const { controls, props, waitForCondition, notifyUser, checkPoint } = context
  const simulation = controls.simulation
  simulation.reset_simulation()
  const aircraft = simulation.set_flight_model_b747()
  controls.flightModel = aircraft
  simulation.set_simulation_speed(1)
  simulation.set_simulation_pause(false)
  context.resetPanels()
  context.setLayout(context.layoutTypes.PILOT)
  context.setVisuals(true)
  context.setTab('flight-model', 'Joystick')
  context.setTab('prompt', 'Console')

  const fuel = (enabled: boolean) => {
    aircraft.set_engine_1_fuel_switch_state(enabled)
    aircraft.set_engine_2_fuel_switch_state(enabled)
    aircraft.set_engine_3_fuel_switch_state(enabled)
    aircraft.set_engine_4_fuel_switch_state(enabled)
  }
  const secure = () => {
    aircraft.set_engine_throttle_position(0)
    aircraft.set_engine_throttle_reverser_position(0)
    aircraft.set_parking_brake(true)
    fuel(false)
  }
  const requireGround = () => {
    if (!aircraft.weight_on_wheel || aircraft.damaged) {
      throw new Error('Demonstration interrupted: aircraft left the ground or was damaged.')
    }
  }
  const wait = async (condition: () => boolean, timeout: number, confirmation = 0) => {
    const reached = await waitForCondition(condition, confirmation, 25, timeout, false)
    if (!reached) throw new Error('Demonstration timed out before reaching the next stage.')
  }

  try {
    aircraft.set_autopilot_master_switch(false)
    aircraft.set_autopilot_speed_indicated_hold(false)
    aircraft.set_autopilot_speed_true_hold(false)
    aircraft.set_autopilot_speed_mach_hold(false)
    aircraft.set_freeze_position(false)
    aircraft.set_freeze_altitude(false)
    aircraft.set_engine_throttle_position(0)
    aircraft.set_engine_throttle_reverser_position(0)
    aircraft.set_parking_brake(true)
    aircraft.set_flaps_selector_position(controls.B747FlapSelector.TWENTY)
    aircraft.set_landing_gear_selector_position(controls.B747GearSelector.DOWN)
    fuel(true)

    for (const property of [
      props.speed_indicated_knots,
      props.engine_throttle_position,
      props.engine_throttle_reverser_position,
      props.parking_brake,
    ])
      context.dataView(property, true)
    context.plotView(props.speed_indicated_knots, true)
    context.plotView([props.engine_throttle_position, props.engine_throttle_reverser_position], true)

    await notifyUser(
      'B747 · Rejected take-off',
      `Automatic demonstration: accelerate to an illustrative **V1 of ${v1Knots} kt IAS**, reject, brake, apply reverse and stop. All four engines will then be shut down.

The model's parking-brake control approximates service braking. No service-brake or spoiler controls are exposed. The V1 value and measured stopping distance are demonstration data, not approved B747 performance.`,
      8000,
    )
    await wait(
      () =>
        aircraft.weight_on_wheel &&
        Math.abs(aircraft.speed_true_knots) < 1 &&
        Math.abs(aircraft.flaps_position - 20) < 0.5,
      30000,
      500,
    )
    checkPoint('B747 rejected take-off configured', {
      illustrativeV1Knots: v1Knots,
      brakingModel: 'parking-brake approximation',
    })

    aircraft.set_parking_brake(false)
    aircraft.set_engine_throttle_position(1)
    void notifyUser(
      'Take-off roll',
      `Accelerating · illustrative V1 ${v1Knots} kt IAS · no rotation.`,
      4000,
    )
    await wait(() => {
      requireGround()
      return aircraft.speed_indicated_knots >= v1Knots
    }, 120000)

    const rejectSpeed = aircraft.speed_indicated_knots
    const rejectTime = simulation.simulation_time
    let latitude = aircraft.latitude
    let longitude = aircraft.longitude
    let stoppingDistanceMetres = 0
    // Command the reject before displaying its announcement; no dwell at V1.
    aircraft.set_engine_throttle_position(0)
    aircraft.set_parking_brake(true)
    aircraft.set_engine_throttle_reverser_position(1)
    checkPoint('V1 — REJECT', { rejectSpeedKnots: rejectSpeed })
    void notifyUser(
      'V1 — REJECT',
      'Forward thrust idle · braking applied · reverse thrust selected.',
      4000,
    )

    await wait(
      () => {
        requireGround()
        const radians = Math.PI / 180
        const nextLatitude = aircraft.latitude
        const nextLongitude = aircraft.longitude
        const a =
          Math.sin(((nextLatitude - latitude) * radians) / 2) ** 2 +
          Math.cos(latitude * radians) *
            Math.cos(nextLatitude * radians) *
            Math.sin(((nextLongitude - longitude) * radians) / 2) ** 2
        stoppingDistanceMetres += 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
        latitude = nextLatitude
        longitude = nextLongitude
        // Demo-only taper to avoid driving the aircraft backwards near standstill.
        aircraft.set_engine_throttle_reverser_position(
          Math.min(1, Math.max(0, (aircraft.speed_true_knots - 5) / 25)),
        )
        return Math.abs(aircraft.speed_true_knots) < 0.5
      },
      120000,
      500,
    )

    const stoppingTimeSeconds = simulation.simulation_time - rejectTime
    secure()
    checkPoint('Stopped · all four engine fuel switches OFF', {
      rejectSpeedKnots: rejectSpeed,
      stoppingTimeSeconds,
      stoppingDistanceMetres,
      engineFuelSwitchesOff: true,
    })
    await notifyUser(
      'Rejected take-off complete',
      `| Measurement | Result |
|---|---|
| Reject speed | ${rejectSpeed.toFixed(1)} kt IAS |
| Stopping time | ${stoppingTimeSeconds.toFixed(1)} s |
| Ground distance after reject | ${stoppingDistanceMetres.toFixed(0)} m |

**Stopped · brakes held · reverse zero · all four engine fuel switches OFF.** Engines will spool down. Results use simplified simulator braking.`,
      0,
    )
  } catch (error) {
    secure()
    simulation.set_simulation_pause(true)
    checkPoint('Rejected take-off demonstration interrupted', { reason: String(error) })
    throw error
  }
}
