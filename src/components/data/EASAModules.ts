export type ModuleEntry = {
  /** Stable identity: do not change when renaming or moving a lesson. */
  id: string
  legacyId?: string
  name: string
  path: string
  description?: string
  /** Present only for private account lessons stored in PocketBase. */
  recordId?: string
  category?: string
}

export type ModuleTree = Record<string, ModuleEntry[]>

export const moduleTree: ModuleTree = {
  Demo: [
    {
      name: 'Intro',
      id: 'lesson-demo',
      legacyId: '/LearningModules/demo.ts',
      path: '/LearningModules/demo.ts',
    },
    {
      name: 'Landing',
      id: 'lesson-landing',
      legacyId: '/LearningModules/landing.ts',
      path: '/LearningModules/landing.ts',
    },
    {
      name: 'Instruments scanning',
      id: 'lesson-instruments-scanning',
      legacyId: '/LearningModules/instruments_scanning.ts',
      path: '/LearningModules/instruments_scanning.ts',
    },
    {
      name: 'Yaw Damper',
      id: 'lesson-yaw-damper',
      legacyId: '/LearningModules/yaw_damper.ts',
      path: '/LearningModules/yaw_damper.ts',
    },
    {
      name: 'Three doublets',
      id: 'lesson-three-doublets',
      legacyId: '/LearningModules/three_doublets.ts',
      path: '/LearningModules/three_doublets.ts',
    },
    {
      name: 'MCAS loop',
      id: 'lesson-mcas-loop',
      legacyId: '/LearningModules/mcas_loop.ts',
      path: '/LearningModules/mcas_loop.ts',
    },
    {
      name: 'Stall',
      id: 'lesson-stall',
      legacyId: '/LearningModules/stall.ts',
      path: '/LearningModules/stall.ts',
      description:
        'Observe how Flaps 10 affects critical AoA, lift coefficient and flow separation.',
    },
    {
      name: 'Basic Flight Knowledge Test',
      id: 'lesson-basic-flight-knowledge-test',
      legacyId: '/LearningModules/basic_flight_knowledge_test.ts',
      path: '/LearningModules/basic_flight_knowledge_test.ts',
      description: 'Asssessment demo, based on MCQs',
    },
  ],
  'Ground Training Seriese': [
    {
      name: 'Lift and Angle of Attack',
      id: 'lesson-easa-lift-and-angle-of-attack',
      legacyId: '/LearningModules/easa_lift_and_angle_of_attack.ts',
      path: '/LearningModules/easa_lift_and_angle_of_attack.ts',
      description:
        'Observe how angle of attack and lift coefficient respond to reduced airspeed in level flight.',
    },
    {
      name: 'Airspeed, Lift and Altitude',
      id: 'lesson-easa-airspeed-lift-and-altitude',
      legacyId: '/LearningModules/easa_airspeed_lift_and_altitude.ts',
      path: '/LearningModules/easa_airspeed_lift_and_altitude.ts',
      description: 'Compare density, indicated airspeed, true airspeed and lift at two altitudes.',
    },
    {
      name: 'Drag and Lift-to-Drag Ratio',
      id: 'lesson-easa-drag-and-lift-to-drag-ratio',
      legacyId: '/LearningModules/easa_drag_and_lift_to_drag_ratio.ts',
      path: '/LearningModules/easa_drag_and_lift_to_drag_ratio.ts',
      description: 'Compare total drag and measured lift-to-drag ratio across three airspeeds.',
    },
    {
      name: 'Four Forces and Turning Flight',
      id: 'lesson-easa-four-forces-and-turning-flight',
      legacyId: '/LearningModules/easa_four_forces_and_turning_flight.ts',
      path: '/LearningModules/easa_four_forces_and_turning_flight.ts',
      description:
        'Compare force equilibrium in straight flight with lift and load factor in banked turns.',
    },
    {
      name: 'Flaps and Lift Augmentation',
      id: 'lesson-easa-flaps-and-lift-augmentation',
      legacyId: '/LearningModules/easa_flaps_and_lift_augmentation.ts',
      path: '/LearningModules/easa_flaps_and_lift_augmentation.ts',
      description: 'Compare lift, drag, AoA and trim across the C172 flap settings.',
    },
    {
      name: 'Stability and Control Response',
      id: 'lesson-easa-stability-and-control-response',
      legacyId: '/LearningModules/easa_stability_and_control_response.ts',
      path: '/LearningModules/easa_stability_and_control_response.ts',
      description: 'Observe longitudinal and lateral response to short control inputs.',
    },
    {
      name: 'Trimming the C172',
      id: 'lesson-easa-trimming-the-c172',
      legacyId: '/LearningModules/easa_trimming_the_c172.ts',
      path: '/LearningModules/easa_trimming_the_c172.ts',
      description: 'Compare trimmed flight conditions and distinguish trim from altitude hold.',
    },
    {
      name: 'Stall Recognition and Recovery',
      id: 'lesson-easa-stall-recognition-and-recovery',
      legacyId: '/LearningModules/easa_stall_recognition_and_recovery.ts',
      path: '/LearningModules/easa_stall_recognition_and_recovery.ts',
      description: 'Recognize a developing C172 stall and observe an aerodynamic recovery.',
    },
    {
      name: 'Take-off Performance',
      id: 'lesson-easa-takeoff-performance',
      legacyId: '/LearningModules/easa_takeoff_performance.ts',
      path: '/LearningModules/easa_takeoff_performance.ts',
      description:
        'Measure C172 acceleration time and ground distance as take-off conditions change.',
    },
    {
      name: 'Climb Performance',
      id: 'lesson-easa-climb-performance',
      legacyId: '/LearningModules/easa_climb_performance.ts',
      path: '/LearningModules/easa_climb_performance.ts',
      description:
        'Compare climb angle and rate across airspeeds, mass, flap and density conditions.',
    },
  ],

  'The Four Forces of Flight': [
    {
      name: 'Level Flight Forces',
      id: 'lesson-level-flight',
      legacyId: '/LearningModules/level_flight.ts',
      path: '/LearningModules/level_flight.ts',
    },
    {
      name: 'Increase and Reduce Thrust',
      id: 'lesson-thrust-change',
      legacyId: '/LearningModules/thrust_change.ts',
      path: '/LearningModules/thrust_change.ts',
    },
    {
      name: 'Change Aircraft Weight',
      id: 'lesson-weight-change',
      legacyId: '/LearningModules/weight_change.ts',
      path: '/LearningModules/weight_change.ts',
    },
  ],
  'Bernoulli’s Principle and Airflow Over the Wing': [
    {
      name: 'Monitor Lift Generation in Flight',
      id: 'lesson-lift-generation',
      legacyId: '/LearningModules/lift_generation.ts',
      path: '/LearningModules/lift_generation.ts',
    },
    {
      name: 'Increase Airspeed and Observe Lift Changes',
      id: 'lesson-lift-vs-speed',
      legacyId: '/LearningModules/lift_vs_speed.ts',
      path: '/LearningModules/lift_vs_speed.ts',
    },
    {
      name: 'Effect of Altitude on Lift',
      id: 'lesson-lift-vs-altitude',
      legacyId: '/LearningModules/lift_vs_altitude.ts',
      path: '/LearningModules/lift_vs_altitude.ts',
    },
  ],
  'Stability modes': [
    {
      name: 'Phugoid Mode',
      id: 'lesson-phugoid',
      legacyId: '/LearningModules/phugoid.ts',
      path: '/LearningModules/phugoid.ts',
    },
    {
      name: 'Dutch Roll',
      id: 'lesson-dutch-roll',
      legacyId: '/LearningModules/dutch_roll.ts',
      path: '/LearningModules/dutch_roll.ts',
    },
  ],
  'Relationship Between Pressure, Velocity, and Airflow': [
    //     { name: "The Relationship Between Velocity and Pressure", content: "" },
    {
      name: 'Changes in Airspeed and Lift at Different Flap Settings',
      id: 'lesson-speed-lift-vs-flap',
      legacyId: '/LearningModules/speed_lift_vs_flap.ts',
      path: '/LearningModules/speed_lift_vs_flap.ts',
    },
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
  'Flight Exercise': [
    {
      name: 'Coordinated Turne Challenge',
      id: 'lesson-coordinated-turn-challenge',
      legacyId: '/LearningModules/coordinated_turn_challenge.ts',
      path: '/LearningModules/coordinated_turn_challenge.ts',
    },
  ],
  'Stick inputs': [
    {
      name: 'Elevator Step Input',
      id: 'lesson-elevator-step-input',
      legacyId: '/LearningModules/elevator_step_input.ts',
      path: '/LearningModules/elevator_step_input.ts',
    },
    {
      name: 'Rudder Step Input',
      id: 'lesson-rudder-step-input',
      legacyId: '/LearningModules/rudder_step_input.ts',
      path: '/LearningModules/rudder_step_input.ts',
    },
  ],
}
