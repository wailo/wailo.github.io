import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

// Exercise small, real component lifecycle functions with browser resources mocked.
// No production abstractions are introduced just to make these functions testable.
export function componentScript(name) {
  const filename = new URL(`../../src/components/${name}.vue`, import.meta.url)
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  return ts.createSourceFile(
    name,
    descriptor.scriptSetup.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
}

export function declarations(source, names) {
  return names
    .map((name) => {
      const statement = source.statements.find((node) =>
        ts.isFunctionDeclaration(node)
          ? node.name?.text === name
          : ts.isVariableStatement(node) &&
            node.declarationList.declarations.some((d) => d.name.getText(source) === name),
      )
      assert.ok(statement, `Missing declaration: ${name}`)
      return statement.getText(source)
    })
    .join('\n')
}

export function hook(source, name) {
  const statement = source.statements.find(
    (node) =>
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(source) === name,
  )
  assert.ok(statement, `Missing hook: ${name}`)
  return statement.expression.arguments[0].getText(source)
}

export function evaluate(code, deps) {
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  return new Function(...Object.keys(deps), js)(...Object.values(deps))
}
