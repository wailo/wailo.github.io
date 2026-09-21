import { ref, shallowRef } from 'vue'
import type PocketBase from 'pocketbase'

export interface SavedLesson {
  id: string
  owner: string
  title: string
  objectives: string
  category: string
  source: string
  revision: number
  updated: string
}
export type LessonSummary = Omit<SavedLesson, 'source'>
export type LessonDraft = Pick<SavedLesson, 'title' | 'objectives' | 'category' | 'source'>

/** Requests and their results stay bound to the account that initiated them. */
export function createLessonRepository(
  client: Pick<PocketBase, 'authStore' | 'collection' | 'send'>,
) {
  const accountId = ref('')
  const lessons = shallowRef<LessonSummary[]>([])
  const status = ref<'guest' | 'loading' | 'ready' | 'error'>('guest')
  let session = 0
  let listing = 0
  let disposed = false
  const identity = () => (client.authStore.isValid ? (client.authStore.record?.id ?? '') : '')
  function capture() {
    const id = identity()
    if (!id || disposed) throw new Error('Sign in to save lessons to your account.')
    const generation = session
    return {
      options: {
        requestKey: null,
        headers: { Authorization: client.authStore.token },
        signal: AbortSignal.timeout(15000),
      },
      check() {
        if (disposed || generation !== session || identity() !== id)
          throw new Error('Account changed. Reopen the lesson from your library.')
      },
    }
  }
  async function refresh() {
    const current = ++listing
    if (!identity() || disposed) return
    const request = capture()
    status.value = 'loading'
    try {
      const result = await client.collection('lessons').getFullList<LessonSummary>({
        ...request.options,
        sort: '-updated,id',
        fields: 'id,owner,title,objectives,category,revision,updated',
      })
      request.check()
      if (current !== listing) return
      lessons.value = result
      status.value = 'ready'
    } catch {
      if (!disposed && current === listing) status.value = 'error'
    }
  }
  const unsubscribe = client.authStore.onChange(() => {
    const id = identity()
    if (id !== accountId.value) {
      session++
      listing++
      lessons.value = []
      accountId.value = id
    }
    if (!id) status.value = 'guest'
    else void refresh()
  }, true)
  return {
    accountId,
    lessons,
    status,
    refresh,
    async load(id: string) {
      const request = capture()
      const record = await client.collection('lessons').getOne<SavedLesson>(id, request.options)
      request.check()
      return record
    },
    async save(draft: LessonDraft, existing?: Pick<SavedLesson, 'id' | 'revision'>) {
      const request = capture()
      const record = await client.send<SavedLesson>('/api/lesson-library/save', {
        ...request.options,
        method: 'POST',
        body: { ...draft, id: existing?.id, expectedRevision: existing?.revision },
      })
      request.check()
      // A previous list response must not overwrite this acknowledged save.
      listing++
      const { source: _source, ...summary } = record
      lessons.value = [summary, ...lessons.value.filter((lesson) => lesson.id !== record.id)]
      status.value = 'ready'
      return record
    },
    dispose() {
      disposed = true
      session++
      listing++
      unsubscribe()
    },
  }
}
