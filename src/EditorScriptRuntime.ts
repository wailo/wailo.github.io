import * as ts from 'typescript'

import type { ScriptSimProps, UserScript } from './ScriptContext'

export type InvalidScriptHandler = (message: string) => void

export function stripImportsExports(input: string): string {
  return input
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*import[\s\S]*?['"].*?['"];?/gm, '')
    .trim()
}

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
