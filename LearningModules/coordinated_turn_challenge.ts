import { ScriptContext } from "../../src/core";

export async function main(context: ScriptContext) {
  const simControls = context.controls;
  const simProps = context.props;
  const repositionWithAutopilot = context.repositionWithAutopilot;
  const waitFor = context.waitFor;
  const waitForCondition = context.waitForCondition;
  const dataView = context.dataView;
  const plotView = context.plotView;
  const dataDisplayReset = context.dataDisplayReset;
  const notifyUser = context.notifyUser;
  // const checkPoint = context.checkPoint;
  const metrics = context.metrics;

dataDisplayReset();
simControls.simulation.reset_simulation();

// 📘 Configurations for Cessna 172
const initialAltitude_ft = 5000; // Typical cruising altitude
const initialSpeed_knots = 100; // Cruise speed (120 knots)
const initialHeading_deg = 0;
const maxAltitudeDeviation_ft = 100; // Tighter deviation
const requiredHeadingChange_deg = 180; // Full 180° turn
const challengeTimeLimit_ms = 60 * 1000; // 1 minute

notifyUser(
    "🎯 **Coordinated Turn (Cessna 172)**",
    "**A coordinated turn** maintains balance between lift, weight, and centrifugal force.\n" +
    "**No slipping or skidding** — the aircraft turns smoothly while maintaining altitude."
);

const flightModel = simControls.simulation.set_flight_model_c172();
await repositionWithAutopilot(context, initialAltitude_ft, initialSpeed_knots, initialHeading_deg);

flightModel.set_autopilot_master_switch(true);  // Enable autopilot again
flightModel.set_autopilot_altitude_hold(true); // Set altitude hold
flightModel.set_autopilot_speed_indicated_hold(true); // Set speed hold
flightModel.set_autopilot_heading_hold(true); // Set heading hold

// 📘 Step 2: Explain Coordinated Turn
await waitFor(4000);

// 📘 Step 3: Display and Plot Relevant Data
dataView(simProps.altitude, true);
await waitFor(300);
dataView(simProps.heading, true);
await waitFor(300);
dataView(simProps.aileron_position, true);
await waitFor(300);
dataView(simProps.elevator_position, true);
await waitFor(300);

plotView(simProps.altitude, true);
plotView(simProps.heading, true);
plotView(simProps.aileron_position, true);
plotView(simProps.elevator_position, true);

// Capture starting values
const initialAltitude = flightModel.altitude_ft;
const initialHeading = flightModel.heading_deg;
const initialPitch_deg = 3; // Cessna 172 typical pitch for coordinated turn
let altitudeWithinLimits = false;

await waitFor(6000);
flightModel.set_autopilot_master_switch(false);
flightModel.set_autopilot_altitude_hold(false);
flightModel.set_autopilot_speed_indicated_hold(false);
flightModel.set_autopilot_heading_hold(false);
await waitFor(1000);

// 📘 Step 4: Start Challenge and Monitor User Action
notifyUser(
    "🛫 **Pilot In Command!**",
    `**Disengaging autopilot now.** Complete the coordinated turn within **${challengeTimeLimit_ms / 1000 / 60} minutes** without exceeding **${maxAltitudeDeviation_ft} ft** in altitude.`
);

let lastHeading = initialHeading;
let totalHeadingChange_deg = 0;
// Define success condition
const success = await waitForCondition(
    () => {
        const currentAltitude = flightModel.altitude_ft;
        const currentHeading = flightModel.heading_deg;
        metrics.push( { timestamp: Date.now(),
        heading: flightModel.heading_deg,
        altitude: flightModel.altitude_ft,
        speed: flightModel.speed_indicated_knots,
        verticalSpeed: flightModel.vertical_speed,
        turnRate: flightModel.heading_dot_deg,
        bank: flightModel.bank_deg,
        pitch: flightModel.pitch_deg,
        elevator: flightModel.elevator_position,
        aileron: flightModel.aileron_position
        })

        // Engaging autopilot is not allowed, disengage if detected
        if (flightModel.autopilot_master_switch) {
            notifyUser(
                "❌ **Autopilot Engaged**",
                "You engaged the autopilot. Disengaging autopilot now."
            );
            flightModel.set_autopilot_master_switch(false);
            return false; // Fail condition if autopilot is engaged
        }

        // Check altitude deviation first; if false, immediately return failure
        altitudeWithinLimits = Math.abs(currentAltitude - initialAltitude) <= maxAltitudeDeviation_ft;
        if (!altitudeWithinLimits) {
            notifyUser(
                "❌ **Altitude Exceeded**",
                `**Altitude deviation exceeded ${maxAltitudeDeviation_ft} ft.** You lost control of the altitude. Try again!`
            );
            return true; // Fail condition immediately if altitude is out of limits
        }

        // Continue with heading change check only if altitude is within limits
        // Calculate smallest angular difference (handles wrap-around at 0/360)
        let diff = currentHeading - lastHeading;
        if (diff > 180) diff = 360 - diff;
        else if (diff < -180) diff = 360 + diff;
        totalHeadingChange_deg = totalHeadingChange_deg + diff;
        const headingChangedEnough = Math.abs(totalHeadingChange_deg) >= requiredHeadingChange_deg;
        lastHeading = currentHeading;
        return altitudeWithinLimits && headingChangedEnough;
    },
    0,          // confirmation_ms: condition must stay true for 2 seconds
    400,        // poll every 40 ms
    challengeTimeLimit_ms,  // Hard timeout
    false       // don't throw if timeout
);

// 📘 Step 5: Announce Result
if (success) {
    if (!altitudeWithinLimits) {
        notifyUser(
            "❌ **Challenge Failed**",
            `**Altitude deviation exceeded ${maxAltitudeDeviation_ft} ft.**`
        );
    } else {
        // Scores
        const averageTurnRate = metrics.reduce((sum, m) => sum + m.turnRate, 0) / metrics.length;
        const maxAltitudeDeviation_ft = Math.max(...metrics.map(m => Math.abs(m.altitude - initialAltitude)));
        const timeTaken_sec = (Date.now() - metrics[0].timestamp) / 1000; // in seconds
        const maxSpeedDeviation_knots = Math.max(...metrics.map(m => Math.abs(m.speed - initialSpeed_knots)));
        const maxVerticalSpeedDeviation_ft = Math.max(...metrics.map(m => Math.abs(m.verticalSpeed)));
        const maxBank_deg = Math.max(...metrics.map(m => Math.abs(m.bank)));
        const maxPitchDeviation_deg = Math.max(...metrics.map(m => Math.abs(m.pitch - initialPitch_deg)));

        notifyUser(
            "🏆 **Challenge Complete!**",
            `You performed a coordinated **${requiredHeadingChange_deg}° turn** without major altitude loss or gain. **Well done!**`
            + `\n**Time Taken:** ${timeTaken_sec.toFixed(2)} seconds, score: ${(100 - (Math.abs(timeTaken_sec - 60) / 10)).toFixed(2)}`
            + `\n\n**Average Turn Rate:** ${averageTurnRate.toFixed(2)}°/s, score: ${(100 - (Math.abs(averageTurnRate - 3) / 10)).toFixed(2)}`
            + `\n**Max Vertical Speed Deviation:** ${maxVerticalSpeedDeviation_ft} ft/min, score: ${(100 - (maxVerticalSpeedDeviation_ft / 20)).toFixed(2)}`
            + `\n**Max Altitude Deviation:** ${maxAltitudeDeviation_ft} ft, score: ${(100 - (maxAltitudeDeviation_ft / 50)).toFixed(2)}`
            + `\n**Max Speed Deviation:** ${maxSpeedDeviation_knots} knots, score: ${(100 - (maxSpeedDeviation_knots / 5)).toFixed(2)}`
            + `\n**Max Pitch Deviation:** ${maxPitchDeviation_deg}°, score: ${(100 - (maxPitchDeviation_deg / 2)).toFixed(2)}`
            + `\n**Max Bank Angle:** ${maxBank_deg}°`
        );
    }
} else {
    notifyUser(
        "❌ **Challenge Failed**",
        `**Time ran out.** Try again!`
    );
}

await waitFor(10000); // Give the user a moment to read the message
}
