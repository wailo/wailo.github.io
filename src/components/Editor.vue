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
    <div class="flex">
      <ButtonSwitch
        buttonLabel="Execute Code"
        class="border border-simElementBorder w-1/5"
        @click="executeCode"
      >
      </ButtonSwitch>
      <ButtonSwitch
        buttonLabel="Stop"
        class="border border-simElementBorder w-1/5"
        @click="stop"
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

declare module "monaco-editor-vue3";
import MonacoEditor from "monaco-editor-vue3";
import * as monaco from "monaco-editor";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

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
const setupMonaco = (editor: monaco.editor.IStandaloneCodeEditor) => {
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
    const simControls : EmbindModule = {};
    const simData : SimData = {}`,
  );
};

const executionResult = ref<string | null>(null);
const code = ref(`// Use sim object to control the simulation
// [simControls] contains all functions to change the state of the simulator
// [simData] contains all variables to read the state of the simulator

simControls.api_set_autopilot(!simData.api_autopilot);`);

// Function to execute code in the context of the provided object
const executeCode = () => {
  try {
    // Create a function with context binding
    const func = new Function(`
      const simControls = arguments[0];
      const code = arguments[1];
      const simData = arguments[2];
      eval(code)
      // with (sim a) {
       // return eval(code);
      // }
    `);

    // Execute the code with context
    const result = func(props.contextObject, code.value, props.dataObject);
    executionResult.value = result;
  } catch (error) {
    executionResult.value = `Error: ${error.message}`;
  }
};
</script>

<style></style>
