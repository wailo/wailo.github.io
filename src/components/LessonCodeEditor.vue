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
import { monaco, acquireLessonTypes } from '../LessonEditorEnvironment'

const props = defineProps<{ value: string; isDarkMode: boolean }>()
const emit = defineEmits<{
  'update:value': [value: string]
  diagnostics: [diagnostics: { source: string; errorCount: number }]
}>()
const container = ref<HTMLElement | null>(null)
const editorError = ref('')
let editor: monaco.editor.IStandaloneCodeEditor | undefined
let model: monaco.editor.ITextModel | undefined
let definitions: monaco.IDisposable[] = []
let changes: monaco.IDisposable | undefined
let markerChanges: monaco.IDisposable | undefined

const publishDiagnostics = () => {
  if (!model) return
  const errorCount = monaco.editor
    .getModelMarkers({ resource: model.uri })
    .filter((marker) => marker.severity === monaco.MarkerSeverity.Error).length
  emit('diagnostics', { source: model.getValue(), errorCount })
}

const focusFirstError = () => {
  if (!model || !editor) return
  const firstError = monaco.editor
    .getModelMarkers({ resource: model.uri })
    .filter((marker) => marker.severity === monaco.MarkerSeverity.Error)
    .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn)[0]
  if (!firstError) return
  editor.setPosition({ lineNumber: firstError.startLineNumber, column: firstError.startColumn })
  editor.revealLineInCenterIfOutsideViewport(firstError.startLineNumber)
  editor.focus()
  void editor.getAction('editor.action.showHover')?.run()
}

defineExpose({ focusFirstError })

const disposeEditor = () => {
  markerChanges?.dispose()
  changes?.dispose()
  editor?.dispose()
  model?.dispose()
  definitions.forEach((definition) => definition.dispose())
  changes = undefined
  editor = undefined
  model = undefined
  definitions = []
  markerChanges = undefined
}

onMounted(() => {
  if (!container.value) return
  try {
    definitions.push(acquireLessonTypes())
    model = monaco.editor.createModel(
      props.value,
      'typescript',
      monaco.Uri.parse(`file:///public/LearningModules/lesson-${crypto.randomUUID()}.ts`),
    )
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
    markerChanges = monaco.editor.onDidChangeMarkers((resources) => {
      if (model && resources.some((uri) => uri.toString() === model!.uri.toString())) {
        publishDiagnostics()
      }
    })
    publishDiagnostics()
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
