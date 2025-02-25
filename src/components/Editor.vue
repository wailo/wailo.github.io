<template>
  <!-- Editor component -->
  <div class="flex flex-col h-full w-full">
    <div class="w-full flex-grow">
      <MonacoEditor
        theme="vs-dark"
        :options="options"
        automaticLayout="true"
        language="typescript"
        v-model:value="code"
        @editorDidMount="setupMonaco"
      ></MonacoEditor>
    </div>
    <div class="flex gap-1">
      <ButtonSwitch
        buttonLabel="Execute Code"
        class="border border-simElementBorder w-1/5"
        @click="executeCode"
      >
      </ButtonSwitch>
      <ButtonSwitch
        buttonLabel="Stop"
        class="border border-simElementBorder w-1/5"
        @click="() => reset()"
      ></ButtonSwitch>
      <span class="w-3/5">
        <span>Execution Result: </span>
        <span>{{ executionResult }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType } from "vue";
import ButtonSwitch from "./ButtonSwitch.vue";
import { MainModule } from "../../public/flightsimulator_exec";
import { SimData } from "../siminterfac.ts";
import simApiTypes from "../../public/flightsimulator_exec.d.ts?raw";
import simDataTypes from "../siminterfac.ts?raw";

// Monaco Editor
declare module "monaco-editor-vue3";
import MonacoEditor from "monaco-editor-vue3";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

const isScriptRunning = ref(false);

// Define the event emitter
const emit = defineEmits<{
  (event: "start", code: string): void;
  (event: "reset"): void;
  (event: "error", error: any): void;
}>();

export type ScriptStatus = "RUNNING" | "IDLE" | "ERROR";

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

const props = defineProps({
  contextObject: {
    type: Object as PropType<MainModule>,
    required: true,
  },
  dataObject: {
    type: Object as PropType<SimData>,
    required: true,
  },
});

const options = {
  colorDecorators: true,
  tabSize: 2,
  minimap: {
    enabled: false,
  },
  scrollBeyondLastLine: false,
  lineNumbers: "off",
  glyphMargin: false,
  folding: false,
  // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 0,
};

// Define the Monaco Editor configuration
const setupMonaco = (_editor: monaco.editor.IStandaloneCodeEditor) => {
  // Capture the simulator interface for intellisense

  // Get functions interface
  let regexMatch = simApiTypes.match(/interface EmbindModule\s*\{([^}]*)\}/g);
  let EmbindModuleStr;
  if (!regexMatch) {
    console.log(
      "// Error while parsing the api types. Autocompletion will not be available",
    );
  } else {
    EmbindModuleStr = regexMatch[0];
  }

  // Get data interface
  regexMatch = simDataTypes.match(/class SimData\s*\{([^}]*)\}/g);
  let SimDataStr;
  if (!regexMatch) {
    console.log(
      "// Error while parsing the api types. Autocompletion will not be available",
    );
  } else {
    SimDataStr = regexMatch[0].replace("class", "interface");
  }

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `${EmbindModuleStr}; ${SimDataStr}
    // Declare types here for autocompletion
    const simControls : EmbindModule = {};
    const simData : SimData = {}
    declare const waitForCondition: (conditionFunction: (...args: any[]) => boolean) => Promise<unknown>;
    declare const waitFor: (ms: number) => Promise<unknown>;
    `,
  );
};

const executionResult = ref<string | null>(null);
const code = ref(`// Use sim object to control the simulation
// [simControls] contains all functions to change the state of the simulator
// [simData] contains all variables to read the state of the simulator

// Reset the simulation
simControls.api_set_simulation_reset()

// Wait for 1000 ms (1 second)
await waitFor(1000);

simControls.api_set_engine_throttle_value(1);
// Toggle the autopilot master switch state.
simControls.api_set_autopilot(true);
simControls.api_set_target_speed(300)
simControls.api_set_target_altitude(35000)
simControls.api_set_target_vertical_speed(3000)

// Wait for autopilot bank hold to be engaged
await waitForCondition(() => { return simData.api_ias_speed_knots > 180 })

// Toggle vertical speed hold
simControls.api_set_vertical_speed_hold(true)

// Toggle speed hold
simControls.api_set_speed_hold(true);

// Wait until target altitude is reached
await waitForCondition(() => { return simData.api_altitude > 33500 })

// Switch to target altitude
simControls.api_set_vertical_speed_hold(false)
// Wait for 1000 ms (1 second)
await waitFor(1000);
simControls.api_set_altitude_hold(true);

`);

const reset = () => {
  window.flag = false;
  if (!window.cache) {
    return;
  }
  window.cache.forEach((n) => clearTimeout(n));
  window.cache.length = 0;
  isScriptRunning.value = false;
  emit("reset");
};

defineExpose({ reset });

// Function to execute code in the context of the provided object
const executeCode = () => {
  window.flag = true;
  window.cache = [];
  try {
    isScriptRunning.value = true;
    emit("start", code.value);
    // Create a function with context binding
    const userScriptFunc = new Function(`
const simControls = arguments[0];
const simData = arguments[1];

const waitForCondition = (conditionFunction) => {
    const poll = (resolve) => {
        if (conditionFunction() === true) {
            resolve()
        }
        else {

            if (window.flag) {
                setTimeout((_) => poll(resolve), 400)
            }
        }
    }
    return new Promise(poll)
}

// Wait for a given time in ms without interrupting the simulation
const waitFor = (ms) => {
    const poll = (resolve) => {
        setTimeout((_) => resolve(), ms)
    }
    return new Promise(poll)
}

const _set = window.setTimeout; // save original reference
const _clear = window.clearTimeout; // save original reference

// Wrap original setTimeout with a function
const setTimeout = function (callback, duration, arg) {
    // also, wrap the callback, so the cache reference will be removed
    // when the timeout has reached (fired the callback)
    const id = _set(
        function () {
            callback.apply(null, arguments);
            removeCacheItem(id);
        },
        duration || 0,
        arg,
    );

    // store reference in the cache array
    window.cache.push(id);

    // id reference must be returned to be able to clear it
    return id;
};

// Wrap original clearTimeout with a function
const clearTimeout = (id) => {
    _clear(id);
    removeCacheItem(id);
};

// Add a custom function named "clearTimeouts" to the "window" object
const resetTimeouts = () => {
    window.cache.forEach((n) => _clear(n));
    // Clear the cache array
    window.cache.length = 0;
};

// removes a specific id from the cache array
const removeCacheItem = (id) => {
    const idx = cache.indexOf(id);
    if (idx > -1) {
        window.cache = window.cache.filter((n) => n != id);
    }
}

resetTimeouts();
return async function () {${code.value} };
    `);

    userScriptFunc(props.contextObject, props.dataObject)()
      .then(() => {
        emit("reset");
      })
      .catch((error: any) => {
        console.log(`Script error: ${error}`);
        executionResult.value = error;
        emit("error", error);
      })
      .finally(() => {
        isScriptRunning.value = false;
      });
  } catch (error: any) {
    console.log(error);
    executionResult.value = `Error: ${error.message}`;
  }
};
</script>

<style></style>
