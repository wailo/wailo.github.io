import {repositionWithAutopilot, simControls, simData, simProps, waitFor, plotView, dataDisplayReset, notifyUser, checkPoint } from "./core"

// Demostrate phugoid mode
notifyUser("Phugiod Mode", "Observe the aircraft's oscillation in pitch and altitude.\n\n" + 
    "Lesson plan:\n\n" +
    "1. Reposition to safe alitude and speed. Aircraft is trimmed, autopilot disengaged\n" +
    "2. Apply stick input for 2 seconds to disturb altitude and speed. then return to normal\n" +
    "3. Observe the aircraft's oscillation in pitch and altitude.\n" + 
    "4. Increase the simulation speed to observe the damping effect\n"
);

// Pre-configuration before trimming the aircraft.
const preConfiguration = () => {
    simControls.api_set_flaps_selector_position(simControls.FlapSelector.TWENTY.value);
}

dataDisplayReset();
await repositionWithAutopilot(3000, 180, 0, preConfiguration);
await waitFor(2000)
simControls.api_set_autopilot(false);
plotView(simProps.elevator_position, true);
plotView(simProps.pitch, true);
plotView(simProps.pitch_dot, true);
plotView(simProps.ias_speed_knots, true);
await waitFor(5000)
checkPoint("Initiating Phugiod mode")
notifyUser("Initiating Phugiod mode", "Pulling the control stick for 2 seconds then return to neutral position.\n\n")
await waitFor(5000)
simControls.api_set_elevator_position(simData.api_elevator_position - 0.30)
await waitFor(2000)
simControls.api_set_elevator_position(0.00)
await waitFor(5000)
checkPoint("Phugiod mode")
notifyUser("Phugiod mode", "Observe how the aircraft oscillates, Observe change in pitch angle with the speed\n\n")
await waitFor(30000)
notifyUser("Phugiod mode", "We will increase the simulation speed gradually.\n\n" + 
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
notifyUser("Phugiod mode", `The simulation speed is now ${simData.api_simulation_speed}x.\n\n` +
    "Observe the aircraft's oscillation in pitch and altitude.\n\n" +
    "The oscillation is damped, meaning the amplitude of the oscillation decreases over time.\n\n" +
    "This is a characteristic of the phugoid mode.")
await waitFor(25000)
notifyUser("Phugiod mode", "By now the Phugiod mode oscillation is almost damped.\n\n" +
    "this mark the end of the phugoid mode demonstration.\n\n")
checkPoint("End of Phugiod mode")
await waitFor(10000)
simControls.api_set_simulation_speed(1);
// simControls.api_set_autopilot(true);
