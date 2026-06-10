
import { ScriptContext } from '../../src/core'

export async function main(context: ScriptContext) {
  const { controls, repositionWithAutopilot, waitFor, notifyUser } = context
  const simulation = controls.simulation

  simulation.reset_simulation()
  simulation.set_flight_model_c172()
  simulation.set_pfd_display(false)
  context.setLayout(context.layoutTypes.FOCUS)

  repositionWithAutopilot(context, 3000, 100, 45)
  await waitFor(1000)

  const totalCycles = 40
  let turnActive = false

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
        label: `<span style="color:${color}; font-weight:bold; letter-spacing:1px;">${id.toUpperCase()}</span>`,
      }
    }

    const progress = total > 0 ? Math.round((cycle / total) * 100) : 0
    const filled = Math.round(progress / 10)
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)

    const pacePct = Math.round(pace * 100)
    const paceIcon = pace > 0.7 ? '◷' : pace > 0.4 ? '◶' : '◵'
    const paceCol = pace > 0.7 ? '#4CAF50' : pace > 0.4 ? '#FF9800' : '#F44336'

    const turnAlert = turnActive
      ? `\n<span style="color:${alertCol}">⚠️ <b>TURN MANEUVER ACTIVE</b> — Maintain instrument cross-check</span>`
      : ''

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

Instruction: Maintain systematic cross-check. Return focus to the attitude indicator after each peripheral scan.
`.trim()
  }

  // -----------------------------
  // PULSE
  // -----------------------------
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
  // GUIDED INTRODUCTION HELPERS
  // -----------------------------
  async function showInstrument(
    instrument: 'att' | 'spd' | 'alt' | 'hdg',
    title: string,
    explanation: string,
    setter: (v: boolean) => void,
  ) {
    notifyUser(
      title,
      `${renderScanUI(instrument, 0, totalCycles, 0.25, 'INTRODUCTION', false)}

${explanation}`,
    )

    setter(false)
    await waitFor(400)
    setter(true)

    await waitFor(3500)
  }

  async function demonstratePair(
    peripheral: 'spd' | 'alt' | 'hdg',
    peripheralSetter: (v: boolean) => void,
    label: string,
  ) {
    notifyUser(
      'Guided Demonstration',
      `${renderScanUI('att', 0, totalCycles, 0.25, label, false)}

### Demonstration

Observe the rhythm:

**Attitude → Peripheral Instrument → Attitude**

The attitude indicator remains the primary reference.`,
    )

    await waitFor(2000)

    // ATTITUDE
    notifyUser('Guided Demonstration', renderScanUI('att', 0, totalCycles, 0.25, label, false))

    simulation.set_analog_attitude_indicator_visible(false)
    await waitFor(300)
    simulation.set_analog_attitude_indicator_visible(true)
    await waitFor(1800)

    // PERIPHERAL
    notifyUser('Guided Demonstration', renderScanUI(peripheral, 0, totalCycles, 0.25, label, false))

    peripheralSetter(false)
    await waitFor(300)
    peripheralSetter(true)
    await waitFor(1800)

    // RETURN TO ATTITUDE
    notifyUser('Guided Demonstration', renderScanUI('att', 0, totalCycles, 0.25, label, false))

    simulation.set_analog_attitude_indicator_visible(false)
    await waitFor(300)
    simulation.set_analog_attitude_indicator_visible(true)
    await waitFor(1800)
  }

  // -----------------------------
  // INTRODUCTION
  // -----------------------------
  await notifyUser(
    'Instrument Scan Training Module',
    `### Training Objective

Learn the standard T-scan instrument cross-check.

The **Attitude Indicator** is the primary reference instrument.

Every scan briefly leaves attitude to gather information from another instrument, then returns immediately to attitude.

We will first introduce each scan pair individually before transitioning to a continuous scan rhythm.`,
    7000,
  )

  await showInstrument(
    'att',
    'Primary Instrument: Attitude Indicator',
    `
### Attitude Indicator

The center of the instrument scan.

This instrument provides immediate pitch and bank information and remains the primary reference throughout the exercise.
`,
    simulation.set_analog_attitude_indicator_visible,
  )

  await showInstrument(
    'spd',
    'Peripheral Instrument: Airspeed Indicator',
    `
### Airspeed Indicator

Provides aircraft performance information.

Take a quick reading, then return immediately to the attitude indicator.
`,
    simulation.set_analog_speed_indicator_visible,
  )

  await demonstratePair('spd', simulation.set_analog_speed_indicator_visible, 'ATT ↔ SPD')

  await showInstrument(
    'alt',
    'Peripheral Instrument: Altimeter',
    `
### Altimeter

Provides altitude information.

Cross-check altitude briefly while maintaining attitude as the primary reference.
`,
    simulation.set_analog_altimeter_visible,
  )

  await demonstratePair('alt', simulation.set_analog_altimeter_visible, 'ATT ↔ ALT')

  await showInstrument(
    'hdg',
    'Peripheral Instrument: Heading Indicator',
    `
### Heading Indicator

Provides directional information.

Check heading briefly, then return immediately to the attitude indicator.
`,
    simulation.set_analog_heading_indicator_visible,
  )

  await demonstratePair('hdg', simulation.set_analog_heading_indicator_visible, 'ATT ↔ HDG')

  await notifyUser(
    'Transitioning to Continuous Scan',
    `### Full Instrument Cross-Check

You have practiced:

• Attitude ↔ Airspeed

• Attitude ↔ Altimeter

• Attitude ↔ Heading

The exercise will now combine all scan pairs into a continuous T-pattern.

The pace will begin slowly and gradually increase.`,
    7000,
  )

  // -----------------------------
  // TRAINING LOOP
  // -----------------------------
  for (let i = 0; i < totalCycles; i++) {
    const cycleNum = i + 1

    let pace: number

    if (i < 5) {
      // Gentle transition from introduction
      pace = 1.4 - i * 0.15
    } else {
      // Progressive acceleration
      pace = Math.max(0.3, 0.8 - (i - 5) * 0.02)
    }

    const beat = 900 * pace
    const pause = 250 * pace

    if (i === 10) {
      turnActive = true

      const fm = context.controls.flightModel

      context.setVisuals(true)

      fm.set_autopilot_bank_target(10)
      fm.set_autopilot_pitch_target(8)
      fm.set_autopilot_master_switch(true)
      fm.set_autopilot_bank_hold(true)
      fm.set_autopilot_pitch_hold(true)

      notifyUser(
        'Maneuver Notification',
        renderScanUI('att', cycleNum, totalCycles, pace, '🔄 TURN EXECUTION', true),
      )
    }

    // ATT ↔ SPD
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

    // ATT ↔ ALT
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

    // ATT ↔ HDG
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
  // COMPLETE
  // -----------------------------
  notifyUser(
    'Training Module Complete',
    `### Session Summary

Instrument scan procedure executed for **${totalCycles} cycles**.

**Key Takeaways**

• Attitude indicator remains the primary reference

• Brief peripheral scans prevent fixation

• Systematic cross-check improves situational awareness

• Scan pace increased progressively throughout the session

Training complete.`,
  )
}
