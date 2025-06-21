import {simControls, simData, simProps, waitFor, waitForCondition, plotView, dataView, dataDisplayReset, notifyUser} from "./core"

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
  const lastIndex = steps.length - 1;

  const tableRows = steps.map((step, index) => {
    let nameCell = step.name;
    let conditionCell = step.condition;
    let indexCell = `${index + 1}`;
    const isCurrent = index === highlightIndex && index !== lastIndex;
    const isPrevious = index < highlightIndex;

    if (isCurrent) {
      indexCell = `<span class="flashing-amber">${index + 1}</span>`;
      nameCell = `<span class="flashing-amber">${step.name}</span>`;
      conditionCell = `<span class="flashing-amber">${step.condition}</span>`;
    } else if (isPrevious) {
      indexCell = `<span style="color: gray;">${index + 1}</span>`;
      nameCell = `<span style="color: gray;">${step.name}</span>`;
      conditionCell = `<span style="color: gray;">${step.condition}</span>`;
    }

    return `| ${indexCell} | ${nameCell} | ${conditionCell} |`;
  });

  const style = `
<style>
  @keyframes flash {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }

  .flashing-amber {
    color: orange;
    animation: flash 2s infinite;
  }

  .markdown table {
  border-bottom: 1px solid #aaa;
    width: 100%;
  }

  .markdown thead {
    text-align: left !important;
    padding: 0 !important;
    border-bottom: 1px solid #aaa; 
  }

  .markdown th {
    border: none !important;
    border-bottom: 1px solid #aaa !important;
    padding: 0px 0px !important;
    margin: 0 !important;
  }

  .markdown td {
    border: none !important;
    padding: 1px !important;
    margin: 0 !important;
  }
</style>
`;


  const scheduleMarkdown = [
    `### ${title}`,
    "| # | Step | Condition |",
    "|--|------|-----------|",
    ...tableRows,
    optionalText ? `\n${optionalText}` : ""
  ].join("\n");

  notifyUser("🗓️ Demo Schedule", style + scheduleMarkdown);
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
dataDisplayReset();
simControls.api_set_simulation_reset();
await waitFor(1000);

// Display key data
dataView(simProps.pitch_deg, true);
await waitFor(300);
dataView(simProps.bank_deg, true);
await waitFor(300);
dataView(simProps.heading_deg, true);
await waitFor(300);
dataView(simProps.flaps_selector_position, true);
await waitFor(300);
dataView(simProps.landing_gear_selector_position, true);
await waitFor(300);
plotView(simProps.altitude, true);
await waitFor(300);
plotView(simProps.ias_speed_knots, true);

// Show motions cues
simControls.api_set_motion_cues(true)

// Flaps + Throttle
simControls.api_set_flaps_selector_position(simControls.FlapSelector.TWENTY.value);
simControls.api_set_autopilot(true);
await waitFor(300);
simControls.api_set_autopilot_ias_speed_target(180);
await waitFor(300);
simControls.api_set_autopilot_altitude_target(18000);
await waitFor(300);
simControls.api_set_autopilot_heading_target(270);
await waitFor(300);
simControls.api_set_autopilot_vertical_speed_target(1500);
await waitFor(300);
simControls.api_set_autopilot_pitch_target(10);
await waitFor(2000)

advanceSchedule("", "Engine throttle to 90%.");
simControls.api_set_engine_throttle_position(0.90);
await waitFor(7000)

advanceSchedule("", "Wait to reach 150 KT IAS");
await waitForCondition(() => simData.api_ias_speed_knots >= 150);
advanceSchedule("Initiate Climbing", "Rotate");
simControls.api_set_elevator_position(-0.25);
// simControls.api_set_autopilot_ias_speed_hold(true);
await waitFor(3000);

await waitForCondition(() => simData.api_vertical_speed > 400, 5000);
advanceSchedule("", "Retracting landing gear");
simControls.api_set_autopilot_pitch_hold(true);
simControls.api_set_landing_gear_selector_position(simControls.GearSelector.UP.value);
await waitFor(3000);
simControls.api_set_engine_throttle_position(0.85)

await waitForCondition(() => simData.api_altitude > 1000);
advanceSchedule("", "Engaging VS and heading hold");
simControls.api_set_autopilot_pitch_hold(false);
simControls.api_set_autopilot_vertical_speed_hold(true);
simControls.api_set_autopilot_heading_hold(true);
await waitFor(5000);
simControls.api_set_engine_throttle_position(0.80)

await waitForCondition(() => simData.api_altitude >= 1000 && simData.api_ias_speed_knots >= 210);
advanceSchedule("", "Retracting to Flaps 10");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.TEN.value);

await waitForCondition(() => simData.api_altitude >= 1500 && simData.api_ias_speed_knots >= 220);
advanceSchedule("", "Retracting to Flaps 5");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.FIVE.value);

await waitForCondition(() => simData.api_altitude >= 2000 && simData.api_ias_speed_knots >= 235);
advanceSchedule("", "Retracting to Flaps 1");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.ONE.value);

await waitForCondition(() => simData.api_altitude >= 2500 && simData.api_ias_speed_knots >= 245);
advanceSchedule("", "Retracting Flaps to 0");
simControls.api_set_flaps_selector_position(simControls.FlapSelector.ZERO.value);



// simControls.api_set_simulation_speed(2);
// await waitForCondition(() => simData.api_altitude >= 3000 && simData.api_heading_deg === 270);

simControls.api_set_autopilot_vertical_speed_hold(false);
simControls.api_set_autopilot_altitude_hold(true);
simControls.api_set_autopilot_ias_speed_target(250);
simControls.api_set_autopilot_ias_speed_hold(true)
await waitFor(4000);

advanceSchedule("Climbing to FL180 using 100x speed", "Climb to FL180");
await waitFor(5000);
simControls.api_set_simulation_speed(100);

// Wait until corssing FL100
await waitForCondition(() => simData.api_altitude >= 10000);
simControls.api_set_autopilot_mach_speed_target(0.6);
simControls.api_set_autopilot_mach_speed_hold(true)


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

await waitFor(20000);
