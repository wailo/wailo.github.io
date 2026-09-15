import type { TrainingArtifact, TrainingRuntime } from './TrainingArtifact'
import type { LessonRun, createLessonRunStore } from './useLessonRun'

type Send = (path: string, body: unknown) => Promise<unknown>

/** One ordered, bounded-lifetime write chain per attempt; no polling or simulator tick work. */
export function createTrainingRecorder(
  store: ReturnType<typeof createLessonRunStore>,
  authenticatedTransport: () => Send | null,
  reportError: (error: unknown) => void,
  onSaved: () => void = () => {},
) {
  const pending = new Map<string, { send: Send; chain: Promise<unknown>; sequence: number }>()
  const unsubscribe = store.subscribeEvidence((event) => {
    const attempt = pending.get(event.runId)
    if (!attempt) return
    try {
      // Capture now: the store can be replaced or its metrics mutated before the request runs.
      const body = JSON.parse(
        JSON.stringify({
          sequence: ++attempt.sequence,
          kind: event.kind,
          payload: event.payload,
        }),
      )
      attempt.chain = attempt.chain.then(() =>
        attempt.send(`/api/training/attempts/${encodeURIComponent(event.runId)}/events`, body),
      )
      // Observe errors without converting the chain to success (later events must not skip gaps).
      void attempt.chain.catch(reportError)
      if (event.kind === 'finished') {
        pending.delete(event.runId)
        // Refresh account progress only after the terminal event was acknowledged by the server.
        void attempt.chain.then(onSaved, () => {})
      }
    } catch (error) {
      pending.delete(event.runId)
      reportError(error)
    }
  })
  return {
    async start(
      run: LessonRun,
      artifact: TrainingArtifact,
      runtime: TrainingRuntime,
      context: unknown,
    ) {
      const send = authenticatedTransport()
      if (!send) return // Guests remain unrecorded practice; no account is invented.
      const body = {
        runId: run.runId,
        lessonId: run.lessonId,
        assignmentId: run.assignmentId,
        title: run.title,
        clientStartedAt: new Date(run.startedAt).toISOString(),
        artifact: JSON.stringify(artifact),
        appCommit: runtime.appCommit,
        modelVersion: runtime.modelVersion,
        context,
      }
      const chain = send('/api/training/attempts', body)
      pending.set(run.runId, { send, chain, sequence: 0 })
      try {
        await chain
      } catch (error) {
        pending.delete(run.runId)
        // Saving must not prevent practice. Do not send later evidence for this unrecorded run.
        reportError(error)
      }
    },
    dispose() {
      unsubscribe()
      pending.clear()
    },
  }
}
