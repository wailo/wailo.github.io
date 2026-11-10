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
  const blur = () => {}
  const globalKeydown = () => {}
  const fullscreen = () => {}
  const panelTab = () => {}
  const dispose = evaluate(
    `let simDisposed = false; let cleanupSimListeners;
    ${assignment.getText(source)};
    return ${hook(source, 'onUnmounted')}`,
    {
      document: { removeEventListener: (...args) => calls.push(['document', ...args]) },
      window: { removeEventListener: (...args) => calls.push(['window', ...args]) },
      GLFWModule: { GLFW: { onBlur: blur } },
      handleSimKeydown: keydown,
      handleSimKeyup: keyup,
      handleGlobalKeydown: globalKeydown,
      onFullscreenChange: fullscreen,
      handlePanelTabRequest: panelTab,
      stopStatusWatch: () => calls.push(['watcher']),
      simUpdateInterval: 1,
      layoutResizeTimer: 2,
      promptAttentionTimer: 4,
      pilotAttentionTimer: 5,
      clearLicenceWatchdog: () => calls.push(['licence']),
      clearLicenceRetry: () => calls.push(['licence-retry']),
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
    ['window', 'keydown', keydown, true],
    ['window', 'keyup', keyup, true],
    ['window', 'blur', blur, true],
    ['watcher'],
    ['interval', 1],
    ['timeout', 2],
    ['timeout', 4],
    ['timeout', 5],
    ['licence'],
    ['licence-retry'],
    ['observer'],
    ['frame', 3],
    ['document', 'fullscreenchange', fullscreen],
    ['window', 'sim:request-panel-tab', panelTab],
  ])
})

test('flight keys keep working on focused controls but defer to typing and UI shortcuts', () => {
  const source = componentScript('Sim')
  const declaration = (name) =>
    findNode(source, (node) => ts.isVariableDeclaration(node) && node.name.getText(source) === name)
  const calls = []
  const canvas = { id: 'canvas' }
  const activeElement = { current: canvas }
  const document = {
    get activeElement() {
      return activeElement.current
    },
  }
  class FakeElement {
    constructor({ typing = false, control = false, slider = false, ignored = false } = {}) {
      this.typing = typing
      this.control = control
      this.slider = slider
      this.ignored = ignored
      this.isContentEditable = false
      this.tagName = 'DIV'
    }
    closest(selector) {
      if (selector === '[data-sim-keys-ignore]') return this.ignored ? this : null
      if (selector === '[role="slider"]') return this.slider ? this : null
      if (selector.includes('button')) return this.control ? this : null
      if (selector.includes('input')) return this.typing ? this : null
      return null
    }
  }
  const handleSimKeydown = evaluate(
    `
    ${declaration('isTypingTarget').getText(source)};
    ${declaration('isControlActivation').getText(source)};
    ${declaration('isSliderNavigation').getText(source)};
    ${declaration('handleSimKeydown').getText(source)};
    return handleSimKeydown;
    `,
    {
      GLFWModule: { GLFW: { onKeydown: (event) => calls.push(event.key) } },
      document,
      canvas,
      Element: FakeElement,
      HTMLElement: FakeElement,
    },
  )
  const press = ({ key = 'w', target = {}, ...rest } = {}) => {
    calls.length = 0
    handleSimKeydown({
      key,
      defaultPrevented: false,
      isComposing: false,
      target: new FakeElement(target),
      ...rest,
    })
    return calls.length
  }

  // The point of the change: a focused autopilot button no longer blocks flight keys.
  assert.equal(press({ target: { control: true } }), 1)
  assert.equal(press({ target: { control: true }, key: 'w' }), 1)
  // Typing and native control activation stay with the UI.
  assert.equal(press({ target: { typing: true } }), 0)
  assert.equal(press({ target: { control: true }, key: ' ' }), 0)
  assert.equal(press({ target: { control: true }, key: 'Enter' }), 0)
  // Sliders own their navigation keys; the classroom owns its whole shortcut layer.
  assert.equal(press({ target: { slider: true }, key: 'ArrowUp' }), 0)
  assert.equal(press({ target: { slider: true }, key: 'w' }), 1)
  assert.equal(press({ target: { ignored: true }, key: 'a' }), 0)
  // Tab and Escape never reach the engine (Escape keeps its focus-restore role).
  assert.equal(press({ key: 'Tab' }), 0)
  activeElement.current = { other: true }
  assert.equal(press({ key: 'Escape' }), 0)
  activeElement.current = canvas
  assert.equal(press({ key: 'Escape' }), 1)
  assert.equal(press({ defaultPrevented: true }), 0)
  assert.equal(press({ isComposing: true }), 0)
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
