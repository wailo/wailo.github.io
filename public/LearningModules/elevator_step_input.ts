import {
  simControls,
  simProps,
  waitFor,
  plotView,
  notifyUser,
  checkPoint,
} from "./core";


const flightModel = simControls.fm

// Demonstrate elevator step input
notifyUser(
  "Elevator Step Input",
  "We will demonstrate a step input on the elevator.\n\n"
);

if (flightModel.autopilot_master_switch) {
  if (flightModel.autopilot_altitude_hold) {
    notifyUser(
      "❌ Autopilot altitude hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
    return;
  } else if (flightModel.autopilot_vertical_speed_hold) {
    notifyUser(
      "❌ Autopilot vertical speed hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
    return;
  } else if (flightModel.autopilot_pitch_hold) {
    notifyUser(
      "❌ Autopilot pitch angle hold is engaged.",
      "Elevator can not be commanded. Disengage",
    );
      return;
  }
}

const initial_autopilot_state = flightModel.autopilot_master_switch;
flightModel.set_autopilot_master_switch(false);
plotView(flightModel.elevator_position, true);
await waitFor(3000);
checkPoint("Initiating Step Input");

notifyUser(
  "Step Input",
  "Applying a sudden elevator step input and holding it for one second, then return to the previous position.\n\n" +
    "This will generate a sustained pitch moment.\n",
);
await waitFor(4000);

const initial_elevator_position = flightModel.elevator_position;
// Apply step input: sudden elevator deflection and hold
flightModel.set_elevator_position(initial_elevator_position - 0.3); // step input (nose up)
// Hold new position
await waitFor(1000);
// Return to trimmed/neutral elevator
flightModel.set_elevator_position(initial_elevator_position);
flightModel.set_autopilot_master_switch(initial_autopilot_state);

checkPoint("End of Elevator Step Input");
notifyUser("End of Elevator Step Input");
