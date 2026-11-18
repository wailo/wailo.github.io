import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import { createEditorTypeLibraries } from '../src/EditorTypeLibraries.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const editorTypesPath = path.join(projectRoot, 'src/wasm/generated/editorTypes.txt')
const simulatorMetaPath = path.join(projectRoot, 'src/wasm/generated/flightsimulator_exec_meta.ts')
const scriptContextPath = path.join(projectRoot, 'src/ScriptContext.ts')

function readRequiredFile(filePath) {
  assert.ok(fs.existsSync(filePath), `Missing generated editor dependency: ${filePath}`)
  return fs.readFileSync(filePath, 'utf8')
}

const editorLibraries = createEditorTypeLibraries(
  readRequiredFile(editorTypesPath),
  readRequiredFile(simulatorMetaPath),
  readRequiredFile(scriptContextPath),
)

function createLanguageService(source) {
  const lessonPath = 'file:///public/LearningModules/lesson.ts'
  const virtualFiles = new Map([
    [lessonPath, source],
    ...editorLibraries.map(({ filePath, content }) => [filePath, content]),
  ])
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Classic,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  }
  const host = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => [...virtualFiles.keys()],
    getScriptVersion: () => '1',
    getScriptSnapshot(fileName) {
      const content = virtualFiles.get(fileName) ?? ts.sys.readFile(fileName)
      return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content)
    },
    getCurrentDirectory: () => projectRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) => virtualFiles.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) => virtualFiles.get(fileName) ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
  }

  return { lessonPath, service: ts.createLanguageService(host, ts.createDocumentRegistry()) }
}

function completionsAt(markedSource) {
  const marker = '__CURSOR__'
  const position = markedSource.indexOf(marker)
  const source = markedSource.replace(marker, '')
  const { lessonPath, service } = createLanguageService(source)
  const completions = service.getCompletionsAtPosition(lessonPath, position, {})
  service.dispose()
  assert.ok(completions, 'No completions returned at the marked position')
  return new Set(completions.entries.map((entry) => entry.name))
}

function propertyCompletions(contextType) {
  return completionsAt(`
    async function lesson(context: ScriptContext<${contextType}>) {
      context.props.__CURSOR__
    }
  `)
}

/** Emscripten runtime internals that must stay out of the lesson-facing API. */
const RUNTIME_INTERNALS = [
  'HEAP8',
  'HEAP16',
  'HEAP32',
  'HEAPU8',
  'HEAPF32',
  'HEAPF64',
  'GLFW',
  'RuntimeExports',
  'WasmModule',
  'FS',
  'callMain',
  'ccall',
  '_malloc',
  'clone',
  'delete',
  'isAliasOf',
]

function lessonDiagnostics(source) {
  const { lessonPath, service } = createLanguageService(source)
  const diagnostics = service
    .getSyntacticDiagnostics(lessonPath)
    .concat(service.getSemanticDiagnostics(lessonPath))
  service.dispose()
  return diagnostics
}

function diagnosticText(diagnostics) {
  return diagnostics
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    .join('\n')
}

test('lesson editor types expose script-owned assessment scoring', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext<B747SimProps>) {
      context.assessment.submit({ score: 5, maxScore: 6, passingScore: 5 });
    }
  `)
  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('B747 simulator properties are autocomplete-friendly and aircraft-specific', () => {
  const completions = propertyCompletions('B747SimProps')

  assert.ok(completions.has('altitude_ft'))
  assert.ok(completions.has('engine_4_n1'))
  assert.ok(!completions.has('engine_mixture_position'))
})

test('C172 simulator properties are autocomplete-friendly and aircraft-specific', () => {
  const completions = propertyCompletions('C172SimProps')

  assert.ok(completions.has('altitude_ft'))
  assert.ok(completions.has('engine_mixture_position'))
  assert.ok(!completions.has('engine_4_n1'))
})

test('controls autocomplete is the curated lesson API, not the Emscripten runtime', () => {
  const completions = completionsAt(`
    async function lesson(context: ScriptContext) {
      context.controls.__CURSOR__
    }
  `)

  for (const name of [
    'flightModel',
    'simulation',
    'world',
    'graphics',
    'check_licence',
    'FLIGHTMODEL_VERSION',
    'B747GearSelector',
    'C172FlapSelector',
  ])
    assert.ok(completions.has(name), `missing ${name} from controls autocomplete`)
  for (const name of RUNTIME_INTERNALS)
    assert.ok(!completions.has(name), `${name} leaked into lesson autocomplete`)
})

test('simulation autocomplete stays on the flight-training surface', () => {
  const completions = completionsAt(`
    async function lesson(context: ScriptContext) {
      context.controls.simulation.__CURSOR__
    }
  `)

  for (const name of [
    'flight_model',
    'airport_name',
    'world',
    'set_simulation_pause',
    'set_flight_model_b747',
  ])
    assert.ok(completions.has(name), `missing ${name} from simulation autocomplete`)
  for (const name of RUNTIME_INTERNALS)
    assert.ok(!completions.has(name), `${name} leaked into simulation autocomplete`)
})

test('airport world helpers are typed for runway training scenarios', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext) {
      context.controls.world.select_runway_end_by_name('27L')
      const approach = context.controls.world.selected_approach
      if (approach) context.checkPoint(approach.runway_name)
      const simulationWorld = context.controls.simulation.world
      if (simulationWorld) simulationWorld.select_runway_end(0, 1)
    }
  `)

  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('plotView accepts simulator metadata objects and arrays', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext<B747SimProps>) {
      context.plotView(context.props.altitude_ft, true)
      context.plotView([context.props.altitude_ft, context.props.speed_indicated_knots], true)
    }
  `)

  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('autocomplete types reject misspelled properties and raw simulator values', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext<B747SimProps>) {
      context.plotView(context.props.altitutde_ft, true)
      context.plotView(context.props.altitude_ft.inputValue, true)
    }
  `)
  const messages = diagnosticText(diagnostics)

  assert.match(messages, /altitutde_ft/)
  assert.match(messages, /SimulationProperties/)
})

