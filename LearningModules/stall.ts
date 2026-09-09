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
  await waitForCondition(
    () => flightModel.flaps_selector_position === simControls.B747FlapSelector.TEN,
  )

  const flapPrediction = await context.askQuestion({
    id: 'stall-flap-effect',
    type: 'multiple-choice',
    title: 'Prediction · Flaps and Stall',
    question: 'Compared with the clean wing, what effect should **Flaps 10** normally have?',
    choices: [
      {
        id: 'lift-and-lower-critical-aoa',
        label: 'More lift, a higher maximum CL, and a potentially lower critical AoA',
      },
      {
        id: 'all-higher',
        label: 'More lift and a necessarily higher critical AoA',
      },
      {
        id: 'no-aerodynamic-change',
        label: 'No meaningful effect until landing gear is lowered',
      },
    ],
    correctAnswer: 'lift-and-lower-critical-aoa',
    correctFeedback:
      'Correct. Flaps increase camber and maximum lift, while critical AoA may decrease.',
    incorrectFeedback: 'Consider how increased camber changes lift and flow separation.',
  })
  context.checkPoint(`Flap prediction answered in ${flapPrediction.attempts} attempt(s)`)

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

  await context.waitForUser({
    title: 'Begin Observation',
    message:
      'Continue when the Airflow panel and AoA–CL graph are visible. The aircraft will keep decelerating while you observe.',
    buttonLabel: 'Observe Stall Development',
  })

  context.checkPoint('Stall setup complete — observing deceleration')

  const stallDetection = waitForCondition(() => flightModel.stalling, 500, 200, 90000, false)

  const recognition = await context.askQuestion({
    id: 'stall-developing-trend',
    type: 'multiple-choice',
    title: 'Recognition · Developing Stall',
    question:
      'While altitude is held and thrust remains idle, which trend indicates that the wing is approaching its critical condition?',
    choices: [
      {
        id: 'speed-down-aoa-up',
        label: 'Airspeed decreases while pitch and angle of attack increase',
      },
      {
        id: 'speed-up-aoa-down',
        label: 'Airspeed increases while angle of attack decreases',
      },
      {
        id: 'heading-change',
        label: 'Heading changes while lift coefficient remains constant',
      },
    ],
    correctAnswer: 'speed-down-aoa-up',
    correctFeedback:
      'Correct. Increasing AoA compensates for the falling airspeed until separation.',
    incorrectFeedback: 'Watch the relationship between airspeed, pitch, and angle of attack.',
  })
  context.checkPoint(`Stall recognition answered in ${recognition.attempts} attempt(s)`)

  const stalled = await stallDetection

  if (stalled) {
    await notifyUser(
      'Stall Observed',
      `Flow separation is indicated at **${flightModel.aoa_deg.toFixed(1)}° AoA** and **CL ${flightModel.cl.toFixed(2)}**.

Flaps 10 allowed more lift at lower speed, but the aircraft still stalled when it reached the configuration's critical angle of attack. Notice that maintaining altitude—not simply slowing down—forced AoA upward until separation occurred.`,
    )
    context.checkPoint('Stall observed')

    const recoveryAnswer = await context.askQuestion({
      id: 'stall-recovery-priority',
      type: 'multiple-choice',
      title: 'Recovery Priority',
      question: 'What is the first aerodynamic priority when recovering from this stall?',
      choices: [
        { id: 'reduce-aoa', label: 'Reduce angle of attack below the critical value' },
        { id: 'hold-altitude', label: 'Maintain altitude at all costs' },
        { id: 'raise-nose', label: 'Raise the nose to prevent altitude loss' },
      ],
      correctAnswer: 'reduce-aoa',
      correctFeedback: 'Correct. Attached airflow must be restored by reducing angle of attack.',
      incorrectFeedback: 'Recovery begins by removing the condition that caused flow separation.',
    })
    context.checkPoint(`Recovery priority answered in ${recoveryAnswer.attempts} attempt(s)`)
  } else {
    await notifyUser(
      'Continue the Observation',
      'The stall flag was not reached within the observation period. Keep watching the Airflow panel as speed decreases and AoA rises.',
    )
  }

  const reflection = await context.askQuestion({
    id: 'stall-reflection',
    type: 'essay',
    title: 'Reflection',
    question:
      'In one or two sentences, explain why an aircraft can stall while the autopilot is trying to maintain altitude.',
    placeholder: 'Relate airspeed, lift demand, and angle of attack…',
    submitLabel: 'Submit Reflection',
  })
  context.checkPoint(`Stall reflection submitted · ${reflection.answer.length} characters`)

  await context.waitForUser({
    title: 'Lesson Review Complete',
    message:
      'Continue to finish the stall lesson and retain the current airflow display for review.',
    buttonLabel: 'Finish Lesson',
  })
}
