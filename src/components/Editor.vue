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
      <div
        class="flex min-h-6 shrink-0 flex-wrap items-center gap-x-1 border-b border-simElementBorder px-1"
      >
        <div class="flex items-center" role="group" aria-label="Filter lessons by source">
          <button
            class="library-filter"
            :aria-pressed="libraryTab === 'all'"
            @click="libraryTab = 'all'"
          >
            ALL
          </button>
          <button
            class="library-filter"
            :aria-pressed="libraryTab === 'mine'"
            @click="libraryTab = 'mine'"
          >
            CUSTOM
          </button>
          <button
            class="library-filter"
            :aria-pressed="libraryTab === 'demo'"
            @click="libraryTab = 'demo'"
          >
            DEMO
          </button>
        </div>
        <div class="ml-auto flex items-center">
          <button class="library-action" title="Create a new lesson" @click="openPlayground">
            + NEW
          </button>
          <button
            class="library-action"
            title="Generate a lesson with AI"
            @click="openLessonGenerator"
          >
            <span aria-hidden="true">✦</span> GENERATE
          </button>
        </div>
      </div>
      <div
        class="mx-1 my-0.5 flex h-5 shrink-0 items-center border border-simElementBorder px-1 focus-within:border-panelActive"
      >
        <input
          v-model="lessonFilter"
          type="search"
          aria-label="Search lessons"
          placeholder="Search lessons…"
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary/50"
        />
        <button
          v-if="libraryTab !== 'demo' && lessonAccountId"
          class="library-action"
          :disabled="libraryStatus === 'loading'"
          title="Refresh custom lessons"
          aria-label="Refresh custom lessons"
          @click="refreshLibrary"
        >
          ↻
        </button>
      </div>
      <div v-if="libraryTab === 'mine' && !lessonAccountId" class="p-2 opacity-70" role="status">
        Sign in to create and save your own lessons. Demos are available without an account.
      </div>
      <div
        v-else-if="libraryTab !== 'demo' && libraryStatus === 'loading'"
        class="px-2 py-1 opacity-60"
        role="status"
      >
        Loading your lessons…
      </div>
      <div v-else-if="libraryTab !== 'demo' && libraryStatus === 'error'" class="p-2" role="alert">
        Could not load your lessons. Use Refresh to retry. Demos remain available.
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          v-if="
            filteredLessons.length === 0 && (libraryTab !== 'mine' || libraryStatus === 'ready')
          "
          class="p-2 opacity-60"
        >
          {{
            lessonFilter.trim() || libraryTab !== 'mine'
              ? 'No matching lessons.'
              : 'No saved lessons yet. Create one or save a copy of a demo.'
          }}
        </div>
        <section v-for="group in filteredLessonGroups" :key="group.category">
          <button
            class="library-group flex h-5 w-full items-center px-1 text-left opacity-70"
            :aria-expanded="isLessonGroupOpen(group.category)"
            :title="`${completedLessonsIn(group.lessons)} of ${group.lessons.length} completed`"
            @click="toggleLessonGroup(group.category)"
          >
            <span> {{ isLessonGroupOpen(group.category) ? '▾' : '▸' }} {{ group.category }} </span>
          </button>
          <div v-show="isLessonGroupOpen(group.category)" class="ml-3">
            <template v-for="lesson in group.lessons" :key="lesson.id">
              <div
                class="lesson-row grid h-5 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 px-1 text-left leading-tight hover:bg-simInputBackground/40"
                :class="selectedFile === lesson.id ? 'bg-panelHeaderBackground' : ''"
              >
                <button
                  class="lesson-title flex h-full min-w-0 items-center gap-1 text-left"
                  :title="`${lesson.name} · ${lesson.recordId ? 'Custom lesson' : 'Demo'}`"
                  :aria-label="`${lesson.name}, ${lesson.recordId ? 'custom lesson' : 'demo'}`"
                  @click="selectLesson(lesson)"
                  :class="selectedFile === lesson.id ? 'text-panelActive' : 'text-secondary'"
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
                  <span class="min-w-0 flex-1 truncate">{{ lesson.name }}</span>
                  <span
                    v-if="
                      runStatus === 'RUNNING' &&
                      [lesson.id, lesson.legacyId].includes(lessonRun.current.value?.lessonId)
                    "
                    class="shrink-0 text-simActiveButton text-xs"
                    >In progress</span
                  >
                  <span v-if="libraryTab === 'all'" class="w-12 shrink-0 text-right opacity-40">{{
                    lesson.recordId ? 'Custom' : 'Demo'
                  }}</span>
                </button>
                <span class="flex shrink-0 items-center gap-1">
                  <button
                    class="row-action"
                    type="button"
                    :class="historyLessonId === lesson.id ? 'is-active' : ''"
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
      <div class="shrink-0 border-b border-simElementBorder p-1">
        <div class="flex flex-wrap items-center gap-1">
          <input
            v-model="ModuleTitle"
            aria-label="Lesson title"
            maxlength="200"
            placeholder="Lesson title"
            class="min-w-24 flex-1 border border-simElementBorder bg-simInputBackground px-1"
          />
          <template v-if="lessonAccountId">
            <button
              class="action-button"
              :disabled="savingLesson || loadingLesson || !ModuleTitle.trim()"
              @click="saveLesson(false)"
            >
              {{
                savingLesson
                  ? 'Saving…'
                  : loadedLesson
                    ? 'Save'
                    : selectedModule
                      ? 'Save a copy'
                      : 'Save to account'
              }}
            </button>
            <button
              v-if="loadedLesson"
              class="action-button"
              :disabled="savingLesson || loadingLesson || !ModuleTitle.trim()"
              @click="saveLesson(true)"
            >
              Save a copy
            </button>
          </template>
        </div>
        <details class="mt-1">
          <summary class="cursor-pointer opacity-70">Learning objectives and category</summary>
          <label class="mt-1 block"
            >Category<input
              v-model="lessonCategory"
              maxlength="100"
              class="ml-1 border border-simElementBorder bg-simInputBackground px-1"
          /></label>
          <label class="mt-1 block"
            >Learning objectives<textarea
              v-model="lessonObjectives"
              maxlength="5000"
              rows="2"
              class="block w-full resize-y border border-simElementBorder bg-simInputBackground p-1"
            />
          </label>
        </details>
        <div class="mt-1 flex flex-wrap items-center gap-1" role="status">
          <span>{{
            loadingLesson
              ? 'Loading lesson…'
              : saveMessage ||
                (dirtyLesson
                  ? 'Unsaved changes'
                  : loadedLesson
                    ? 'Saved to your account'
                    : 'Local lesson')
          }}</span>
          <span v-if="!lessonAccountId" class="opacity-60">· Sign in to save to your account.</span>
          <button
            v-if="saveConflict"
            class="action-button"
            :disabled="savingLesson || loadingLesson"
            @click="reloadSavedLesson"
          >
            Reload saved version
          </button>
        </div>
      </div>
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
          :disabled="!isScriptRunning && (codeErrorCount > 0 || loadingLesson)"
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
import { createLessonRepository, type SavedLesson } from '../LessonRepository'
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
const loadLessonValidator = () => import('../LessonScriptValidation')
const lessonRepository = createLessonRepository(pb)
const {
  accountId: lessonAccountId,
  lessons: savedLessons,
  status: libraryStatus,
  refresh: refreshLibrary,
} = lessonRepository
const libraryTab = ref<'all' | 'mine' | 'demo'>('all')

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
} = createLessonProgress(pb, () => lessons.value)
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
const loadedLesson = ref<SavedLesson | null>(null)
const lessonObjectives = ref('')
const lessonCategory = ref('')
const savedSnapshot = ref(JSON.stringify(['', '', '', '']))
const lessonSnapshot = () =>
  JSON.stringify([ModuleTitle.value, lessonObjectives.value, lessonCategory.value, code.value])
