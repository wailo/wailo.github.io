// Define target altitude, speed, and heading
const targetAltitude = 30000; // in feet
const targetSpeed = 180; // in knots
const targetHeading = 0; // in degrees

// Demonstrate dutch roll mode
simControls.notifyUser(
    "**Dutch Roll Mode**",
    `Observe the aircraft's oscillation in *yaw* and *roll*.

**Lesson Plan:**

1. Reposition to a safe altitude of **${targetAltitude} ft** and speed of **${targetSpeed} knots**. Aircraft is trimmed, autopilot disengaged.
2. Apply rudder input for 2 seconds to disturb yaw and roll, then return to neutral.
3. Observe the aircraft's oscillation in *yaw* and *roll*.
4. Increase the simulation speed to observe the damping effect.
`
);

await waitFor(5000);
await reposition_with_autopilot(targetAltitude, targetSpeed, targetHeading);
simControls.api_set_autopilot(false);
displayData.api_rudder_position.visible = true;
displayData.api_aileron_position.visible = true;
displayData.api_sideslip_deg.visible = true;
displayData.api_pitch_deg.visible = true;
displayData.api_bank_deg.visible = true;
displayData.api_ias_speed_knots.visible = true;
simControls.api_set_aileron_position(0.0);
simControls.api_set_rudder_position(0.0);
await waitFor(5000);

simControls.notifyUser(
    "**Initiating Dutch Roll Mode**",
    `Applying step rudder input for **2.5 seconds** in each direction, then returning to neutral position.`
);
await waitFor(5000);
simControls.api_set_rudder_position(-1.0);
await waitFor(2500);
simControls.api_set_rudder_position(1.0);
await waitFor(3000);
simControls.api_set_rudder_position(0.0);

simControls.notifyUser(
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
simControls.api_set_simulation_speed(0.5);
await waitFor(40000);

simControls.notifyUser(
    "**Dutch Roll Mode**",
    `By now, the Dutch Roll mode oscillation is almost damped.
This marks the end of the Dutch Roll mode demonstration.`
);
await waitFor(10000);
simControls.api_set_simulation_speed(1);
// simControls.api_set_autopilot(true);
