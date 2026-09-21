import { stripImportsExports } from './ScriptSource'

/** In-memory files shared by Monaco and the editor's language-service tests. */
export function createEditorTypeLibraries(
  simulatorTypes: string,
  simulatorMeta: string,
  scriptApi: string,
): { filePath: string; content: string }[] {
  const scriptTypes = [...scriptApi.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)].map(
    (match) => match[1],
  )
  return [
    {
      filePath: 'file:///src/editor-globals.d.ts',
      content: `${simulatorTypes}\n${stripImportsExports(simulatorMeta)}\n${stripImportsExports(scriptApi)}`,
    },
    {
      filePath: 'file:///src/core.d.ts',
      content: `export type {
        ScriptContext, FlightModelInstance, b747, c172, graphics,
        ExtendedMainModule, SimulationProperties
      };`,
    },
    {
      filePath: 'file:///src/ScriptContext.d.ts',
      content: `export type { ${scriptTypes.join(', ')} };`,
    },
  ]
}
