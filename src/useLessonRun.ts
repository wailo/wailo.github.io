import { computed, readonly, ref } from 'vue'
import type {
  AskQuestionOptions,
  CheckpointData,
  QuestionChoice,
  QuestionResult,
} from './ScriptContext'

export type LessonRunStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'ERROR'
export interface LessonRunEvent {
  id: number
  timestamp: number
  time: string
  message: string
  replaceKey?: string
}
export interface LessonCheckpoint {
  timestamp: number
  message: string
  data?: CheckpointData
}
export interface LessonAnswer {
  timestamp: number
  title: string
  question: string
  mode?: 'practice' | 'assessment'
  choices?: QuestionChoice[]
  result: QuestionResult
}
export interface LessonRun {
  runId: string
  lessonId: string
  title: string
  status: LessonRunStatus
  startedAt: number
  endedAt: number | null
  step: string | null
  events: LessonRunEvent[]
  checkpoints: LessonCheckpoint[]
  answers: LessonAnswer[]
  // Preserve the existing script-owned metric format and database payload.
  metrics: any[]
}

/** One store per simulator; the factory also allows isolated consumers/tests. */
export function createLessonRunStore() {
  const current = ref<LessonRun | null>(null)
  let eventId = 0
  const active = (runId: string) =>
    current.value?.runId === runId && current.value.status === 'RUNNING'

  const addEvent = (runId: string, message: string, replaceKey?: string) => {
    if (!active(runId)) return
    const run = current.value!
    const timestamp = Date.now()
    const seconds = Math.max(0, Math.floor((timestamp - run.startedAt) / 1000))
    const event = {
      id: ++eventId,
      timestamp,
      time: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
      message,
      replaceKey,
    }
    const index = replaceKey ? run.events.findIndex((item) => item.replaceKey === replaceKey) : -1
    if (index >= 0) run.events[index] = { ...event, id: run.events[index].id }
    else run.events.push(event)
  }

  const finish = (runId: string, status: 'COMPLETED' | 'STOPPED' | 'ERROR', message: string) => {
    if (!active(runId)) return
    addEvent(runId, message)
    current.value!.status = status
    current.value!.endedAt = Date.now()
  }

  return {
    current: readonly(current),
    status: computed(() => current.value?.status ?? 'IDLE'),
    startedAt: computed(() => current.value?.startedAt ?? null),
    events: computed(() => readonly(current.value?.events ?? [])),
    begin(lessonId: string, title: string) {
      if (current.value) finish(current.value.runId, 'STOPPED', 'Lesson replaced')
      current.value = {
        runId: crypto.randomUUID(),
        lessonId,
        title,
        status: 'RUNNING',
        startedAt: Date.now(),
        endedAt: null,
        step: null,
        events: [],
        checkpoints: [],
        answers: [],
        metrics: [],
      }
      addEvent(current.value.runId, `Started ${title || 'lesson'}`)
      // Only the executor needs the mutable metric array used by existing scripts.
      return { runId: current.value.runId, metrics: current.value.metrics }
    },
    addEvent,
    finish,
    recordCheckpoint(runId: string, message: string, data?: CheckpointData) {
      if (!active(runId)) return
      const checkpoint: LessonCheckpoint = { timestamp: Date.now(), message }
      if (data !== undefined) checkpoint.data = JSON.parse(JSON.stringify(data))
      if (typeof checkpoint.data?.step === 'string') current.value!.step = checkpoint.data.step
      current.value!.checkpoints.push(checkpoint)
      addEvent(runId, message)
      return checkpoint
    },
    recordAnswer(runId: string, options: AskQuestionOptions, result: QuestionResult) {
      if (!active(runId) || result.cancelled) return
      current.value!.answers.push({
        timestamp: Date.now(),
        title: options.title,
        question: options.question,
        mode: options.type === 'multiple-choice' ? (options.mode ?? 'practice') : undefined,
        choices:
          options.type === 'multiple-choice'
            ? options.choices.map((choice) => ({ ...choice }))
            : undefined,
        result: { ...result },
      })
    },
    snapshot(): LessonRun | null {
      return current.value ? JSON.parse(JSON.stringify(current.value)) : null
    },
  }
}

const lessonRunStore = createLessonRunStore()
export const useLessonRun = () => lessonRunStore
