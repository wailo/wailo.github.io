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

    <div v-if="viewMode === 'lessons'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-6 shrink-0 items-center border-b border-simElementBorder px-1">
        <span class="px-1 opacity-60">/</span>
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

      <div class="flex shrink-0 justify-end border-b border-simElementBorder px-1 py-1">
        <button class="action-button inline-flex items-center gap-1" @click="openLessonGenerator">
          <span aria-hidden="true">✦</span> Generate lesson <span class="ai-badge">AI</span>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="filteredLessons.length === 0" class="p-2 opacity-60">NO MATCHING LESSONS</div>
        <section v-for="group in filteredLessonGroups" :key="group.category" class="mb-1">
          <button
            class="flex h-5 w-full items-center justify-between px-1 text-left opacity-75 hover:bg-simInputBackground/40 hover:opacity-100"
            @click="toggleLessonGroup(group.category)"
          >
            <span>
              {{ isLessonGroupOpen(group.category) ? '▾' : '▸' }} {{ group.category }}
              <span class="opacity-60"
                >[{{ completedLessonsIn(group.lessons) }}/{{ group.lessons.length }}]</span
              >
            </span>
          </button>
          <div v-show="isLessonGroupOpen(group.category)" class="ml-3">
            <template v-for="lesson in group.lessons" :key="lesson.id">
              <div
                class="grid h-5 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-1 text-left leading-tight hover:bg-simInputBackground/60"
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
                  <span class="w-4 shrink-0 text-center text-simActiveButton">
                    <span
                      v-if="
                        progressStatus === 'ready' &&
                        (lessonProgress.get(lesson.id)?.completedAttempts ?? 0) > 0
                      "
                      :title="completionTitle(lesson.id)"
                      :aria-label="completionTitle(lesson.id)"
                      >✓</span
                    >
                  </span>
                  <span class="truncate">{{ lesson.name }}</span>
                  <span
                    v-if="
                      runStatus === 'RUNNING' &&
                      [lesson.id, lesson.legacyId].includes(lessonRun.current.value?.lessonId)
                    "
                    class="shrink-0 text-simActiveButton text-xs"
                    >In progress</span
                  >
                </span>
                <span class="flex items-center gap-1">
                  <button
                    class="row-action"
                    type="button"
                    :aria-label="`History for ${lesson.name}`"
                    :title="`History for ${lesson.name}`"
                    :aria-expanded="historyLessonId === lesson.id"
                    :aria-controls="`lesson-history-${lesson.id}`"
                    @click.stop="historyLessonId = historyLessonId === lesson.id ? null : lesson.id"
                    @keydown.stop
                  >
                    <span aria-hidden="true">◷</span>
                  </button>
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
              <LessonHistory
                v-if="historyLessonId === lesson.id"
                :id="`lesson-history-${lesson.id}`"
                :lesson="lesson"
                :refresh-key="historyRefreshKey"
              />
            </template>
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
        <LessonCodeEditor
          ref="codeEditor"
          :is-dark-mode="isDarkMode"
          v-model:value="code"
          @diagnostics="codeDiagnostics = $event"
        />
      </div>
      <aside
        v-if="aiPanelOpen"
        class="absolute bottom-9 right-1 top-1 z-30 flex w-[calc(100%-0.5rem)] max-w-md flex-col overflow-y-auto border border-panelBorder bg-panelContentBackground p-2 shadow-lg"
        aria-labelledby="lesson-generator-title"
      >
        <div
          class="flex h-6 shrink-0 items-center justify-between border-b border-simElementBorder"
        >
          <span id="lesson-generator-title"
            >Generate a lesson <span class="ai-badge">AI</span></span
          >
          <button
            class="action-button"
            aria-label="Close lesson generator"
            @click="closeLessonGenerator"
          >
            ×
          </button>
        </div>

        <template v-if="!aiGeneratedCode">
          <label class="mt-2" for="ai-lesson-request">What are the learning objectives?</label>
          <textarea
            id="ai-lesson-request"
            ref="aiPromptInput"
            v-model="aiPrompt"
            class="min-h-24 resize-y border border-simElementBorder bg-simInputBackground p-1 text-secondary outline-none focus:border-panelActive"
            placeholder="A beginner C172 lesson on maintaining altitude, with practice and a short quiz."
            @keydown.ctrl.enter.prevent="generateLesson"
            @keydown.meta.enter.prevent="generateLesson"
          />

          <label class="mt-2 flex items-center gap-1">
            <input v-model="aiIncludeCurrentCode" type="checkbox" :disabled="!code.trim()" />
            Use the current lesson as a starting point
          </label>
          <p class="mt-2 opacity-60">Generate a draft, then review it before using it.</p>

          <div class="mt-auto flex gap-1 pt-1">
            <button
              class="action-button"
              :disabled="!aiPrompt.trim() || isLLMPending"
              @click="generateLesson"
            >
              {{ isLLMPending ? 'Generating…' : 'Generate draft' }}
            </button>
            <button class="action-button" @click="closeLessonGenerator">Close</button>
          </div>
          <div
            v-if="aiError"
            class="mt-1 border border-panelActive p-1 text-panelActive"
            role="alert"
          >
            {{ aiError }}
          </div>
        </template>

        <template v-else>
          <div class="flex h-6 shrink-0 items-center justify-between">
            <span>Lesson draft</span>
            <span
              :class="aiValidationIssues.length ? 'text-panelActive' : 'text-secondary'"
              role="status"
            >
              {{
                aiValidationPending
                  ? 'Checking…'
                  : aiValidationIssues.length
                    ? `${aiValidationIssues.length} issue(s)`
                    : 'Ready to review'
              }}
            </span>
          </div>
          <pre
            ref="aiDraftPreview"
            tabindex="-1"
            aria-label="Generated lesson draft"
            class="min-h-0 flex-1 overflow-auto border border-simElementBorder bg-simInputBackground p-1 text-secondary"
            >{{ aiGeneratedCode }}</pre
          >
          <div
            v-if="aiValidationIssues.length"
            class="max-h-20 overflow-auto border-x border-b border-panelActive p-1"
          >
            <div v-for="issue in aiValidationIssues" :key="issue">! {{ issue }}</div>
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <button
              class="action-button"
              :disabled="aiValidationPending"
              @click="applyGeneratedLesson(false)"
            >
              Use this lesson
            </button>
            <button
              class="action-button"
              :disabled="aiValidationPending"
              @click="applyGeneratedLesson(true)"
            >
              Replace current
            </button>
            <button class="action-button" @click="reviseLessonDraft">Revise request</button>
          </div>
        </template>
      </aside>
      <div class="flex h-8 shrink-0 items-center gap-1 border-t border-simElementBorder px-1">
        <button
          class="action-button w-16 shrink-0"
          :disabled="!isScriptRunning && codeErrorCount > 0"
          :title="
            !isScriptRunning && codeErrorCount > 0 ? 'Fix code errors before running' : undefined
          "
          @click="isScriptRunning ? reset() : executeCode()"
        >
          {{ isScriptRunning ? '■ STOP' : '▶ RUN' }}
        </button>
        <button
          ref="generateLessonButton"
          class="action-button inline-flex shrink-0 items-center gap-1"
          :class="aiPanelOpen ? 'text-panelActive' : ''"
          :aria-expanded="aiPanelOpen"
          @click="openLessonGenerator"
        >
          <span aria-hidden="true">✦</span> Generate lesson <span class="ai-badge">AI</span>
        </button>
        <button
          v-if="codeErrorCount"
          class="diagnostic-button ml-auto inline-flex min-w-0 items-center gap-1"
          :class="isDarkMode ? 'text-red-300' : 'text-red-700'"
          :title="`${codeErrorCount} TypeScript ${codeErrorCount === 1 ? 'error' : 'errors'}. Click to review the first error.`"
          :aria-label="`Review ${codeErrorCount} code ${codeErrorCount === 1 ? 'error' : 'errors'}`"
          @click="reviewCodeErrors"
        >
          <span aria-hidden="true">⚠</span>
          <span class="truncate"
            >{{ codeErrorCount }} {{ codeErrorCount === 1 ? 'error' : 'errors' }}</span
          >
        </button>
        <span v-else-if="executionResult" class="ml-auto truncate opacity-60">{{
          executionResult
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  h,
  ref,
  watch,
  PropType,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'
import {
  ExtendedMainModule,
  repositionWithAutopilot,
  SimulationProperties,
  waitFor,
  waitForCondition,
} from '../core.ts'
import { resetTimeouts } from '../core.ts'
import { createScriptContext, runUserScript } from '../ScriptContext.ts'
import type {
  AskQuestionOptions,
  ActiveFlightModelSimProps,
  QuestionResult,
  ScriptContext,
  WaitForUserOptions,
} from '../ScriptContext.ts'
import { LayoutTypes } from '../../src/wasm/siminterface.ts'
import { useLessonRun } from '../useLessonRun'
import { createTrainingRecorder } from '../TrainingRecorder'
import { trainingTransport } from '../Pocketbase/trainingTransport'
import { pb } from '../Pocketbase/pocketbase'
import { createLessonProgress } from '../LessonProgress'
import type { CheckpointData, LessonAIRequest, LessonAIResponse } from '../ScriptContext'

const LessonCodeEditor = defineAsyncComponent({
  loader: () => import('./LessonCodeEditor.vue'),
  loadingComponent: () =>
    h('div', { class: 'p-2 text-secondary', role: 'status' }, 'Loading editor…'),
  errorComponent: () =>
    h(
      'div',
      { class: 'p-2 text-secondary', role: 'alert' },
      'Unable to load the code editor. Lessons remain available.',
    ),
})
const loadLessonCompiler = () => import('../EditorScriptRuntime')

const lessonRun = useLessonRun()
const runStatus = lessonRun.status
const runStartedAt = lessonRun.startedAt
const runEvents = lessonRun.events
const isScriptRunning = computed(() => runStatus.value === 'RUNNING')
const isLLMPending = ref(false)
const ModuleTitle = ref('')
const selectedFile = ref<string>('')
const routeHash = window.location.href
const viewModes = ['lessons', 'run', 'code'] as const
const viewMode = ref<(typeof viewModes)[number]>('lessons')
const lessonFilter = ref('')
const runClock = ref(Date.now())
const lessonQueue = ref<LessonListEntry[]>([])
const queuePlaying = ref(false)
const aiPanelOpen = ref(false)
const codeEditor = ref<{ focusFirstError: () => void } | null>(null)
const aiPromptInput = ref<HTMLTextAreaElement | null>(null)
const aiDraftPreview = ref<HTMLElement | null>(null)
const generateLessonButton = ref<HTMLButtonElement | null>(null)
const openLessonGenerator = async () => {
  viewMode.value = 'code'
  aiPanelOpen.value = true
  await nextTick()
  const focusTarget = aiPromptInput.value ?? aiDraftPreview.value
  focusTarget?.focus()
}
const closeLessonGenerator = () => {
  aiPanelOpen.value = false
  generateLessonButton.value?.focus()
}
const reviseLessonDraft = async () => {
  aiGeneratedCode.value = ''
  await nextTick()
  aiPromptInput.value?.focus()
}
const reviewCodeErrors = () => {
  aiPanelOpen.value = false
  codeEditor.value?.focusFirstError()
}
const aiPrompt = ref('')
const aiIncludeCurrentCode = ref(false)
const aiGeneratedCode = ref('')
const aiError = ref('')
let runClockTimer: ReturnType<typeof setInterval> | undefined
let executionGeneration = 0
let aiRunController = new AbortController()

// Define the event emitter
const emit = defineEmits<{
  (event: 'start', code: string): void
  (event: 'reset'): void
  (event: 'error', error: any, title?: string): void
  (event: 'completed', title: string): void
}>()

export type ScriptStatus = 'IN-PROGRESS' | 'IDLE' | 'ERROR'

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
      checkPoint: (content: string, data?: CheckpointData) => void
      requestAI: (
        request: LessonAIRequest,
        runId: string,
        signal: AbortSignal,
      ) => Promise<LessonAIResponse>
    }>,
    required: true,
  },
})