test('multiple-choice questions accept practice and assessment modes', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext<C172SimProps>) {
      await context.askQuestion({
        type: 'multiple-choice',
        mode: 'practice',
        title: 'Practice',
        question: 'Choose the correct answer.',
        choices: [{ id: 'correct', label: 'Correct' }],
        correctAnswer: 'correct',
      })
      await context.askQuestion({
        type: 'multiple-choice',
        mode: 'assessment',
        title: 'Assessment',
        question: 'Submit one answer.',
        choices: [{ id: 'answer', label: 'Answer' }],
      })
    }
  `)

  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('script debriefs expose typed request and outcome APIs in the lesson editor', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext) {
      const result = await context.ai.request({ purpose: 'debrief', evidence: { scorePercent: 80 } });
      if (result.status === 'completed') await context.notifyUser('AI debrief', result.message);
      else context.checkPoint(result.reason);
    }
  `)
  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('checkpoints accept text and optional structured evidence in the lesson editor', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext) {
      context.checkPoint('Started');
      context.checkPoint('Climb established', {
        step: 'climb', altitudeFt: 1500, targetAltitudeFt: 3000,
        samples: [1400, 1500], criteria: { stable: true }
      });
    }
  `)
  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('checkpoints reject a non-object evidence argument', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext) {
      context.checkPoint('Climb', 1500);
    }
  `)
  assert.ok(diagnostics.length > 0)
})

test('multiple-choice questions reject unknown modes', () => {
  const diagnostics = lessonDiagnostics(`
    async function lesson(context: ScriptContext<C172SimProps>) {
      await context.askQuestion({
        type: 'multiple-choice',
        mode: 'exam',
        title: 'Invalid mode',
        question: 'Choose an answer.',
        choices: [{ id: 'answer', label: 'Answer' }],
      })
    }
  `)

  assert.match(diagnosticText(diagnostics), /practice.*assessment|assessment.*practice/)
})

test('core imports resolve to the existing simulator types', () => {
  const diagnostics = lessonDiagnostics(`
    import { ScriptContext, b747 } from '../../src/core'
    export async function main(context: ScriptContext) {
      const model = context.controls.flightModel as b747
      context.plotView(context.props.altitude_ft, true)
      model.set_engine_throttle_position(0.5)
    }
  `)
  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})

test('ScriptContext imports retain aircraft-specific type checking', () => {
  const source = `
    import type { ScriptContext, C172SimProps } from '../../src/ScriptContext'
    export async function main(context: ScriptContext<C172SimProps>) {
      context.plotView(context.props.altitude_ft, true)
    }
  `
  assert.equal(lessonDiagnostics(source).length, 0)
  const diagnostics = lessonDiagnostics(source.replace('altitude_ft', 'altitutde_ft'))
  assert.match(diagnosticText(diagnostics), /altitutde_ft/)
  assert.ok(!diagnostics.some((diagnostic) => diagnostic.code === 2307))
})

test('core imports retain errors for invalid simulator arguments', () => {
  const diagnostics = lessonDiagnostics(`
    import { ScriptContext } from '../../src/core'
    export async function main(context: ScriptContext) {
      context.controls.flightModel.set_engine_throttle_position('invalid')
    }
  `)
  assert.match(diagnosticText(diagnostics), /string.*number/)
})

test('virtual modules do not hide missing exports or unknown imports', () => {
  assert.match(
    diagnosticText(
      lessonDiagnostics(`
    import type { MissingType } from '../../src/core'
  `),
    ),
    /MissingType/,
  )
  assert.match(
    diagnosticText(
      lessonDiagnostics(`
    import type { ScriptContext } from '../../src/missing'
  `),
    ),
    /Cannot find module/,
  )
})

test('demo lesson imports resolve without losing its type checks', () => {
  const diagnostics = lessonDiagnostics(
    readRequiredFile(path.join(projectRoot, 'public/LearningModules/demo.ts')),
  )
  assert.equal(diagnostics.length, 0, diagnosticText(diagnostics))
})
