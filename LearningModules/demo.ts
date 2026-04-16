import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simProps = context.props;
  // const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const waitForCondition = context.waitForCondition;
  const dataView = context.dataView;
  const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  const checkPoint = context.checkPoint;

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
  checkPoint(title)

}

function showSchedule(highlightIndex : number, title: string, optionalText = "") {
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
simControls.simulation.reset_simulation();
const flightmodel = simControls.simulation.set_flight_model_b747();
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
simControls.simulation.set_motion_cues(true)

// Flaps + Throttle
flightmodel.set_flaps_selector_position(simControls.B747FlapSelector.TWENTY);
flightmodel.set_autopilot_master_switch(true);
await waitFor(300);
flightmodel.set_autopilot_speed_indicated_target(180);
await waitFor(300);
flightmodel.set_autopilot_altitude_target(18000);
await waitFor(300);
flightmodel.set_autopilot_heading_target(270);
await waitFor(300);
flightmodel.set_autopilot_vertical_speed_target(1500);
await waitFor(300);
flightmodel.set_autopilot_pitch_target(10);
await waitFor(2000)

advanceSchedule("", "Engine throttle to 90%.");
flightmodel.set_engine_throttle_position(0.90);
await waitFor(7000)

advanceSchedule("", "Wait to reach 150 KT IAS");
await waitForCondition(() => flightmodel.speed_indicated_knots >= 150);
advanceSchedule("Initiate Climbing", "Rotate");
flightmodel.set_elevator_position(-0.25);

// Wait for positive vertical speed above 400 ft/min for more than 1 second
await waitForCondition(() => flightmodel.vertical_speed_ftmin > 400, 1000);
advanceSchedule("", "Retracting landing gear");
flightmodel.set_autopilot_pitch_hold(true);
flightmodel.set_landing_gear_selector_position(simControls.B747GearSelector.UP);
await waitFor(3000);
flightmodel.set_engine_throttle_position(0.85)

await waitForCondition(() => flightmodel.altitude_ft > 1000);
advanceSchedule("", "Engaging VS and heading hold");
flightmodel.set_autopilot_pitch_hold(false);
flightmodel.set_autopilot_vertical_speed_hold(true);
flightmodel.set_autopilot_heading_hold(true);
await waitFor(5000);
flightmodel.set_engine_throttle_position(0.80)

await waitForCondition(() => flightmodel.altitude_ft >= 1000 && flightmodel.speed_indicated_knots >= 210);
advanceSchedule("", "Retracting to Flaps 10");
flightmodel.set_flaps_selector_position(simControls.B747FlapSelector.TEN);

await waitForCondition(() => flightmodel.altitude_ft >= 1500 && flightmodel.speed_indicated_knots >= 220);
advanceSchedule("", "Retracting to Flaps 5");
flightmodel.set_flaps_selector_position(simControls.B747FlapSelector.FIVE);

await waitForCondition(() => flightmodel.altitude_ft >= 2000 && flightmodel.speed_indicated_knots >= 235);
advanceSchedule("", "Retracting to Flaps 1");
flightmodel.set_flaps_selector_position(simControls.B747FlapSelector.ONE);

await waitForCondition(() => flightmodel.altitude_ft >= 2500 && flightmodel.speed_indicated_knots >= 245);
advanceSchedule("", "Retracting Flaps to 0");
flightmodel.set_flaps_selector_position(simControls.B747FlapSelector.ZERO);



// simControls.api_set_simulation_speed(2);
// await waitForCondition(() => flightmodel.altitude_ft >= 3000 && flightmodel.api_heading_deg === 270);

flightmodel.set_autopilot_vertical_speed_hold(false);
flightmodel.set_autopilot_altitude_hold(true);
flightmodel.set_autopilot_speed_indicated_target(250);
flightmodel.set_autopilot_speed_indicated_hold(true)
await waitFor(4000);

advanceSchedule("Climbing to FL180 using 100x speed", "Climb to FL180");
await waitFor(5000);
simControls.simulation.set_simulation_speed(100);

// Wait until corssing FL100
  await waitForCondition(() => flightmodel.altitude_ft >= 10000);
flightmodel.set_autopilot_speed_mach_target(0.6);
flightmodel.set_autopilot_speed_mach_hold(true)


await waitForCondition(() => flightmodel.altitude_ft >= 18000);
advanceSchedule("Returning to normal speed, disabling autopilot", "Cruise");
await waitFor(5000);
simControls.simulation.set_simulation_speed(1);
flightmodel.set_autopilot_master_switch(false);

advanceSchedule(
  "We have demonstrated:\n" +
  "- Full autopilot control\n" +
  "- Smart wait conditions\n" +
  "- Speed control\n" +
  "- Takeoff/climb automation\n\n" +
  "Now you may try to fly the simulator manually.\n\n",
  "Wrap-up"
);
}
