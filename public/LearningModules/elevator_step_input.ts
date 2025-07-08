import {
  simControls,
  simData,
  simProps,
  waitFor,
  plotView,
  dataDisplayReset,
  notifyUser,
  checkPoint,
} from "./core";

// Demonstrate elevator step input
notifyUser(
  "Elevator Step Input",
  "We will demonstrate a step input on the elevator.\n\n"
);

if (simData.api_autopilot) {
  if (simData.api_autopilot_altitude_hold) {
    notifyUser(
      "Autopilot altitude hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
    return;
  } else if (simData.api_autopilot_vertical_speed_hold) {
    notifyUser(
      "Autopilot vertical speed hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
    return;
  } else if (simData.api_autopilot_pitch_hold) {
    notifyUser(
      "Autopilot pitch angle hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
      return;
  }
}

const initial_autopilot_state = simData.api_autopilot;
simControls.api_set_autopilot(false);
plotView(simProps.elevator_position, true);
await waitFor(3000);
checkPoint("Initiating Step Input");

notifyUser(
  "Step Input",
  "Applying a sudden elevator step input and holding it for one second, then return to the previous position.\n\n" +
    "This will generate a sustained pitch moment.\n",
);
await waitFor(4000);

const initial_elevator_position = simData.api_elevator_position;
// Apply step input: sudden elevator deflection and hold
simControls.api_set_elevator_position(initial_elevator_position - 0.3); // step input (nose up)
// Hold new position
await waitFor(1000);
// Return to trimmed/neutral elevator
simControls.api_set_elevator_position(initial_elevator_position);
simControls.api_set_autopilot(initial_autopilot_state);

checkPoint("End of Elevator Step Input");
notifyUser("End of Elevator Step Input");
