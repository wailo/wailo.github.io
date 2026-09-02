export type ModuleEntry = {
  name: string
  path: string
  description?: string
}

export type ModuleTree = Record<string, ModuleEntry[]>

export const moduleTree: ModuleTree = {
  Demo: [
    { name: 'Intro', path: '/LearningModules/demo.ts' },
    {
      name: 'Basic Flight Knowledge Test',
      path: '/LearningModules/basic_flight_knowledge_test.ts',
      description: 'Assess knowledge of the four forces, primary controls and basic turn geometry.',
    },
    { name: 'Landing', path: '/LearningModules/landing.ts' },
    { name: 'Instruments scanning', path: '/LearningModules/instruments_scanning.ts' },
    { name: 'Yaw Damper', path: '/LearningModules/yaw_damper.ts' },
    { name: 'Three doublets', path: '/LearningModules/three_doublets.ts' },
    { name: 'MCAS loop', path: '/LearningModules/mcas_loop.ts' },
    {
      name: 'Multi-model switching',
      path: '/LearningModules/multi_model_switching.ts',
      description: 'Reposition a B747 and then a C172 within one lesson.',
    },
    {
      name: 'Stall',
      path: '/LearningModules/stall.ts',
      description:
        'Observe how Flaps 10 affects critical AoA, lift coefficient and flow separation.',
    },
  ],
  'Ground Training Seriese': [
    {
      name: 'Lift and Angle of Attack',
      path: '/LearningModules/easa_lift_and_angle_of_attack.ts',
      description:
        'Observe how angle of attack and lift coefficient respond to reduced airspeed in level flight.',
    },
    {
      name: 'Airspeed, Lift and Altitude',
      path: '/LearningModules/easa_airspeed_lift_and_altitude.ts',
      description: 'Compare density, indicated airspeed, true airspeed and lift at two altitudes.',
    },
    {
      name: 'Drag and Lift-to-Drag Ratio',
      path: '/LearningModules/easa_drag_and_lift_to_drag_ratio.ts',
      description: 'Compare total drag and measured lift-to-drag ratio across three airspeeds.',
    },
    {
      name: 'Four Forces and Turning Flight',
      path: '/LearningModules/easa_four_forces_and_turning_flight.ts',
      description:
        'Compare force equilibrium in straight flight with lift and load factor in banked turns.',
    },
    {
      name: 'Flaps and Lift Augmentation',
      path: '/LearningModules/easa_flaps_and_lift_augmentation.ts',
      description: 'Compare lift, drag, AoA and trim across the C172 flap settings.',
    },
    {
      name: 'Stability and Control Response',
      path: '/LearningModules/easa_stability_and_control_response.ts',
      description: 'Observe longitudinal and lateral response to short control inputs.',
    },
    {
      name: 'Trimming the C172',
      path: '/LearningModules/easa_trimming_the_c172.ts',
      description: 'Compare trimmed flight conditions and distinguish trim from altitude hold.',
    },
    {
      name: 'Stall Recognition and Recovery',
      path: '/LearningModules/easa_stall_recognition_and_recovery.ts',
      description: 'Recognize a developing C172 stall and observe an aerodynamic recovery.',
    },
    {
      name: 'Take-off Performance',
      path: '/LearningModules/easa_takeoff_performance.ts',
      description:
        'Measure C172 acceleration time and ground distance as take-off conditions change.',
    },
    {
      name: 'Climb Performance',
      path: '/LearningModules/easa_climb_performance.ts',
      description:
        'Compare climb angle and rate across airspeeds, mass, flap and density conditions.',
    },
  ],

  'The Four Forces of Flight': [
    { name: 'Level Flight Forces', path: '/LearningModules/level_flight.ts' },
    { name: 'Increase and Reduce Thrust', path: '/LearningModules/thrust_change.ts' },
    { name: 'Change Aircraft Weight', path: '/LearningModules/weight_change.ts' },
  ],
  'Bernoulli’s Principle and Airflow Over the Wing': [
    { name: 'Monitor Lift Generation in Flight', path: '/LearningModules/lift_generation.ts' },
    {
      name: 'Increase Airspeed and Observe Lift Changes',
      path: '/LearningModules/lift_vs_speed.ts',
    },
    { name: 'Effect of Altitude on Lift', path: '/LearningModules/lift_vs_altitude.ts' },
  ],
  'Stability modes': [
    { name: 'Phugoid Mode', path: '/LearningModules/phugoid.ts' },
    { name: 'Dutch Roll', path: '/LearningModules/dutch_roll.ts' },
  ],
  'Relationship Between Pressure, Velocity, and Airflow': [
    //     { name: "The Relationship Between Velocity and Pressure", content: "" },
    {
      name: 'Changes in Airspeed and Lift at Different Flap Settings',
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
    { name: 'Coordinated Turne Challenge', path: '/LearningModules/coordinated_turn_challenge.ts' },
  ],
  'Stick inputs': [
    { name: 'Elevator Step Input', path: '/LearningModules/elevator_step_input.ts' },
    { name: 'Rudder Step Input', path: '/LearningModules/rudder_step_input.ts' },
  ],
}
