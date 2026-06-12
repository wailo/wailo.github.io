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
  simControls.simulation.set_pfd_horizon_visible(false)
  context.setVisuals(true)
  context.setLayout(context.layoutTypes.PILOT)

  simControls.simulation.set_flight_model_b747()
  const flightModel = simControls.flightModel

  // Reposition aircraft to initial conditions
  await repositionWithAutopilot(context, 2000, 330, 73, 10000, () => {
    flightModel.set_center_of_gravity(-0.65)
    flightModel.set_empty_mass(flightModel.empty_mass + 100000)
    flightModel.set_autopilot_auto_trim(false)
    flightModel.set_elevator_trim_position(0)
    flightModel.set_latitude(8.973167)
    flightModel.set_longitude(38.786667)
  })

  flightModel.set_autopilot_master_switch(true)
  flightModel.set_autopilot_altitude_hold(true)
  flightModel.set_autopilot_altitude_target(32000)
  flightModel.set_autopilot_speed_indicated_hold(false)
  flightModel.set_autopilot_speed_indicated_target(238)

  // Initialize loop control variables
  let mcasActive = true
  let pauseTimer = 0
  let lastTrim = -10

  const formatTimeQuick = (seconds: number): string =>
    new Date(seconds * 1000).toISOString().slice(14, 19)

  plotView(simProps.elevator_trim_position_deg, true)
  plotView(simProps.vertical_speed_ftmin, true)

  let startTime = simControls.simulation.simulation_time
  let endTime = startTime + 9.26
  const maxTrimDeflection_deg = 20
  const dt = 200

  // State flags for one-off history events (prevents append spam)
  const eventHistory = {
    apDisconnect: false,
    configChange: false,
    pilotTrim: false,
    strokeComplete: false,
    flapsExtended: false,
  }

  // Optimization: Only re-render the dashboard if the content changes
  let lastDashboardHtml = ''

  // Initial setup message with MCAS Introduction
  await notifyUser(
    'ℹ️ Legacy MCAS Simulation',
    `**Introduction to MCAS:** This is an approximation of the legacy MCAS system behaviour, for demonstration purposes only.

**Scenario:** Legacy pre-amendment MCAS on heavy airframe.
⚠️ Single-sensor failure logic active.`,
    8000,
  )

  await waitFor(1000)

  // Note: The callback is now async to allow awaiting notifyUser calls
  await waitForCondition(
    () => {
      const currentSpeed = flightModel.speed_indicated_knots
      const simTime = simControls.simulation.simulation_time
      const isDescending = flightModel.vertical_speed_ftmin < -2000

      // ==========================================
      // 1. STATE CHANGES
      // ==========================================

      if (flightModel.autopilot_master_switch === true && !eventHistory.apDisconnect) {
        waitFor(3000).then(() => {
          flightModel.set_autopilot_master_switch(false)
          eventHistory.apDisconnect = true

          waitFor(5000).then(() => {
            eventHistory.apDisconnect = false
          })
        })
      }

      // if flaps are extended above 275 knots, assume physical damage and exit the lesson plan.
      if (
        currentSpeed > 275 &&
        flightModel.flaps_selector_position !== simControls.B747FlapSelector.ZERO
      ) {
        eventHistory.flapsExtended = true
        flightModel.set_flaps_selector_position(simControls.B747FlapSelector.ZERO) // Force flaps up to prevent further damage in simulation
        waitFor(5000).then(() => {
          eventHistory.flapsExtended = false
        })
      }

      // ==========================================
      // 2. STATE TRANSITIONS (Inhibit / Reset / Complete)
      // ==========================================

      const isConfigChanged =
        flightModel.flaps_selector_position !== simControls.B747FlapSelector.ZERO ||
        flightModel.autopilot_master_switch === true
      const isPilotCut = Math.abs(lastTrim - flightModel.elevator_trim_position) > 1e-6
      const isStrokeExpired = simTime > endTime

      if (isConfigChanged && !eventHistory.configChange) {
        eventHistory.configChange = true
        mcasActive = false
        pauseTimer = simTime + 5
        // return false
      } else if (!isConfigChanged) {
        eventHistory.configChange = false
      }

      if (isPilotCut && !eventHistory.pilotTrim) {
        eventHistory.pilotTrim = true
        lastTrim = flightModel.elevator_trim_position
        pauseTimer = simTime + 5
        mcasActive = false
        endTime = simTime + 9.26
        // return false
      } else if (!isPilotCut) {
        eventHistory.pilotTrim = false
      }

      if (
        isStrokeExpired &&
        !eventHistory.strokeComplete &&
        Math.abs(lastTrim - flightModel.elevator_trim_position) <= 1e-6
      ) {
        eventHistory.strokeComplete = true
        lastTrim = flightModel.elevator_trim_position
        pauseTimer = simTime + 5
        mcasActive = false
        endTime = simTime + 9.26
        // return false
      } else if (!isStrokeExpired) {
        eventHistory.strokeComplete = false
      }

      // ==========================================
      // 3. DYNAMIC DASHBOARD (Updates in-place, NO append)
      // ==========================================

      // Main container: Solid dark background with border/shadow ensures visibility on ANY parent theme
      let dashboardHtml =
        "<div style=\"font-family: 'SF Mono', 'Consolas', 'Roboto Mono', monospace; border: 1px solid #30363d; border-radius: 8px; overflow: hidden; background: #0d1117; color: #c9d1d9; margin-top: 5px; box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);\">"

      // Header
      dashboardHtml += `<div style="background: #161b22; padding: 8px 12px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #8b949e; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Crew Alerts</span>
        <span style="color: #00e676; font-size: 11px; font-weight: bold;">${formatTimeQuick(simControls.simulation.clock_time)}</span>
      </div>`

      // Channel A: Active Warnings (Top - EICAS Style)
      if (mcasActive) {
        dashboardHtml += `<div style="background: #3d0000; color: #ff5252; padding: 10px; border-bottom: 1px solid #30363d; text-align: center;">
          <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; animation: blink 1s infinite;">🚨 Stall Warning / Stick Shaker</strong><br>
          <span style="font-size: 10px; color: #ff9e9e;">Left AOA Sensor > Threshold</span>
        </div>`
      }
      if (currentSpeed > 340) {
        dashboardHtml += `<div style="background: #3d2600; color: #ffca28; padding: 10px; border-bottom: 1px solid #30363d; text-align: center;">
          <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Overspeed Warning</strong><br>
          <span style="font-size: 10px; color: #ffe082;">Current Speed: ${Math.round(currentSpeed)} kts</span>
        </div>`
      }
      if (isDescending) {
        dashboardHtml += `<div style="background: #3d0000; color: #ff5252; padding: 10px; border-bottom: 1px solid #30363d; text-align: center;">
          <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; animation: blink 0.5s infinite;">🚨 Terrain - Pull Up</strong><br>
          <span style="font-size: 10px; color: #ff9e9e;">Excessive descent rate</span>
        </div>`
      }
      if (eventHistory.apDisconnect) {
        dashboardHtml += `<div style="background: #3d0000; color: #ff5252; padding: 10px; border-bottom: 1px solid #30363d; text-align: center;">
          <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Autopilot Disconnected</strong><br>
          <span style="font-size: 10px; color: #ff9e9e;">Manual control required</span>
        </div>`
      }
      if (eventHistory.flapsExtended) {
        dashboardHtml += `<div style="background: #3d0000; color: #ff5252; padding: 10px; border-bottom: 1px solid #30363d; text-align: center;">
          <strong style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">⚠️ Airframe Damage</strong><br>
          <span style="font-size: 10px; color: #ff9e9e;">Flap extension exceeded Vfe</span>
        </div>`
      }

      // Channel B: MCAS Enable Conditions
      const apOff = !flightModel.autopilot_master_switch
      const flapsUp = flightModel.flaps_selector_position === simControls.B747FlapSelector.ZERO

      dashboardHtml += `<div style="background: #0d1117; color: #c9d1d9; padding: 12px; border-bottom: 1px solid #30363d;">
        <div style="color: #8b949e; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">MCAS SYSTEM</div>
        <div style="display: flex; justify-content: space-around; font-size: 13px; text-align: center;">
          <div style="flex: 1;">
            <div style="color: #8b949e; font-size: 10px; margin-bottom: 2px;">Autopilot</div>
            <strong style="color: ${apOff ? '#00e676' : '#ffca28'}; font-size: 13px;">
              ${flightModel.autopilot_master_switch ? 'ENGAGED' : 'DISENGAGED'}
            </strong>
          </div>
          <div style="flex: 1; border-left: 1px solid #30363d; border-right: 1px solid #30363d;">
            <div style="color: #8b949e; font-size: 10px; margin-bottom: 2px;">Flaps</div>
            <strong style="color: ${flapsUp ? '#00e676' : '#ffca28'}; font-size: 13px;">
              ${flapsUp ? 'UP' : 'EXTENDED'}
            </strong>
          </div>
          <div style="flex: 1;">
            <div style="color: #8b949e; font-size: 10px; margin-bottom: 2px;">MCAS</div>
            <strong style="color: ${mcasActive ? '#00e676' : '#ff5252'}; font-size: 13px;">
              ${mcasActive ? 'ACTIVE' : 'INHIBIT'}
            </strong>
          </div>
        </div>
      </div>`

      // Channel C: MCAS System Status (Dynamic)
      if (simTime < pauseTimer) {
        const remaining = (pauseTimer - simTime).toFixed(1)
        dashboardHtml += `<div style="background: #1c1e26; color: #c9d1d9; padding: 12px; border-bottom: 1px solid #30363d; text-align: center;">
          <div style="color: #ffca28; font-size: 12px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">⏸️ MCAS Standby</div>
          <div style="font-size: 11px; color: #8b949e;">Cooldown: ${remaining}s | Trim: ${flightModel.elevator_trim_position_deg.toFixed(2)}°</div>
        </div>`
      } else {
        const timeLeft = Math.max(0, endTime - simTime).toFixed(1)
        dashboardHtml += `<div style="background: #161b22; color: #c9d1d9; padding: 12px; border-bottom: 1px solid #30363d;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #ff5252; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🔴 MCAS Active Drive</strong>
            <span style="font-size: 10px; color: #c9d1d9; background: #21262d; padding: 2px 6px; border-radius: 4px; border: 1px solid #30363d;">${timeLeft}s</span>
          </div>
          <div style="font-size: 12px; line-height: 1.6; color: #c9d1d9;">
            Command: <span style="color: #ff5252; font-weight: bold;">NOSE DOWN 0.27°/s</span><br>
            Stabilizer: <strong style="color: #ffffff; font-size: 16px; font-family: monospace;">${flightModel.elevator_trim_position_deg.toFixed(2)}°</strong>
          </div>
        </div>`
      }

      // Channel D: Configuration Status (Bottom)
      if (isConfigChanged) {
        dashboardHtml += `<div style="background: #0d2137; color: #00e5ff; padding: 10px; text-align: center;">
          <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">⚙️ MCAS Inhibited</strong><br>
          <span style="font-size: 10px; color: #8b949e;">Background trim loops suppressed</span>
        </div>`
      }

      dashboardHtml += '</div>'

      // Only call notifyUser if the visual content has actually changed (prevents flicker/spam)
      if (dashboardHtml !== lastDashboardHtml) {
        // Persistent notification: Use a dedicated channel to avoid blocking the loop
        notifyUser('MCAS System Dashboard', dashboardHtml)
        lastDashboardHtml = dashboardHtml
      }

      // ==========================================
      // 4. MCAS LOGIC EXECUTION
      // ==========================================

      if (simTime >= pauseTimer && !mcasActive) {
        mcasActive = true
        endTime = simTime + 9.26
      }

      if (mcasActive) {
        // Apply trim stroke (using original formula)
        const mcas_cmd_rate = (dt / 1000) * (0.27 / maxTrimDeflection_deg)
        lastTrim = flightModel.elevator_trim_position + mcas_cmd_rate
        flightModel.set_elevator_trim_position(lastTrim)
      }

      console.log(flightModel.damaged)
      return flightModel.damaged
    },
    0,
    dt,
    240000,
  )
}
