import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { ref, computed, watch, nextTick, shallowReactive, effectScope } from 'vue'
import {
  prepareTrainingArtifact,
  loadUserScript,
  validateGeneratedLesson,
} from '../src/EditorScriptRuntime.ts'
import { stripImportsExports } from '../src/ScriptSource.ts'
import { createScriptContext, runUserScript } from '../src/ScriptContext.ts'
import { createLessonRunStore } from '../src/useLessonRun.ts'
import { createTrainingRecorder } from '../src/TrainingRecorder.ts'
import { componentScript, declarations, hook, evaluate } from './helpers/vue-script.mjs'

const compiler = { prepareTrainingArtifact, loadUserScript, validateGeneratedLesson }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function runnerFixture(loadLessonCompiler = async () => compiler) {
  const lessonRun = createLessonRunStore()
  const events = [],
    checkpoints = [],
    sessions = []
  const deps = {
    navigator: { userAgent: 'test-browser' },
    trainingRecorder: { start: async () => {} },
    ref,
    computed,
    stripImportsExports,
    createScriptContext,
    runUserScript,
    lessonRun,
    runStatus: lessonRun.status,
    loadLessonCompiler,
    ModuleTitle: ref('Test'),
    selectedFile: ref(''),
    selectedModule: ref(null),
    viewMode: ref('lessons'),
    completedLessons: ref(new Set()),
    runClock: ref(0),
    queuePlaying: ref(false),
    resetTimeouts() {},
    repositionWithAutopilot() {},
    waitFor() {},
    waitForCondition() {},
    LayoutTypes: {},
    props: {
      contextObject: { FLIGHTMODEL_VERSION: 'test' },
      simProps: {},
      utilityFuncs: {
        cancelPromptInteractions() {},
        notifyUser() {},
        checkPoint: (...args) => checkpoints.push(args),
      },
    },
    submitSession: async (data) => sessions.push(data),
    emit: (...args) => events.push(args),
    console: { error() {} },
  }
  const source = componentScript('Editor')
  const code = declarations(source, [
    'executionGeneration',
    'aiRunController',
    'executionResult',
    'code',
    'reset',
    'executeCode',
    'executeExternalCode',
  ]).replaceAll('import.meta.env.VITE_GIT_SHA', '"' + 'a'.repeat(40) + '"')
  const api = evaluate(`${code}; return {code, reset, executeCode, executeExternalCode}`, deps)
  return { ...api, deps, events, checkpoints, sessions, lessonRun }
}

test('assigned execution uses assignment identity and local stop finishes that same run', () => {
  const f = runnerFixture(() => new Promise(() => {}))
  f.deps.selectedModule.value = { path: 'unrelated-local-lesson' }
  f.executeExternalCode('Assigned test', '', 'assignment-123')
  assert.equal(f.lessonRun.current.value.assignmentId, 'assignment-123')
  assert.equal(f.lessonRun.current.value.lessonId, 'Assigned test')
  assert.equal(f.lessonRun.status.value, 'RUNNING')
  f.reset()
  assert.equal(f.lessonRun.status.value, 'STOPPED')
  assert.equal(f.lessonRun.current.value.assignmentId, 'assignment-123')
})