const {
  status: progressStatus,
  byLesson: lessonProgress,
  refresh: refreshProgress,
  dispose: disposeProgress,
} = createLessonProgress(pb, Object.values(importedNModuleTree).flat())
watch(viewMode, (mode) => {
  if (mode === 'lessons') void refreshProgress()
})
const completionTitle = (id: string) => {
  const progress = lessonProgress.value.get(id)
  if (!progress) return 'Saved completion'
  const date = new Date(progress.lastCompletedAt.replace(' ', 'T')).toLocaleString()
  return `Completed ${date} · ${progress.completedAttempts} saved completion(s) · Latest outcome: ${progress.latestOutcome || 'not assessed'}`
}
const historyLessonId = ref<string | null>(null)
const historyRefreshKey = ref(0)
const trainingRecorder = createTrainingRecorder(
  lessonRun,
  trainingTransport,
  (error) => {
    console.error('Training history could not be saved:', error)
    props.utilityFuncs.notifyUser(
      'Training history not saved',
      'Progress could not be saved. You can continue as unrecorded practice; this attempt will not count as verified training.',
      8000,
    )
  },
  () => {
    void refreshProgress()
    historyRefreshKey.value++
  },
)

const executionResult = ref<string | null>(null)
const code = ref(``)
// Keep known errors when the code tab closes, but never apply them to another source.
const codeDiagnostics = ref<{ source: string; errorCount: number } | null>(null)
const codeErrorCount = computed(() =>
  codeDiagnostics.value?.source === code.value ? codeDiagnostics.value.errorCount : 0,
)

