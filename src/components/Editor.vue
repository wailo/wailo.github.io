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
import { ref, onMounted, PropType } from "vue";
import ButtonSwitch from "./ButtonSwitch.vue";
import { MainModule } from "../../public/flightsimulator_exec";
import simApiTypes from "../../public/flightsimulator_exec.d.ts?raw";

declare module "monaco-editor-vue3";
import MonacoEditor from "monaco-editor-vue3";
import * as monaco from "monaco-editor";

// Context (scope) for script execution.
let editorContext: Object = {};

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
  contextObject: Object as PropType<MainModule>,
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
  // capture the simulator interface for intellisense
  const regexMatch = simApiTypes.match(/interface EmbindModule\s*\{([^}]*)\}/g);
  let EmbindModuleStr;
  if (!regexMatch) {
    console.log(
      "// Error while parsing the api types. Autocompletion will not be available",
    );
  } else {
    EmbindModuleStr = regexMatch[0];
  }

  // Exctract api functions and copy them to the object that will be used as context for the editor.
  for (const key of Object.keys(props.contextObject)) {
    if (
      key.startsWith("api") &&
      typeof props.contextObject[key as keyof typeof props.contextObject] ===
        "function"
    ) {
      // Copy function to target object with a modified name
      const targetKey = key;
      (editorContext as any)[targetKey] = (props.contextObject as any)[key];
    }
  }

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `${EmbindModuleStr};
    const sim : EmbindModule = {}`,
  );
};

const executionResult = ref<string | null>(null);
const code = ref(`// Use sim object to control the simulation
sim.api_set_autopilot(true);`);

// Dynamically import Monaco Editor configuration
onMounted(() => {});

const stop = () => {};

// Function to execute code in the context of the provided object
const executeCode = () => {
  try {
    // Create a function with context binding
    const func = new Function(`
      const sim = arguments[0];
      const code = arguments[1];
      eval(code)
      // with (sim) {
       // return eval(code);
      // }
    `);

    // Execute the code with context
    const result = func(editorContext, code.value);
    executionResult.value = result;
  } catch (error) {
    executionResult.value = `Error: ${error.message}`;
  }
};
</script>

<style></style>
