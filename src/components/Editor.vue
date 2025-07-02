<template>
  <div class="flex h-full w-full">
  <!-- Sidebar -->
  <div
    class="transition-all duration-50 border-r border-slate-700 flex flex-col"
    :class="isEditing === false ? 'w-3/5' : 'w-1/5'"
    @click="isEditing = false"
  >
    <!-- Header -->
    <div class="px-4 mb-1 border-b border-slate-700 text-xs font-semibold">
      {{ ModuleTitle || "Select a Module" }}
    </div>

    <!-- File Tree -->
    <div class="flex-1 overflow-y-auto p-2">
      <ul>
        <li v-for="(folder, folderName) in fileTree" :key="folderName">
          <div
            @click.stop="toggleFolder(folderName); isEditing = false"
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
              @click.stop="loadFileContent(file); isEditing = false"
            >
              📄 {{ file.name }}
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>

  <!-- Editor -->
  <div
    class="flex flex-col min-w-0 transition-all duration-300"
    :class="isEditing === true ? 'w-4/5' : 'w-2/5'"
  >
    <!-- Monaco Editor -->
    <div class="flex-1 overflow-auto">
      <MonacoEditor
        theme="vs-dark"
        :options="options"
        language="typescript"
        v-model:value="code"
        @editorDidMount="setupMonaco"
        @click="isEditing = true"
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
import { ExtendedMainModule, SimulationProperties} from "../siminterfac.ts";
import simDataTypesRaw from "../../public/flightsimulator_exec_meta.ts?raw";
import simApiTypes from "../../public/flightsimulator_exec.d.ts?raw";

import {resetTimeouts} from "../../public/LearningModules/core.ts"
// core.ts converted to js
import coreSimJs from 'virtual:transpiled-core-js';
// core.ts types converted to d.ts
import coreSimTsTypesRaw from 'virtual:transpiled-core-dts';

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
let isEditing = ref(false);
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
    type: Object as PropType<ExtendedMainModule>,
    required: true,
  },
  simProps: {
    type: Object as PropType<Record<string, SimulationProperties>>,
    required: true,
  },
  utilityFuncs: {
    type: Object as PropType<{
      notifyUser: (title: string, body: string, timeOut: number) => void;
      plotView: (item: SimulationProperties, state: boolean) => void;
      dataView: (item: SimulationProperties, state: boolean) => void;
      dataDisplayReset: () => void;
      checkPoint: (content: string) => void;
    }>,
    required: true,
  }
});

// Remove import and declare statements and replace export with a empty string
  function stripImportsExports(input: string): string {
    return input
      .replace(/^\s*export\s+/gm, "")
      .replace(/^\s*import\s.*?;?\s*$\n/gm, "");
  }

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
      "// Error while parsing EmbindModule api types. Autocompletion will not be available",
    );
  } else {
    EmbindModuleStr = regexMatch[0];
  }

  // This regex matches everything between the markers
const extractRegex = /\/\/\s*@editor-extract-start([\s\S]*?)\/\/\s*@editor-extract-end/g;
const matches = [...simDataTypesRaw.matchAll(extractRegex)].map(m => m[1].trim());
const SimPropsStr = matches.join('\n\n').replaceAll("export", "");

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  allowNonTsExtensions: true,
  // moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  noEmit: true,
  strict: true,
  //typeRoots: ['node_modules/@types'],
});
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `${EmbindModuleStr}
    ${SimPropsStr}
    ${stripImportsExports(coreSimTsTypesRaw)}
    `,
  );
};

const executionResult = ref<string | null>(null);
const code = ref(``);

const reset = () => {
  executionResult.value = null;
  resetTimeouts()
  isScriptRunning.value = false;
  emit("reset");
};

defineExpose({ reset });

// Function to execute code in the context of the provided object
const executeCode = async () => {
  reset();
  let coreCode = coreSimJs;
  coreCode = stripImportsExports(coreCode);
  code.value = stripImportsExports(code.value);
  const metrics :any[] = [];

  executionResult.value = null;
  try {
    isScriptRunning.value = true;
    emit("start", code.value);
    // Create a function with context binding
    const userScriptFunc = new Function(`
const simControls = arguments[0];
const simData = simControls.simData;
const simProps = arguments[1];
const dataView = arguments[2];
const plotView = arguments[3];
const dataDisplayReset = arguments[4];
const notifyUser = arguments[5]
const checkPoint = arguments[6]
const metrics = arguments[7];
${coreCode}
resetTimeouts();
return async function () {${code.value}
};`);

const startStime = new Date()
    userScriptFunc(props.contextObject, props.simProps, props.utilityFuncs.dataView,
    props.utilityFuncs.plotView, props.utilityFuncs.dataDisplayReset, props.utilityFuncs.notifyUser, props.utilityFuncs.checkPoint, metrics)()
      .then(() => {
        emit("reset");
      })
      .catch((error: any) => {
        console.log(`Script error: ${error}`);
        executionResult.value = error;
        emit("error", error);
      })
      .finally(() => {
        const endTime = new Date()
        isScriptRunning.value = false;
           submitSession({ scenario: ModuleTitle.value,
            start_time: startStime,
            end_time: endTime,
            raw_metrics: metrics})
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

import { useTrainingSessions } from '../Pocketbase/useTrainingSessions.ts'
const { submitSession } = useTrainingSessions()

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
    code.value = stripImportsExports(text);

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

    // // if demo mode
    // // wait for 5 seconds then run the code
    // setTimeout(() => {
    //   executeCode();
    // }, 5000);
  }
});
</script>

<style></style>
