<template>
  <!-- Editor component -->
  <div class="flex flex-col h-full w-full">
    <div class="w-full flex-grow">
      <MonacoEditor theme="vs-dark" :options="options" automaticLayout="true" language="typescript"
        v-model:value="code"></MonacoEditor>
    </div>
    <div>
      <button class="border border-slate-600 w-1/5" @click="executeCode">Execute Code</button>
      <button class="border border-slate-600 w-1/5" @click="stop">Stop</button>
      <span class="w-3/5">
        <span>Execution Result: </span>
        <span>{{ executionResult }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, PropType } from 'vue';
import { MainModule } from "../../public/flightsimulator_exec";

declare module 'monaco-editor-vue3';
import MonacoEditor from 'monaco-editor-vue3';
import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

const props = defineProps({
  contextObject: Object as PropType<MainModule>
});

const options = {
  colorDecorators: true,
  tabSize: 2,
  minimap: {
    enabled: false
  },
  scrollBeyondLastLine: false,
  lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 0
};

// Define the Monaco Editor configuration
const setupMonaco = () => {
  // Register a new language (e.g., TypeScript)
  monaco.languages.register({ id: 'typescript' });

  // Define TypeScript language configuration
  monaco.languages.setMonarchTokensProvider('typescript', {
    tokenizer: {
      root: [
        [/\b(?:import|export|function|class|let|const|var|if|else|for|while)\b/, 'keyword'],
        [/\b(?:true|false|null|undefined)\b/, 'constant'],
        [/\b\d+\b/, 'number'],
        [/[a-zA-Z_]\w*/, 'identifier'],
      ],
    },
  });

  // Provide autocomplete suggestions based on the context object
  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: () => {
      const completionItems: monaco.languages.CompletionItem[] = Object.keys([props.contextObject]).map(key => ({
        label: key,
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: key,
        detail: typeof props.contextObject[key] === 'function' ? 'Function' : 'Variable',
      }));

      return { suggestions: completionItems };
    },
  });
};


const executionResult = ref<string | null>(null);
const code = ref(`_api_set_altitude_hold(true);
_api_set_autopilot(true);`);

// Dynamically import Monaco Editor configuration
onMounted(async () => {
  setupMonaco();
});

const stop = () => { }


// Function to execute code in the context of the provided object
const executeCode = () => {
  try {
    // Create a function with context binding
    const func = new Function(`
      const context = arguments[0];
      const code = arguments[1];
      with (context) {
        return eval(code);
      }
    `);

    // Execute the code with context
    const result = func(props.contextObject, code.value);
    executionResult.value = result;
  } catch (error) {
    executionResult.value = `Error: ${error.message}`;
  }
};
</script>

<style></style>