import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  // const simProps = context.props;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  // const waitForCondition = context.waitForCondition;
  // const dataView = context.dataView;
  // const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  // const checkPoint = context.checkPoint;

// =========================
// 📘 Introduction
// =========================
notifyUser(
    "📘 Lesson: Effect of Aircraft Weight",
    "⚖️ In this lesson, you'll explore how aircraft weight affects flight dynamics.\n\n" +
    "🎯 Objectives:\n" +
    "• Reposition to stable flight\n" +
    "• 🔼 Increase and 🔽 decrease aircraft weight\n" +
    "• 👀 Observe speed, pitch, and flight performance changes\n\n" +
    "📢 Watch carefully! Questions will follow."
  );
  
  dataDisplayReset();
  const flightModel = simControls.simulation.set_flight_model_b747();
  // ✈️ Reposition and stabilize at level flight
  await repositionWithAutopilot(context, 12000, 270, 180);
  notifyUser("⚖️ Weight Adjustment", "We'll now modify aircraft weight and observe the effects.");
  
  // 🧪 Record current weight
  const initialWeight = flightModel.weight;
  
  // 🔓 Disable altitude and speed hold to allow natural response
  flightModel.set_autopilot_altitude_hold(false);
  flightModel.set_autopilot_speed_indicated_hold(false);
  
  // ⏳ Wait before adjustments
  await waitFor(2000);
  
  // 📊 Function to display flight data
  const notifyWeightFlightData = () => {
    const weight = flightModel.weight.toFixed(0);
    const speed = flightModel.speed_indicated_knots.toFixed(1);
    const pitch = flightModel.pitch_deg.toFixed(1);
    notifyUser("📈 Live Data", `⚖️ Weight: ${weight} kg\n💨 Speed: ${speed} knots\n🧭 Pitch: ${pitch}°`);
  };
  
  // 🔼 Increase weight by 20%
  flightModel.set_empty_weight(initialWeight * 1.2);
  notifyUser("🔼 Increasing Weight", "Weight increased by 20%. Observe performance.");
  for (let i = 0; i < 3; i++) {
    await waitFor(5000);
    notifyWeightFlightData();
  }
  
  // 🔽 Decrease weight to 80% of original
  flightModel.set_empty_weight(initialWeight * 0.8);
  notifyUser("🔽 Decreasing Weight", "Weight reduced by 20%. Observe changes.");
  for (let i = 0; i < 3; i++) {
    await waitFor(5000);
    notifyWeightFlightData();
  }
  
  // 🔁 Reset to original weight
  flightModel.set_empty_weight(initialWeight);
  notifyUser("🔁 Weight Restored", "Aircraft weight reset. Observe return to initial performance.");
  await waitFor(3000);
  notifyWeightFlightData();
  
  // =========================
  // 🧠 Post-Lesson Assessment
  // =========================
  await waitFor(8000);
  
  // ❓ Question 1
  notifyUser(
    "🧠 Assessment - Q1",
    "📊 What happens to pitch and climb when aircraft weight is increased?\n" +
    "A. Pitch increases, harder to climb\n" +
    "B. Pitch decreases, easier to climb\n" +
    "C. No effect\n" +
    "D. Aircraft descends quickly"
  );
  
  // ❓ Question 2
  await waitFor(8000);
  notifyUser(
    "🧠 Assessment - Q2",
    "⚖️ How does reduced weight affect aircraft performance?\n" +
    "A. Higher acceleration and easier climb\n" +
    "B. Increased drag\n" +
    "C. Increased stall speed\n" +
    "D. Causes structural stress"
  );
  
// ❓ Question 3
await waitFor(8000);
notifyUser(
  "🧠 Assessment - Q3",
  "🚀 When does aircraft weight naturally decrease during flight?\n" +
  "A. As fuel is burned over time\n" +
  "B. When the pilot dumps passengers\n" +
  "C. When switching to autopilot\n" +
  "D. During high-speed descent"
);

// ❓ Question 4
await waitFor(8000);
notifyUser(
  "🧠 Assessment - Q4",
  "🧐 Can you think of a situation where the aircraft weight increases during flight?\n" +
  "💬 This is an open-ended question — think of real-world scenarios (hint: something being added to the aircraft)."
);
}
