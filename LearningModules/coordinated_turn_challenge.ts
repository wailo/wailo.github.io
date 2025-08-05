import {repositionWithAutopilot, simControls, simData, simProps, waitFor, waitForCondition, plotView, dataView, dataDisplayReset, notifyUser} from "./core"
// 📘 Configurations
const initialAltitude_ft = 5000;
const initialSpeed_knots = 180;
const initialHeading_deg = 0;
const maxAltitudeDeviation_ft = 200;
const requiredHeadingChange_deg = 180;
const challengeTimeLimit_ms = 2 * 60 * 1000; // 2 minutes

notifyUser(
    "🎯 **Coordinated Turn**",
    "**A coordinated turn** maintains balance between lift, weight, and centrifugal force.\n" +
    "**No slipping or skidding** — the aircraft turns smoothly while maintaining altitude."
);

dataDisplayReset();
await repositionWithAutopilot(initialAltitude_ft, initialSpeed_knots, initialHeading_deg);

simControls.api_set_autopilot(true);  // Enable autopilot again
simControls.api_set_autopilot_altitude_hold(true); // Set altitude hold
simControls.api_set_autopilot_ias_speed_hold(true); // Set speed hold
simControls.api_set_autopilot_heading_hold(true); // Set heading hold

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
const initialAltitude = simData.api_altitude;
const initialHeading = simData.api_heading_deg;
const initialPitch_deg = simData.api_pitch_deg;
let altitudeWithinLimits = false;


await waitFor(6000);
simControls.api_set_autopilot(false);
simControls.api_set_autopilot_altitude_hold(false);
simControls.api_set_autopilot_ias_speed_hold(false);
simControls.api_set_autopilot_heading_hold(false);
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
        const currentAltitude = simData.api_altitude;
        const currentHeading = simData.api_heading_deg;
        metrics.push( { timestamp: Date.now(),
        heading: simData.api_heading_deg,
        altitude: simData.api_altitude,
        speed: simData.api_ias_speed_knots,
        verticalSpeed: simData.api_vertical_speed,
        turnRate: simData.api_heading_dot_deg,
        bank: simData.api_bank_deg,
        pitch: simData.api_pitch_deg,
        elevator: simData.api_elevator_position,
        aileron: simData.api_aileron_position
        })
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
    400,        // poll every 400ms
    challengeTimeLimit_ms,  // timeout after 2 minutes
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


// // 📘 Step 8: Declare End of Challenge
// notifyUser(
//   "🛑 **Challenge Ended**",
//   "You can run this challenge again anytime."
// );

// await waitFor(1000); // Give the user a moment to read the message

// 📘 Step 9: Re-engage Autopilot to Stabilize Aircraft
simControls.api_set_autopilot(true);  // Enable autopilot again
simControls.api_set_autopilot_altitude_hold(true); // Set altitude hold
simControls.api_set_autopilot_ias_speed_hold(true); // Set speed hold
simControls.api_set_autopilot_bank_hold(true); // Set bank hold
