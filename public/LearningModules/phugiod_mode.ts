// Demostrate phugoid mode
simControls.notifyUser("Phugiod Mode", "Observe the aircraft's oscillation in pitch and altitude.\n\n" + 
    "Lesson plan:\n\n" +
    "1. Reposition to safe alitude and speed. Aircraft is trimmed, autopilot disengaged\n" +
    "2. Apply stick input for 2 seconds to disturb altitude and speed. then return to normal\n" +
    "3. Observe the aircraft's oscillation in pitch and altitude.\n" + 
    "4. Increase the simulation speed to observe the damping effect\n"
);

await waitFor(5000)
await reposition_with_autopilot(8000, 180, 0);
simControls.api_set_autopilot(false);
displayData.api_elevator_position.visible = true;
displayData.api_pitch_deg.visible = true;
displayData.api_ias_speed_knots.visible = true;
await waitFor(5000)

simControls.notifyUser("Initiating Phugiod mode", "Pulling the control stick for 2 seconds then return to neutral position.\n\n")
await waitFor(5000)
simControls.api_set_elevator_position(-0.30)
await waitFor(2000)
simControls.api_set_elevator_position(0.00)
await waitFor(5000)
simControls.notifyUser("Phugiod mode", "Observe how the aircraft oscillates, Observe change in pitch angle with the speed\n\n")
await waitFor(30000)
simControls.notifyUser("Phugiod mode", "We will increase the simulation speed gradually.\n\n" + 
    "This will help you observe oscillation and the damping effect of the phugoid mode.\n\n")
await waitFor(3000)
simControls.api_set_simulation_speed(simData.api_simulation_speed +1);
await waitFor(2000)
simControls.api_set_simulation_speed(simData.api_simulation_speed +2);
await waitFor(2000)
simControls.api_set_simulation_speed(simData.api_simulation_speed +2);
await waitFor(2000)
simControls.api_set_simulation_speed(simData.api_simulation_speed +2);
await waitFor(2000)
simControls.api_set_simulation_speed(simData.api_simulation_speed +2);

simControls.notifyUser("Phugiod mode", `The simulation speed is now ${simData.api_simulation_speed}x.\n\n` +
    "Observe the aircraft's oscillation in pitch and altitude.\n\n" +
    "The oscillation is damped, meaning the amplitude of the oscillation decreases over time.\n\n" +
    "This is a characteristic of the phugoid mode.")
await waitFor(25000)
simControls.notifyUser("Phugiod mode", "By now the Phugiod mode oscillation is almost damped.\n\n" +
    "this mark the end of the phugoid mode demonstration.\n\n")
await waitFor(10000)
simControls.api_set_simulation_speed(1);
// simControls.api_set_autopilot(true);
