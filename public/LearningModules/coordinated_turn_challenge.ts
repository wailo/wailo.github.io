// 📘 Configurations
const targetAltitude_ft = 5000;
const targetSpeed_knots = 210;
const targetHeading_deg = 0;
const maxAltitudeDeviation_ft = 500;
const requiredHeadingChange_deg = 180;
const challengeTimeLimit_ms = 2 * 60 * 1000; // 2 minutes

// 📘 Step 1: Reposition
simControls.notifyUser("📍 Setting Up", `Repositioning aircraft for the coordinated turn challenge to ${targetAltitude_ft} ft, ${targetSpeed_knots} knots, and ${targetHeading_deg}°...`);
await waitFor(3000);

await reposition_with_autopilot(targetAltitude_ft, targetSpeed_knots, targetHeading_deg);

simControls.api_set_autopilot(true);  // Enable autopilot again
simControls.api_set_altitude_hold(true); // Set altitude hold
simControls.api_set_speed_hold(true); // Set speed hold
simControls.api_set_heading_hold(true); // Set heading hold

// 📘 Step 2: Explain Coordinated Turn
simControls.notifyUser(
    "🎯 Coordinated Turn",
    "A coordinated turn maintains balance between lift, weight, and centrifugal force.\n" +
    "No slipping or skidding — the aircraft turns smoothly while maintaining altitude."
);
await waitFor(6000);

// 📘 Step 3: Display Relevant Data
displayData.api_altitude.visible = true;
await waitFor(300);
displayData.api_heading_deg.visible = true;
await waitFor(300);
displayData.api_aileron_position.visible = true;
await waitFor(300);
displayData.api_elevator_position.visible = true;
await waitFor(300);

// Capture starting values
const initialAltitude = simData.api_altitude;
const initialHeading = simData.api_heading_deg;
let altitudeWithinLimits = false;

// 📘 Step 4: Start Challenge and Monitor User Action
simControls.notifyUser(
    "🛫 Pilot In Command!",
    `Disengaging autopilot now. Complete the coordinated turn within ${challengeTimeLimit_ms / 1000 / 60} minutes without exceeding ${maxAltitudeDeviation_ft} ft in altitude.`
);

await waitFor(6000);
simControls.api_set_autopilot(false);
simControls.api_set_altitude_hold(false); 
simControls.api_set_speed_hold(false);
simControls.api_set_heading_hold(false);
await waitFor(1000);
// Define success condition
const success = await waitForCondition(
    () => {
        const currentAltitude = simData.api_altitude;
        const currentHeading = simData.api_heading_deg;

        // Check altitude deviation first; if false, immediately return failure
        altitudeWithinLimits = Math.abs(currentAltitude - initialAltitude) <= maxAltitudeDeviation_ft;
        if (!altitudeWithinLimits) {
            simControls.notifyUser(
                "❌ Altitude Exceeded",
                `Altitude deviation exceeded ${maxAltitudeDeviation_ft} ft. You lost control of the altitude. Try again!`
            );
            return true; // Fail condition immediately if altitude is out of limits
        }

        if (simData.api_autopilot) {
          // Fail condition if autopilot is engaged during the challenge
          simControls.notifyUser(
              "❌ Autopilot Engaged",
              "Autopilot cannot be engaged during the challenge."
          );
          simControls.api_set_autopilot(false);  // Ensure autopilot is off
        }

        // Continue with heading change check only if altitude is within limits
        const headingChangedEnough = Math.abs(currentHeading - initialHeading) >= requiredHeadingChange_deg;
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
        simControls.notifyUser(
            "❌ Challenge Failed",
            `Altitude deviation exceeded ${maxAltitudeDeviation_ft} ft. Try again!`
        );
    } else {
        simControls.notifyUser(
            "🏆 Challenge Complete!",
            `You performed a coordinated ${requiredHeadingChange_deg}° turn without major altitude loss or gain. Well done!`
        );
    }
} else {
    simControls.notifyUser(
        "❌ Challenge Failed",
        `Time ran out. Try again!`
    );
}

await waitFor(2000); // Give the user a moment to read the message


// 📘 Step 8: Declare End of Challenge
simControls.notifyUser(
  "🛑 Challenge Ended",
  "You can run this challenge again anytime."
);

await waitFor(1000); // Give the user a moment to read the message

// 📘 Step 9: Re-engage Autopilot to Stabilize Aircraft
simControls.api_set_autopilot(true);  // Enable autopilot again
simControls.api_set_altitude_hold(true); // Set altitude hold
simControls.api_set_speed_hold(true); // Set speed hold
simControls.api_set_heading_hold(true); // Set heading hold
