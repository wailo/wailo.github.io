<template>
  <div class="flex h-full min-h-0 w-full flex-col font-panelFont text-panelFont text-secondary">
    <div class="flex h-7 shrink-0 items-center gap-1 border-b border-simElementBorder px-1">
      <button
        v-for="mode in viewModes"
        :key="mode"
        class="h-5 px-2"
        :class="viewMode === mode ? 'bg-panelActive text-primary' : 'bg-panelHeaderBackground'"
        @click="viewMode = mode"
      >
        {{ mode.toUpperCase() }}
      </button>
      <span class="ml-auto truncate opacity-60">{{ ModuleTitle || 'NO LESSON SELECTED' }}</span>
    </div>

    <div v-if="viewMode === 'lessons'" class="flex min-h-0 flex-1 flex-col p-1">
      <div class="flex h-7 shrink-0 items-center border-b border-simElementBorder px-1">
        <span class="px-2 opacity-60">/</span>
        <input
          v-model="lessonFilter"
          type="search"
          placeholder="Search title or category"
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary/50"
        />
        <button
          class="px-2 opacity-70 hover:text-panelActive hover:opacity-100"
          title="New playground"
          @click="openPlayground"
        >
          + NEW
        </button>
      </div>

      <div class="mt-1 min-h-0 flex-1 overflow-y-auto">
        <div v-if="filteredLessons.length === 0" class="p-2 opacity-60">NO MATCHING LESSONS</div>
        <section v-for="group in filteredLessonGroups" :key="group.category" class="mb-2">
          <button
            class="flex h-6 w-full items-center justify-between px-1 pt-1 text-left opacity-75 hover:bg-simInputBackground/40 hover:opacity-100"
            @click="toggleLessonGroup(group.category)"
          >
            <span>{{ isLessonGroupOpen(group.category) ? '▾' : '▸' }} {{ group.category }}</span>
            <span class="opacity-60">{{ group.lessons.length }}</span>
          </button>
          <div v-show="isLessonGroupOpen(group.category)" class="ml-3">
            <div
              v-for="lesson in group.lessons"
              :key="lesson.path"
              class="grid min-h-5 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-2 py-0.5 text-left leading-tight hover:bg-simInputBackground/60"
              :class="selectedFile === lesson.name ? 'bg-panelHeaderBackground' : ''"
              role="button"
              tabindex="0"
              @click="selectLesson(lesson)"
              @keydown.enter.prevent="selectLesson(lesson)"
              @keydown.space.prevent.stop="toggleLessonQueue(lesson)"
            >
              <span
                class="flex min-w-0 items-center gap-1"
                :class="selectedFile === lesson.name ? 'text-panelActive' : 'text-secondary'"
              >
                <span class="truncate">{{ lesson.name }}</span>
                <span
                  v-if="completedLessons.has(lesson.name)"
                  class="shrink-0 opacity-60"
                  title="Completed"
                  aria-label="Completed"
                >
                  ✓
                </span>
              </span>
              <span class="flex items-center gap-1">
                <button
                  class="row-action"
                  type="button"
                  :title="
                    isScriptRunning
                      ? `Stop current lesson and run ${lesson.name}`
                      : `Run ${lesson.name}`
                  "
                  :aria-label="
                    isScriptRunning
                      ? `Stop current lesson and run ${lesson.name}`
                      : `Run ${lesson.name}`
                  "
                  :disabled="queuePlaying"
                  @click.stop="runLesson(lesson)"
                >
                  ▶
                </button>
                <button
                  class="queue-action"
                  type="button"
                  :class="queuePosition(lesson) ? 'is-queued' : ''"
                  :title="queuePosition(lesson) ? 'Remove from queue' : 'Add to queue'"
                  :aria-label="
                    queuePosition(lesson)
                      ? `Remove ${lesson.name} from queue`
                      : `Add ${lesson.name} to queue`
                  "
                  :aria-pressed="Boolean(queuePosition(lesson))"
                  :disabled="queuePlaying"
                  @click.stop="toggleLessonQueue(lesson)"
                >
                  {{ queuePosition(lesson) || '+' }}
                </button>
                <button
                  class="row-action"
                  type="button"
                  :title="`Edit ${lesson.name}`"
                  :aria-label="`Edit ${lesson.name}`"
                  @click.stop="editLesson(lesson)"
                >
                  ✎
                </button>
              </span>
            </div>
          </div>
        </section>
      </div>

      <div
        v-if="lessonQueue.length"
        class="mt-1 flex h-6 shrink-0 items-center gap-1 border-t border-simElementBorder px-1"
      >
        <span class="min-w-0 flex-1 truncate">{{ lessonQueue.length }} QUEUED</span>
        <button
          class="action-button"
          :disabled="isScriptRunning || queuePlaying"
          @click="playLessonQueue"
        >
          ▶ PLAY
        </button>
        <button class="action-button" :disabled="queuePlaying" @click="clearLessonQueue">
          CLEAR
        </button>
      </div>
    </div>

    <div v-else-if="viewMode === 'run'" class="flex min-h-0 flex-1 flex-col p-1">
      <div
        class="grid h-6 shrink-0 grid-cols-3 items-center border border-simElementBorder bg-panelHeaderBackground"
      >
        <div class="flex min-w-0 items-center gap-1 px-1">
          <span class="opacity-60">STATUS</span>
          <span
            class="min-w-0 truncate font-medium"
            :class="isScriptRunning ? 'text-panelActive' : 'text-secondary'"
          >
            {{ runStatus }}
          </span>
        </div>
        <div class="flex min-w-0 items-center gap-1 border-l border-simElementBorder px-1">
          <span class="opacity-60">ELAPSED</span>
          <span class="truncate font-medium text-secondary">{{ elapsedDisplay }}</span>
        </div>
        <div class="flex min-w-0 items-center gap-1 border-l border-simElementBorder px-1">
          <span class="opacity-60">AIRCRAFT</span>
          <span class="truncate font-medium text-secondary">{{ aircraftType }}</span>
        </div>
      </div>

      <div class="mt-1 min-h-0 flex-1 overflow-y-auto">
        <div v-if="runEvents.length === 0" class="px-1 py-0.5 opacity-60">
          Run a lesson to see progress.
        </div>
        <div
          v-for="event in runEvents"
          :key="event.id"
          class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-1 px-1 py-0.5 leading-tight hover:bg-simInputBackground/40"
        >
          <span class="opacity-60">{{ event.time }}</span>
          <span class="min-w-0">{{ event.message }}</span>
        </div>
      </div>

      <div class="mt-1 flex shrink-0 gap-1">
        <button class="action-button" @click="isScriptRunning ? reset() : runSelectedLesson()">
          {{ isScriptRunning ? '■ STOP' : '▶ RUN' }}
        </button>
        <button class="action-button" :disabled="!selectedModule" @click="runSelectedLesson">
          ↻ RESTART
        </button>
        <button class="action-button" @click="viewMode = 'code'">CODE</button>
        <span v-if="executionResult" class="ml-auto truncate opacity-60">{{
          executionResult
        }}</span>
      </div>
    </div>

    <div v-else class="relative flex min-h-0 flex-1 flex-col">
      <div class="min-h-0 flex-1">
        <MonacoEditor
          :theme="isDarkMode ? 'vs-dark' : 'vs-light'"
          :options="options"
          language="typescript"
          v-model:value="code"
          @editorWillMount="SetupTypes"
          @editorDidMount="setupMonaco"
        />
      </div>
      <aside
        v-if="aiPanelOpen"
        class="absolute bottom-9 right-1 top-1 z-30 flex w-[46%] min-w-72 flex-col border border-panelBorder bg-panelContentBackground p-1 shadow-lg"
      >
        <div
          class="flex h-6 shrink-0 items-center justify-between border-b border-simElementBorder"
        >
          <span>AI LESSON GENERATOR</span>
          <button class="px-1" title="Close" @click="aiPanelOpen = false">×</button>
        </div>

        <template v-if="!aiGeneratedCode">
          <label class="mt-1 opacity-60" for="ai-lesson-request">REQUEST</label>
          <textarea
            id="ai-lesson-request"
            v-model="aiPrompt"
            class="min-h-24 resize-y border border-simElementBorder bg-simInputBackground p-1 text-secondary outline-none focus:border-panelActive"
            placeholder="Describe the lesson, initial conditions, student actions and completion condition..."
            @keydown.ctrl.enter.prevent="generateLesson"
          />

          <div class="mt-1 grid grid-cols-3 gap-1">
            <label class="ai-field">
              <span>AIRCRAFT</span>
              <select v-model="aiAircraft">
                <option>B747</option>
                <option>C172</option>
                <option>ANY</option>
              </select>
            </label>
            <label class="ai-field">
              <span>DIFFICULTY</span>
              <select v-model="aiDifficulty">
                <option>INTRODUCTORY</option>
                <option>INTERMEDIATE</option>
                <option>ADVANCED</option>
              </select>
            </label>
            <label class="ai-field">
              <span>DURATION</span>
              <select v-model="aiDurationMinutes">
                <option :value="3">3 MIN</option>
                <option :value="5">5 MIN</option>
                <option :value="10">10 MIN</option>
                <option :value="15">15 MIN</option>
              </select>
            </label>
          </div>

          <div class="mt-1 flex flex-wrap gap-1">
            <button
              class="action-button"
              :class="aiIncludeCurrentCode ? 'border-panelActive text-panelActive' : ''"
              @click="aiIncludeCurrentCode = !aiIncludeCurrentCode"
            >
              CURRENT CODE {{ aiIncludeCurrentCode ? 'ON' : 'OFF' }}
            </button>
            <span class="self-center opacity-60">SIM API ON · AUTHORING GUIDE ON</span>
          </div>

          <div class="mt-auto flex gap-1 pt-1">
            <button
              class="action-button"
              :disabled="!aiPrompt.trim() || isLLMPending"
              @click="generateLesson"
            >
              {{ isLLMPending ? 'GENERATING…' : 'GENERATE' }}
            </button>
            <button class="action-button" @click="aiPanelOpen = false">CANCEL</button>
            <span class="ml-auto self-center opacity-60">CTRL+ENTER</span>
          </div>
          <div v-if="aiError" class="mt-1 border border-panelActive p-1 text-panelActive">
            {{ aiError }}
          </div>
        </template>

        <template v-else>
          <div class="flex h-6 shrink-0 items-center justify-between">
            <span>GENERATED LESSON</span>
            <span :class="aiValidationIssues.length ? 'text-panelActive' : 'text-secondary'">
              {{ aiValidationIssues.length ? `${aiValidationIssues.length} ISSUE(S)` : 'TS OK' }}
            </span>
          </div>
          <pre
            class="min-h-0 flex-1 overflow-auto border border-simElementBorder bg-simInputBackground p-1 text-secondary"
            >{{ aiGeneratedCode }}</pre
          >
          <div
            v-if="aiValidationIssues.length"
            class="max-h-20 overflow-auto border-x border-b border-panelActive p-1"
          >
            <div v-for="issue in aiValidationIssues" :key="issue">! {{ issue }}</div>
          </div>
          <div class="mt-1 flex gap-1">
            <button class="action-button" @click="applyGeneratedLesson(false)">CREATE NEW</button>
            <button class="action-button" @click="applyGeneratedLesson(true)">REPLACE</button>
            <button class="action-button" @click="aiGeneratedCode = ''">REVISE</button>
          </div>
        </template>
      </aside>
      <div class="flex h-8 shrink-0 items-center gap-1 border-t border-simElementBorder px-1">
        <button class="action-button" @click="isScriptRunning ? reset() : executeCode()">
          {{ isScriptRunning ? '■ STOP' : '▶ RUN' }}
        </button>
        <button
          class="action-button"
          :class="aiPanelOpen ? 'text-panelActive' : ''"
          @click="aiPanelOpen = true"
        >
          ASK AI
        </button>
        <span v-if="executionResult" class="ml-auto truncate opacity-60">{{
          executionResult
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, PropType, onMounted, onUnmounted } from 'vue'
import {
  ExtendedMainModule,
  repositionWithAutopilot,
  SimulationProperties,
  waitFor,
  waitForCondition,
} from '../core.ts'
import * as ts_compiler from 'typescript'
import types_definitions from './../../src/wasm/generated/editorTypes.txt?raw'
import simMetaTypes from './../../src/wasm/generated/flightsimulator_exec_meta.ts?raw'
import { resetTimeouts } from '../core.ts'
// core.ts converted to js
import coreSimJs from 'virtual:transpiled-core-js'
// core.ts types converted to d.ts
// import coreSimTsTypesRaw from 'virtual:transpiled-core-dts';

// Monaco Editor
declare module 'monaco-editor-vue3'
import MonacoEditor from 'monaco-editor-vue3'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { createScriptContext, runUserScript } from '../ScriptContext.ts'
import type {
  AskQuestionOptions,
  ActiveFlightModelSimProps,
  QuestionResult,
  ScriptContext,
  ScriptSimProps,
  UserScript,
  WaitForUserOptions,
} from '../ScriptContext.ts'
import scriptApiTypes from '../ScriptContext.ts?raw'
import { LayoutTypes } from '../../src/wasm/siminterface.ts'

const isScriptRunning = ref(false)
const isLLMPending = ref(false)
const ModuleTitle = ref('')
const selectedFile = ref<string>('')
const routeHash = window.location.href
const viewModes = ['lessons', 'run', 'code'] as const
const viewMode = ref<(typeof viewModes)[number]>('lessons')
const lessonFilter = ref('')
const runStatus = ref<'IDLE' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'ERROR'>('IDLE')
const runStartedAt = ref<number | null>(null)
const runClock = ref(Date.now())
const completedLessons = ref(new Set<string>())
const lessonQueue = ref<LessonListEntry[]>([])
const queuePlaying = ref(false)
const runEvents = ref<Array<{ id: number; time: string; message: string; replaceKey?: string }>>([])
const aiPanelOpen = ref(false)
const aiPrompt = ref('')
const aiAircraft = ref<'B747' | 'C172' | 'ANY'>('B747')
const aiDifficulty = ref<'INTRODUCTORY' | 'INTERMEDIATE' | 'ADVANCED'>('INTRODUCTORY')
const aiDurationMinutes = ref(5)
const aiIncludeCurrentCode = ref(false)
const aiGeneratedCode = ref('')
const aiError = ref('')
let runEventId = 0
let runClockTimer: ReturnType<typeof setInterval> | undefined
let executionGeneration = 0

// let monacoEditor: monaco.editor.IStandaloneCodeEditor | null = null;

// Define the event emitter
const emit = defineEmits<{
  (event: 'start', code: string): void
  (event: 'reset'): void
  (event: 'error', error: any, title?: string): void
  (event: 'completed', title: string): void
}>()

export type ScriptStatus = 'IN-PROGRESS' | 'IDLE' | 'ERROR'

window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

const props = defineProps({
  contextObject: {
    type: Object as PropType<ExtendedMainModule>,
    required: true,
  },
  simProps: {
    type: Object as PropType<ActiveFlightModelSimProps>,
    required: true,
  },
  isDarkMode: {
    type: Boolean,
    default: false,
  },
  aircraftType: {
    type: String,
    default: 'UNKNOWN',
  },
  utilityFuncs: {
    type: Object as PropType<{
      notifyUser: (
        title: string,
        body?: string,
        timeOut?: number,
        options?: { append?: boolean; replace?: boolean },
      ) => Promise<void>
      waitForUser: (options: WaitForUserOptions) => Promise<void>
      askQuestion: (options: AskQuestionOptions) => Promise<QuestionResult>
      cancelPromptInteractions: () => void
      plotView: (item: SimulationProperties | SimulationProperties[], state: boolean) => void
      dataView: (item: SimulationProperties, state: boolean) => void
      dataDisplayReset: () => void
      setLayout: (mode: LayoutTypes) => void
      setVisuals: (state: boolean) => void
      setMap: (state: boolean) => void
      setTheme: (dark: boolean) => void
      setTab: (panelId: string, tabName: string) => void
      resetPanels: () => void
      checkPoint: (content: string) => void
    }>,
    required: true,
  },
})

// ------------------------
// ts-interface-extractor.ts
// ------------------------
// import * as ts from "typescript";

// Remove import and declare statements and replace export with a empty string
function stripImportsExports(input: string): string {
  return input
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*import[\s\S]*?['"].*?['"];?/gm, '')
    .trim()
}

const options = {
  automaticLayout: true,
  colorDecorators: true,
  tabSize: 2,
  minimap: {
    enabled: false,
  },
  scrollBeyondLastLine: false,
  lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 0,
  scrollbar: {
    verticalScrollbarSize: 7,
    horizontalScrollbarSize: 7,
  },
}

// Set up Monaco Editor with TypeScript definitions from ScriptContext and the generated modelfile
const SetupTypes = () => {
  monaco.typescript.typescriptDefaults.addExtraLib(
    `${types_definitions}\n${stripImportsExports(simMetaTypes)}\n${stripImportsExports(scriptApiTypes)}`,
  )
}

// Define the Monaco Editor configuration
const setupMonaco = (_editor: monaco.editor.IStandaloneCodeEditor) => {
  monaco.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    // moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.typescript.ModuleKind.ESNext,
    noEmit: true,
    strict: true,
    //typeRoots: ['node_modules/@types'],
  })
}

