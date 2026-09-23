import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { declarations, evaluate } from './helpers/vue-script.mjs'

const sourceFile = (name) =>
  ts.createSourceFile(
    name,
    readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )

test('closing an editor keeps type libraries alive until a concurrent validation releases them', () => {
  let registered = 0,
    disposed = 0
  const monaco = {
    typescript: {
      ScriptTarget: { ES2020: 1 },
      ModuleKind: { ESNext: 1 },
      typescriptDefaults: {
        setCompilerOptions() {},
        addExtraLib() {
          registered++
          return {
            dispose() {
              disposed++
            },
          }
        },
      },
    },
  }
  const api = evaluate(
    `${declarations(sourceFile('LessonEditorEnvironment'), ['users', 'libraries', 'acquireLessonTypes']).replace('export function', 'function')}; return {acquireLessonTypes}`,
    {
      monaco,
      typesDefinitions: '',
      simMetaTypes: '',
      scriptApiTypes: '',
      createEditorTypeLibraries: () => [{ content: '', filePath: '/types.d.ts' }],
    },
  )
  const editor = api.acquireLessonTypes()
  const validation = api.acquireLessonTypes()
  assert.equal(registered, 1)
  editor.dispose()
  editor.dispose()
  assert.equal(disposed, 0)
  validation.dispose()
  assert.equal(disposed, 1)
  api.acquireLessonTypes().dispose()
  assert.equal(registered, 2)
  assert.equal(disposed, 2)
})

function validationFixture(fail = false) {
  const calls = []
  const worker = {
    async getSyntacticDiagnostics(filename) {
      calls.push(['syntax', filename])
      return [{ category: 1, start: 0, messageText: 'Syntax error' }]
    },
    async getSemanticDiagnostics(filename) {
      calls.push(['types', filename])
      return [
        {
          category: 1,
          start: 10,
          messageText: { messageText: 'Wrong type', next: [{ messageText: 'Expected number' }] },
        },
        { category: 0, start: 0, messageText: 'Warning only' },
      ]
    },
  }
  const monaco = {
    Uri: { parse: (uri) => ({ toString: () => uri }) },
    editor: {
      createModel(source, language, uri) {
        calls.push(['model', source, language])
        return {
          uri,
          getPositionAt: (offset) => ({ lineNumber: offset ? 2 : 1 }),
          dispose() {
            calls.push('dispose model')
          },
        }
      },
    },
    typescript: {
      async getTypeScriptWorker() {
        if (fail) throw new Error('Worker failed')
        return async () => worker
      },
    },
  }
  const api = evaluate(
    `${declarations(sourceFile('LessonScriptValidation'), ['validateLessonSource']).replace('export async', 'async')}; return {validateLessonSource}`,
    {
      monaco,
      ensureTypeScriptReady: async () => {},
      acquireLessonTypes: () => ({
        dispose() {
          calls.push('dispose types')
        },
      }),
    },
  )
  return { ...api, calls }
}

test('frontend validation checks syntax and semantics on the same snapshot, and reports errors only', async () => {
  const f = validationFixture()
  assert.deepEqual(await f.validateLessonSource('snapshot'), [
    'Line 1: Syntax error',
    'Line 2: Wrong type Expected number',
  ])
  assert.deepEqual(f.calls[0], ['model', 'snapshot', 'typescript'])
  assert.equal(f.calls[1][1], f.calls[2][1])
  assert.match(f.calls[1][1], /^file:\/\/\/public\/LearningModules\/check-/)
  assert.deepEqual(f.calls.slice(-2), ['dispose model', 'dispose types'])
})

test('worker failures still release the temporary model and type libraries', async () => {
  const f = validationFixture(true)
  await assert.rejects(f.validateLessonSource('snapshot'), /Worker failed/)
  assert.deepEqual(f.calls.slice(-2), ['dispose model', 'dispose types'])
})

function initializationFixture() {
  const calls = []
  let fail = false
  const worker = async () => {
    if (fail) throw new Error('Worker unavailable')
  }
  const monaco = {
    editor: {
      create(_host, options) {
        assert.equal(options.model, null)
        calls.push('editor')
        return {
          setModel() {
            calls.push('attach')
          },
          dispose() {
            calls.push('dispose editor')
          },
        }
      },
      createModel() {
        calls.push('model')
        return {
          uri: {},
          dispose() {
            calls.push('dispose model')
          },
        }
      },
    },
    typescript: { getTypeScriptWorker: async () => worker },
  }
  const api = evaluate(
    `${declarations(sourceFile('LessonEditorEnvironment'), ['initialization', 'waitForTypeScriptRegistration', 'ensureTypeScriptReady']).replace('export function', 'function')}; return {ensureTypeScriptReady}`,
    { monaco, document: { createElement: () => ({}) } },
  )
  return {
    ...api,
    calls,
    setFail(value) {
      fail = value
    },
  }
}

test('internal initialization is shared, creates editor before model, and disposes temporary resources', async () => {
  const f = initializationFixture()
  const first = f.ensureTypeScriptReady()
  assert.equal(f.ensureTypeScriptReady(), first)
  await first
  await f.ensureTypeScriptReady()
  assert.deepEqual(f.calls, ['editor', 'model', 'attach', 'dispose editor', 'dispose model'])
})

test('failed initialization cleans up and permits a later retry', async () => {
  const f = initializationFixture()
  f.setFail(true)
  await assert.rejects(f.ensureTypeScriptReady(), /Worker unavailable/)
  assert.deepEqual(f.calls.slice(-2), ['dispose editor', 'dispose model'])
  f.setFail(false)
  await f.ensureTypeScriptReady()
  assert.equal(f.calls.filter((call) => call === 'editor').length, 2)
})

function registrationFixture(getTypeScriptWorker) {
  let now = 0
  let waits = 0
  const api = evaluate(
    `${declarations(sourceFile('LessonEditorEnvironment'), ['waitForTypeScriptRegistration'])}; return {waitForTypeScriptRegistration}`,
    {
      monaco: { typescript: { getTypeScriptWorker } },
      Date: { now: () => now },
      setTimeout(resolve, milliseconds) {
        waits++
        now += milliseconds
        resolve()
      },
    },
  )
  return { ...api, waits: () => waits }
}

test('initial worker lookup waits for delayed TypeScript registration', async () => {
  let attempts = 0
  const worker = async () => ({})
  const f = registrationFixture(async () => {
    if (++attempts < 4) throw 'TypeScript not registered!'
    return worker
  })
  assert.equal(await f.waitForTypeScriptRegistration(), worker)
  assert.equal(f.waits(), 3)
})

test('registered TypeScript proceeds immediately and real worker failures are not retried', async () => {
  const worker = async () => ({})
  const ready = registrationFixture(async () => worker)
  assert.equal(await ready.waitForTypeScriptRegistration(), worker)
  assert.equal(ready.waits(), 0)
  const failure = new Error('Worker download failed')
  const broken = registrationFixture(async () => {
    throw failure
  })
  await assert.rejects(broken.waitForTypeScriptRegistration(), (error) => error === failure)
  assert.equal(broken.waits(), 0)
})

test('missing TypeScript registration times out instead of leaving Run pending forever', async () => {
  const f = registrationFixture(async () => {
    throw 'TypeScript not registered!'
  })
  await assert.rejects(f.waitForTypeScriptRegistration(), /TypeScript initialization timed out/)
  assert.equal(f.waits(), 400)
})
