// ==============================
// 1. TYPES (Single Source of Truth)
// ==============================

import {
  ExtendedMainModule,
  SimulationProperties,
  repositionWithAutopilot
} from "./core";

export interface ScriptContext {
  controls: ExtendedMainModule;
  props: any;
  repositionWithAutopilot: typeof repositionWithAutopilot;
  waitFor: (ms: number) => Promise<void>;
  waitForCondition: (
    condition: () => boolean,
    confirmationMs?: number,
    pollIntervalMs?: number,
    hardTimeoutMs?: number | null,
    throwOnTimeout?: boolean,
  ) => Promise<boolean>;

  notifyUser: (title: string, body?: string, timeout?: number) => void;
  dataView: (prop: SimulationProperties, state: boolean) => void;
  plotView: (prop: SimulationProperties, state: boolean) => void;
  dataDisplayReset: () => void;

  checkPoint: (content: string) => void;
  metrics: any[];
}

// ==============================
// 2. CONTEXT FACTORY (ONLY PLACE YOU UPDATE)
// ==============================

export function createScriptContext(deps: {
  controls: ExtendedMainModule;
  props: any;
  repositionWithAutopilot: ScriptContext["repositionWithAutopilot"];

  waitFor: ScriptContext["waitFor"];
  waitForCondition: ScriptContext["waitForCondition"];

  notifyUser: ScriptContext["notifyUser"];
  dataView: ScriptContext["dataView"];
  plotView: ScriptContext["plotView"];
  dataDisplayReset: () => void;

  checkPoint: ScriptContext["checkPoint"];
  metrics: any[];
}): ScriptContext {
  return {
    controls: deps.controls,
    props: deps.props,
    repositionWithAutopilot: deps.repositionWithAutopilot,
    waitFor: deps.waitFor,
    waitForCondition: deps.waitForCondition,
    notifyUser: deps.notifyUser,
    dataView: deps.dataView,
    plotView: deps.plotView,
    dataDisplayReset: deps.dataDisplayReset,
    checkPoint: deps.checkPoint,
    metrics: deps.metrics,
  };
}

// ==============================
// 3. SCRIPT RUNNER
// ==============================

export type UserScript = (ctx: ScriptContext) => Promise<void>;

export async function runUserScript(script: UserScript, ctx: ScriptContext) {
  try {
    await script(ctx);
  } catch (err) {
    console.error("Script execution failed:", err);
    ctx.notifyUser("Script Error", String(err));
  }
}

// ==============================
// 4. OPTIONAL: FRIENDLIER API WRAPPER
// ==============================

// export class ScriptAPI {
//   constructor(private ctx: ScriptContext) {}

//   wait(ms: number) {
//     return this.ctx.waitFor(ms);
//   }

//   waitUntil(condition: () => boolean) {
//     return this.ctx.waitForCondition(condition);
//   }

//   notify(title: string, body?: string) {
//     this.ctx.notifyUser(title, body);
//   }

//   reposition(
//     flightModel: FlightModelInstance,
//     altitude: number,
//     speed: number,
//     heading: number,
//     timeout: number,
//   ) {
//     return this.ctx.repositionWithAutopilot(
//       ,
//       altitude,
//       speed,
//       heading,
//       timeout,
//     );
//   }

//   checkpoint(label: string) {
//     this.ctx.checkPoint(label);
//   }
// }

// ==============================
// 5. USER SCRIPT TEMPLATE (STATIC - NEVER UPDATE)
// ==============================

// export const exampleUserScript: UserScript = async (ctx) => {
//   // Option A: direct usage
//   await ctx.waitFor(1000);
//   ctx.notifyUser("Script started");

//   // Option B: nicer wrapper
//   const api = new ScriptAPI(ctx);

//   await api.wait(500);
//   api.notify("Using API wrapper");

//   // Example autopilot call
//   api.reposition({} as any, 10000, 250, 180, 5000);

//   api.checkpoint("Reached reposition step");
// };

// ==============================
// 6. ENGINE ENTRY (HOW YOU RUN IT)
// ==============================

// async function engineMain() {
//   // ⚠️ Replace these with real implementations
//   const deps = {
//     controls: {} as ExtendedMainModule,
//     simProps: {},

//     repositionWithAutopilot:
//       (() => {}) as ScriptContext["repositionWithAutopilot"],

//     waitFor: (ms: number) => new Promise<void>((res) => setTimeout(res, ms)),

//     waitForCondition: async () => true,

//     notifyUser: (title: string, body?: string, timeOut? : number) =>
//       console.log("NOTIFY:", title, body, timeOut),

//     dataView: () => {},
//     plotView: () => {},
//     dataDisplayReset: () => {},

//     checkPoint: (msg: string) => console.log("CHECKPOINT:", msg),
//     metrics: [],
//   };

//   const ctx = createScriptContext(deps);

//   await runUserScript(exampleUserScript, ctx);
// }

// Uncomment to test locally
// engineMain();