function loadUserScript<TProps extends ScriptSimProps>(code: string): UserScript<TProps> {
  const fn = new Function(`
    ${code}
    return main;
  `)

  const result = fn()

  if (typeof result !== 'function') {
    props.utilityFuncs.notifyUser('Error', "The script must define a function named 'main'", 3000)
    throw new Error("Script must define a function named 'main'")
  }

  return result
}

const executionResult = ref<string | null>(null)
const code = ref(``)

const reset = (markStopped = true) => {
  executionGeneration++
  props.utilityFuncs.cancelPromptInteractions()
  executionResult.value = null
  resetTimeouts()
  isScriptRunning.value = false
  if (markStopped && runStatus.value === 'RUNNING') {
    queuePlaying.value = false
    runStatus.value = 'STOPPED'
    addRunEvent('Lesson stopped')
  }
  emit('reset')
}

const executeExternalCode = (title: string, content: string) => {
  props.utilityFuncs.notifyUser(`Running a script from instrutor`, title, 2000)
  ModuleTitle.value = title
  selectedFile.value = title
  code.value = content
  viewMode.value = 'run'
  executeCode()
}

defineExpose({ reset, executeExternalCode })

// Function to execute code in the context of the provided object
const executeCode = async (): Promise<boolean> => {
  reset(false)
  const runGeneration = executionGeneration
  let coreCode = coreSimJs
  coreCode = stripImportsExports(coreCode)
  code.value = stripImportsExports(code.value)
  const metrics: any[] = []

  executionResult.value = null
  try {
    isScriptRunning.value = true
    runStatus.value = 'RUNNING'
    runStartedAt.value = Date.now()
    runClock.value = Date.now()
    runEvents.value = []
    addRunEvent(`Started ${ModuleTitle.value || 'lesson'}`)
    emit('start', code.value)

    const deps: ScriptContext<typeof props.simProps> = {
      controls: props.contextObject,
      props: props.simProps,
      repositionWithAutopilot: repositionWithAutopilot,
      waitFor: waitFor,
      waitForCondition: waitForCondition,
      notifyUser: async (
        title: string,
        body?: string,
        timeOut?: number,
        options?: { append?: boolean; replace?: boolean },
      ) => {
        if (runGeneration !== executionGeneration) return new Promise<void>(() => {})
        addRunEvent(`Prompt: ${title}`, options?.replace ? `prompt:${title}` : undefined)
        await props.utilityFuncs.notifyUser(title, body, timeOut, options)
        if (runGeneration !== executionGeneration) return new Promise<void>(() => {})
      },
      waitForUser: async (options: WaitForUserOptions) => {
        if (runGeneration !== executionGeneration) return new Promise<void>(() => {})
        addRunEvent(`Waiting for user: ${options.title}`)
        await props.utilityFuncs.waitForUser(options)
        if (runGeneration !== executionGeneration) return new Promise<void>(() => {})
        addRunEvent(`User continued: ${options.title}`)
      },
      askQuestion: async (options: AskQuestionOptions) => {
        if (runGeneration !== executionGeneration) {
          return new Promise<QuestionResult>(() => {})
        }
        addRunEvent(`Question: ${options.title}`)
        const result = await props.utilityFuncs.askQuestion(options)
        if (runGeneration !== executionGeneration) {
          return new Promise<QuestionResult>(() => {})
        }
        addRunEvent(
          `Answer submitted: ${options.title}${result.correct === undefined ? '' : result.correct ? ' · correct' : ' · incorrect'}`,
        )
        return result
      },
      dataView: props.utilityFuncs.dataView,
      plotView: props.utilityFuncs.plotView,
      dataDisplayReset: props.utilityFuncs.dataDisplayReset,
      setLayout: props.utilityFuncs.setLayout,
      setVisuals: props.utilityFuncs.setVisuals,
      setMap: props.utilityFuncs.setMap,
      setTheme: props.utilityFuncs.setTheme,
      setTab: props.utilityFuncs.setTab,
      resetPanels: props.utilityFuncs.resetPanels,
      layoutTypes: LayoutTypes,
      checkPoint: (content: string) => {
        addRunEvent(content)
        props.utilityFuncs.checkPoint(content)
      },
      metrics: metrics,
    }

    const finalUserCode_js = ts_compiler.transpile(code.value, {
      target: ts_compiler.ScriptTarget.ES2020,
      module: ts_compiler.ModuleKind.None,
    })

    const finalUserCode = await loadUserScript<typeof props.simProps>(finalUserCode_js)
    const ctx = createScriptContext(deps)

    const startStime = new Date()
    await runUserScript(finalUserCode, ctx)
    runStatus.value = 'COMPLETED'
    completedLessons.value = new Set([...completedLessons.value, ModuleTitle.value])
    addRunEvent('Lesson completed')
    emit('completed', ModuleTitle.value)
    emit('reset')

    const endTime = new Date()
    isScriptRunning.value = false
    submitSession({
      scenario: ModuleTitle.value,
      start_time: startStime,
      end_time: endTime,
      model_version: deps.controls.FLIGHTMODEL_VERSION.toString(),
      ui_version: import.meta.env.VITE_GIT_SHA,
      raw_metrics: metrics,
    }).catch((err) => {
      emit('error', err, ModuleTitle.value)
    })
    return true
  } catch (err) {
    console.error(err)
    runStatus.value = 'ERROR'
    addRunEvent(`Error: ${String(err)}`)
    emit('error', err, ModuleTitle.value)
    isScriptRunning.value = false
    return false
  }
}

