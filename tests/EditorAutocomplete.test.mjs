import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import { stripImportsExports } from '../src/EditorScriptRuntime.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const editorTypesPath = path.join(projectRoot, 'src/wasm/generated/editorTypes.txt')
const simulatorMetaPath = path.join(projectRoot, 'src/wasm/generated/flightsimulator_exec_meta.ts')
const scriptContextPath = path.join(projectRoot, 'src/ScriptContext.ts')

function readRequiredFile(filePath) {
  assert.ok(fs.existsSync(filePath), `Missing generated editor dependency: ${filePath}`)
  return fs.readFileSync(filePath, 'utf8')
}

const editorDefinitions = [
  readRequiredFile(editorTypesPath),
  stripImportsExports(readRequiredFile(simulatorMetaPath)),
  stripImportsExports(readRequiredFile(scriptContextPath)),
].join('\n')

function createLanguageService(source) {
  const lessonPath = path.join(projectRoot, '__editor_test_lesson.ts')
  const definitionsPath = path.join(projectRoot, '__editor_test_definitions.ts')
  const virtualFiles = new Map([
    [lessonPath, source],
    [definitionsPath, editorDefinitions],
  ])
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
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
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  }

  return { lessonPath, service: ts.createLanguageService(host, ts.createDocumentRegistry()) }
}

function propertyCompletions(contextType) {
  const marker = '__CURSOR__'
  const markedSource = `
    async function lesson(context: ScriptContext<${contextType}>) {
      context.props.${marker}
    }
  `
  const position = markedSource.indexOf(marker)
  const source = markedSource.replace(marker, '')
  const { lessonPath, service } = createLanguageService(source)
  const completions = service.getCompletionsAtPosition(lessonPath, position, {})
  service.dispose()
  assert.ok(completions, `No context.props completions returned for ${contextType}`)
  return new Set(completions.entries.map((entry) => entry.name))
}

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
