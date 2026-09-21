import assert from 'node:assert/strict'
import test from 'node:test'
import { ref, computed } from 'vue'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const entry = { id: 'saved:abc', recordId: 'abc', name: 'Saved', path: '' }
const record = {
  id: 'abc',
  owner: 'owner',
  title: 'Saved',
  objectives: 'Objectives',
  category: 'Flight',
  source: 'saved source',
  revision: 2,
}

test('combined library defaults to All and composes source filters with search', () => {
  const names = ['libraryTab', 'lessons', 'filteredLessons', 'filteredLessonGroups']
  const lessonFilter = ref('')
  const fileTree = ref({
    Flight: [
      { id: 'landing', name: 'Landing' },
      { id: 'saved:altitude', recordId: 'altitude', name: 'Altitude' },
    ],
    Navigation: [{ id: 'routing', name: 'Routing' }],
  })
  const api = evaluate(
    `${declarations(componentScript('Editor'), names)}; return {${names.join(',')}}`,
    { ref, computed, fileTree, lessonFilter },
  )
  assert.equal(api.libraryTab.value, 'all')
  assert.equal(api.filteredLessons.value.length, 3)
  assert.deepEqual(api.filteredLessonGroups.value[0].lessons.map(l => l.name), ['Altitude', 'Landing'])
  api.libraryTab.value = 'mine'
  assert.deepEqual(api.filteredLessons.value.map(l => l.id), ['saved:altitude'])
  lessonFilter.value = 'navigation'
  assert.equal(api.filteredLessonGroups.value.length, 0)
  api.libraryTab.value = 'demo'
  assert.deepEqual(api.filteredLessons.value.map(l => l.id), ['routing'])
  lessonFilter.value = '  LANDING '
  assert.deepEqual(api.filteredLessons.value.map(l => l.id), ['landing'])
  assert.equal(fileTree.value.Flight[0].name, 'Landing')
})

function fixture() {
  const requests = [],
    notices = []
  const deps = {
    ref,
    computed,
    ModuleTitle: ref(''),
    selectedFile: ref(''),
    lessonAccountId: ref('owner'),
    libraryTab: ref('demo'),
    window: { confirm: () => true },
    console: { error() {} },
    refreshProgress() {},
    props: { utilityFuncs: { notifyUser: (...args) => notices.push(args) } },
    fetch: async () => {
      throw new Error('Offline')
    },
    lessonRepository: {
      load(id) {
        const d = deferred()
        requests.push({ kind: 'load', id, ...d })
        return d.promise
      },
      save(draft, existing) {
        const d = deferred()
        requests.push({ kind: 'save', draft, existing, ...d })
        return d.promise
      },
    },
  }
  const names = [
    'code',
    'loadedLesson',
    'lessonObjectives',
    'lessonCategory',
    'savedSnapshot',
    'lessonSnapshot',
    'dirtyLesson',
    'savingLesson',
    'loadingLesson',
    'saveMessage',
    'saveConflict',
    'lessonLoadGeneration',
    'editorDocumentGeneration',
    'discardEdits',
    'applyLesson',
    'saveLesson',
    'reloadSavedLesson',
    'loadFileContent',
  ]
  const api = evaluate(
    `${declarations(componentScript('Editor'), names)}; return {${names.join(',')}}`,
    deps,
  )
  return { ...api, deps, requests, notices }
}

test('loads by record ID and keeps the revision needed for a later save', async () => {
  const f = fixture()
  const loading = f.loadFileContent(entry)
  assert.equal(f.requests[0].id, 'abc')
  f.requests[0].resolve(record)
  assert.equal(await loading, true)
  assert.equal(f.code.value, record.source)
  assert.equal(f.deps.selectedFile.value, entry.id)
  assert.equal(f.loadedLesson.value.revision, 2)
  assert.equal(f.dirtyLesson.value, false)
})

test('a failed download never replaces the previous source or launches the wrong lesson', async () => {
  const f = fixture()
  f.applyLesson('Current', 'current source')
  assert.equal(await f.loadFileContent({ id: 'demo', name: 'Demo', path: '/missing.ts' }), false)
  assert.equal(f.code.value, 'current source')
  assert.equal(f.deps.ModuleTitle.value, 'Current')
  assert.equal(f.loadingLesson.value, false)
  assert.equal(f.notices.length, 1)
})

test('slow responses cannot overwrite a newer selection or edits made during loading', async () => {
  const f = fixture()
  const first = f.loadFileContent(entry)
  const second = f.loadFileContent({ ...entry, id: 'saved:other', recordId: 'other' })
  f.requests[1].resolve({ ...record, id: 'other', source: 'newer lesson' })
  assert.equal(await second, true)
  f.requests[0].resolve(record)
  assert.equal(await first, false)
  assert.equal(f.code.value, 'newer lesson')
  const third = f.loadFileContent(entry)
  f.code.value = 'typed while loading'
  f.requests[2].resolve(record)
  assert.equal(await third, false)
  assert.equal(f.code.value, 'typed while loading')
})

test('save captures current content without replacing edits made while the request is pending', async () => {
  const f = fixture()
  f.applyLesson(record.title, record.source, record.category, record.objectives, record, entry.id)
  f.code.value = 'unfinished ='
  const saving = f.saveLesson(false)
  assert.equal(f.requests[0].draft.source, 'unfinished =')
  assert.equal(f.requests[0].existing.revision, 2)
  f.code.value = 'newer edit'
  f.requests[0].resolve({ ...record, source: 'unfinished =', revision: 3 })
  await saving
  assert.equal(f.code.value, 'newer edit')
  assert.equal(f.dirtyLesson.value, true)
  assert.equal(f.loadedLesson.value.revision, 3)
  assert.match(f.saveMessage.value, /Newer edits/)
})

test('conflicts preserve the draft; Save a copy removes the original record identity', async () => {
  const f = fixture()
  f.applyLesson(record.title, 'my changes', record.category, record.objectives, record, entry.id)
  const saving = f.saveLesson(false)
  f.requests[0].reject({ status: 409 })
  await saving
  assert.equal(f.code.value, 'my changes')
  assert.equal(f.saveConflict.value, true)
  assert.equal(f.loadedLesson.value.revision, 2)
  const copying = f.saveLesson(true)
  assert.equal(f.requests[1].existing, undefined)
  f.requests[1].resolve({ ...record, id: 'copy', source: 'my changes', revision: 1 })
  await copying
  assert.equal(f.deps.selectedFile.value, 'saved:copy')
  assert.equal(f.saveConflict.value, false)
})

test('a save completing after switching lessons does not switch the editor back', async () => {
  const f = fixture()
  f.applyLesson(record.title, record.source, '', '', record, entry.id)
  const saving = f.saveLesson(false)
  f.applyLesson('Another lesson', 'other source')
  f.requests[0].resolve({ ...record, revision: 3 })
  await saving
  assert.equal(f.code.value, 'other source')
  assert.equal(f.loadedLesson.value, null)
})
