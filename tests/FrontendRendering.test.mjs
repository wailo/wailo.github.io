import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import { PlotBuffer } from '../src/PlotBuffer.ts'
import { componentScript, declarations, hook, evaluate } from './helpers/vue-script.mjs'

function findNode(source, predicate) {
  function visit(node) {
    if (predicate(node)) return node
    return ts.forEachChild(node, visit)
  }
  const node = visit(source)
  assert.ok(node, 'Expected component implementation node')
  return node
}

test('sim teardown removes keyboard handlers, its asynchronous watcher and scheduled work', () => {
  const source = componentScript('Sim')
  const assignment = findNode(
    source,
    (node) => ts.isBinaryExpression(node) && node.left.getText(source) === 'cleanupSimListeners',
  )
  const calls = []
  const keydown = () => {}
  const keyup = () => {}
  const globalKeydown = () => {}
  const fullscreen = () => {}
  const panelTab = () => {}
  const dispose = evaluate(
    `let simDisposed = false; let cleanupSimListeners;
    ${assignment.getText(source)};
    return ${hook(source, 'onUnmounted')}`,
    {
      document: { removeEventListener: (...args) => calls.push(['document', ...args]) },
      canvas: { removeEventListener: (...args) => calls.push(['canvas', ...args]) },
      window: { removeEventListener: (...args) => calls.push(['window', ...args]) },
      handleCanvasKeydown: keydown,
      handleCanvasKeyup: keyup,
      handleGlobalKeydown: globalKeydown,
      onFullscreenChange: fullscreen,
      handlePanelTabRequest: panelTab,
      stopStatusWatch: () => calls.push(['watcher']),
      simUpdateInterval: 1,
      layoutResizeTimer: 2,
      canvasResizeFrame: 3,
      clearInterval: (id) => calls.push(['interval', id]),
      clearTimeout: (id) => calls.push(['timeout', id]),
      cancelAnimationFrame: (id) => calls.push(['frame', id]),
      canvasResizeObserver: { disconnect: () => calls.push(['observer']) },
    },
  )
  dispose()
  assert.deepEqual(calls, [
    ['document', 'keydown', globalKeydown],
    ['canvas', 'keydown', keydown, true],
    ['canvas', 'keyup', keyup, true],
    ['watcher'],
    ['interval', 1],
    ['timeout', 2],
    ['observer'],
    ['frame', 3],
    ['document', 'fullscreenchange', fullscreen],
    ['window', 'sim:request-panel-tab', panelTab],
  ])
})

test('late simulator initialization detaches global engine keys and skips frontend setup', () => {
  const source = componentScript('Sim')
  const callback = findNode(
    source,
    (node) => ts.isArrowFunction(node) && node.parameters[0]?.name.getText(source) === 'modules',
  )
  const guard = callback.body.statements[0].getText(source)
  const removed = []
  const glfw = { onKeydown() {}, onKeyPress() {}, onKeyup() {}, onBlur() {} }
  const initialize = evaluate(`return (modules) => { ${guard}; return 'setup' }`, {
    simDisposed: true,
    window: { removeEventListener: (...args) => removed.push(args) },
  })
  assert.equal(initialize([{ GLFW: glfw }]), undefined)
  assert.deepEqual(removed, [
    ['keydown', glfw.onKeydown, true],
    ['keypress', glfw.onKeyPress, true],
    ['keyup', glfw.onKeyup, true],
    ['blur', glfw.onBlur, true],
  ])
})

test('hidden plots retain samples without rendering; visibility restores current data even paused', () => {
  const source = componentScript('TimePlot')
  const buffer = new PlotBuffer(['altitude'], 5)
  const rendered = []
  const props = { pause: false, sources: { altitude: { inputValue: 10 } } }
  const host = { isConnected: true, offsetWidth: 300, offsetHeight: 60 }
  const document = { hidden: false }
  const { tick, redrawVisiblePlots } = evaluate(
    `${declarations(source, ['tick', 'updatePlot', 'redrawVisiblePlots'])}; return {tick, redrawVisiblePlots}`,
    {
      props,
      document,
      plotRefs: { plot: host },
      plotList: { value: [{ id: 'plot', sourceIds: ['altitude'] }] },
      plots: new Map([['plot', { setData: (data) => rendered.push(Array.from(data[1])) }]]),
      plotBuffers: new Map([['plot', buffer]]),
    },
  )
  tick()
  host.offsetWidth = 0
  props.sources.altitude.inputValue = 20
  tick()
  assert.equal(buffer.index, 2)
  assert.equal(rendered.length, 1)
  host.offsetWidth = 300
  document.hidden = true
  props.sources.altitude.inputValue = 30
  tick()
  assert.equal(rendered.length, 1)
  props.pause = true
  document.hidden = false
  redrawVisiblePlots()
  assert.deepEqual(rendered.at(-1), [10, 20, 30])
})
