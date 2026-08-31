import fs from 'node:fs'
import path from 'node:path'

import ts from 'typescript'
import { Node, ObjectLiteralExpression, Project, SourceFile } from 'ts-morph'

const SIMULATOR_TYPES_FILE = 'src/wasm/generated/flightsimulator_exec.d.ts'
const SIMULATOR_META_FILE = 'src/wasm/generated/flightsimulator_exec_meta.ts'
const SCRIPT_CONTEXT_FILE = 'src/ScriptContext.ts'
const SIM_INTERFACE_FILE = 'src/wasm/siminterface.ts'
const OUTPUT_FILE = 'src/wasm/generated/Modelfile'
const DTS_OUTPUT_FILE = 'src/wasm/generated/editorTypes.txt'
const BASE_MODEL_NAME = 'qwen3.5:9b'
const GENERATED_FILE_NOTICE = 'Auto generated file from generate-modelfile.ts, do not edit manually'

const project = new Project({ tsConfigFilePath: 'tsconfig.app.json' })

type AircraftCatalogName = 'B747SimProps' | 'C172SimProps' | 'GraphicsSimProps'

interface PropertyMetadata {
  name: string
  label?: string
  description?: string
  group?: string
  unit?: string
  type?: string
  min?: string
  max?: string
  step?: string
  precision?: string
  enumSource?: string
  writable: boolean
}

function sourceFile(fileName: string): SourceFile {
  return project.getSourceFileOrThrow(path.resolve(fileName))
}

function withoutExport(text: string): string {
  return text.replace(/^export\s+(?:default\s+)?/, '')
}

function interfaceText(source: SourceFile, name: string, removeClassHandle = false): string {
  let text = withoutExport(source.getInterfaceOrThrow(name).getText())
  if (removeClassHandle) {
    text = text.replace(`interface ${name} extends ClassHandle`, `interface ${name}`)
  }

  const seenMembers = new Set<string>()
  return text
    .split('\n')
    .filter((line) => {
      if (!/^\s{2}\S.*;\s*$/.test(line)) return true
      const member = line.trim()
      if (seenMembers.has(member)) return false
      seenMembers.add(member)
      return true
    })
    .join('\n')
}

function typeAliasText(source: SourceFile, name: string): string {
  return withoutExport(source.getTypeAliasOrThrow(name).getText())
}

function enumText(source: SourceFile, name: string): string {
  return withoutExport(source.getEnumOrThrow(name).getText())
}

function literalValue(object: ObjectLiteralExpression, propertyName: string): string | undefined {
  const property = object.getProperty(propertyName)
  if (!property || !Node.isPropertyAssignment(property)) return undefined

  const initializer = property.getInitializer()
  if (!initializer) return undefined
  if (Node.isStringLiteral(initializer) || Node.isNoSubstitutionTemplateLiteral(initializer)) {
    return initializer.getLiteralValue()
  }

  return initializer.getText().replace(/\s+/g, ' ').trim()
}

function extractPropertyCatalog(functionName: string): PropertyMetadata[] {
  const declaration = sourceFile(SIMULATOR_META_FILE).getFunctionOrThrow(functionName)
  const body = declaration.getBodyOrThrow()
  if (!Node.isBlock(body)) throw new Error(`${functionName} must have a block body`)
  const returnStatement = body.getStatements().find(Node.isReturnStatement)
  let returned = returnStatement?.getExpression()

  while (
    returned &&
    (Node.isSatisfiesExpression(returned) ||
      Node.isAsExpression(returned) ||
      Node.isParenthesizedExpression(returned))
  ) {
    returned = returned.getExpression()
  }

  if (!returned || !Node.isObjectLiteralExpression(returned)) {
    throw new Error(`${functionName} must directly return a property metadata object`)
  }

  return returned.getProperties().flatMap((property): PropertyMetadata[] => {
    if (!Node.isPropertyAssignment(property)) return []
    const value = property.getInitializer()
    if (!value || !Node.isObjectLiteralExpression(value)) return []

    const enumValues = literalValue(value, 'enumValues')
    const enumSource = enumValues?.match(/Object\.entries\((\w+)\)/)?.[1]

    return [
      {
        name: property.getName(),
        label: literalValue(value, 'label'),
        description: literalValue(value, 'description'),
        group: literalValue(value, 'group'),
        unit: literalValue(value, 'unit'),
        type: literalValue(value, 'type'),
        min: literalValue(value, 'min'),
        max: literalValue(value, 'max'),
        step: literalValue(value, 'step'),
        precision: literalValue(value, 'precision'),
        enumSource,
        writable: value.getProperty('setterFunc') !== undefined,
      },
    ]
  })
}

function cleanDocText(value: string): string {
  return value.replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim()
}

