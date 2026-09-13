import { ref } from 'vue'
import { applicationTimers } from './ApplicationTimers'
import type { LessonAIRequest, LessonAIResponse } from './ScriptContext'
import type { FeedbackSuggestionInput } from './FeedbackReview'
import type { LessonCheckpoint } from './useLessonRun'

export interface AIRequestEnvelope extends LessonAIRequest {
  requestId: string
  assignmentId: string
  runId: string
}
export interface AIResponseEnvelope {
  requestId: string
  assignmentId: string
  runId: string
  result: LessonAIResponse
}
export type AIPolicy = 'off' | 'review' | 'automatic'
export interface AIJob {
  id: string
  peerId: string
  request: AIRequestEnvelope
  delivery: AIPolicy
  state: 'queued' | 'generating' | 'review' | 'finished'
  suggestion?: FeedbackSuggestionInput
  evidence?: LessonCheckpoint[]
  result?: LessonAIResponse
}
export const aiTimeout = (value?: number) =>
  Number.isFinite(value) ? Math.min(600_000, Math.max(1000, value!)) : 300_000

export function validAIRequest(value: unknown): value is AIRequestEnvelope {
  const r = value as AIRequestEnvelope
  try {
    return Boolean(
      r &&
      r.purpose === 'debrief' &&
      [r.requestId, r.assignmentId, r.runId].every(
        (v) => typeof v === 'string' && v.length > 0 && v.length <= 128,
      ) &&
      r.evidence &&
      typeof r.evidence === 'object' &&
      !Array.isArray(r.evidence) &&
      JSON.stringify(r).length <= 24_000,
    )
  } catch {
    return false
  }
}

/** UI-independent queue. Delivery policy is captured on admission, never chosen by students. */
export function createAICoordinator(deps: {
  current: (peerId: string, assignmentId: string) => boolean
  generate: (job: AIJob, signal: AbortSignal) => Promise<FeedbackSuggestionInput | null>
  deliver: (job: AIJob, result: LessonAIResponse) => void
  concurrency?: number
}) {
  const jobs = ref<AIJob[]>([])
  const controls = new Map<
    string,
    { abort: AbortController; timer: ReturnType<typeof setTimeout> }
  >()
  let active = 0
  const finish = (job: AIJob, result: LessonAIResponse) => {
    if (job.state === 'finished') return
    job.state = 'finished'
    job.result = result
    const control = controls.get(job.id)
    applicationTimers.clearTimeout(control?.timer)
    control?.abort.abort()
    controls.delete(job.id)
    if (deps.current(job.peerId, job.request.assignmentId)) {
      try {
        deps.deliver(job, result)
      } catch {
        job.result = { status: 'failed', reason: 'Could not deliver the AI response.' }
      }
    }
  }
  const pump = () => {
    for (const job of jobs.value) {
      if (active >= (deps.concurrency ?? 2)) break
      if (job.state !== 'queued') continue
      if (!deps.current(job.peerId, job.request.assignmentId)) {
        finish(job, { status: 'cancelled', reason: 'Assignment changed.' })
        continue
      }
      job.state = 'generating'
      active++
      const signal = controls.get(job.id)!.abort.signal
      void Promise.resolve()
        .then(() => deps.generate(job, signal))
        .then((suggestion) => {
          if (signal.aborted) return
          if (!deps.current(job.peerId, job.request.assignmentId)) {
            finish(job, { status: 'cancelled', reason: 'Assignment changed.' })
          } else if (!suggestion) {
            finish(job, { status: 'failed', reason: 'Insufficient evidence for feedback.' })
          } else {
            job.suggestion = suggestion
            if (job.delivery === 'automatic')
              finish(job, { status: 'completed', message: suggestion.message })
            else job.state = 'review'
          }
        })
        .catch((error) => {
          if (!signal.aborted)
            finish(job, {
              status: 'failed',
              reason: String(error instanceof Error ? error.message : error),
            })
        })
        .finally(() => {
          active--
          pump()
        })
    }
  }
  return {
    jobs,
    submit(peerId: string, request: AIRequestEnvelope, delivery: AIPolicy) {
      if (!validAIRequest(request) || !deps.current(peerId, request.assignmentId)) return false
      const id = JSON.stringify([peerId, request.assignmentId, request.runId, request.requestId])
      if (jobs.value.some((j) => j.id === id)) return true
      if (jobs.value.some((j) => j.peerId === peerId && j.state !== 'finished')) return false
      // Bound retained history, preserving active jobs.
      if (jobs.value.length >= 500) {
        const index = jobs.value.findIndex((j) => j.state === 'finished')
        if (index < 0) return false
        jobs.value.splice(index, 1)
      }
      jobs.value.push({
        id,
        peerId,
        request: JSON.parse(JSON.stringify(request)),
        delivery,
        state: 'queued',
      })
      const job = jobs.value[jobs.value.length - 1]
      controls.set(id, {
        abort: new AbortController(),
        timer: applicationTimers.setTimeout(() => {
          finish(job, { status: 'timeout', reason: 'AI request or instructor review timed out.' })
          pump()
        }, aiTimeout(request.timeoutMs)),
      })
      if (delivery === 'off')
        finish(job, { status: 'unavailable', reason: 'Script AI is disabled by the instructor.' })
      pump()
      return true
    },
    approve(id: string) {
      const job = jobs.value.find((j) => j.id === id)
      if (job?.state === 'review' && job.suggestion) {
        finish(
          job,
          deps.current(job.peerId, job.request.assignmentId)
            ? { status: 'completed', message: job.suggestion.message }
            : { status: 'cancelled', reason: 'Assignment changed.' },
        )
      }
    },
    cancel(id: string, dismissed = false) {
      const job = jobs.value.find((j) => j.id === id)
      if (job)
        finish(job, {
          status: dismissed ? 'dismissed' : 'cancelled',
          reason: dismissed ? 'Instructor dismissed feedback.' : 'Request cancelled.',
        })
      pump()
    },
    expire() {
      for (const job of jobs.value)
        if (!deps.current(job.peerId, job.request.assignmentId))
          finish(job, { status: 'cancelled', reason: 'Classroom or assignment changed.' })
      pump()
    },
    dispose() {
      for (const job of jobs.value)
        finish(job, { status: 'cancelled', reason: 'Classroom closed.' })
    },
  }
}

