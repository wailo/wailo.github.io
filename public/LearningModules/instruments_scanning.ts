import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const { controls, repositionWithAutopilot, waitFor, notifyUser } = context
  const simulation = controls.simulation

  simulation.reset_simulation()
  simulation.set_flight_model_c172()
  simulation.set_pfd_display(false)

  repositionWithAutopilot(context, 3000, 100, 45)
  await waitFor(1000)

  // -----------------------------
  // DYNAMIC UI RENDERER
  // -----------------------------
  function renderScanUI(
    active: string,
    cycle: number,
    total: number,
    pace: number,
    phase: string,
    turnActive: boolean,
  ) {
    const activeCol = '#00E676'
    const inactiveCol = '#546E7A'
    const alertCol = '#FF5252'

    // Returns an object containing the dot HTML and the label HTML
    const dot = (id: string) => {
      const color = id === active ? activeCol : inactiveCol
      const symbol = id === active ? '●' : '○'
      return {
        dot: `<span style="color:${color}; font-size:4.5em">${symbol}</span>`,
        label: `<span style="color:${color}; font-weight: bold; letter-spacing: 1px;">${id.toUpperCase()}</span>`,
      }
    }

    const progress = Math.round((cycle / total) * 100)
    const filled = Math.round(progress / 10)
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)

    const pacePct = Math.round(pace * 100)
    const paceIcon = pace > 0.7 ? '◷' : pace > 0.4 ? '◶' : '◵'
    const paceCol = pace > 0.7 ? '#4CAF50' : pace > 0.4 ? '#FF9800' : '#F44336'

    const turnAlert = turnActive
      ? `\n<span style="color:${alertCol}">⚠️ <b>TURN MANEUVER ACTIVE</b> — Maintain instrument cross-check</span>`
      : ''

    // Pre-generate the dot and label elements
    const spd = dot('spd')
    const att = dot('att')
    const alt = dot('alt')
    const hdg = dot('hdg')

    return `
### Instrument Scan Pattern: T-Configuration

<div style="text-align:center; margin:12px 0;">
  <!-- Added border="0", cellpadding, cellspacing, and inline border:none to force hide borders -->
  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center; border-collapse: collapse; border: none; border-spacing: 0;">
    <tr style="border: none;">
      <td style="padding: 0 25px; border: none;">${spd.dot}<br>${spd.label}</td>
      <td style="padding: 0 25px; border: none;">${att.dot}<br>${att.label}</td>
      <td style="padding: 0 25px; border: none;">${alt.dot}<br>${alt.label}</td>
    </tr>
    <tr style="border: none;">
      <td style="border: none;"></td>
      <td style="padding: 0 25px; padding-top: 15px; border: none;">${hdg.dot}<br>${hdg.label}</td>
      <td style="border: none;"></td>
    </tr>
  </table>
</div>

**Phase:** ${phase}  
**Cycle:** ${cycle}/${total} | **Pace:** <span style="color:${paceCol}">${paceIcon} ${pacePct}%</span>  
**Progress:** \`[${bar}]\` ${progress}%
${turnAlert}

> Instruction: Maintain systematic cross-check. Return focus to attitude indicator after each peripheral instrument scan.
`.trim()
  }

  // -----------------------------
  // INTRO
  // -----------------------------
  await notifyUser(
    'Instrument Scan Training Module',
    `### Training Objective
Execute the standardized T-Scan procedure: Attitude → Peripheral Instruments → Attitude
Primary reference: Attitude Indicator

> Protocol: Systematic cross-check. Avoid fixation on single instruments.
> Legend: ● = Primary Focus | ○ = Peripheral Reference

**Training sequence initiating in 3 seconds...**`,
    7000,
  )

  // -----------------------------
  // PULSE & PAIR
  // -----------------------------
  const totalCycles = 20
  let turnActive = false

  async function pulse(
    name: 'att' | 'spd' | 'alt' | 'hdg',
    setter: (v: boolean) => void,
    delay: number,
    cycle: number,
    pace: number,
    phase: string,
  ) {
    notifyUser(
      'Instrument Scan Procedure',
      renderScanUI(name, cycle, totalCycles, pace, phase, turnActive),
    )
    setter(false)
    await waitFor(delay * 0.15)
    setter(true)
    await waitFor(delay)
  }

  async function pair(a: () => Promise<void>, b: () => Promise<void>, pause: number) {
    await a()
    await b()
    await waitFor(pause)
  }

  // -----------------------------
  // TRAINING LOOP
  // -----------------------------
  for (let i = 0; i < totalCycles; i++) {
    const cycleNum = i + 1
    const pace = Math.max(0.2, 1 - i * 0.03)
    const beat = 900 * pace
    const pause = 250 * pace

    // Introduce coordinated turn at cycle 11
    if (i === 10) {
      turnActive = true
      const fm = context.controls.flightModel
      // Execute standard rate turn: 25° bank with pitch compensation
      fm.set_autopilot_bank_target(25)
      fm.set_autopilot_pitch_target(2)
      fm.set_autopilot_master_switch(true)
      fm.set_autopilot_bank_hold(true)
      fm.set_autopilot_pitch_hold(true)

      notifyUser(
        'Maneuver Notification',
        renderScanUI('att', cycleNum, totalCycles, pace, '🔄 TURN EXECUTION', true),
      )
      await waitFor(1500)
    }

    // 1–2 (Attitude ↔ Airspeed)
    await pair(
      () =>
        pulse(
          'att',
          simulation.set_analog_attitude_indicator_visible,
          beat,
          cycleNum,
          pace,
          'Phase 1-2: ATT ↔ SPD',
        ),
      () =>
        pulse(
          'spd',
          simulation.set_analog_speed_indicator_visible,
          beat / 2,
          cycleNum,
          pace,
          'Phase 1-2: ATT ↔ SPD',
        ),
      pause,
    )

    // 3–4 (Attitude ↔ Altimeter)
    await pair(
      () =>
        pulse(
          'att',
          simulation.set_analog_attitude_indicator_visible,
          beat,
          cycleNum,
          pace,
          'Phase 3-4: ATT ↔ ALT',
        ),
      () =>
        pulse(
          'alt',
          simulation.set_analog_altimeter_visible,
          beat / 2,
          cycleNum,
          pace,
          'Phase 3-4: ATT ↔ ALT',
        ),
      pause,
    )

    // 5–6 (Attitude ↔ Heading)
    await pair(
      () =>
        pulse(
          'att',
          simulation.set_analog_attitude_indicator_visible,
          beat,
          cycleNum,
          pace,
          'Phase 5-6: ATT ↔ HDG',
        ),
      () =>
        pulse(
          'hdg',
          simulation.set_analog_heading_indicator_visible,
          beat / 2,
          cycleNum,
          pace,
          'Phase 5-6: ATT ↔ HDG',
        ),
      pause,
    )
  }

  // -----------------------------
  // END
  // -----------------------------
  notifyUser(
    'Training Module Complete',
    `### Session Summary
Instrument scan procedure executed for **${totalCycles} cycles** with integrated turn maneuver.

**Procedural Review:**
• Attitude indicator serves as primary reference instrument
• Systematic cross-check rhythm prevents instrument fixation
• Scan pace adjusts to maintain situational awareness
`,
  )
}