const reset = (markStopped = true) => {
  executionGeneration++
  aiRunController.abort()
  aiRunController = new AbortController()
  props.utilityFuncs.cancelPromptInteractions()
  executionResult.value = null
  resetTimeouts()
  if (markStopped && runStatus.value === 'RUNNING') {
    queuePlaying.value = false
    lessonRun.finish(lessonRun.current.value!.runId, 'STOPPED', 'Lesson stopped')
  }
  emit('reset')
}

const executeExternalCode = (
  title: string,
  content: string,
  assignmentId?: string,
  lessonId?: string,
) => {
  props.utilityFuncs.notifyUser(`Running a script from instrutor`, title, 2000)
  ModuleTitle.value = title
  selectedFile.value = title
  code.value = content
  viewMode.value = 'run'
  executeCode(lessonId ?? title, assignmentId)
}

defineExpose({ reset, executeExternalCode })

// Function to execute code in the context of the provided object
const executeCode = async (lessonId?: string, assignmentId?: string): Promise<boolean> => {
  if (codeErrorCount.value > 0) {
    props.utilityFuncs.notifyUser(
      'Code errors',
      'Fix code errors in the CODE tab before running.',
      3000,
    )
    return false
  }
  reset(false)
  const runGeneration = executionGeneration
  const aiSignal = aiRunController.signal
  const source = code.value
  const lessonTitle = ModuleTitle.value
  const run = lessonRun.begin(
    lessonId ?? selectedModule.value?.id ?? lessonTitle,
    lessonTitle,
    assignmentId,
  )
  const metrics = run.metrics
  const addRunEvent = (message: string, replaceKey?: string) =>
    lessonRun.addEvent(run.runId, message, replaceKey)

  executionResult.value = null
  try {
    runClock.value = Date.now()
    emit('start', code.value)

    const { prepareTrainingArtifact, loadUserScript } = await loadLessonCompiler()
    // Loading must not resurrect a stopped/replaced lesson or evaluate its top-level code.
    if (runGeneration !== executionGeneration || aiSignal.aborted) return false

    const artifact = prepareTrainingArtifact(source)
    await trainingRecorder.start(
      lessonRun.snapshot()!,
      artifact,
      {
        appCommit: import.meta.env.VITE_GIT_SHA,
        modelVersion: String(props.contextObject.FLIGHTMODEL_VERSION),
      },
      {
        browser: navigator.userAgent,
        aircraftId: props.contextObject.simulation?.flight_model_id,
        initialState: Object.fromEntries(
          [
            'latitude',
            'longitude',
            'altitude_ft',
            'pitch',
            'bank',
            'yaw',
            'speed_indicated_knots',
            'engine_throttle_position',
            'flaps_selector_position',
            'landing_gear_selector_position',
          ].map((key) => [key, (props.contextObject.flightModel as any)?.[key]]),
        ),
      },
    )
    if (runGeneration !== executionGeneration || aiSignal.aborted) return false

    const deps: Omit<ScriptContext<typeof props.simProps>, 'assessment'> = {
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
        lessonRun.recordAnswer(run.runId, options, result)
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
      checkPoint: (content: string, data?: CheckpointData) => {
        if (runGeneration !== executionGeneration) return
        const checkpoint = lessonRun.recordCheckpoint(run.runId, content, data)
        if (checkpoint) props.utilityFuncs.checkPoint(content, checkpoint.data)
      },
      metrics: metrics,
      ai: {
        request: async (request) => {
          if (aiSignal.aborted) throw new Error('Lesson stopped.')
          addRunEvent('AI debrief requested')
          const result = await props.utilityFuncs.requestAI(request, run.runId, aiSignal)
          if (aiSignal.aborted) throw new Error('Lesson stopped.')
          addRunEvent(`AI debrief: ${result.status}`)
          const data = { aiResponse: result }
          lessonRun.recordCheckpoint(run.runId, `AI debrief: ${result.status}`, data)
          return result
        },
      },
    }

    const finalUserCode = loadUserScript<typeof props.simProps>(artifact.javascript, (message) =>
      props.utilityFuncs.notifyUser('Error', message, 3000),
    )
    const ctx = createScriptContext(deps)

    await runUserScript(finalUserCode, ctx)
    aiRunController.signal === aiSignal && aiRunController.abort()
    if (runGeneration !== executionGeneration) return false
    lessonRun.finish(run.runId, 'COMPLETED', 'Lesson completed')
    emit('completed', lessonTitle)
    emit('reset')

    return true
  } catch (err) {
    if (aiRunController.signal === aiSignal) aiRunController.abort()
    if (runGeneration !== executionGeneration) return false
    console.error(err)
    lessonRun.finish(run.runId, 'ERROR', `Error: ${String(err)}`)
    emit('error', err, lessonTitle)
    return false
  }
}

