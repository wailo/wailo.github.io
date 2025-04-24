// Demonstrate dutch roll mode
simControls.notifyUser("Dutch Roll Mode", "Observe the aircraft's oscillation in yaw and roll.\n\n" + 
    "Lesson plan:\n\n" +
    "1. Reposition to safe altitude and speed. Aircraft is trimmed, autopilot disengaged\n" +
    "2. Apply rudder input for 2 seconds to disturb yaw and roll. then return to normal\n" +
    "3. Observe the aircraft's oscillation in yaw and roll.\n" + 
    "4. Increase the simulation speed to observe the damping effect\n"
);

await waitFor(5000)
await reposition_with_autopilot(30000, 180, 0);
simControls.api_set_autopilot(false);
displayData.api_rudder_position.visible = true;
displayData.api_alpha_aileron.visible = true;
displayData.api_heading_deg.visible = true;
displayData.api_pitch_deg.visible = true;
displayData.api_bank_deg.visible = true;
displayData.api_ias_speed_knots.visible = true;
await waitFor(5000)

simControls.notifyUser("Initiating Dutch Roll mode", "Applying rudder input for 2 seconds in each direction then returning to neutral position.\n\n")
await waitFor(5000)
simControls.api_set_rudder_position(-1.0)
await waitFor(2500)
simControls.api_set_rudder_position(1.0)
await waitFor(2500)
simControls.api_set_rudder_position(0.0)
simControls.notifyUser("Dutch Roll mode", "We will observer the dutch roll in slow motion, Observe how the aircraft oscillates. Observe changes in yaw, roll, and sideslip angles.\n\n")
simControls.api_set_simulation_speed(0.5);
await waitFor(40000)

simControls.notifyUser("Dutch Roll mode", "By now the Dutch Roll mode oscillation is almost damped.\n\n" +
    "This marks the end of the Dutch Roll mode demonstration.\n\n")
await waitFor(10000)
simControls.api_set_simulation_speed(1);
// simControls.api_set_autopilot(true);