function propertyDocumentation(property: PropertyMetadata): string {
  const details: string[] = []
  if (property.label) details.push(cleanDocText(property.label))
  if (property.description) details.push(cleanDocText(property.description))
  if (property.group) details.push(`group: ${cleanDocText(property.group)}`)
  if (property.unit) details.push(`unit: ${cleanDocText(property.unit)}`)
  if (property.type) details.push(`value: ${cleanDocText(property.type)}`)
  if (property.min !== undefined || property.max !== undefined) {
    details.push(`range: ${property.min ?? '-infinity'}..${property.max ?? 'infinity'}`)
  }
  if (property.step) details.push(`step: ${property.step}`)
  if (property.precision) details.push(`precision: ${property.precision}`)
  if (property.enumSource) details.push(`values: ${property.enumSource}`)
  details.push(property.writable ? 'read/write' : 'read-only')
  return details.join(' | ')
}

function catalogInterface(
  name: AircraftCatalogName | 'CommonFlightModelSimProps',
  entries: PropertyMetadata[],
) {
  const properties = entries
    .map(
      (property) =>
        `  /** ${propertyDocumentation(property)} */\n  readonly ${property.name}: SimulationProperties`,
    )
    .join('\n')
  return `interface ${name} {\n${properties}\n}`
}

function simulatorContract(): string {
  const source = sourceFile(SIMULATOR_TYPES_FILE)
  const simInterface = sourceFile(SIM_INTERFACE_FILE)
  return [
    interfaceText(source, 'b747', true),
    typeAliasText(source, 'B747GearSelector'),
    typeAliasText(source, 'B747FlapSelector'),
    interfaceText(source, 'c172', true),
    typeAliasText(source, 'C172GearSelector'),
    typeAliasText(source, 'C172FlapSelector'),
    interfaceText(source, 'graphics', true),
    typeAliasText(source, 'GRAPHICSEFlightModel'),
    typeAliasText(source, 'EmbindString'),
    interfaceText(source, 'EmbindModule'),
    'type FlightModelInstance = b747 | c172',
    'type ExtendedMainModule = EmbindModule & { flightModel: FlightModelInstance; simulation: graphics }',
    enumText(simInterface, 'LayoutTypes'),
  ].join('\n\n')
}

function questionContract(): string {
  const source = sourceFile(SCRIPT_CONTEXT_FILE)
  return [
    interfaceText(source, 'WaitForUserOptions'),
    interfaceText(source, 'QuestionChoice'),
    interfaceText(source, 'BaseQuestionOptions'),
    interfaceText(source, 'MultipleChoiceQuestionOptions'),
    interfaceText(source, 'EssayQuestionOptions'),
    typeAliasText(source, 'AskQuestionOptions'),
    interfaceText(source, 'QuestionResult'),
  ].join('\n\n')
}

function metadataContract(): string {
  const simulationProperties = interfaceText(
    sourceFile(SIMULATOR_META_FILE),
    'SimulationProperties',
  )
  const b747 = extractPropertyCatalog('get_Parameters_b747')
  const c172 = extractPropertyCatalog('get_Parameters_c172')
  const graphics = extractPropertyCatalog('get_Parameters_graphics')
  const c172Names = new Set(c172.map((property) => property.name))
  const common = b747.filter((property) => c172Names.has(property.name))

  if (!b747.length || !c172.length || !graphics.length || !common.length) {
    throw new Error('One or more simulator property catalogs are empty')
  }

  return [
    'type PropertyType = number | boolean | string',
    simulationProperties,
    catalogInterface('B747SimProps', b747),
    catalogInterface('C172SimProps', c172),
    catalogInterface('CommonFlightModelSimProps', common),
    catalogInterface('GraphicsSimProps', graphics),
    'type ActiveFlightModelSimProps = B747SimProps | C172SimProps',
    'type FlightModelSimProps = B747SimProps & C172SimProps',
    'type ScriptSimProps = ActiveFlightModelSimProps | FlightModelSimProps | GraphicsSimProps',
  ].join('\n\n')
}

function scriptApiContract(): string {
  return [
    questionContract(),
    `declare function notifyUser(
  title: string,
  message?: string,
  time?: number,
  options?: { append?: boolean; replace?: boolean },
): Promise<void>`,
    `declare function repositionWithAutopilot(
  context: ScriptContext<FlightModelSimProps>,
  targetAltitude: number,
  targetSpeed: number,
  targetHeading: number,
  timeoutMs?: number,
  preConfiguration?: () => void,
): Promise<boolean>`,
    interfaceText(sourceFile(SCRIPT_CONTEXT_FILE), 'ScriptContext'),
  ].join('\n\n')
}

function generateContract(): string {
  return [
    '// Simulator control values and methods',
    simulatorContract(),
    '// Metadata objects accepted by plotView() and dataView()',
    metadataContract(),
    '// Lesson authoring API',
    scriptApiContract(),
  ].join('\n\n')
}

const EXAMPLE_LESSON = `export async function main(context: ScriptContext<B747SimProps>) {
  const flightModel = context.controls.flightModel
  const simProps = context.props

  context.resetPanels()
  context.setTab('realtime', 'Real-Time-Data')
  context.plotView([simProps.speed_indicated_knots, simProps.aoa_deg, simProps.cl], true)

  await context.notifyUser(
    'Stall demonstration',
    'Observe airspeed, angle of attack and lift coefficient as the aircraft approaches a stall.',
  )

  const stalled = await context.waitForCondition(() => flightModel.stalling, 500, 100, 30_000)
  context.checkPoint(stalled ? 'Stall detected' : 'Stall condition not reached')
}`