import { moduleTree as importedNModuleTree, type ModuleEntry } from './data/EASAModules'
import LessonHistory from './LessonHistory.vue'

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
const completedLessonsIn = (groupLessons: LessonListEntry[]) =>
  progressStatus.value === 'ready'
    ? groupLessons.filter(
        (lesson) => (lessonProgress.value.get(lesson.id)?.completedAttempts ?? 0) > 0,
      ).length
    : 0
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
  const endedAt = lessonRun.current.value?.endedAt ?? runClock.value
  const elapsedSeconds = Math.max(0, Math.floor((endedAt - runStartedAt.value) / 1000))
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

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

const aiValidationIssues = ref<string[]>([])
const aiValidationPending = ref(false)
watch(
  aiGeneratedCode,
  async (source, _previous, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    aiValidationIssues.value = []
    aiValidationPending.value = Boolean(source)
    if (!source) return
    try {
      const { validateGeneratedLesson } = await loadLessonCompiler()
      if (!cancelled) aiValidationIssues.value = validateGeneratedLesson(source)
    } catch {
      if (!cancelled) aiValidationIssues.value = ['Unable to load TypeScript validation.']
    } finally {
      if (!cancelled) aiValidationPending.value = false
    }
  },
  { flush: 'sync' },
)

const generatedLessonRequest = () => {
  const currentCodeContext = aiIncludeCurrentCode.value
    ? `\n\nRevise or use this current lesson as context:\n\n${code.value}`
    : ''
  return `Create a complete flight-simulator learning lesson in TypeScript.

User request:
${aiPrompt.value.trim()}

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
  if (!aiGeneratedCode.value || aiValidationPending.value) return
  if (replaceCurrent && !window.confirm('Replace the current editor contents?')) return
  code.value = aiGeneratedCode.value
  if (!replaceCurrent) {
    selectedFile.value = 'AI Draft'
    ModuleTitle.value = 'AI Draft'
  }
  executionResult.value = aiValidationIssues.value.length
    ? `Generated with ${aiValidationIssues.value.length} validation issue(s)`
    : 'Generated lesson ready'
  closeLessonGenerator()
  aiGeneratedCode.value = ''
}

const handleEditorKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !aiPanelOpen.value) return
  event.stopPropagation()
  closeLessonGenerator()
}

const loadFileContent = async (file: ModuleEntry) => {
  try {
    selectedFile.value = file.name
    ModuleTitle.value = file.name
    const response = await fetch(file.path)
    const text = await response.text()
    code.value = text
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
  reset()
  trainingRecorder.dispose()
  disposeProgress()
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

.ai-badge {
  border: 1px solid rgb(var(--color-simElementBorder));
  border-radius: 2px;
  padding: 0 0.2rem;
  font-size: 0.75em;
  line-height: 1.3;
  opacity: 0.7;
}

.diagnostic-button {
  height: 1.5rem;
  padding-inline: 0.25rem;
}

.diagnostic-button:hover,
.diagnostic-button:focus-visible {
  background: rgb(var(--color-panelHeaderBackground));
  outline: 1px solid currentColor;
  outline-offset: -1px;
}
</style>
