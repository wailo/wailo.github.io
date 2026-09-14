import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import { effectScope, markRaw, nextTick, ref, watch } from 'vue'
import { useWhiteboard } from 'vue-whiteboard-composable'
import {
  parseWhiteboardState,
  replaceWhiteboardState,
  serializeWhiteboardState,
} from '../src/WhiteboardState.ts'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'

const stroke = (id, pathData = 'M0,0L10,10') => ({
  id,
  type: 'line',
  timestamp: 1000,
  pathData,
  brush: { color: '#ff5a66', size: '2px' },
})

// Real drawing-library history, watchers and mouse gestures; only the SVG/browser is mocked.
async function fixture(options = {}) {
  const scope = effectScope()
  const published = [],
    writes = [],
    warnings = []
  let instances = 0,
    serializations = 0,
    beforeUnmount,
    exposed
  let saved = options.saved ?? '[]'
  const storage = { failRead: false, failWrite: false, ...options.storage }
  class EventTarget {
    listeners = new Map()
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || new Set()
      listeners.add(listener)
      this.listeners.set(type, listeners)
    }
    removeEventListener(type, listener) {
      this.listeners.get(type)?.delete(listener)
    }
    dispatch(type, props = {}) {
      const event = {
        type,
        target: this,
        currentTarget: this,
        view,
        clientX: 0,
        clientY: 0,
        button: 0,
        ctrlKey: false,
        preventDefault() {},
        stopImmediatePropagation() {},
        ...props,
      }
      for (const listener of [...(this.listeners.get(type) || [])]) listener.call(this, event)
    }
  }
  const document = { createElementNS: (namespace, name) => new SvgNode(namespace, name) }
  class SvgNode extends EventTarget {
    constructor(namespace, name) {
      super()
      this.namespaceURI = namespace
      this.name = name
      this.ownerDocument = document
      this.children = []
      this.parentNode = null
      this.attributes = new Map()
      this.style = {
        setProperty(key, value) {
          this[key] = value
        },
        removeProperty(key) {
          delete this[key]
        },
      }
      this.clientLeft = 0
      this.clientTop = 0
      markRaw(this)
    }
    getBoundingClientRect() {
      return { left: 0, top: 0 }
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value))
    }
    getAttribute(name) {
      return this.attributes.get(name) ?? null
    }
    removeAttribute(name) {
      this.attributes.delete(name)
    }
    querySelectorAll() {
      return [...this.children]
    }
    appendChild(node) {
      if (node.parentNode) node.parentNode.removeChild(node)
      this.children.push(node)
      node.parentNode = this
      return node
    }
    removeChild(node) {
      this.children.splice(this.children.indexOf(node), 1)
      node.parentNode = null
    }
  }
  const svg = new SvgNode('http://www.w3.org/2000/svg', 'svg')
  document.documentElement = new SvgNode('http://www.w3.org/1999/xhtml', 'html')
  const view = new EventTarget()
  view.document = document
  const source = componentScript('Whiteboard')
  const code = source.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(source))
    .join('\n')
  const api = scope.run(() =>
    evaluate(`${code}; return {svgRef, board, undo, redo, canUndo, canRedo}`, {
      ref,
      watch,
      nextTick,
      parseWhiteboardState,
      replaceWhiteboardState,
      serializeWhiteboardState: (board) => {
        serializations++
        return serializeWhiteboardState(board)
      },
      useWhiteboard: (...args) => {
        instances++
        return useWhiteboard(...args)
      },
      onBeforeUnmount: (fn) => {
        beforeUnmount = fn
      },
      defineEmits: () => (_event, data) => published.push(data.serialized),
      defineExpose: (api) => {
        exposed = api
      },
      console: { warn: (...args) => warnings.push(args) },
      localStorage: {
        getItem() {
          if (storage.failRead) throw new Error('Storage disabled')
          return saved
        },
        setItem(key, value) {
          if (storage.failWrite) throw new Error('Storage quota')
          assert.equal(key, 'drawing')
          writes.push(value)
          saved = value
        },
      },
    }),
  )
  const result = {
    ...api,
    ...exposed,
    published,
    writes,
    warnings,
    svg,
    view,
    storage,
    instances: () => instances,
    serializations: () => serializations,
    saved: () => saved,
    watcherCount: () => scope.effects.length,
    async mount() {
      api.svgRef.value = svg
      await nextTick()
    },
    draw() {
      svg.dispatch('mousedown')
      view.dispatch('mousemove', { clientX: 20, clientY: 10 })
      view.dispatch('mouseup', { clientX: 30, clientY: 15 })
    },
    dispose() {
      beforeUnmount()
      scope.stop()
      api.svgRef.value = null
    },
  }
  if (options.mount !== false) await result.mount()
  return result
}