import { moduleTree as importedNModuleTree, type ModuleEntry } from './data/EASAModules'

import { useTrainingSessions } from '../Pocketbase/useTrainingSessions.ts'
const { submitSession } = useTrainingSessions()

// Reactive copy of the fileTree
const fileTree = ref(importedNModuleTree)
const openLessonGroups = ref(new Set(Object.keys(importedNModuleTree)))
type LessonListEntry = ModuleEntry & { category: string }
const lessons = computed<LessonListEntry[]>(() =>
  Object.entries(fileTree.value).flatMap(([category, entries]) =>
    entries.map((entry) => ({ ...entry, category })),
  ),
)
const filteredLessons = computed(() => {
  const query = lessonFilter.value.trim().toLocaleLowerCase()
  if (!query) return lessons.value
  return lessons.value.filter((lesson) =>
    [lesson.name, lesson.category, lesson.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(query)),
  )
})
const filteredLessonGroups = computed(() =>
  Object.keys(fileTree.value)
    .map((category) => ({
      category,
      lessons: filteredLessons.value.filter((lesson) => lesson.category === category),
    }))
    .filter((group) => group.lessons.length > 0),
)
const isLessonGroupOpen = (category: string) =>
  Boolean(lessonFilter.value.trim()) || openLessonGroups.value.has(category)
