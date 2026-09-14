<template>
  <div class="relative h-full min-h-0 w-full">
    <div
      v-if="editorError"
      class="absolute inset-0 z-10 bg-panelContentBackground p-2 text-secondary"
      role="alert"
    >
      {{ editorError }}
    </div>
    <div ref="container" class="h-full w-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import typesDefinitions from '../wasm/generated/editorTypes.txt?raw'
import simMetaTypes from '../wasm/generated/flightsimulator_exec_meta.ts?raw'
import scriptApiTypes from '../ScriptContext.ts?raw'
import { stripImportsExports } from '../ScriptSource'

const props = defineProps<{ value: string; isDarkMode: boolean }>()
const emit = defineEmits<{ 'update:value': [value: string] }>()
const container = ref<HTMLElement | null>(null)
const editorError = ref('')
let editor: monaco.editor.IStandaloneCodeEditor | undefined
let model: monaco.editor.ITextModel | undefined
let definitions: monaco.IDisposable | undefined
let changes: monaco.IDisposable | undefined

window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === 'typescript' || label === 'javascript' ? new tsWorker() : new editorWorker()
  },
}

const disposeEditor = () => {
  changes?.dispose()
  editor?.dispose()
  model?.dispose()
  definitions?.dispose()
  changes = undefined
  editor = undefined
  model = undefined
  definitions = undefined
}

onMounted(() => {
  if (!container.value) return
  try {
    const defaults = monaco.typescript.typescriptDefaults
    defaults.setCompilerOptions({
      target: monaco.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      module: monaco.typescript.ModuleKind.ESNext,
      noEmit: true,
      strict: true,
    })
    definitions = defaults.addExtraLib(
      `${typesDefinitions}\n${stripImportsExports(simMetaTypes)}\n${stripImportsExports(scriptApiTypes)}`,
    )
    model = monaco.editor.createModel(props.value, 'typescript')
    editor = monaco.editor.create(container.value, {
      model,
      theme: props.isDarkMode ? 'vs-dark' : 'vs',
      automaticLayout: true,
      colorDecorators: true,
      tabSize: 2,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 0,
      scrollbar: { verticalScrollbarSize: 7, horizontalScrollbarSize: 7 },
    })
    changes = editor.onDidChangeModelContent(() => {
      const value = model!.getValue()
      if (value !== props.value) emit('update:value', value)
    })
  } catch (error) {
    disposeEditor()
    editorError.value = 'Unable to open the code editor. Lessons remain available.'
    console.error(error)
  }
})

watch(
  () => props.value,
  (value) => {
    if (model && model.getValue() !== value) model.setValue(value)
  },
)
watch(
  () => props.isDarkMode,
  (dark) => {
    if (editor) monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
  },
)
onBeforeUnmount(disposeEditor)
</script>