test('repeated incoming snapshots reuse one library instance and replace rather than append strokes', async () => {
  const f = await fixture()
  try {
    const watchers = f.watcherCount()
    const listeners = [...f.svg.listeners.values()].reduce((count, set) => count + set.size, 0)
    for (let i = 0; i < 100; i++) {
      assert.equal(
        f.UpdateState(JSON.stringify([stroke(`first-${i}`), stroke(`second-${i}`)])),
        true,
      )
      assert.equal(f.svg.children.length, 2)
      assert.equal(f.board.history.value.length, 2)
    }
    await nextTick()
    assert.equal(f.instances(), 1)
    assert.equal(f.watcherCount(), watchers)
    assert.equal(
      [...f.svg.listeners.values()].reduce((count, set) => count + set.size, 0),
      listeners,
    )
    assert.deepEqual(
      f.published,
      [],
      'remote replacement never echoes, including after watcher flush',
    )
    assert.equal(JSON.parse(f.saved())[0].id, 'first-99')
    assert.equal(f.canUndo.value, true)
    f.undo()
    assert.equal(f.svg.children.length, 1, 'toolbar acts on the replacement history')
    f.redo()
    assert.equal(f.svg.children.length, 2)
  } finally {
    f.dispose()
  }
})

test('drawing, undo and redo each serialize once and send/store only visible strokes', async () => {
  const f = await fixture()
  try {
    const baseline = f.serializations()
    f.draw()
    assert.equal(f.serializations(), baseline + 1)
    assert.equal(f.published.length, 1)
    assert.equal(f.writes[0], f.published[0])
    f.draw()
    f.undo()
    assert.equal(f.serializations(), baseline + 3)
    assert.equal(f.board.history.value.length, 2, 'redo history stays local')
    assert.equal(JSON.parse(f.published.at(-1)).length, 1)
    assert.equal(JSON.parse(f.saved()).length, 1)
    assert.equal(f.svg.children.length, 1)
    assert.equal(f.canRedo.value, true)
    f.redo()
    assert.equal(f.serializations(), baseline + 4)
    assert.equal(JSON.parse(f.published.at(-1)).length, 2)
    f.undo()
    f.draw()
    assert.equal(f.canRedo.value, false, 'new strokes discard the old redo branch')
    assert.equal(f.svg.children.length, 2)
    assert.equal(JSON.parse(f.published.at(-1)).length, 2)
  } finally {
    f.dispose()
  }
})

test('incoming clear does not echo; local clear publishes once and clears redo', async () => {
  const f = await fixture()
  try {
    f.UpdateState(JSON.stringify([stroke('a')]))
    f.UpdateState('[]')
    await nextTick()
    assert.equal(f.svg.children.length, 0)
    assert.equal(f.canUndo.value, false)
    assert.equal(f.canRedo.value, false)
    assert.deepEqual(f.published, [])
    assert.equal(f.saved(), '[]')
    f.draw()
    f.clear()
    assert.equal(f.published.at(-1), '[]')
    const count = f.published.length
    f.clear()
    assert.equal(f.published.length, count)
    f.draw()
    f.undo()
    assert.equal(f.canRedo.value, true)
    f.UpdateState('[]')
    assert.equal(f.canRedo.value, false, 'authoritative empty state discards local undone strokes')
  } finally {
    f.dispose()
  }
})

test('restoration stays silent and a pending remote state supersedes saved drawing', async () => {
  const initial = JSON.stringify([stroke('saved')])
  const f = await fixture({ saved: initial })
  try {
    assert.equal(f.board.history.value[0].id, 'saved')
    assert.deepEqual(f.published, [])
    assert.deepEqual(f.writes, [], 'loading does not rewrite storage')
  } finally {
    f.dispose()
  }
  const waiting = await fixture({ saved: initial, mount: false })
  try {
    waiting.UpdateState(JSON.stringify([stroke('remote-1')]))
    waiting.UpdateState(JSON.stringify([stroke('remote-2')]))
    await waiting.mount()
    assert.equal(waiting.board.history.value[0].id, 'remote-2')
    assert.equal(waiting.instances(), 1)
    assert.deepEqual(waiting.published, [])
    assert.equal(JSON.parse(waiting.saved())[0].id, 'remote-2')
  } finally {
    waiting.dispose()
  }
})