const toggleLessonGroup = (category: string) => {
  if (lessonFilter.value.trim()) return
  const next = new Set(openLessonGroups.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  openLessonGroups.value = next
}
const selectedModule = computed(() =>
  lessons.value.find((lesson) => lesson.name === selectedFile.value),
)
const elapsedDisplay = computed(() => {
  if (!runStartedAt.value) return '00:00'
  const elapsedSeconds = Math.max(0, Math.floor((runClock.value - runStartedAt.value) / 1000))
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const addRunEvent = (message: string, replaceKey?: string) => {
  const elapsed = runStartedAt.value ? Date.now() - runStartedAt.value : 0
  const minutes = Math.floor(elapsed / 60000)
  const seconds = Math.floor((elapsed % 60000) / 1000)
  const event = {
    id: ++runEventId,
    time: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    message,
    replaceKey,
  }

  if (replaceKey) {
    const existingIndex = runEvents.value.findIndex((item) => item.replaceKey === replaceKey)
    if (existingIndex >= 0) {
      runEvents.value[existingIndex] = { ...event, id: runEvents.value[existingIndex].id }
      return
    }
  }

  runEvents.value.push(event)
}

const queuePosition = (lesson: ModuleEntry) =>
  lessonQueue.value.findIndex((queued) => queued.path === lesson.path) + 1

const toggleLessonQueue = (lesson: LessonListEntry) => {
  if (queuePlaying.value) return
  const position = queuePosition(lesson)
  lessonQueue.value = position
    ? lessonQueue.value.filter((queued) => queued.path !== lesson.path)
    : [...lessonQueue.value, lesson]
}

const clearLessonQueue = () => {
  if (!queuePlaying.value) lessonQueue.value = []
}

const playLessonQueue = async () => {
  if (!lessonQueue.value.length || isScriptRunning.value || queuePlaying.value) return
  queuePlaying.value = true
  const queuedLessons = [...lessonQueue.value]

  for (const lesson of queuedLessons) {
    if (!queuePlaying.value) break
    await loadFileContent(lesson)
    viewMode.value = 'run'
    const completed = await executeCode()
    if (!completed) break
    lessonQueue.value = lessonQueue.value.filter((queued) => queued.path !== lesson.path)
  }

  queuePlaying.value = false
}

const selectLesson = async (lesson: ModuleEntry) => {
  await loadFileContent(lesson)
}

const runLesson = async (lesson: ModuleEntry) => {
  if (queuePlaying.value) return
  if (isScriptRunning.value) reset()
  await loadFileContent(lesson)
  viewMode.value = 'run'
  await executeCode()
}

const runSelectedLesson = async () => {
  if (!selectedModule.value) return
  await runLesson(selectedModule.value)
}

const editLesson = async (lesson: ModuleEntry) => {
  await loadFileContent(lesson)
  viewMode.value = 'code'
}

const openPlayground = () => {
  selectedFile.value = 'Playground'
  ModuleTitle.value = 'Playground'
  code.value = `export async function main(context: ScriptContext) {
  context.notifyUser('Hello, World!')
  const simControls = context.controls
  const flightModel = simControls.simulation.set_flight_model_b747()
}`
  viewMode.value = 'code'
}

const aiValidationIssues = computed(() => {
  if (!aiGeneratedCode.value) return []
  const issues: string[] = []
  if (!/export\s+async\s+function\s+main\s*\(/.test(aiGeneratedCode.value)) {
    issues.push('Missing export async function main(context: ScriptContext).')
  }
  const output = ts_compiler.transpileModule(aiGeneratedCode.value, {
    compilerOptions: {
      target: ts_compiler.ScriptTarget.ES2020,
      module: ts_compiler.ModuleKind.ESNext,
    },
    reportDiagnostics: true,
  })
  output.diagnostics?.forEach((diagnostic) => {
    issues.push(ts_compiler.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
  })
  return [...new Set(issues)]
})

const generatedLessonRequest = () => {
  const currentCodeContext = aiIncludeCurrentCode.value
    ? `\n\nRevise or use this current lesson as context:\n\n${code.value}`
    : ''
  return `Create a complete flight-simulator learning lesson in TypeScript.

User request:
${aiPrompt.value.trim()}

Configuration:
- Aircraft: ${aiAircraft.value}
- Difficulty: ${aiDifficulty.value.toLocaleLowerCase()}
- Approximate duration: ${aiDurationMinutes.value} minutes

Authoring requirements:
- Export exactly one async function named main with a ScriptContext parameter.
- Use context.controls and the documented ScriptContext utilities.
- Use context.notifyUser for concise instructional prompts.
- Use context.checkPoint for observable lesson progress.
- Give every waitForCondition a finite hard timeout.
- Avoid infinite loops and conflicting autopilot modes.
- Return only TypeScript source code without Markdown fences.${currentCodeContext}`
}

const cleanGeneratedCode = (content: string) => {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const fencedCode = /```(?:typescript|ts)?\s*([\s\S]*?)```/i.exec(withoutThinking)
  return (fencedCode?.[1] || withoutThinking).trim()
}

const generateLesson = async () => {
  if (!aiPrompt.value.trim() || isLLMPending.value) return
  aiError.value = ''
  isLLMPending.value = true

  const llm_api_host = import.meta.env.DEV
    ? 'http://localhost:11434/api/chat'
    : 'https://raspberrypi.tail89a8a0.ts.net/llm/api/chat'

  // Set up timeout using AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000) // 5 minutes

  let response: Response
  try {
    response = await fetch(llm_api_host, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'flightsimModel:latest',
        messages: [
          {
            role: 'user',
            content: generatedLessonRequest(),
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    })
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      aiError.value = 'AI request timed out after 5 minutes.'
    } else if (err instanceof Error) {
      aiError.value = `AI request failed: ${err.message}`
    } else {
      aiError.value = 'AI request failed with an unknown error.'
    }
    isLLMPending.value = false
    return
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    aiError.value = `AI request failed: ${response.statusText}`
    isLLMPending.value = false
    return
  }

  try {
    const jsonResponse = await response.json()
    const result = jsonResponse?.message?.content
    if (typeof result !== 'string') throw new Error('Invalid AI response format')
    aiGeneratedCode.value = cleanGeneratedCode(result)
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    aiError.value = `Failed to read AI response: ${String(error)}`
  } finally {
    isLLMPending.value = false
  }
}

const applyGeneratedLesson = (replaceCurrent: boolean) => {
  if (!aiGeneratedCode.value) return
  if (replaceCurrent && !window.confirm('Replace the current editor contents?')) return
  code.value = aiGeneratedCode.value
  if (!replaceCurrent) {
    selectedFile.value = 'AI Draft'
    ModuleTitle.value = 'AI Draft'
  }
  executionResult.value = aiValidationIssues.value.length
    ? `Generated with ${aiValidationIssues.value.length} validation issue(s)`
    : 'Generated lesson ready'
  aiPanelOpen.value = false
  aiGeneratedCode.value = ''
}

const handleEditorKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !aiPanelOpen.value) return
  event.stopPropagation()
  aiPanelOpen.value = false
}

const loadFileContent = async (file: ModuleEntry) => {
  try {
    selectedFile.value = file.name
    ModuleTitle.value = file.name
    const response = await fetch(file.path)
    const text = await response.text()
    code.value = stripImportsExports(text)
  } catch (error) {
    console.error(error)
    code.value = `// Failed to load ${file.name}`
    ModuleTitle.value = `Error loading ${file.name}`
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEditorKeydown, true)
  runClockTimer = setInterval(() => {
    runClock.value = Date.now()
  }, 1000)

  // Load the first file in the first folder by default
  const firstFolder = Object.keys(fileTree.value)[0]
  const firstFile = fileTree.value[firstFolder][0]
  if (firstFile) {
    loadFileContent(firstFile)

    // // if demo mode
    // // wait for 5 seconds then run the code
    // setTimeout(() => {
    //   executeCode();
    // }, 5000);
  }

  const hashString = routeHash.split('?')[1]
  const urlParams = new URLSearchParams(hashString)
  const lessonid = urlParams.get('lessonId')

  if (lessonid) {
    const found = Object.values(fileTree.value)
      .flat()
      .find((file) => file.name.toLocaleLowerCase() === lessonid.toLowerCase())
    if (!found) {
      props.utilityFuncs.notifyUser('Error', `Lesson with ID "${lessonid}" not found`, 5000)
      return
    }

    props.utilityFuncs
      .notifyUser(`${found.name}`, `Lesson will start in 5 seconds`, 5000)
      .then(() => {
        loadFileContent(found).then(() => {
          executeCode()
        })
      })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEditorKeydown, true)
  if (runClockTimer) clearInterval(runClockTimer)
})
</script>

<style scoped>
.queue-action {
  min-width: 1.25rem;
  height: 1.1rem;
  padding-inline: 0.2rem;
  color: rgb(var(--color-secondary));
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-align: center;
  opacity: 0.65;
}

.queue-action.is-queued,
.queue-action:hover,
.queue-action:focus-visible {
  color: rgb(var(--color-panelActive));
  opacity: 1;
  outline: none;
}

.queue-action:disabled {
  cursor: default;
  opacity: 0.35;
}

.row-action {
  min-width: 1.25rem;
  height: 1.1rem;
  color: rgb(var(--color-secondary));
  line-height: 1;
  opacity: 0.65;
}

.row-action:hover,
.row-action:focus-visible {
  color: rgb(var(--color-panelActive));
  opacity: 1;
  outline: none;
}

.row-action:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.action-button {
  height: 1.5rem;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding-inline: 0.5rem;
  color: rgb(var(--color-secondary));
}

.action-button:hover:not(:disabled),
.action-button:focus-visible {
  border-color: rgb(var(--color-panelActive));
  outline: none;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.ai-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
}

.ai-field > span {
  opacity: 0.6;
}

.ai-field select {
  min-width: 0;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-simInputBackground));
  padding: 0.125rem;
  color: rgb(var(--color-secondary));
  outline: none;
}

.ai-field select:focus {
  border-color: rgb(var(--color-panelActive));
}
</style>