function generatedSystemPrompt(): string {
  return `You generate complete TypeScript learning lessons for a flight simulator.

Output code only. Do not chat, explain, add Markdown fences, or add imports.
The first line must start with: export async function main(
The response must end with the matching closing brace of main and contain no other text.

Use only declarations in the supplied TypeScript API contract. Never invent methods or properties.

Authoring rules:
- Use context.controls.flightModel for live numeric or boolean simulator values and control methods.
- Use context.props.<property> metadata with plotView() and dataView(); never pass a raw numeric value to them.
- Use ScriptContext<B747SimProps> for B747 lessons and ScriptContext<C172SimProps> for C172 lessons.
- For aircraft-independent lessons, use ScriptContext<CommonFlightModelSimProps> and only common properties.
- Await waitFor(), waitForCondition(), notifyUser(), waitForUser(), askQuestion(), and repositionWithAutopilot().
- Use concise instructional prompts and checkpoints at meaningful scenario stages.
- Avoid infinite loops and conflicting autopilot modes.
- Add comments only for important lesson phases, not for every line.

If the request cannot be completed with the supplied API, output exactly:

export async function main(context: ScriptContext<CommonFlightModelSimProps>) {
  // ERROR: No documented API exists for the requested action.
}`
}

function generateModelfile(contract: string): string {
  return `# ${GENERATED_FILE_NOTICE}
FROM ${BASE_MODEL_NAME}

PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER num_ctx 32768

SYSTEM """
${generatedSystemPrompt()}

Example of a complete, valid lesson:

${EXAMPLE_LESSON}
"""

TEMPLATE """
## TYPESCRIPT API CONTRACT

${contract}

## LESSON REQUEST

{{ .Prompt }}
"""`
}

function editorContract(): string {
  return [
    simulatorContract(),
    `declare function notifyUser(
  title: string,
  message?: string,
  time?: number,
  options?: { append?: boolean; replace?: boolean },
): Promise<void>`,
    `declare function repositionWithAutopilot(
  context: ScriptContext,
  targetAltitude: number,
  targetSpeed: number,
  targetHeading: number,
  timeoutMs?: number,
  preConfiguration?: () => void,
): Promise<boolean>`,
  ].join('\n\n')
}

function validateTypeScript(sourceText: string, label: string) {
  const validationProject = new Project({
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
    },
  })
  const file = validationProject.createSourceFile(`__generated_${label}.ts`, sourceText, {
    overwrite: true,
  })
  const diagnostics = file.getPreEmitDiagnostics()
  if (diagnostics.length) {
    const messages = diagnostics
      .map((diagnostic) => {
        const message = diagnostic.getMessageText()
        return typeof message === 'string' ? message : message.getMessageText()
      })
      .join('\n')
    throw new Error(`Generated ${label} is not valid TypeScript:\n${messages}`)
  }
}

function validateTypeScriptSyntax(sourceText: string, label: string) {
  const output = ts.transpileModule(sourceText, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: `__generated_${label}.ts`,
    reportDiagnostics: true,
  })
  if (output.diagnostics?.length) {
    throw new Error(
      `Generated ${label} has invalid TypeScript syntax:\n${output.diagnostics
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n')}`,
    )
  }
}

function validateContract(contract: string) {
  const requiredFragments = [
    'interface B747SimProps',
    'interface C172SimProps',
    'interface CommonFlightModelSimProps',
    'interface GraphicsSimProps',
    'readonly altitude_ft: SimulationProperties',
    'readonly engine_4_n1: SimulationProperties',
    'readonly engine_mixture_position: SimulationProperties',
    'interface ScriptContext',
    "(panelId: 'realtime', tabName: 'Real-Time-Data' | 'Airflow')",
    'Promise<boolean>',
  ]
  const missing = requiredFragments.filter((fragment) => !contract.includes(fragment))
  if (missing.length) {
    throw new Error(`Generated lesson API contract is incomplete: ${missing.join(', ')}`)
  }

  validateTypeScript(`${contract}\n\n${EXAMPLE_LESSON}`, 'lesson_contract')
}

function main() {
  const contract = generateContract()
  validateContract(contract)

  const modelfile = generateModelfile(contract)
  const dtsContent = `// ${GENERATED_FILE_NOTICE}\n// Generated TypeScript definitions\n\n${editorContract()}\n`
  // This declaration fragment is augmented with metadata and ScriptContext declarations in Editor.vue.
  validateTypeScriptSyntax(dtsContent, 'editor_types')

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, modelfile)
  fs.writeFileSync(DTS_OUTPUT_FILE, dtsContent)
  console.log('Modelfile and editor TypeScript definitions generated successfully')
}

main()
