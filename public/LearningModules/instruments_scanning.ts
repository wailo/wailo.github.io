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
  context.setVisuals(true)

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

    const dot = (id: string) => {
      const color = id === active ? activeCol : inactiveCol
      const symbol = id === active ? '○' : '○'

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
      ? `\n<span style="color:${alertCol}">⚠️ <b>TURN MANEUVER ACTIVE</b></span>`
      : ''

    const spd = dot('spd')
    const att = dot('att')
    const alt = dot('alt')
    const hdg = dot('hdg')

    return `
### T-Scan Pattern

<div style="text-align:center; margin:12px 0;">
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

**Phase:** ${phase} | **Cycle:** ${cycle}/${total}  
**Pace:** <span style="color:${paceCol}">${paceIcon} ${pacePct}%</span> | **Progress:** \`[${bar}]\` ${progress}%
${turnAlert}
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
    const totalTime = delay * 1.15

    await Promise.all([
      notifyUser(phase, renderScanUI(name, cycle, totalCycles, pace, phase, turnActive), totalTime),
      (async () => {
        setter(false)
        await waitFor(delay * 0.15)
        setter(true)
        await waitFor(delay)
      })(),
    ])
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
    titles: string[],
    texts: string[],
    setter: (v: boolean) => void,
  ) {
    setter(false)
    await waitFor(200)
    setter(true)

    for (let i = 0; i < titles.length; i++) {
      await notifyUser(
        titles[i],
        `${renderScanUI(instrument, 0, totalCycles, 0.25, 'INTRODUCTION', false)}\n\n${texts[i]}`,
        3000,
      )
    }
  }

  async function demonstratePair(
    peripheral: 'spd' | 'alt' | 'hdg',
    peripheralSetter: (v: boolean) => void,
    label: string,
  ) {
    await notifyUser(
      `Demonstration ${label}`,
      'Observing the established rhythm: **Attitude → Peripheral → Attitude**.',
      3000,
    )

    // ATTITUDE
    await Promise.all([
      notifyUser('Phase 1: Attitude', 'The scan originates at the Attitude Indicator.', 2100),
      (async () => {
        simulation.set_analog_attitude_indicator_visible(false)
        await waitFor(300)
        simulation.set_analog_attitude_indicator_visible(true)
        await waitFor(1800)
      })(),
    ])

    // PERIPHERAL
    await Promise.all([
      notifyUser(
        'Phase 2: Peripheral',
        `A rapid visual check is directed to the ${peripheral.toUpperCase()}.`,
        2100,
        { append: true },
      ),
      (async () => {
        peripheralSetter(false)
        await waitFor(300)
        peripheralSetter(true)
        await waitFor(1800)
      })(),
    ])

    // RETURN TO ATTITUDE
    await Promise.all([
      notifyUser(
        'Phase 3: Return',
        'Visual focus immediately returns to the Attitude Indicator.',
        2100,
        { append: true },
      ),
      (async () => {
        simulation.set_analog_attitude_indicator_visible(false)
        await waitFor(300)
        simulation.set_analog_attitude_indicator_visible(true)
        await waitFor(1800)
      })(),
    ])
  }

  // -----------------------------
  // INTRODUCTION
  // -----------------------------
  await notifyUser(
    'Module Overview',
    'This module covers the standard T-scan instrument cross-check.',
    5000,
  )
  await notifyUser('', 'The **Attitude Indicator** serves as the primary reference.', 5000, {
    append: true,
  })
  await notifyUser(
    'Scan Pattern',
    'The scan involves a brief observation of a peripheral instrument, followed by an immediate return to the Attitude Indicator.',
    5500,
  )

  await showInstrument(
    'att',
    ['Primary Instrument', 'Operational Role'],
    [
      'The Attitude Indicator is positioned at the center of the instrument panel.',
      'It provides immediate pitch and bank information, functioning as the primary reference throughout the exercise.',
    ],
    simulation.set_analog_attitude_indicator_visible,
  )

  await showInstrument(
    'spd',
    ['Peripheral Instrument', 'Scanning Technique'],
    [
      'The Airspeed Indicator provides critical aircraft performance data.',
      'The pilot must execute a brief visual check before immediately returning focus to the Attitude Indicator.',
    ],
    simulation.set_analog_speed_indicator_visible,
  )

  await demonstratePair('spd', simulation.set_analog_speed_indicator_visible, 'ATT ↔ SPD')

  await showInstrument(
    'alt',
    ['Peripheral Instrument', 'Scanning Technique'],
    [
      'The Altimeter provides essential altitude data.',
      'Altitude must be cross-checked briefly while maintaining the Attitude Indicator as the primary reference.',
    ],
    simulation.set_analog_altimeter_visible,
  )

  await demonstratePair('alt', simulation.set_analog_altimeter_visible, 'ATT ↔ ALT')

  await showInstrument(
    'hdg',
    ['Peripheral Instrument', 'Scanning Technique'],
    [
      'The Heading Indicator provides directional information.',
      'Heading is checked briefly before visual focus immediately returns to the Attitude Indicator.',
    ],
    simulation.set_analog_heading_indicator_visible,
  )

  await demonstratePair('hdg', simulation.set_analog_heading_indicator_visible, 'ATT ↔ HDG')

  await notifyUser(
    'Demonstration Concluded',
    'All individual scan pairs have now been demonstrated.',
    3000,
  )
  await notifyUser(
    'Continuous Scan',
    'The individual pairs will now be combined into a continuous T-pattern.',
    3000,
  )
  await notifyUser(
    'Pacing Parameters',
    'The scan sequence will commence at a reduced pace and accelerate progressively.',
    3000,
  )

  // -----------------------------
  // TRAINING LOOP
  // -----------------------------
  for (let i = 0; i < totalCycles; i++) {
    const cycleNum = i + 1

    let pace: number

    if (i < 5) {
      pace = 1.4 - i * 0.15
    } else {
      pace = Math.max(0.3, 0.8 - (i - 5) * 0.02)
    }

    const beat = 900 * pace
    const pause = 250 * pace

    if (i === 10) {
      turnActive = true

      const fm = context.controls.flightModel
      context.setVisuals(false)

      fm.set_autopilot_bank_target(10)
      fm.set_autopilot_pitch_target(8)
      fm.set_autopilot_master_switch(true)
      fm.set_autopilot_bank_hold(true)
      fm.set_autopilot_pitch_hold(true)

      // After a delay, adjust the autopilot targets to simulate a maneuver that requires attention
      waitFor(10000).then(() => {
        fm.set_autopilot_pitch_target(-3)
        fm.set_autopilot_bank_target(-2)
      })

      await notifyUser(
        'Maneuver Notification',
        renderScanUI('att', cycleNum, totalCycles, pace, '🔄 TURN EXECUTION', true),
        3000,
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
  await notifyUser(
    'Training Module Concluded',
    `The instrument scan procedure has been executed for **${totalCycles} cycles**.`,
    3000,
  )
  await notifyUser(
    'Core Principle 1',
    'The Attitude Indicator remains the primary reference at all times.',
    3000,
  )
  await notifyUser(
    'Core Principle 2',
    'Brief peripheral observations prevent fixation and enhance situational awareness.',
    3000,
  )
  await notifyUser(
    'Session Summary',
    'The scan pace was increased progressively throughout the session. Training sequence complete.',
    3000,
  )
}
