import { ref, shallowRef } from 'vue'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { applicationTimers } from './ApplicationTimers'

export interface LessonAttempt extends RecordModel {
  start_time: string
  end_time: string
  status: string
  outcome: string
  score: number
  assessment?: { score: number; maxScore: number; passingScore: number; source: string }
  revision: string
  app_commit: string
  model_version: string
  expand?: { revision?: RecordModel & { hash: string } }
}

export function createLessonHistory(
  client: Pick<PocketBase, 'authStore' | 'collection' | 'filter'>,
  lesson: { id: string; legacyId?: string },
) {
  const status = ref<'guest' | 'loading' | 'ready' | 'error'>('guest')
  const attempts = shallowRef<LessonAttempt[]>([])
  const page = ref(1)
  const totalPages = ref(0)
  let generation = 0
  let disposed = false
  let controller: AbortController | undefined

  async function refresh(requestedPage = 1) {
    if (disposed) return
    const current = ++generation
    controller?.abort()
    attempts.value = []
    totalPages.value = 0
    page.value = Math.max(1, Math.floor(requestedPage))
    if (!client.authStore.isValid || !client.authStore.record) {
      status.value = 'guest'
      return
    }
    const accountId = client.authStore.record.id
    const token = client.authStore.token
    controller = new AbortController()
    const signal = controller.signal
    const controllerForRequest = controller
    const timer = applicationTimers.setTimeout(() => controllerForRequest.abort(), 5000)
    status.value = 'loading'
    try {
      const result = await client
        .collection('studentRecords')
        .getList<LessonAttempt>(page.value, 10, {
          filter: client.filter(
            'student = {:student} && (lesson_id = {:id} || lesson_id = {:legacy})',
            {
              student: accountId,
              id: lesson.id,
              legacy: lesson.legacyId ?? lesson.id,
            },
          ),
          sort: '-start_time,-id',
          expand: 'revision',
          // Never download source bundles, raw metrics or event payloads for a history list.
          fields:
            'id,start_time,end_time,status,outcome,score,assessment,revision,app_commit,model_version,expand.revision.hash',
          requestKey: null,
          signal,
          headers: { Authorization: token },
        })
      if (disposed || generation !== current || client.authStore.record?.id !== accountId) return
      attempts.value = result.items
      totalPages.value = result.totalPages
      status.value = 'ready'
    } catch {
      if (!disposed && generation === current) status.value = 'error'
    } finally {
      applicationTimers.clearTimeout(timer)
    }
  }
  const unsubscribe = client.authStore.onChange(() => {
    void refresh()
  }, true)
  return {
    status,
    attempts,
    page,
    totalPages,
    refresh,
    dispose() {
      disposed = true
      generation++
      controller?.abort()
      unsubscribe()
    },
  }
}

export function attemptDuration(attempt: Pick<LessonAttempt, 'start_time' | 'end_time'>) {
  if (!attempt.end_time) return '—'
  const milliseconds = Date.parse(attempt.end_time) - Date.parse(attempt.start_time)
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—'
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}
