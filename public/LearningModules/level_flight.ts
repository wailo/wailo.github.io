import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simProps = context.props;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const waitForCondition = context.waitForCondition;
  const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;

  // Reset simulation and configure aircraft
  dataDisplayReset();
  simControls.simulation.reset_simulation();
  simControls.simulation.set_flight_model_c172();

  const flightModel = simControls.flightModel;

  const targetAltitude = 400; // ft
  const targetSpeed = 110; // knots
  const targetHeading = 270; // degrees

  ////////////////////////////////////////////////////////////
  // AIRCRAFT SETUP
  ////////////////////////////////////////////////////////////

  const repositionPromise = repositionWithAutopilot(
    context,
    targetAltitude,
    targetSpeed,
    targetHeading,
    10000,
    () => simControls.flightModel.set_empty_mass(430), // arbitrary mass adjustment used to trim the aircraft close to zero pitch
  ).then(async () => {
    ////////////////////////////////////////////////////////////
    // AUTOPILOT CONFIGURATION
    ////////////////////////////////////////////////////////////

    simControls.flightModel.set_autopilot_master_switch(true);

    simControls.flightModel.set_autopilot_altitude_target(targetAltitude);

    simControls.flightModel.set_autopilot_speed_indicated_target(targetSpeed);

    simControls.flightModel.set_autopilot_heading_target(targetHeading);

    simControls.flightModel.set_autopilot_altitude_hold(true);
    simControls.flightModel.set_autopilot_speed_indicated_hold(true);
    simControls.flightModel.set_autopilot_heading_hold(true);

    ////////////////////////////////////////////////////////////
    // STABILIZATION PHASE
    ////////////////////////////////////////////////////////////

    simControls.simulation.set_simulation_speed(100);

    await waitForCondition(() => {
      const correction = -flightModel.pitch_deg * 30;

      flightModel.set_empty_mass(flightModel.empty_mass + correction);

      return Math.abs(flightModel.pitch_deg) < 0.001;
    });

    // Hold current pitch attitude
    flightModel.set_autopilot_pitch_target(flightModel.pitch_deg);

    flightModel.set_autopilot_pitch_hold(true);

    // Reset vertical speed target for plotting purposes
    flightModel.set_autopilot_vertical_speed_target(0);

    simControls.simulation.set_simulation_speed(1);
  });

  ////////////////////////////////////////////////////////////
  // LESSON INTRODUCTION
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Introduction",
    "This lesson demonstrates force equilibrium during steady, level flight.\n\n" +
      "The following aerodynamic quantities will be monitored throughout the exercise:\n" +
      "• Lift\n" +
      "• Weight\n" +
      "• Thrust\n" +
      "• Drag\n" +
      "• Airspeed\n" +
      "• Vertical Speed\n\n" +
      "The objective is to observe how the aircraft responds when the equilibrium between these forces changes.\n\n" +
      `The aircraft will now be repositioned and stabilized under autopilot control.\n\n` +
      `Target conditions:\n` +
      `• Altitude: ${targetAltitude} ft\n` +
      `• Indicated Airspeed: ${targetSpeed} KT\n` +
      `• Heading: ${targetHeading}°`,
    16000,
  );

  await repositionPromise;

  ////////////////////////////////////////////////////////////
  // FORCE VISUALIZATION
  ////////////////////////////////////////////////////////////

  plotView([simProps.thrust, simProps.drag], true);

  plotView(
    [simProps.speed_indicated_knots, simProps.autopilot_speed_indicated_target],
    true,
  );

  plotView([simProps.lift, simProps.weight], true);

  plotView(
    [simProps.vertical_speed_ftmin, simProps.autopilot_vertical_speed_target],
    true,
  );

  ////////////////////////////////////////////////////////////
  // INITIAL OBSERVATION
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Steady-State Observation",
    "The aircraft is now stabilized in steady level flight.\n\n" +
      "Observe the plotted values carefully.\n\n" +
      "In steady level flight:\n" +
      "• Lift is approximately equal to Weight\n" +
      "• Thrust is approximately equal to Drag\n" +
      "• Vertical speed remains near zero\n" +
      "• Airspeed remains constant\n\n" +
      "Because the forces are balanced, the aircraft maintains a constant flight condition.",
    18000,
  );

  await notifyUser(
    "Observation Questions",
    "Review the plots and consider the following questions:\n\n" +
      "• Are Lift and Weight approximately equal?\n" +
      "• Are Thrust and Drag approximately equal?\n" +
      "• What would happen if Lift became greater than Weight?\n" +
      "• What would happen if Drag became greater than Thrust?\n" +
      "• Why does the vertical speed remain near zero during equilibrium?",
    16000,
  );

  ////////////////////////////////////////////////////////////
  // ACCELERATION DEMONSTRATION
  ////////////////////////////////////////////////////////////

  const acceleratedSpeed = targetSpeed + 5;

  await notifyUser(
    "Thrust Increase Demonstration",
    `The target airspeed will now increase from ${targetSpeed} KT to ${acceleratedSpeed} KT.\n\n` +
      "Observe the sequence of aerodynamic events carefully.\n\n" +
      "• Thrust increases\n" +
      "• Thrust becomes greater than Drag\n" +
      "• The aircraft begins accelerating\n\n" +
      "This is a direct application of Newton's Second Law:\n" +
      "A net force produces acceleration.",
    17000,
  );

  simControls.flightModel.set_autopilot_speed_indicated_target(
    acceleratedSpeed,
  );

  simControls.flightModel.set_autopilot_speed_indicated_hold(true);

  ////////////////////////////////////////////////////////////
  // OBSERVATION DURING ACCELERATION
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Acceleration and Lift Observation",
    "Monitor all plots during the speed increase.\n\n" +
      "Observe the following sequence:\n\n" +
      "• Does Thrust increase first?\n" +
      "• Does the imbalance between Thrust and Drag increase the airspeed?\n" +
      "• As airspeed increases, what happens to Drag?\n" +
      "• As airspeed increases, what happens to Lift?\n\n" +
      "Notice that Lift increases because the aircraft is now moving faster through the air.\n\n" +
      "If Lift becomes greater than Weight:\n" +
      "• What happens to Vertical Speed?\n" +
      "• What happens to Altitude?\n\n" +
      "This is also a direct application of Newton's Second Law:\n" +
      "A net upward force produces upward acceleration.",
    21000,
  );

  await waitForCondition(
    () =>
      simControls.flightModel.speed_indicated_knots >= acceleratedSpeed - 0.1,
  );

  await waitFor(4000);

  ////////////////////////////////////////////////////////////
  // NEW HORIZONTAL EQUILIBRIUM
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Horizontal Equilibrium Restored",
    "The aircraft has now stabilized at the higher airspeed.\n\n" +
      "Observe the force relationships carefully:\n\n" +
      "• As speed increased, Drag also increased\n" +
      "• Eventually Drag became equal to Thrust again\n" +
      "• Horizontal acceleration stopped because the net horizontal force returned to zero\n\n" +
      "This is Newton's First Law:\n" +
      "With zero net force, acceleration stops.\n\n" +
      "However, observe that Lift may still be greater than Weight.\n\n" +
      "If Lift remains greater than Weight:\n" +
      "• The aircraft will continue climbing\n" +
      "• Vertical speed will remain positive",
    22000,
  );

  ////////////////////////////////////////////////////////////
  // RETURNING LIFT/WEIGHT TO EQUILIBRIUM
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Reducing Speed to Restore Vertical Equilibrium",
    `The target airspeed will now decrease from ${acceleratedSpeed} KT back to ${targetSpeed} KT.\n\n` +
      "Observe what happens as the speed decreases:\n\n" +
      "• Lift decreases as airspeed decreases\n" +
      "• Lift gradually returns toward equilibrium with Weight\n" +
      "• Observe how Vertical Speed responds during this process\n\n" +
      "The objective is to restore Lift ≈ Weight and eliminate the climb.",
    19000,
  );

  simControls.flightModel.set_autopilot_speed_indicated_target(targetSpeed);

  simControls.flightModel.set_autopilot_speed_indicated_hold(true);

  ////////////////////////////////////////////////////////////
  // OBSERVATION DURING DECELERATION
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Lift and Vertical Speed Observation",
    "Monitor the plots during the reduction in airspeed.\n\n" +
      "Observe the following:\n\n" +
      "• As speed decreases, what happens to Lift?\n" +
      "• As Lift approaches Weight, what happens to Vertical Speed?\n" +
      "• When does the climb stop?\n" +
      "• When are the vertical forces balanced again?\n\n" +
      "Once Lift and Weight return to equilibrium:\n" +
      "• Net vertical force becomes zero\n" +
      "• Vertical acceleration stops\n" +
      "• Vertical speed returns toward zero",
    20000,
  );

  await waitForCondition(
    () => simControls.flightModel.speed_indicated_knots <= targetSpeed + 0.1,
  );

  await waitFor(4000);

  ////////////////////////////////////////////////////////////
  // FINAL EQUILIBRIUM
  ////////////////////////////////////////////////////////////

  await notifyUser(
    "Restored Force Equilibrium",
    "The aircraft has now returned to steady flight.\n\n" +
      "Observe that:\n" +
      "• Thrust ≈ Drag\n" +
      "• Lift ≈ Weight\n" +
      "• Airspeed is stable\n" +
      "• Vertical speed is near zero\n\n" +
      "When the net forces are zero, acceleration stops and the aircraft returns to a steady flight condition." +
      "![ Alt text](https://www1.grc.nasa.gov/wp-content/uploads/cruise.jpg)",
    17000,
  );
}