const dirtyLesson = computed(() => lessonSnapshot() !== savedSnapshot.value)
const savingLesson = ref(false)
const loadingLesson = ref(false)
const saveMessage = ref('')
const saveConflict = ref(false)
let lessonLoadGeneration = 0
let editorDocumentGeneration = 0
const discardEdits = () => !dirtyLesson.value || window.confirm('Discard unsaved lesson changes?')
const applyLesson = (
  title: string,
  source: string,
  category = '',
  objectives = '',
  record: SavedLesson | null = null,
  id = '',
) => {
  editorDocumentGeneration++
  loadedLesson.value = record
  selectedFile.value = id
  ModuleTitle.value = title
  lessonCategory.value = category
  lessonObjectives.value = objectives
  code.value = source
  savedSnapshot.value = lessonSnapshot()
  saveMessage.value = ''
  saveConflict.value = false
}
const saveLesson = async (copy: boolean) => {
  if (
    savingLesson.value ||
    loadingLesson.value ||
    !lessonAccountId.value ||
    !ModuleTitle.value.trim()
  )
    return
  const document = editorDocumentGeneration
  const snapshot = lessonSnapshot()
  const draft = {
    title: ModuleTitle.value,
    objectives: lessonObjectives.value,
    category: lessonCategory.value,
    source: code.value,
  }
  savingLesson.value = true
  saveMessage.value = ''
  saveConflict.value = false
  try {
    const record = await lessonRepository.save(
      draft,
      copy ? undefined : (loadedLesson.value ?? undefined),
    )
    if (document !== editorDocumentGeneration) return
    loadedLesson.value = record
    selectedFile.value = `saved:${record.id}`
    savedSnapshot.value = snapshot
    saveMessage.value =
      lessonSnapshot() === snapshot
        ? 'Saved to your account'
        : 'Saved. Newer edits are not saved yet.'
    void refreshProgress()
  } catch (error: any) {
    if (document !== editorDocumentGeneration) return
    saveConflict.value = error.status === 409
    saveMessage.value = saveConflict.value
      ? 'Saved elsewhere. Reload or save a copy to keep your changes.'
      : 'Could not save. Your edits are still here; try again.'
  } finally {
    savingLesson.value = false
  }
}
const reloadSavedLesson = async () => {
  const record = loadedLesson.value
  if (!record || !discardEdits()) return
  await loadFileContent(
    { id: `saved:${record.id}`, recordId: record.id, name: record.title, path: '' },
    true,
  )
}
watch(
  [code, ModuleTitle, lessonObjectives, lessonCategory],
  () => {
    if (!saveConflict.value) saveMessage.value = ''
  },
  { flush: 'sync' },
)
watch(
  lessonAccountId,
  (_account, previousAccount) => {
    lessonLoadGeneration++
    editorDocumentGeneration++
    loadingLesson.value = false
    lessonQueue.value = []
    queuePlaying.value = false
    reset()
    if (previousAccount) {
      applyLesson('', '')
      aiPrompt.value = ''
      aiGeneratedCode.value = ''
      aiPanelOpen.value = false
    }
  },
  { flush: 'sync' },
)
watch(savedLessons, () => {
  void refreshProgress()
})
// Keep known errors when the code tab closes, but never apply them to another source.
const codeDiagnostics = ref<{ source: string; errorCount: number } | null>(null)
const codeErrorCount = computed(() =>
  codeDiagnostics.value?.source === code.value ? codeDiagnostics.value.errorCount : 0,
)

