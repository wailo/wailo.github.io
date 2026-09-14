import * as ts from 'typescript'

import type { ScriptSimProps, UserScript } from './ScriptContext'
import { stripImportsExports } from './ScriptSource'

export { stripImportsExports } from './ScriptSource'

export type InvalidScriptHandler = (message: string) => void

export function loadUserScript<TProps extends ScriptSimProps>(
  code: string,
  onInvalidScript?: InvalidScriptHandler,
): UserScript<TProps> {
  const factory = new Function(`
    ${code}
    return typeof main === 'undefined' ? undefined : main;
  `)
  const script = factory()

  if (typeof script !== 'function') {
    const message = "The script must define a function named 'main'"
    onInvalidScript?.(message)
    throw new Error(message)
  }

  return script as UserScript<TProps>
}

export function compileUserScript<TProps extends ScriptSimProps>(
  source: string,
  onInvalidScript?: InvalidScriptHandler,
): UserScript<TProps> {
  const code = stripImportsExports(source)
  const javascript = ts.transpile(code, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
  })

  return loadUserScript<TProps>(javascript, onInvalidScript)
}

export function validateGeneratedLesson(source: string): string[] {
  const issues: string[] = []
  if (!/export\s+async\s+function\s+main\s*\(/.test(source)) {
    issues.push('Missing export async function main(context: ScriptContext).')
  }
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  })
  output.diagnostics?.forEach((diagnostic) => {
    issues.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '))
  })
  return [...new Set(issues)]
}
