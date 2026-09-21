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
