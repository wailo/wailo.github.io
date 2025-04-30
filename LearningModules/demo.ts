// 🛠️ Helper: Flight Schedule Tracker
let currentStep = 0;

const steps = [
  { name: "Pre-Takeoff Configuration", condition: "On the ground" },
  { name: "Throttle Up", condition: "IAS < 150" },
  { name: "Wait for Takeoff speed", condition: "IAS < 150" },
  { name: "Rotate", condition: "IAS ≥ 150" },
  { name: "Retract Gear", condition: "Positive climb rate" },
  { name: "Turn to 270°", condition: "Alt > 1000" },
  { name: "Flaps to 10°", condition: "Alt ≥ 1000, IAS ≥ 210" },
  { name: "Flaps to 5°", condition: "Alt ≥ 1500, IAS ≥ 220" },
  { name: "Flaps to 1°", condition: "Alt ≥ 2000, IAS ≥ 235" },
  { name: "Flaps Up", condition: "Alt ≥ 2500, IAS ≥ 245" },
  { name: "Climb to FL180", condition: "Alt < 18000" },
  { name: "Cruise", condition: "Alt ≥ FL180" },
  { name: "Wrap-up", condition: "User Control Enabled" },
];

function advanceSchedule(extraText = "", title = "") {
  showSchedule(currentStep++, title, extraText);
}

function showSchedule(highlightIndex, title, optionalText = "") {
  const tableRows = steps.map((step, index) => {
    return index === highlightIndex
      ? `| <u><b>${index + 1}</b></u> | <u><b>${step.name}</b></u> | <u><b>${step.condition}</b></u> |`
      : `| ${index + 1} | ${step.name} | ${step.condition} |`;
  });

  const scheduleMarkdown = [
    `### ${title}`,
    "| # | Step | Condition |",
    "|---|------|-----------|",
    ...tableRows,
    optionalText ? `\n${optionalText}` : ""
  ].join("\n");

  simControls.notifyUser("🗓️ Demo Schedule", scheduleMarkdown);
}

// 📜 Simulator Demo Script
advanceSchedule(
  "Pre-Takeoff Configuration\n\n" +
  "- **Flaps**: 20\n" +
  "- **Target Speed**: 250 KT\n" +
  "- **Target Altitude**: FL180\n" +
  "- **Target Vertical Speed**: 1500 ft/min\n" +
  "- **Target Heading**: 270°",
  "Takeoff configuration..."
);
simControls.api_set_simulation_reset();
await waitFor(1000);

// Display key data
displayData.api_altitude.visible = true;
await waitFor(300);
displayData.api_ias_speed_knots.visible = true;
await waitFor(300);
displayData.api_pitch_deg.visible = true;
await waitFor(300);
displayData.api_bank_deg.visible = true;
await waitFor(300);
displayData.api_heading_deg.visible = true;
await waitFor(300);
displayData.api_flaps_selector_position_name.visible = true;
await waitFor(300);
displayData.api_landing_gear_selector_position_name.visible = true;
await waitFor(300);

// Flaps + Throttle
simControls.api_set_flaps_selector_position(simControls.FlapSelector.TWENTY);
simControls.api_set_autopilot(true);
await waitFor(300);
simControls.api_set_target_speed(180);
await waitFor(300);
simControls.api_set_target_altitude(18000);
await waitFor(300);
simControls.api_set_target_heading_deg(270);
await waitFor(300);
simControls.api_set_target_vertical_speed(1500);
await waitFor(300);
simControls.api_set_target_pitch_deg(10);
await waitFor(2000)

advanceSchedule("", "Engine throttle to 90%.");
simControls.api_set_engine_throttle_value(0.90);
await waitFor(7000)

advanceSchedule("", "Wait to reach 150 KT IAS");
await waitForCondition(() => simData.api_ias_speed_knots >= 150);
advanceSchedule("Initiate Climbing", "Rotate");
simControls.api_set_elevator_position(-0.25);
// simControls.api_set_speed_hold(true);
await waitFor(3000);

await waitForCondition(() => simData.api_vertical_speed > 400, 5000);
advanceSchedule("Retracting landing gear", "Retract Gear");
simControls.api_set_pitch_hold(true);
simControls.api_set_landing_gear_selector_position(simControls.GearSelector.UP);
await waitFor(3000);
simControls.api_set_engine_throttle_value(0.85)

await waitForCondition(() => simData.api_altitude > 1000);
advanceSchedule("Activate Vertical Speed Hold to 1500 ft/min, heading hold to 270", "Engaging VS and heading hold");
simControls.api_set_pitch_hold(false);
simControls.api_set_vertical_speed_hold(true);
simControls.api_set_heading_hold(true);
await waitFor(5000);
simControls.api_set_engine_throttle_value(0.80)

await waitForCondition(() => simData.api_altitude >= 1000 && simData.api_ias_speed_knots >= 210);
advanceSchedule("Retracting to Flaps 10", "Flaps to 10");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.TEN);

await waitForCondition(() => simData.api_altitude >= 1500 && simData.api_ias_speed_knots >= 220);
advanceSchedule("Retracting to Flaps 5", "Flaps to 5");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.FIVE);

await waitForCondition(() => simData.api_altitude >= 2000 && simData.api_ias_speed_knots >= 235);
advanceSchedule("Retracting to Flaps 1", "Flaps to 1");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.ONE);

await waitForCondition(() => simData.api_altitude >= 2500 && simData.api_ias_speed_knots >= 245);
advanceSchedule("Clean configuration achieved (Flaps 0)", "Flaps Up");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.ZERO);



// simControls.api_set_simulation_speed(2);
// await waitForCondition(() => simData.api_altitude >= 3000 && simData.api_heading_deg === 270);

simControls.api_set_vertical_speed_hold(false);
simControls.api_set_altitude_hold(true);
simControls.api_set_target_speed(250);
simControls.api_set_speed_hold(true)
await waitFor(4000);

advanceSchedule("Climbing to FL180 using 100x speed", "Climb to FL180");
await waitFor(5000);
simControls.api_set_simulation_speed(100);

// Wait until corssing FL100
await waitForCondition(() => simData.api_altitude >= 10000);
simControls.api_set_target_mach_speed(0.6);
simControls.api_set_mach_speed_hold(true)


await waitForCondition(() => simData.api_altitude >= 18000);
advanceSchedule("Returning to normal speed, disabling autopilot", "Cruise");
await waitFor(5000);
simControls.api_set_simulation_speed(1);
simControls.api_set_autopilot(false);

advanceSchedule(
  "We have demonstrated:\n" +
  "- Full autopilot control\n" +
  "- Smart wait conditions\n" +
  "- Speed control\n" +
  "- Takeoff/climb automation\n\n" +
  "Now you may try to fly the simulator manually.\n\n",
  "Wrap-up"
);
