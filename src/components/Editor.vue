<template>
  <div class="flex h-full w-full text-white">
    <!-- Sidebar -->
    <div class="w-2/5 border-r border-slate-700 flex flex-col">
      <!-- Header -->
      <div class="px-4 mb-1 border-b border-slate-700 text-xs font-semibold">
        {{ ModuleTitle || "Select a Module" }}
      </div>

      <!-- File Tree -->
      <div class="flex-1 overflow-y-auto p-2">
        <ul>
          <li v-for="(folder, folderName) in fileTree" :key="folderName">
            <div
              @click="toggleFolder(folderName)"
              class="cursor-pointer font-semibold text-secondary hover:text-white mt-1"
            >
              📁 {{ folderName }}
            </div>
            <ul v-show="openFolders[folderName]" class="ml-4">
              <li
                v-for="file in folder"
                :key="file.name"
                class="cursor-pointer rounded hover:bg-slate-700"
                :class="{
                  'text-blue-400': ModuleTitle !== file.name,
                  'text-green-400 bg-slate-700': ModuleTitle === file.name,
                }"
                @click="loadFileContent(file)"
              >
                📄 {{ file.name }}
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>

    <!-- Editor + Controls -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Monaco Editor -->
      <div class="flex-1">
        <MonacoEditor
          theme="vs-dark"
          :options="options"
          language="typescript"
          v-model:value="code"
          @editorDidMount="setupMonaco"
        />
      </div>

      <!-- Controls -->
      <div
        class="flex items-center gap-1 px-1 py-1 border-t border-slate-700 bg-[#1e1e2f]"
      >
        <button
          class="px-4 border border-green-500 text-green-400 hover:bg-green-500/10 transition"
          @click="executeCode"
        >
          ▶ Run
        </button>
        <button
          class="px-4 border border-red-500 text-red-400 hover:bg-red-500/10 transition"
          @click="reset"
        >
          ■ Stop
        </button>
        <span v-if="executionResult" class="ml-auto truncate text-slate-300">
          <span class="opacity-60">Result:</span> {{ executionResult }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, onMounted } from "vue";
import { MainModule } from "../../public/flightsimulator_exec";
import { SimData, SimulationDataDisplay } from "../siminterfac.ts";
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
const ModuleTitle = ref("");
const selectedFile = ref<string | null>(null);
// let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null;

// Define the event emitter
const emit = defineEmits<{
  (event: "start", code: string): void;
  (event: "reset"): void;
  (event: "error", error: any): void;
}>();

export type ScriptStatus = "IN-PROGRESS" | "IDLE" | "ERROR";

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
  displayData: {
    type: Object as PropType<SimulationDataDisplay>,
    required: true,
  }
});

const options = {
  automaticLayout: true,
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
  scrollbar: {
    verticalScrollbarSize: 7,
    horizontalScrollbarSize: 7,
  },
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
    declare const waitForCondition: (conditionFunction: (...args: any[], number) => boolean) => Promise<unknown>;
    declare const waitFor: (ms: number) => Promise<unknown>;
    `,
  );
};

const executionResult = ref<string | null>(null);
const code = ref(``);

const reset = () => {
  executionResult.value = null;
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
const executeCode = async () => {
  reset();
  const res = await fetch("/LearningModules/core.ts?raw");
  const coreCode = await res.text();

  executionResult.value = null;
  window.flag = true;
  window.cache = [];
  try {
    isScriptRunning.value = true;
    emit("start", code.value);
    // Create a function with context binding
    const userScriptFunc = new Function(`
const simControls = arguments[0];
const simData = arguments[1];
const displayData = arguments[2];
${coreCode}
resetTimeouts();
return async function () {${code.value}};
    `);

    userScriptFunc(props.contextObject, props.dataObject, props.displayData)()
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

import {
  moduleTree as importedNModuleTree,
  type ModuleEntry,
} from "./data/EASAModules";

// Reactive copy of the fileTree
const fileTree = ref(importedNModuleTree);

const openFolders = ref<Record<string, boolean>>(
  Object.fromEntries(Object.keys(fileTree.value).map((key) => [key, true])),
);
const toggleFolder = (folderName: string) => {
  openFolders.value[folderName] = !openFolders.value[folderName];
};

const loadFileContent = async (file: ModuleEntry) => {
  try {
    selectedFile.value = file.name;
    ModuleTitle.value = file.name;
    const response = await fetch(file.path);
    const text = await response.text();
    code.value = text;
  } catch (error) {
    console.error(error);
    code.value = `// Failed to load ${file.name}`;
    ModuleTitle.value = `Error loading ${file.name}`;
  }
};

onMounted(() => {
  // Load the first file in the first folder by default
  const firstFolder = Object.keys(fileTree.value)[0];
  const firstFile = fileTree.value[firstFolder][0];
  if (firstFile) {
    loadFileContent(firstFile);

    // if demo mode
    // wait for 5 seconds then run the code
    setTimeout(() => {
      executeCode();
    }, 5000);
  }
});
</script>

<style></style>
