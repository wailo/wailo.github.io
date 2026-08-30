import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { compileUserScript } from '../src/EditorScriptRuntime.ts'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const learningModulesDirectory = path.join(projectRoot, 'public/LearningModules')
const lessonFiles = fs
  .readdirSync(learningModulesDirectory)
  .filter((fileName) => fileName.endsWith('.ts'))
  .sort()

test('learning-module directory contains lesson scripts', () => {
  assert.ok(lessonFiles.length > 0)
})

for (const fileName of lessonFiles) {
  test(`learning module ${fileName} compiles to an executable main function`, () => {
    const source = fs.readFileSync(path.join(learningModulesDirectory, fileName), 'utf8')
    const lesson = compileUserScript(source)

    assert.equal(typeof lesson, 'function')
  })
}
