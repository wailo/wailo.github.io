import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simProps = context.props;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const waitForCondition = context.waitForCondition;
  const checkPoint = context.checkPoint;
  const notifyUser = context.notifyUser;
  const dataDisplayReset = context.dataDisplayReset;
  const plotView = context.plotView;

// simControls.simulation.reset_flightmodel();
const simulation = simControls.simulation;
simulation.reset_simulation();


notifyUser("Landing Scenario", "Landing Scenario - B747\n\n" + 
    "Lesson plan:\n\n" +
    "1. Reposition to approach configuration, aircraft is trimmed\n" +
    "2. Configure aircraft for landing (flaps, gear, speed reduction)\n" +
    "3. Descend to approach altitude\n" +
    "4. Configure for final approach\n" +
    "5. Touchdown and rollout\n" +
    "6. Observe final approach data\n"
);

dataDisplayReset();
simulation.set_six_instruments_display(false);
simulation.set_pfd_horizon_visible(false);
simulation.set_motion_cues(true);

const flightModel = simControls.simulation.set_flight_model_b747();
await repositionWithAutopilot(context, 300, 180, 90);


checkPoint("Initiating Landing Sequence")
await waitFor(5000);

notifyUser("Landing Scenario", "Initiating landing sequence for B747\n\n" + 
    "Current Configuration:\n" +
    "- Altitude: 800 ft\n" +
    "- Speed: 180 knots\n" +
    "- Heading: 90 degrees\n\n" +
    "Next steps:\n" +
    "1. Configure flaps for landing\n" +
    "2. Extend landing gear\n" +
    "3. Reduce speed to approach speed\n" +
    "4. Configure pitch for descent\n" +
    "5. Maintain approach altitude and speed\n"
);

await waitFor(10000);

notifyUser("Landing Scenario", "Configuring flaps and gear for approach\n\n" +
    "1. Set FULL flaps for landing\n" +
    "2. Extend landing gear\n" +
    "3. Reduce speed to approach speed (~200 knots for B747)\n" +
    "4. Configure pitch attitude for glide slope\n"
);

flightModel.set_flaps_selector_position(simControls.B747FlapSelector.THIRTY);
flightModel.set_autopilot_master_switch(true);  // Enable autopilot
flightModel.set_autopilot_speed_indicated_hold(true);
flightModel.set_autopilot_speed_indicated_target(150);

flightModel.set_autopilot_vertical_speed_target(-500); // Set descent rate
flightModel.set_autopilot_vertical_speed_hold(true);

await waitFor(2000);

plotView(simProps.speed_indicated_knots, true);
await waitFor(2000);

flightModel.set_landing_gear_selector_position(simControls.B747GearSelector.DOWN);
await waitFor(5000);

notifyUser("Landing Scenario", "Gear extended. Configuring speed to approach.\n\n" + 
    "Target speed: ~200 knots\n" +
    "Current speed: ${flightModel.speed_indicated_knots} knots\n\n" +
    "Monitor speed and adjust throttle.\n"
);

await waitFor(5000);

plotView(simProps.throttle_position, true);
await waitFor(5000);

notifyUser("Landing Scenario", "Approaching glide slope. Pitch is being adjusted for descent.\n\n" + 
    "Configure pitch attitude to maintain glide path.\n\n" +
    "Target: ~3 degrees below horizon for approach\n"
);

plotView(simProps.pitch_deg, true);
await waitFor(3000);

notifyUser("Landing Scenario", "Maintaining approach parameters.\n\n" + 
    `- Speed: ${flightModel.speed_indicated_knots} knots\n` +
    `- Altitude: ${flightModel.altitude_ft} ft\n` +
    `- Rate of descent: ${flightModel.vertical_speed_ftmin} fpm\n` +
    `- Glide slope: On approach path\n` +
    `- Configure for final approach\n`
);

await waitFor(15000);

notifyUser("Landing Scenario", "On final approach.\n\n" + 
    "Monitor your approach:\n" +
    "- Maintain glide slope\n" +
    "- Configure speed between 180-200 knots\n" +
    "- Prepare for touchdown\n"
);


checkPoint("Approaching runway")
await waitFor(10000);

notifyUser("Landing Scenario", "Touchdown imminent. Reduce speed and prepare for landing.\n\n" +
    "- Pull throttle to idle\n" +
    "- Hold nose wheel in landing gear position\n" +
    "- Touchdown on main gear\n" + 
    "- Deploy reverse thrusters when appropriate\n"
);

await waitForCondition(() => flightModel.altitude_ft < 70);
flightModel.set_autopilot_vertical_speed_target(0); // Level off for final approach
flightModel.set_autopilot_speed_indicated_target(120);

await waitFor(1000);

plotView(simProps.altitude_ft, true);
// await waitFor(3000);

notifyUser("Landing Scenario", "Touchdown!\n\n" +
    "- Maintain directional control\n" +
    "- Use reverse thrust and spoilers if available\n" +
    "- Apply brakes when appropriate\n" +
    "- Maintain runway centerline\n"
);

await waitFor(10000);

notifyUser("Landing Scenario", "Rollout in progress.\n\n" +
    "- Monitor speed reduction\n" +
    "- Apply brakes as needed\n" +
    "- Keep runway centerline\n" +
    "- Complete landing procedure\n"
);

await waitFor(30000);

checkPoint("Landing Complete")
await waitFor(10000);

notifyUser("Landing Scenario", "Landing sequence complete.\n\n" +
    "Summary:\n\n" +
    "1. Started at 800 ft altitude, 180 knots, heading 90\n" +
    "2. Configured flaps and gear\n" +
    "3. Reduced speed to approach parameters\n" +
    "4. Maintained glide slope\n" +
    "5. Achieved touchdown\n" +
    "6. Completed rollout\n\n" +
    "Good job completing the landing scenario!\n"
);

await waitFor(5000);

simControls.simulation.set_simulation_speed(1);
}