test('lesson shell has only dynamic dependencies on Monaco and the compiler', () => {
  const source = componentScript('Editor')
  const imports = source.statements
    .filter(ts.isImportDeclaration)
    .map((node) => node.moduleSpecifier.text)
  assert.ok(
    !imports.some((path) => /monaco|typescript|EditorScriptRuntime|editorTypes|\?raw/.test(path)),
  )
  assert.match(
    declarations(source, ['LessonCodeEditor']),
    /loader: \(\) => import\('\.\/LessonCodeEditor.vue'\)/,
  )
  assert.match(
    declarations(source, ['loadLessonCompiler']),
    /import\('\.\.\/EditorScriptRuntime'\)/,
  )
  const text = readFileSync(new URL('../src/components/Editor.vue', import.meta.url), 'utf8')
  assert.match(text, /<div v-else class="relative[^]*?<LessonCodeEditor[^]*?v-model:value="code"/)
  const cleanup = readFileSync(new URL('../src/ScriptSource.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(cleanup, /from ['"]typescript['"]|import\(/)
})

test('assigned lesson executes checkpoints and saves results without opening CODE', async () => {
  const f = runnerFixture()
  f.executeExternalCode(
    'Assigned test',
    `export async function main(context: ScriptContext) {
    context.checkPoint('Test complete', {score: 6}); context.metrics.push({score: 6});
  }`,
  )
  await new Promise(setImmediate)
  assert.equal(f.deps.viewMode.value, 'run')
  assert.equal(f.lessonRun.status.value, 'COMPLETED')
  assert.equal(f.checkpoints[0][0], 'Test complete')
  assert.equal(f.lessonRun.current.value.metrics[0].score, 6)
  assert.ok(f.events.some((event) => event[0] === 'completed' && event[1] === 'Assigned test'))
})

test('stop while compiler loads prevents even top-level script evaluation', async () => {
  const loading = deferred()
  let compilations = 0
  const f = runnerFixture(() => loading.promise)
  f.code.value = 'export async function main() {}'
  const run = f.executeCode()
  assert.equal(f.lessonRun.status.value, 'RUNNING')
  f.reset()
  loading.resolve({
    compileUserScript() {
      compilations++
      return async () => {}
    },
  })
  assert.equal(await run, false)
  assert.equal(compilations, 0)
  assert.equal(f.lessonRun.status.value, 'STOPPED')
  assert.equal(f.sessions.length, 0)
})

test('archive acknowledgement gates top-level execution and captures source before edits', async () => {
  const saved = deferred()
  const f = runnerFixture()
  let archived
  f.deps.trainingRecorder.start = async (_run, artifact) => {
    archived = artifact
    await saved.promise
  }
  const source = 'globalThis.__trainingGate = true; export async function main() {}'
  f.code.value = source
  const result = f.executeCode()
  f.code.value = 'edited later'
  await new Promise(setImmediate)
  assert.equal(archived.originalSource, source)
  assert.equal(globalThis.__trainingGate, undefined)
  f.reset()
  saved.resolve()
  assert.equal(await result, false)
  assert.equal(globalThis.__trainingGate, undefined)
})

test('backend failure still runs the lesson and reports unrecorded practice', async () => {
  const f = runnerFixture()
  const warnings = []
  const recorder = createTrainingRecorder(
    f.lessonRun,
    () => async () => {
      throw new Error('Backend unavailable')
    },
    (error) => warnings.push(error),
  )
  f.deps.trainingRecorder.start = recorder.start
  try {
    f.code.value = 'globalThis.__trainingGate = true;\nexport async function main() {}'
    assert.equal(await f.executeCode(), true)
    assert.equal(globalThis.__trainingGate, true)
    assert.equal(f.lessonRun.status.value, 'COMPLETED')
    assert.equal(warnings.length, 1)
    assert.ok(!f.events.some((event) => event[0] === 'error'))
  } finally {
    recorder.dispose()
    delete globalThis.__trainingGate
  }
})

test('replacement during compiler loading runs only the new lesson', async () => {
  const first = deferred(),
    second = deferred()
  let requests = 0
  const f = runnerFixture(() => (++requests === 1 ? first.promise : second.promise))
  f.code.value = `export async function main(context: ScriptContext) { context.checkPoint('Old') }`
  const oldRun = f.executeCode()
  f.code.value = `export async function main(context: ScriptContext) { context.checkPoint('New') }`
  const newRun = f.executeCode()
  first.resolve(compiler)
  assert.equal(await oldRun, false)
  second.resolve(compiler)
  assert.equal(await newRun, true)
  assert.deepEqual(
    f.checkpoints.map((c) => c[0]),
    ['New'],
  )
})

test('compilation uses the launch-time source, preserving later editor changes', async () => {
  const loading = deferred()
  const f = runnerFixture(() => loading.promise)
  f.code.value = `export async function main(context: ScriptContext) { context.checkPoint('Original') }`
  const run = f.executeCode()
  f.code.value = '// Unsaved edit while the compiler downloads'
  loading.resolve(compiler)
  assert.equal(await run, true)
  assert.deepEqual(
    f.checkpoints.map((c) => c[0]),
    ['Original'],
  )
  assert.equal(f.code.value, '// Unsaved edit while the compiler downloads')
})

test('compiler download failure reports an error and a later run can retry', async () => {
  let tries = 0
  const f = runnerFixture(async () => {
    if (++tries === 1) throw new Error('Offline')
    return compiler
  })
  f.code.value = 'export async function main() {}'
  assert.equal(await f.executeCode(), false)
  assert.equal(f.lessonRun.status.value, 'ERROR')
  assert.equal(f.events.filter((e) => e[0] === 'error').length, 1)
  assert.equal(await f.executeCode(), true)
  assert.equal(f.lessonRun.status.value, 'COMPLETED')
})

test('AI validation loads on demand and discards replaced or unmounted requests', async () => {
  const pending = []
  const scope = effectScope()
  const source = componentScript('Editor')
  const watcher = source.statements.find(
    (node) =>
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(source) === 'watch' &&
      node.expression.arguments[0]?.getText(source) === 'aiGeneratedCode',
  )
  const f = scope.run(() =>
    evaluate(
      `${declarations(source, ['aiGeneratedCode', 'aiValidationIssues', 'aiValidationPending'])}
    ${watcher.getText(source)}
    return {aiGeneratedCode, aiValidationIssues, aiValidationPending}`,
      {
        ref,
        watch,
        loadLessonCompiler() {
          const loading = deferred()
          pending.push(loading)
          return loading.promise
        },
      },
    ),
  )
  assert.equal(pending.length, 0)
  f.aiGeneratedCode.value = 'invalid old draft'
  assert.equal(f.aiValidationPending.value, true)
  f.aiGeneratedCode.value = 'export async function main() {}'
  pending[0].resolve(compiler)
  await nextTick()
  assert.equal(f.aiValidationPending.value, true)
  assert.deepEqual(f.aiValidationIssues.value, [])
  pending[1].resolve(compiler)
  await nextTick()
  assert.equal(f.aiValidationPending.value, false)
  assert.deepEqual(f.aiValidationIssues.value, [])
  f.aiGeneratedCode.value = 'draft while offline'
  pending[2].reject(new Error('offline'))
  await nextTick()
  assert.match(f.aiValidationIssues.value[0], /Unable to load/)
  f.aiGeneratedCode.value = 'unmounted draft'
  scope.stop()
  pending[3].resolve(compiler)
  await nextTick()
  assert.deepEqual(f.aiValidationIssues.value, [])
})

function codeEditorFixture(props, failCreation = false) {
  const scope = effectScope()
  const calls = [],
    models = []
  let change
  const monaco = {
    typescript: {
      ScriptTarget: { ES2020: 1 },
      ModuleKind: { ESNext: 1 },
      typescriptDefaults: {
        setCompilerOptions() {},
        addExtraLib() {
          return {
            dispose() {
              calls.push('definitions')
            },
          }
        },
      },
    },
    editor: {
      setTheme(theme) {
        calls.push(theme)
      },
      createModel(value) {
        const model = {
          getValue: () => value,
          setValue(next) {
            value = next
            change?.()
          },
          dispose() {
            calls.push('model')
          },
        }
        models.push(model)
        return model
      },
      create(_container, options) {
        if (failCreation) throw new Error('Cannot create editor')
        calls.push(options.theme)
        return {
          dispose() {
            calls.push('editor')
          },
          onDidChangeModelContent(fn) {
            change = fn
            return {
              dispose() {
                change = undefined
                calls.push('listener')
              },
            }
          },
        }
      },
    },
  }
  const source = componentScript('LessonCodeEditor')
  const watchers = source.statements.filter(
    (node) =>
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(source) === 'watch',
  )
  const api = scope.run(() =>
    evaluate(
      `${declarations(source, ['container', 'editorError', 'editor', 'model', 'definitions', 'changes', 'disposeEditor'])}
    ${watchers.map((w) => w.getText(source)).join('\n')}
    return {container, editorError, mount: ${hook(source, 'onMounted')}, dispose: ${hook(source, 'onBeforeUnmount')}}`,
      {
        props,
        ref,
        watch,
        monaco,
        stripImportsExports,
        typesDefinitions: '',
        simMetaTypes: '',
        scriptApiTypes: '',
        console: { error() {} },
        emit(name, value) {
          assert.equal(name, 'update:value')
          props.value = value
        },
      },
    ),
  )
  api.container.value = {}
  return {
    ...api,
    calls,
    models,
    close() {
      api.dispose()
      scope.stop()
    },
  }
}

test('code tab preserves edits and themes, disposing models and definitions on every close', async () => {
  const props = shallowReactive({ value: 'original', isDarkMode: false })
  const first = codeEditorFixture(props)
  first.mount()
  first.models[0].setValue('edited code')
  assert.equal(props.value, 'edited code')
  props.isDarkMode = true
  await nextTick()
  assert.equal(first.calls.at(-1), 'vs-dark')
  first.close()
  first.dispose() // Idempotent, including after a failed mount.
  assert.deepEqual(first.calls.slice(-4), ['listener', 'editor', 'model', 'definitions'])
  const second = codeEditorFixture(props)
  second.mount()
  assert.equal(second.models[0].getValue(), 'edited code')
  assert.equal(second.calls[0], 'vs-dark')
  props.value = 'replacement lesson'
  await nextTick()
  assert.equal(second.models[0].getValue(), 'replacement lesson')
  second.close()
})

test('failed editor mount releases a partially created model and type definitions', () => {
  const f = codeEditorFixture(shallowReactive({ value: '', isDarkMode: false }), true)
  f.mount()
  assert.match(f.editorError.value, /Unable to open/)
  assert.deepEqual(f.calls, ['model', 'definitions'])
  f.close()
  assert.deepEqual(f.calls, ['model', 'definitions'])
})
