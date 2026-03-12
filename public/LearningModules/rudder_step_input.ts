import {
  simControls,
  simProps,
  waitFor,
  plotView,
  notifyUser,
  checkPoint,
} from "./core";

const flightModel = simControls.fm

if (flightModel.autopilot_yaw_damper) {
  notifyUser(
    "❌ Autopilot yaw dumper is engaged.",
    "Rudder can not be commanded. Disengage",
  );
  return;
}

// Demonstrate elevator step input
notifyUser("Rudder Step Input", "Applying step input on the rudder.\n\n");

plotView(simProps.rudder_position, true);
await waitFor(3000);

notifyUser(
  "Step Input",
  "Applying a sudden rudder doublet input with on 3 seconds wait in between.\n\n" +
    "This will generate a sustained Roll and Yaw moment.\n",
);
await waitFor(5000);

checkPoint("Initiating Step Input");
const initial_rudder_position = flightModel.rudder_position;
flightModel.set_rudder_position(-1.0);
await waitFor(3000);
flightModel.set_rudder_position(1.0);
await waitFor(3000);
flightModel.set_rudder_position(initial_rudder_position);
checkPoint("End of Rudder Step Input");
notifyUser("End of Rudder Step Input");
