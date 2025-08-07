<template>
  <div class="flex h-full w-full">
  <!-- Sidebar -->
  <div
    class="transition-all duration-50 border-r border-slate-700 flex flex-col"
    :class="isEditing === false ? 'w-full' : 'w-1/5'"
    @click="isEditing = false"
  >
    <!-- Header -->
    <div class="px-4 mb-1 border-b border-slate-700 text-xs font-semibold">
      {{ ModuleTitle || "Select a Module" }}
    </div>

    <!-- File Tree -->
    <div class="flex-1 overflow-y-auto p-2">
      <button @click.stop="() => {
        isEditing = true;
        code = `// You can write a code, or ask AI to write a code for you\n// example: Reposition to FL150, speed 230 knots, heading 90 degrees\n`}"
        class="px-1 rounded text-secondary hover:bg-slate-600 border border-simElementBorder">
        New</button>
      <hr class="my-2 border-slate-700" />
      <ul>
        <li v-for="(folder, folderName) in fileTree" :key="folderName">
          <div
            @click.stop="toggleFolder(folderName); isEditing = false"
            class="cursor-pointer font-semibold text-secondary hover:text-white mt-1"
          >
            - {{ folderName }}
          </div>
          <ul v-show="openFolders[folderName]" class="ml-4">
<li
  v-for="file in folder"
  @click="selectedFile = file.name"
  :key="file.name"
  class="flex justify-between items-start rounded hover:bg-slate-700"
  :class="[
  'transition-colors duration-200',
  selectedFile === file.name ? 'bg-simInputBackground' : 'text-secondary',
  selectedFile === file.name && isScriptRunning ? 'animate-pulse' : '',
]"
>
  <div class="flex-1 cursor-default">
    + {{ file.name }}
  </div>

  <!-- Horizontal Button Row -->
   <div class="flex flex-row gap-1 whitespace-nowrap items-center">
    <button
  class="px-1 rounded text-secondary hover:bg-slate-600 border border-simElementBorder"
  title="Edit"
  @click.stop="async () => {
    await loadFileContent(file);
    isEditing = true;
  }"
>
  Edit
</button>
    <button
  class="px-1 rounded text-secondary hover:bg-slate-600 border border-simElementBorder"
  :title="isScriptRunning ? 'Stop' : 'Run'"
  @click.stop="async () => {
    await loadFileContent(file);
    isScriptRunning ? reset() : executeCode();
  }"
>
  {{ isScriptRunning && selectedFile === file.name ? 'Stop' : 'Play' }}
</button>

<button
  class="px-1 rounded text-secondary hover:bg-slate-600 border border-simElementBorder"
  title="Broadcast"
  @click.stop="async() => {
    await loadFileContent(file);
    broadacast(selectedFile, code)
  }"
>
  Broadcast
</button>

  </div>
</li>
          </ul>
        </li>
      </ul>
    </div>
  </div>

  <!-- Editor -->
  <div
  v-if="isEditing"
class="flex flex-col min-w-0 transition-all duration-300 w-4/5"
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
        class="px-4 border transition"
        :class="[isScriptRunning ? 'border-red-500 text-red-400 hover:bg-red-500/10' : 'border-green-500 text-green-400 hover:bg-green-500/10']"
        @click="isScriptRunning === true? reset(): executeCode()"
      >
        {{isScriptRunning? `■ Stop`:`▶ Run`}}
      </button>
      <button
        class="px-4 border  transition"
        @click="() => broadacast(selectedFile, code)"
      >
        ◉ Broadcast
      </button>
        <button
         class="px-4 border transition"
        :class="[isLLMPending ? 'border-amber-500 text-amber-400 hover:bg-red-500/10' : 'border-secondary text-secondary']"
  title="AI"
  @click.stop="async() => {
    sendToLLM(code)
  }"
>
  Ask AI
</button>
            <button
        class="px-4 border  transition"
        @click="isEditing = false"
      >
        x Close
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
import simApiTypesRaw from "../../public/flightsimulator_exec.d.ts?raw";

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
const isLLMPending = ref(false);
const ModuleTitle = ref("");
const selectedFile = ref<string>("");
let isEditing = ref(false);
// let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null;

// Define the event emitter
const emit = defineEmits<{
  (event: "start", code: string): void;
  (event: "reset"): void;
  (event: "error", error: any): void;
  (event: "broadcastScript", title: string, content:string): void;
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
      .replace(/^\s*import[\s\S]*?['"].*?['"];?/gm, "").trim();
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
  let regexMatch = simApiTypesRaw.match(/interface EmbindModule\s*\{([^}]*)\}/g);
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

const broadacast = async (title:string, content: string) => {
  props.utilityFuncs.notifyUser('Broadcast', `Broadcasting ${title}`, 2000);
  emit('broadcastScript',title, content);
}

const executeExternalCode = (title:string, content: string) => {
  props.utilityFuncs.notifyUser(`Running a script from instrutor`, title, 2000)
  code.value = content;
  executeCode();
}

defineExpose({ reset, executeExternalCode });

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
            raw_metrics: metrics}).catch(err => {
              emit("error", err); });
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

const sendToLLM = async (content: string) => {
  executionResult.value = "Pending AI response...";
  isLLMPending.value = true;

  const llm_api_host = import.meta.env.DEV
    ? "http://localhost:11434/api/chat"
    : "https://raspberrypi.tail89a8a0.ts.net/llm/api/chat";

  // Set up timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

  let response;
  try {
    response = await fetch(llm_api_host, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "instructor-lesson-planner:latest",
        messages: [
          {
            role: "user",
            content: `English only, respond to the following prompt: "${content}"`,
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    isLLMPending.value = false;
  if (err instanceof DOMException && err.name === "AbortError") {
    executionResult.value = "AI request timed out after 5 minutes.";
  } else if (err instanceof Error) {
    executionResult.value = `AI request failed: ${err.message}`;
  } else {
    executionResult.value = "AI request failed with an unknown error.";
  }
    return;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    executionResult.value = `AI request failed: ${response.statusText}`;
    isLLMPending.value = false;
    return;
  }

  if (!response.body) {
    executionResult.value = "No response body from AI request";
    isLLMPending.value = false;
    return;
  }

  // Read and decode stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  // Try to parse final JSON
  try {
    const jsonResponse = JSON.parse(result);
    if (jsonResponse?.message?.content) {
      result = jsonResponse.message.content;
    } else {
      throw new Error("Invalid AI response format");
    }
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    executionResult.value = "Failed to parse AI response: " + error;
    isLLMPending.value = false;
    return;
  }

  isLLMPending.value = false;
  executionResult.value = "Done";
  code.value = `/*\n${code.value}*/\n\n` + result.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
