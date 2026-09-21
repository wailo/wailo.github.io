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
