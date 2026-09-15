import { watch } from 'vue'
import type { LessonRun, createLessonRunStore } from './useLessonRun'

export type LessonState = Pick<LessonRun, 'runId' | 'lessonId' | 'assignmentId' | 'status'> & {
  detail?: string
}

/** Component-owned watcher; synchronous so replacement cannot hide the previous run's stop. */
export function watchLessonLifecycle(
  store: ReturnType<typeof createLessonRunStore>,
  report: (state: LessonState) => void,
) {
  return watch(
    () => [store.current.value?.runId, store.current.value?.status],
    () => {
      const run = store.current.value
      if (!run) return
      report({
        runId: run.runId,
        lessonId: run.lessonId,
        assignmentId: run.assignmentId,
        status: run.status,
        detail: run.events.at(-1)?.message,
      })
    },
    { flush: 'sync' },
  )
}
