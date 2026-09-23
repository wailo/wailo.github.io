import { monaco, acquireLessonTypes, ensureTypeScriptReady } from './LessonEditorEnvironment'

/** Always checks a separate immutable snapshot, including when the CODE tab is closed. */
export async function validateLessonSource(source: string): Promise<string[]> {
  const types = acquireLessonTypes()
  let model: monaco.editor.ITextModel | undefined
  try {
    await ensureTypeScriptReady()
    model = monaco.editor.createModel(
      source,
      'typescript',
      monaco.Uri.parse(`file:///public/LearningModules/check-${crypto.randomUUID()}.ts`),
    )
    const getWorker = await monaco.typescript.getTypeScriptWorker()
    const worker = await getWorker(model.uri)
    const filename = model.uri.toString()
    const diagnostics = (
      await Promise.all([
        worker.getSyntacticDiagnostics(filename),
        worker.getSemanticDiagnostics(filename),
      ])
    ).flat()
    type MessageChain = { messageText: string; next?: MessageChain[] }
    const messageText = (message: string | MessageChain): string =>
      typeof message === 'string'
        ? message
        : [message.messageText, ...(message.next ?? []).map(messageText)].join(' ')
    return diagnostics
      .filter((diagnostic) => diagnostic.category === 1)
      .map((diagnostic) => {
        const position = model!.getPositionAt(diagnostic.start ?? 0)
        return `Line ${position.lineNumber}: ${messageText(diagnostic.messageText)}`
      })
  } finally {
    model?.dispose()
    types.dispose()
  }
}
