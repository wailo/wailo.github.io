import { readonly, ref } from 'vue'
import type { InstructorActionResult } from './InstructorActions'
import type { LessonCheckpoint } from './useLessonRun'

export interface FeedbackSuggestionInput {
  id: string
  peerId: string
  assignmentId: string
  message: string
  /** References to real checkpoints, not model-supplied measurement values. */
  evidence: Array<{ timestamp: number; message: string }>
}
export interface FeedbackSuggestion extends FeedbackSuggestionInput {
  createdAt: number
  evidence: LessonCheckpoint[]
  status: 'pending' | 'sent' | 'dismissed' | 'expired'
  error?: string
}
interface Dependencies {
  assignment: (peerId: string) => { id: string; checkpoints: LessonCheckpoint[] } | undefined
  send: (peerId: string, assignmentId: string, message: string) => InstructorActionResult
}

/** The adapter can enqueue suggestions; only an explicit review action sends them. */
export function createFeedbackReview(deps: Dependencies) {
  const suggestions = ref<FeedbackSuggestion[]>([])
  const isCurrent = (item: FeedbackSuggestionInput) =>
    deps.assignment(item.peerId)?.id === item.assignmentId
  const expireStale = () => {
    for (const item of suggestions.value) {
      if (item.status === 'pending' && !isCurrent(item)) item.status = 'expired'
    }
  }
  return {
    suggestions: readonly(suggestions),
    expireStale,
    enqueue(input: FeedbackSuggestionInput): { accepted: boolean; reason?: string } {
      if (
        !input ||
        ![input.id, input.peerId, input.assignmentId, input.message].every(
          (value) => typeof value === 'string' && value.trim().length > 0,
        )
      ) {
        return { accepted: false, reason: 'Incomplete suggestion' }
      }
      if (suggestions.value.some((item) => item.id === input.id))
        return { accepted: false, reason: 'Duplicate suggestion' }
      if (!isCurrent(input)) return { accepted: false, reason: 'Assignment changed' }
      const checkpoints = deps.assignment(input.peerId)!.checkpoints
      if (!Array.isArray(input.evidence) || !input.evidence.length)
        return { accepted: false, reason: 'Supporting checkpoints required' }
      const evidence = input.evidence.map((reference) =>
        checkpoints.find(
          (checkpoint) =>
            reference &&
            checkpoint.timestamp === reference.timestamp &&
            checkpoint.message === reference.message,
        ),
      )
      if (evidence.some((checkpoint) => !checkpoint))
        return { accepted: false, reason: 'Unknown supporting checkpoint' }
      suggestions.value.push({
        ...input,
        message: input.message.trim(),
        createdAt: Date.now(),
        status: 'pending',
        evidence: JSON.parse(JSON.stringify(evidence)),
      })
      return { accepted: true }
    },
    dismiss(id: string) {
      const item = suggestions.value.find((item) => item.id === id)
      if (item?.status === 'pending') item.status = 'dismissed'
    },
    approve(id: string): InstructorActionResult | undefined {
      expireStale()
      const item = suggestions.value.find((item) => item.id === id)
      if (!item || item.status !== 'pending') return undefined
      let result: InstructorActionResult
      try {
        result = deps.send(item.peerId, item.assignmentId, item.message)
      } catch (error) {
        result = { peerId: item.peerId, status: 'failed', reason: String(error) }
      }
      if (result.status === 'sent') {
        item.status = 'sent'
        item.error = undefined
      } else {
        item.error = result.reason || 'Message was not sent'
      }
      return result
    },
  }
}
