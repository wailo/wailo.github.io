import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelfilePath = path.join(projectRoot, 'src/wasm/generated/Modelfile')
// Exercise the same generation/semantic validation as installation, not stale local output.
execFileSync(process.execPath, ['--import', 'tsx', 'src/generate-modelfile.ts'], {
  cwd: projectRoot,
  timeout: 60000,
  stdio: 'pipe',
})
const modelfile = fs.readFileSync(modelfilePath, 'utf8')

test('fresh lesson contract includes checkpoint, assessment and AI dependencies', () => {
  for (const name of ['CheckpointData', 'AssessmentSubmission', 'LessonAIRequest']) {
    assert.match(modelfile, new RegExp(`interface ${name} \\{`))
  }
  assert.match(modelfile, /type LessonAIResponse\s*=/)
  assert.match(modelfile, /submit: \(result: AssessmentSubmission\) => void/)
})

test('generated Modelfile exposes aircraft-specific plotting catalogs', () => {
  assert.match(modelfile, /interface B747SimProps \{/)
  assert.match(modelfile, /interface C172SimProps \{/)
  assert.match(modelfile, /interface CommonFlightModelSimProps \{/)
  assert.match(modelfile, /readonly engine_4_n1: SimulationProperties/)
  assert.match(modelfile, /readonly engine_mixture_position: SimulationProperties/)
})

test('generated plotting properties retain useful metadata', () => {
  assert.match(modelfile, /Indicated Airspeed[^\n]*group: flight[^\n]*unit: knots[^\n]*read-only/)
  assert.match(modelfile, /Target Indicated Airspeed[^\n]*range: 0\.\.450[^\n]*read\/write/)
})

test('generated API contract preserves TypeScript literals and promises', () => {
  assert.match(modelfile, /\(panelId: 'realtime', tabName: 'Real-Time-Data' \| 'Airflow'\)/)
  assert.match(modelfile, /waitForCondition: \([\s\S]*?\) => Promise<boolean>/)
  assert.doesNotMatch(modelfile, /\) -> /)
})

test('generated lesson instructions are import-free and distinguish values from metadata', () => {
  const systemPrompt = modelfile.match(/SYSTEM """([\s\S]*?)"""/)?.[1] ?? ''
  assert.match(systemPrompt, /Do not .*add imports/)
  assert.match(systemPrompt, /context\.controls\.flightModel for live numeric or boolean/)
  assert.match(
    systemPrompt,
    /context\.props\.<property> metadata with plotView\(\) and dataView\(\)/,
  )
  assert.doesNotMatch(systemPrompt, /^import\s/m)
})
