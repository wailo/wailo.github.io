// A replaced, stopped or unmounted run has to unwind its lesson awaits. Those
// rejections are expected control flow: they must not be reported to the user or
// logged as script failures.
export const LESSON_CANCELLED = 'Lesson run cancelled'
export const LESSON_STOPPED = 'Lesson stopped.'

export class LessonCancelledError extends Error {
  constructor() {
    super(LESSON_CANCELLED)
    this.name = 'LessonCancelledError'
  }
}

export const isLessonCancelled = (error: unknown): boolean => {
  if (error instanceof LessonCancelledError) return true
  if (!(error instanceof Error)) return false
  return (
    error.name === 'AbortError' ||
    error.message === LESSON_CANCELLED ||
    error.message === LESSON_STOPPED
  )
}