/** Correlates responses to a particular script execution, not just a student. */
export function createAIClient(
  send: (type: 'ai-request' | 'ai-cancel', payload: AIRequestEnvelope) => void,
) {
  const pending = new Map<
    string,
    { request: AIRequestEnvelope; settle: (result: LessonAIResponse) => void }
  >()
  return {
    request(request: AIRequestEnvelope, signal?: AbortSignal): Promise<LessonAIResponse> {
      if (!validAIRequest(request))
        return Promise.resolve({ status: 'failed', reason: 'Invalid or oversized AI request.' })
      if (pending.has(request.requestId))
        return Promise.resolve({ status: 'failed', reason: 'Duplicate request ID.' })
      return new Promise((resolve) => {
        const settle = (result: LessonAIResponse) => {
          applicationTimers.clearTimeout(timer)
          signal?.removeEventListener('abort', abort)
          pending.delete(request.requestId)
          resolve(result)
        }
        const abort = () => {
          try {
            send('ai-cancel', request)
          } catch {
            /* Already disconnected. */
          }
          settle({ status: 'cancelled', reason: 'Lesson stopped.' })
        }
        const timer = applicationTimers.setTimeout(() => {
          try {
            send('ai-cancel', request)
          } catch {
            /* Already disconnected. */
          }
          settle({ status: 'timeout', reason: 'AI response timed out.' })
        }, aiTimeout(request.timeoutMs))
        pending.set(request.requestId, { request, settle })
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) {
          abort()
          return
        }
        try {
          send('ai-request', request)
        } catch {
          settle({ status: 'unavailable', reason: 'Instructor connection unavailable.' })
        }
      })
    },
    receive(response: AIResponseEnvelope) {
      const item = pending.get(response?.requestId)
      if (
        !item ||
        response.assignmentId !== item.request.assignmentId ||
        response.runId !== item.request.runId
      )
        return
      const r = response.result
      if (
        !r ||
        (r.status === 'completed'
          ? typeof r.message !== 'string' || r.message.length > 600
          : !['unavailable', 'timeout', 'cancelled', 'failed', 'dismissed'].includes(r.status) ||
            typeof r.reason !== 'string')
      )
        return
      item.settle(r)
    },
    dispose() {
      for (const item of pending.values())
        item.settle({ status: 'cancelled', reason: 'Classroom or assignment changed.' })
    },
  }
}
