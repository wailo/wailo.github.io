import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modelfilePath = path.join(projectRoot, 'src/wasm/generated/Modelfile')
const modelfile = fs.readFileSync(modelfilePath, 'utf8')

test('generated Modelfile exposes aircraft-specific plotting catalogs', () => {
  assert.match(modelfile, /interface B747SimProps \{/)
  assert.match(modelfile, /interface C172SimProps \{/)
  assert.match(modelfile, /interface CommonFlightModelSimProps \{/)
  assert.match(modelfile, /readonly engine_4_n1: SimulationProperties/)
  assert.match(modelfile, /readonly engine_mixture_position: SimulationProperties/)
})

test('generated plotting properties retain useful metadata', () => {
  assert.match(
    modelfile,
    /Indicated Airspeed[^\n]*group: flight[^\n]*unit: knots[^\n]*read-only/,
  )
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
  assert.match(systemPrompt, /context\.props\.<property> metadata with plotView\(\) and dataView\(\)/)
  assert.doesNotMatch(systemPrompt, /^import\s/m)
})