test('snapshots received during a stroke apply after it ends without a stale echo', async () => {
  const f = await fixture()
  try {
    f.svg.dispatch('mousedown')
    f.UpdateState(JSON.stringify([stroke('superseded')]))
    f.UpdateState(JSON.stringify([stroke('latest-a'), stroke('latest-b')]))
    assert.equal(f.board.history.value.length, 0, 'do not replace an active drawing gesture')
    f.view.dispatch('mousemove', { clientX: 10, clientY: 20 })
    f.view.dispatch('mouseup', { clientX: 30, clientY: 40 })
    await nextTick()
    assert.deepEqual(
      f.board.history.value.map((record) => record.id),
      ['latest-a', 'latest-b'],
    )
    assert.deepEqual(f.published, [])
    f.undo()
    assert.equal(
      JSON.parse(f.published.at(-1)).length,
      1,
      'undo remains reactive after replacement',
    )
    f.redo()
    assert.equal(JSON.parse(f.published.at(-1)).length, 2)
    f.svg.dispatch('mousedown')
    f.UpdateState(JSON.stringify([stroke('older')]))
    f.view.dispatch('mouseup')
    f.UpdateState('[]')
    await nextTick()
    assert.equal(f.svg.children.length, 0, 'a newer clear wins over a queued snapshot')
  } finally {
    f.dispose()
  }
})

test('malformed snapshots and unsafe brush values leave the current drawing untouched', async () => {
  const f = await fixture({ saved: '{broken' })
  try {
    assert.equal(f.svg.children.length, 0)
    f.UpdateState(JSON.stringify([stroke('valid')]))
    const path = f.svg.children[0]
    const invalid = [
      'not json',
      '{}',
      'null',
      '[null]',
      '[1]',
      '[{}]',
      JSON.stringify([{ ...stroke('x'), type: 'script' }]),
      JSON.stringify([{ ...stroke('x'), pathData: {} }]),
      JSON.stringify([
        { ...stroke('x'), brush: { color: 'url(https://example.com)', size: '2px' } },
      ]),
      JSON.stringify([{ ...stroke('x'), brush: { color: '#fff', size: '2px; fill:red' } }]),
      JSON.stringify([{ ...stroke('x'), brush: { color: '#fff', size: '-1px' } }]),
    ]
    for (const serialized of invalid) assert.equal(f.UpdateState(serialized), false)
    assert.equal(f.svg.children[0], path)
    assert.equal(f.board.history.value[0].id, 'valid')
    assert.deepEqual(f.published, [])
    assert.equal(JSON.parse(f.saved())[0].id, 'valid')
    const extra = {
      ...stroke('safe'),
      onclick: 'bad()',
      brush: { ...stroke('safe').brush, extra: 'bad' },
    }
    assert.deepEqual(parseWhiteboardState(JSON.stringify([extra])), [stroke('safe')])
    assert.equal(path.getAttribute('fill'), 'none')
    assert.equal(path.getAttribute('stroke-linecap'), 'round')
  } finally {
    f.dispose()
  }
})

test('storage failures do not prevent drawing, undo or classroom publication', async () => {
  const f = await fixture({ storage: { failRead: true, failWrite: true } })
  try {
    f.draw()
    assert.equal(f.svg.children.length, 1)
    assert.equal(f.published.length, 1)
    f.undo()
    assert.equal(f.published.at(-1), '[]')
    f.storage.failWrite = false
    f.redo()
    assert.equal(f.saved(), f.published.at(-1))
    assert.ok(f.warnings.length > 0)
  } finally {
    f.dispose()
  }
})

test('teardown clears retained paths and stops watchers without broadcasting', async () => {
  const f = await fixture()
  f.draw()
  const messages = f.published.length,
    writes = f.writes.length
  f.dispose()
  assert.equal(f.board.history.value.length, 0)
  assert.equal(f.svg.children.length, 0)
  assert.equal(f.UpdateState(JSON.stringify([stroke('late')])), false)
  f.clear()
  // A late ref change must not initialize drawing or apply old pending state again.
  f.svgRef.value = f.svg
  f.board.currentIndex.value = 0
  await nextTick()
  assert.equal(f.published.length, messages)
  assert.equal(f.writes.length, writes)
})

test('instructor clear commands use the non-broadcasting state update path', () => {
  const calls = []
  const handler = evaluate(
    `${declarations(componentScript('Sim'), ['handleInstructorCommand'])}; return handleInstructorCommand`,
    {
      FlightSimModule: {},
      whiteBoardComponentRef: { value: { UpdateState: (state) => calls.push(state) } },
    },
  )
  handler('clear-whiteboard')
  assert.deepEqual(calls, ['[]'])
})
