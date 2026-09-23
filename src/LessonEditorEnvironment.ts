import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import typesDefinitions from './wasm/generated/editorTypes.txt?raw'
import simMetaTypes from './wasm/generated/flightsimulator_exec_meta.ts?raw'
import scriptApiTypes from './ScriptContext.ts?raw'
import { createEditorTypeLibraries } from './EditorTypeLibraries'

export { monaco }
window.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    return label === 'typescript' || label === 'javascript' ? new tsWorker() : new editorWorker()
  },
}
let users = 0
let libraries: monaco.IDisposable[] = []
let initialization: Promise<void> | undefined

/** Monaco's language activation starts asynchronously and its worker getter does not await it. */
async function waitForTypeScriptRegistration() {
  const deadline = Date.now() + 10000
  for (;;) {
    try {
      return await monaco.typescript.getTypeScriptWorker()
    } catch (error) {
      // Retry only Monaco's registration race, never download or worker startup failures.
      if (error !== 'TypeScript not registered!') throw error
      if (Date.now() >= deadline) {
        throw new Error('TypeScript initialization timed out. Reload the page and try again.')
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 25))
    }
  }
}

/** Initialize through Monaco's public editor API without mounting visible UI. */
export function ensureTypeScriptReady(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      let editor: monaco.editor.IStandaloneCodeEditor | undefined
      let model: monaco.editor.ITextModel | undefined
      try {
        // Editor services must exist before the first TypeScript model is created.
        editor = monaco.editor.create(document.createElement('div'), { model: null })
        model = monaco.editor.createModel('', 'typescript')
        editor.setModel(model)
        const getWorker = await waitForTypeScriptRegistration()
        await getWorker(model.uri)
      } finally {
        editor?.dispose()
        model?.dispose()
      }
    })().catch((error) => {
      initialization = undefined
      throw error
    })
  }
  return initialization
}

/** Editors and temporary validation models share one compiler configuration and type library. */
export function acquireLessonTypes(): monaco.IDisposable {
  if (users === 0) {
    const defaults = monaco.typescript.typescriptDefaults
    defaults.setCompilerOptions({
      target: monaco.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      module: monaco.typescript.ModuleKind.ESNext,
      noEmit: true,
      strict: true,
    })
    try {
      for (const library of createEditorTypeLibraries(
        typesDefinitions,
        simMetaTypes,
        scriptApiTypes,
      ))
        libraries.push(defaults.addExtraLib(library.content, library.filePath))
    } catch (error) {
      libraries.forEach((library) => library.dispose())
      libraries = []
      throw error
    }
  }
  users++
  let released = false
  return {
    dispose() {
      if (released) return
      released = true
      if (--users === 0) {
        libraries.forEach((library) => library.dispose())
        libraries = []
      }
    },
  }
}
