import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const simControls = context.controls
  const plotView = context.plotView
  const simProps = context.props
  const repositionWithAutopilot = context.repositionWithAutopilot
  const waitFor = context.waitFor
  const notifyUser = context.notifyUser
  const dataDisplayReset = context.dataDisplayReset
  const waitForCondition = context.waitForCondition

  // Reset simulation to ensure clean state for flight.
  simControls.simulation.reset_simulation()
  dataDisplayReset()
  simControls.simulation.set_six_instruments_display(false)
  context.setVisuals(true)

  simControls.simulation.set_flight_model_b747()
  const flightModel = simControls.flightModel

  // Reposition aircraft to initial conditions: 4000 ft altitude, 200 spd, 90 heading.
  await repositionWithAutopilot(context, 7000, 330, 90)

  // Initialize loop control variables for MCAS simulation state.
  let mcasActive = false
  let pauseTimer = 0

  plotView(simProps.elevator_trim_position_deg, true)

  let startTime = simControls.simulation.simulation_time
  let endTime = startTime + 9.26
  const maxTrimDeflection_deg = 20
  const dt = 200

  // Step 4: Set MCAS active flag to true and reset stroke timer.
  mcasActive = true
  let lastTrim = -10

  // Introductory narrative notification
  notifyUser(
    '✈️ Simulation Initialised',
    `<div style="font-family:sans-serif; line-height:1.5;">
      <p><strong>Scenario:</strong> Simulating legacy pre-amendment 737 MAX MCAS behavior on a heavy airframe.</p>
      <p style="color:#f0ad4e;">⚠️ <em>Note: Single-sensor failure logic is active. The system believes the aircraft is stalling.</em></p>
     </div>`,
  )

  await waitFor(1000)

  await waitForCondition(
    () => {
      const currentSpeed = flightModel.speed_indicated_knots // Fallback helper

      // --- COCKPIT WARNING SIMULATOR SUB-ROUTINE ---
      // 1. STALL WARNING (Simulating the physical MCAS trigger condition)
      if (mcasActive) {
        notifyUser(
          '🚨 STALL WARNING / STICK SHAKER',
          `<div style="background-color:#5a0000; padding:10px; border-radius:5px; color:#fff; font-family:monospace; border:2px solid #d9534f;">
            <h3 style="margin:0; color:#ff4d4d; animation: blink 1s infinite;">⚠️ STALL STALL</h3>
            <p style="margin:5px 0 0 0; font-weight:bold;">*CLACK-CLACK-CLACK-CLACK*</p>
            <p style="margin:2px 0 0 0; font-size:11px; color:#ccc;">Left AOA Sensor reading > Threshold. Control column shaking violently.</p>
           </div>`,
        )
      }

      // 2. HIGH SPEED WARNING (Simulating flight acceleration as the nose drops)
      if (currentSpeed > 340) {
        notifyUser(
          '⚠️ OVERSPEED WARNING',
          `<div style="background-color:#3a2000; padding:10px; border-radius:5px; color:#fff; font-family:monospace; border:2px solid #f0ad4e;">
            <h3 style="margin:0; color:#f0ad4e;">OVERSPEED - PILOT CAUTION</h3>
            <p style="margin:5px 0 0 0; font-weight:bold;">*CLACKER SOUND ACTIVE* 🛑 AIRSPEED HIGH</p>
            <p style="margin:2px 0 0 0; font-size:11px; color:#ccc;">Current Speed: <span style="color:#f0ad4e; font-weight:bold;">${Math.round(currentSpeed)} kts</span>. Tail loads increasing dynamically.</p>
           </div>`,
        )
      }

      // Step 3: Check aircraft configuration (flaps/autopilot).
      // if the flaps is not full retracted or the autopilot is engaged, deactivate MCAS and restart loop.
      debugger
      if (
        flightModel.flaps_selector_position != simControls.B747FlapSelector.ZERO ||
        flightModel.autopilot_master_switch === true
      ) {
        notifyUser(
          '⚙️ Configuration Changed',
          `<div style="font-family:sans-serif; border-left:4px solid #5bc0de; padding-left:10px;">
            <p style="color:#5bc0de; font-weight:bold; margin:0;">MCAS Inhibited</p>
            <p style="margin:5px 0 0 0; font-size:12px;">Flaps extended or Autopilot engaged. Automated background trim loops suppressed.</p>
           </div>`,
        )
        mcasActive = false
        pauseTimer = simControls.simulation.simulation_time + 5
        return false
      }

      // If elevator trim value changed or time stroke expired.
      if (
        Math.abs(lastTrim - flightModel.elevator_trim_position) > 0.0000001 ||
        simControls.simulation.simulation_time > endTime
      ) {
        const isPilotCut = Math.abs(lastTrim - flightModel.elevator_trim_position) > 0.0000001

        if (isPilotCut) {
          notifyUser(
            '🟢 Pilot Trim Interrupt',
            `<div style="background-color:#1e3d2f; padding:10px; border-radius:5px; color:#fff; font-family:sans-serif; border-left:5px solid #5cb85c;">
              <span style="color:#5cb85c; font-weight:bold;">⚡ PILOT INPUT DETECTED</span>
              <p style="margin:5px 0 0 0; font-size:12px;">Crew applied thumb switch trim up. MCAS nose-down drive has yielded immediately.</p>
              <p style="margin:2px 0 0 0; font-size:11px; color:#a2cbb5;">New baseline set to: ${flightModel.elevator_trim_position.toFixed(3)}°</p>
             </div>`,
          )
        } else {
          notifyUser(
            '⏱️ Stroke Time Expired',
            `<div style="font-family:sans-serif; color:#777;">
              <p style="margin:0;">Completed full 9.26-second automated nose-down stroke limit.</p>
             </div>`,
          )
        }

        lastTrim = flightModel.elevator_trim_position
        // Step 8: Start local pause timer for system reset.
        pauseTimer = simControls.simulation.simulation_time + 5
        mcasActive = false

        endTime = simControls.simulation.simulation_time + 9.26
        return false
      }

      if (simControls.simulation.simulation_time < pauseTimer) {
        const remainingPause = (pauseTimer - simControls.simulation.simulation_time).toFixed(1)
        notifyUser(
          '🟡 System Reset Pause',
          `<div style="font-family:monospace; background-color:#222; padding:8px; border-radius:4px; color:#f0ad4e;">
            <strong>MCAS IDLE:</strong> Resetting timer... [${remainingPause}s remaining]
            <br><span style="color:#aaa; font-size:11px;">Stabilizer locked at: ${flightModel.elevator_trim_position_deg.toFixed(3)}°</span>
           </div>`,
        )
        mcasActive = false
        return false
      }

      if (!mcasActive) {
        endTime = simControls.simulation.simulation_time + 9.26
        mcasActive = true
      }

      // Add trim stroke time if MCAS is active.
      notifyUser(
        '🔴 MCAS Active Drive',
        `<div style="background-color:#3a0000; padding:10px; border-radius:5px; color:#fff; font-family:sans-serif; border-left:5px solid #d9534f;">
          <strong style="color:#d9534f;">⚡ COMMANDING NOSE-DOWN TRIM</strong>
          <p style="margin:5px 0 0 0; font-size:12px;">System driving motorized jackscrew at <span style="color:#ff6b6b;">0.27°/sec</span>.</p>
          <p style="margin:2px 0 0 0; font-size:11px; color:#cca6a6;">Current Stabilizer: <strong>${flightModel.elevator_trim_position.toFixed(3)}°</strong></p>
         </div>`,
      )

      // Subtract trim angle to push nose down (simulating MCAS).

      // 0.27 degree per second
      const mcas_cmd_rate = (dt / 1000) * (0.27 / maxTrimDeflection_deg)
      lastTrim = flightModel.elevator_trim_position + mcas_cmd_rate
      flightModel.set_elevator_trim_position(lastTrim)
      return flightModel.damaged
    },
    0,
    dt,
    120000,
  )
}