const reset = (markStopped = true) => {
  if (markStopped) {
    lessonLoadGeneration++
    loadingLesson.value = false
    queuePlaying.value = false
  }
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
  lessonLoadGeneration++
  loadingLesson.value = false
  props.utilityFuncs.notifyUser(`Running a script from instrutor`, title, 2000)
  applyLesson(title, content)
  viewMode.value = 'run'
  executeCode(lessonId ?? title, assignmentId)
}

defineExpose({ reset, executeExternalCode })

// Function to execute code in the context of the provided object
const executeCode = async (lessonId?: string, assignmentId?: string): Promise<boolean> => {
  if (loadingLesson.value) return false
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
    executionResult.value = 'Checking code…'
    const { validateLessonSource } = await loadLessonValidator()
    if (runGeneration !== executionGeneration || aiSignal.aborted) return false
    const issues = await validateLessonSource(source)
    if (runGeneration !== executionGeneration || aiSignal.aborted) return false
    if (issues.length) {
      if (code.value === source) codeDiagnostics.value = { source, errorCount: issues.length }
      props.utilityFuncs.notifyUser('Code errors', issues.slice(0, 3).join('\n'), 6000)
      throw new Error(issues.join('\n'))
    }
    executionResult.value = null
    emit('start', source)

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

const fileTree = computed(() => {
  const tree = Object.create(null) as Record<string, ModuleEntry[]>
  for (const [category, entries] of Object.entries(importedNModuleTree))
    tree[category] = [...entries]
  for (const record of savedLessons.value) {
    const category = record.category || 'Custom lessons'
    ;(tree[category] ??= []).push({
      id: `saved:${record.id}`,
      recordId: record.id,
      name: record.title,
      description: record.objectives,
      category,
      path: '',
    })
  }
  return tree
})
const openLessonGroups = ref(new Set(Object.keys(importedNModuleTree)))
type LessonListEntry = ModuleEntry & { category: string }
const lessons = computed<LessonListEntry[]>(() =>
  Object.entries(fileTree.value).flatMap(([category, entries]) =>
    entries.map((entry) => ({ ...entry, category })),
  ),
)
const filteredLessons = computed(() => {
  const visible = lessons.value.filter(
    (lesson) =>
      libraryTab.value === 'all' ||
      (libraryTab.value === 'mine' ? Boolean(lesson.recordId) : !lesson.recordId),
  )
  const query = lessonFilter.value.trim().toLocaleLowerCase()
  if (!query) return visible
  return visible.filter((lesson) =>
    [lesson.name, lesson.category, lesson.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(query)),
  )
})
const filteredLessonGroups = computed(() =>
  Object.keys(fileTree.value)
    .map((category) => ({
      category,
      lessons: filteredLessons.value
        .filter((lesson) => lesson.category === category)
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
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
  lessons.value.find((lesson) => lesson.id === selectedFile.value),
)
watch(
  savedLessons,
  (records) => {
    const next = new Set(openLessonGroups.value)
    for (const record of records) next.add(record.category || 'Custom lessons')
    openLessonGroups.value = next
  },
  { immediate: true },
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
  lessonQueue.value.findIndex((queued) => queued.id === lesson.id) + 1

const toggleLessonQueue = (lesson: LessonListEntry) => {
  if (queuePlaying.value) return
  const position = queuePosition(lesson)
  lessonQueue.value = position
    ? lessonQueue.value.filter((queued) => queued.id !== lesson.id)
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
    if (!(await loadFileContent(lesson))) break
    viewMode.value = 'run'
    const completed = await executeCode()
    if (!completed) break
    lessonQueue.value = lessonQueue.value.filter((queued) => queued.id !== lesson.id)
  }

  queuePlaying.value = false
}

const selectLesson = async (lesson: ModuleEntry) => {
  await loadFileContent(lesson)
}

const runLesson = async (lesson: ModuleEntry) => {
  if (queuePlaying.value) return
  if (isScriptRunning.value) reset()
  if (!(await loadFileContent(lesson))) return
  viewMode.value = 'run'
  await executeCode()
}

const runSelectedLesson = async () => {
  if (!selectedModule.value) return
  await executeCode()
}

const editLesson = async (lesson: ModuleEntry) => {
  if (!(await loadFileContent(lesson))) return
  viewMode.value = 'code'
}

const openPlayground = () => {
  if (!discardEdits()) return
  lessonLoadGeneration++
  loadingLesson.value = false
  applyLesson('Playground', '')
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
  if (!replaceCurrent && !discardEdits()) return
  lessonLoadGeneration++
  loadingLesson.value = false
  if (!replaceCurrent) {
    applyLesson('AI Draft', aiGeneratedCode.value, '', aiPrompt.value)
    savedSnapshot.value = ''
  } else code.value = aiGeneratedCode.value
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

const loadFileContent = async (file: ModuleEntry, discardConfirmed = false): Promise<boolean> => {
  if (!discardConfirmed && !discardEdits()) return false
  const generation = ++lessonLoadGeneration
  const previousSnapshot = lessonSnapshot()
  loadingLesson.value = true
  try {
    if (file.recordId) {
      const record = await lessonRepository.load(file.recordId)
      if (generation !== lessonLoadGeneration) return false
      if (lessonSnapshot() !== previousSnapshot) throw new Error('Editor changed during loading')
      applyLesson(record.title, record.source, record.category, record.objectives, record, file.id)
    } else {
      const response = await fetch(file.path)
      if (!response.ok) throw new Error('Lesson download failed')
      const text = await response.text()
      if (generation !== lessonLoadGeneration) return false
      if (lessonSnapshot() !== previousSnapshot) throw new Error('Editor changed during loading')
      applyLesson(file.name, text, file.category || '', file.description || '', null, file.id)
    }
    return true
  } catch (error) {
    if (generation !== lessonLoadGeneration) return false
    console.error(error)
    props.utilityFuncs.notifyUser(
      'Unable to load lesson',
      `Could not load ${file.name}. Your current edits are unchanged.`,
      5000,
    )
    return false
  } finally {
    if (generation === lessonLoadGeneration) loadingLesson.value = false
  }
}

const guardUnsavedLesson = (event: BeforeUnloadEvent) => {
  if (!dirtyLesson.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', guardUnsavedLesson)
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
        loadFileContent(found).then((loaded) => {
          if (loaded) executeCode()
        })
      })
  }
})

onUnmounted(() => {
  lessonLoadGeneration++
  editorDocumentGeneration++
  lessonRepository.dispose()
  reset()
  trainingRecorder.dispose()
  disposeProgress()
  window.removeEventListener('keydown', handleEditorKeydown, true)
  window.removeEventListener('beforeunload', guardUnsavedLesson)
  if (runClockTimer) clearInterval(runClockTimer)
})
</script>

<style scoped>
.library-action,
.library-filter {
  flex-shrink: 0;
  height: 1.25rem;
  padding-inline: 0.25rem;
  opacity: 0.65;
}

.library-filter[aria-pressed='true'],
.library-action:hover:not(:disabled),
.library-filter:hover {
  opacity: 1;
}

.library-filter[aria-pressed='true'] {
  text-decoration: underline;
  text-underline-offset: 3px;
  color: rgb(var(--color-panelActive));
}

.library-action:disabled {
  opacity: 0.35;
}

.library-action:focus-visible,
.library-filter:focus-visible,
.library-group:focus-visible,
.lesson-title:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: -1px;
}

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

.action-button[aria-pressed='true'] {
  border-color: rgb(var(--color-panelActive));
  color: rgb(var(--color-panelActive));
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
  height: 1.25rem;
  padding-inline: 0.25rem;
}

.diagnostic-button:hover,
.diagnostic-button:focus-visible {
  background: rgb(var(--color-panelHeaderBackground));
  outline: 1px solid currentColor;
  outline-offset: -1px;
}
</style>
