import { computed, ref, shallowRef } from 'vue'
import type PocketBase from 'pocketbase'
import { applicationTimers } from './ApplicationTimers'

export interface LessonProgressSummary {
  lessonId: string
  completedAttempts: number
  lastCompletedAt: string
  latestAttemptAt: string
  latestStatus: string
  latestOutcome: string
}
type LessonIdentity = { id: string; legacyId?: string }

/** Aliases are explicit catalogue metadata, never inferred from titles or current filenames. */
export function indexLessonProgress(rows: LessonProgressSummary[], catalogue: LessonIdentity[]) {
  const aliases = new Map<string, string>()
  for (const lesson of catalogue) {
    aliases.set(lesson.id, lesson.id)
    if (lesson.legacyId) aliases.set(lesson.legacyId, lesson.id)
  }
  const result = new Map<string, LessonProgressSummary>()
  for (const row of rows) {
    const id = aliases.get(row.lessonId)
    if (!id) continue
    const previous = result.get(id)
    const latest = previous && previous.latestAttemptAt > row.latestAttemptAt ? previous : row
    result.set(id, {
      ...latest,
      lessonId: id,
      completedAttempts: (previous?.completedAttempts ?? 0) + row.completedAttempts,
      lastCompletedAt:
        previous && previous.lastCompletedAt > row.lastCompletedAt
          ? previous.lastCompletedAt
          : row.lastCompletedAt,
    })
  }
  return result
}

export function createLessonProgress(
  client: Pick<PocketBase, 'authStore' | 'send'>,
  catalogue: LessonIdentity[],
) {
  const status = ref<'guest' | 'loading' | 'ready' | 'error'>('guest')
  const byLesson = shallowRef(new Map<string, LessonProgressSummary>())
  const completedCount = computed(
    () => [...byLesson.value.values()].filter((row) => row.completedAttempts > 0).length,
  )
  let generation = 0
  let controller: AbortController | undefined
  let disposed = false
  async function refresh() {
    if (disposed) return
    const current = ++generation
    controller?.abort()
    byLesson.value = new Map()
    if (!client.authStore.isValid || !client.authStore.record) {
      status.value = 'guest'
      return
    }
    const accountId = client.authStore.record.id
    const token = client.authStore.token
    status.value = 'loading'
    const requestController = new AbortController()
    controller = requestController
    const timer = applicationTimers.setTimeout(() => requestController.abort(), 5000)
    try {
      const result = await client.send<{ lessons: LessonProgressSummary[] }>(
        '/api/training/progress',
        {
          method: 'GET',
          requestKey: null,
          signal: requestController.signal,
          headers: { Authorization: token },
        },
      )
      if (disposed || current !== generation || client.authStore.record?.id !== accountId) return
      if (
        !Array.isArray(result.lessons) ||
        result.lessons.some(
          (row) =>
            !row ||
            typeof row.lessonId !== 'string' ||
            !Number.isSafeInteger(row.completedAttempts) ||
            row.completedAttempts < 0 ||
            typeof row.lastCompletedAt !== 'string' ||
            typeof row.latestAttemptAt !== 'string' ||
            typeof row.latestStatus !== 'string' ||
            typeof row.latestOutcome !== 'string',
        )
      )
        throw new Error('Invalid lesson progress response')
      byLesson.value = indexLessonProgress(result.lessons, catalogue)
      status.value = 'ready'
    } catch {
      if (!disposed && current === generation) status.value = 'error'
    } finally {
      applicationTimers.clearTimeout(timer)
    }
  }
  const unsubscribe = client.authStore.onChange(() => {
    void refresh()
  }, true)
  return {
    status,
    byLesson,
    completedCount,
    refresh,
    dispose() {
      disposed = true
      generation++
      controller?.abort()
      unsubscribe()
    },
  }
}
