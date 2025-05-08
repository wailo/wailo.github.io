export type ModuleEntry = {
    name: string;
    path: string;
  };

  export type ModuleTree = Record<string, ModuleEntry[]>;


  export const moduleTree: ModuleTree = {
    "Demo": [
        {name: "Intro", path: "/LearningModules/demo.ts"},
    ],
    "The Four Forces of Flight": [
        { name: "Observe Level Flight Forces", path: "/LearningModules/level_flight.ts" },
        { name: "Increase and Reduce Thrust", path: "/LearningModules/thrust_change.ts"},
        { name: "Change Aircraft Weight", path: "/LearningModules/weight_change.ts" }
    ],
    "Bernoulli’s Principle and Airflow Over the Wing": [
        { name: "Monitor Lift Generation in Flight", path: "/LearningModules/lift_generation.ts" },
        { name: "Increase Airspeed and Observe Lift Changes", path : "/LearningModules/lift_vs_speed.ts" },
        { name: "Effect of Altitude on Lift", path: "/LearningModules/lift_vs_altitude.ts" }
    ],
    "Stability modes": [
        { name: "Phugiod mode", path: "/LearningModules/phugiod_mode.ts" },
        { name: "Dutch Roll", path : "/LearningModules/dutch_roll.ts" },

    ],
    "Relationship Between Pressure, Velocity, and Airflow": [
    //     { name: "The Relationship Between Velocity and Pressure", content: "" },
        { name: "Changes in Airspeed and Lift at Different Flap Settings", path: "/LearningModules/speed_lift_vs_flap.ts" }
    ],
    // "Angle of Attack (AoA) and Its Influence on Lift and Drag": [
    //     { name: "Monitor AoA and Lift in Straight and Level Flight", content: "" },
    //     { name: "Increase AoA Until Stall", content: "" },
    //     { name: "Stall Recovery Practice", content: "" }
    // ],
    // "Practical Application – Flying an Efficient Climb and Descent": [
    //     { name: "Optimizing Climb Performance", content: "" },
    //     { name: "Simulating a High-Drag Descent", content: "" },
    //     { name: "Autopilot vs. Manual Climb/Descent", content: "" }
    // ],
    "Flight Exercise": [
        { name: "Coordinated Turne Challenge", path: "/LearningModules/coordinated_turn_challenge.ts" },
        // { name: "Final Exam (Written & Practical)", content: "" }
    ]
};
