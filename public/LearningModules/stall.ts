import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const notifyUser = context.notifyUser
  const waitFor = context.waitFor
  const waitForCondition = context.waitForCondition

  await notifyUser(
    'Stall Demonstration',
    'The aircraft will be configured at **6,000 ft**, **180 kt**, with **Flaps 10**. ' +
      'After repositioning, the autopilot will hold zero vertical speed while the throttles are moved to idle.',
  )

  const flightModel = simControls.simulation.set_flight_model_b747()
  simControls.flightModel = flightModel
  await waitFor(200)

  const repositioned = await context.repositionWithAutopilot(context, 6000, 180, 0, 20000)
  if (!repositioned) return

  flightModel.set_flaps_selector_position(simControls.B747FlapSelector.TEN)
  await waitForCondition(() => flightModel.flaps_selector_position === simControls.B747FlapSelector.TEN)

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_altitude_hold(false)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_pitch_hold(false)
  flightModel.set_autopilot_vertical_speed_target(0)
  flightModel.set_autopilot_vertical_speed_hold(true)
  flightModel.set_engine_throttle_position(0)

  context.setTab('realtime', 'Airflow')

  await notifyUser(
    'Observe the Airflow and Lift Curve',
    `Flaps increase wing camber. At a given angle of attack, the wing therefore produces a higher lift coefficient, and its maximum lift coefficient is normally higher than in the clean configuration.

The critical—or maximum usable—angle of attack does **not** necessarily increase with flap deployment. It commonly becomes lower because the more highly cambered flow can separate sooner. In the current model, watch the **MAX AOA ${flightModel.max_aoa_deg.toFixed(1)}°** reference and the live **AoA–CL** trace rather than assuming flap angle adds directly to critical AoA.

With vertical speed held at zero and thrust at idle, airspeed will decay. The autopilot must progressively increase pitch and AoA to maintain altitude. Watch the airflow detach and compare the AoA and lift coefficient when the stall flag appears.`,
  )

  context.checkPoint('Stall setup complete — observing deceleration')

  const stalled = await waitForCondition(
    () => flightModel.stalling,
    500,
    200,
    90000,
    false,
  )

  if (stalled) {
    await notifyUser(
      'Stall Observed',
      `Flow separation is indicated at **${flightModel.aoa_deg.toFixed(1)}° AoA** and **CL ${flightModel.cl.toFixed(2)}**.

Flaps 10 allowed more lift at lower speed, but the aircraft still stalled when it reached the configuration's critical angle of attack. Notice that maintaining altitude—not simply slowing down—forced AoA upward until separation occurred.`,
    )
    context.checkPoint('Stall observed')
  } else {
    await notifyUser(
      'Continue the Observation',
      'The stall flag was not reached within the observation period. Keep watching the Airflow panel as speed decreases and AoA rises.',
    )
  }
}
