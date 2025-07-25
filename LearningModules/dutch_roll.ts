import {repositionWithAutopilot, simControls, simProps, waitFor, plotView, dataDisplayReset, notifyUser } from "./core"

// Define target altitude, speed, and heading
const targetAltitude = 5000; // in feet
const targetSpeed = 180; // in knots
const targetHeading = 0; // in degrees

// Demonstrate dutch roll mode
notifyUser(
    "**Dutch Roll Mode**",
    `Observe the aircraft's oscillation in *yaw* and *roll*.

**Lesson Plan:**

1. Reposition to a safe altitude of **${targetAltitude} ft** and speed of **${targetSpeed} knots**. Aircraft is trimmed, autopilot disengaged.
2. Apply rudder input for 2 seconds to disturb yaw and roll, then return to neutral.
3. Observe the aircraft's oscillation in *yaw* and *roll*.
4. Increase the simulation speed to observe the damping effect.
`
);

// Pre-configuration befroe trimming the aircraft.
const preConfiguration = () => {
    simControls.api_set_flaps_selector_position(simControls.FlapSelector.TWENTY.value);
}

dataDisplayReset();
await repositionWithAutopilot(targetAltitude, targetSpeed, targetHeading, 10000, preConfiguration);
// plotView(simProps.api_aileron_position, true);
plotView(simProps.heading, true);
plotView(simProps.heading_dot, true);
plotView(simProps.sideslip, true);
plotView(simProps.rudder_position, true);
// plotView(simProps.pitch_deg, true);
// plotView(simProps.ias_speed_knots, true);
simControls.api_set_aileron_position(0.0);
simControls.api_set_rudder_position(0.0);
await waitFor(5000);

notifyUser(
    "**Initiating Dutch Roll Mode**",
    `Applying step rudder input for **2.5 seconds** in each direction, then returning to neutral position.`
);
// Show motions cues
simControls.api_set_motion_cues(true)
await waitFor(5000);
simControls.api_set_rudder_position(-1.0);
await waitFor(2500);
simControls.api_set_rudder_position(1.0);
await waitFor(3000);
simControls.api_set_rudder_position(0.0);

notifyUser(
    "**Dutch Roll Mode**",
    `We will observe the Dutch Roll in **slow motion**.

**Key Observations:**
- Concentrate on the following flight instruments to watch the oscillation:
  - **Turn Coordinator**	Needle (yaw rate) oscillates left-right.
  - **Slip/Skid Indicator**	Ball will move side to side during slips/skids caused by yawing.
  - **Inclinometer (Ball)** Ball swings side to side (indicating sideslip).
  - **Attitude Indicator**	Bank angle rocks left and right.
  - **Heading Indicator**	Heading slowly wobbles back and forth.
`
);
simControls.api_set_simulation_speed(1.0);
await waitFor(40000);

notifyUser(
    "**Dutch Roll Mode**",
    `By now, the Dutch Roll mode oscillation is almost damped.
This marks the end of the Dutch Roll mode demonstration.`
);
await waitFor(10000);
simControls.api_set_simulation_speed(1);
// simControls.api_set_autopilot(true);
