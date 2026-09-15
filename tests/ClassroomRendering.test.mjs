import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import * as Vue from 'vue'
import Fuse from 'fuse.js'
import * as peerPresentation from '../src/ClassroomPeer.ts'
import { nextClassroomFocus } from '../src/ClassroomFocus.ts'
import { componentScript, declarations, evaluate } from './helpers/vue-script.mjs'

const classroom = componentScript('ClassRoom')
const sfc = (name) =>
  parse(readFileSync(new URL(`../src/components/${name}.vue`, import.meta.url), 'utf8')).descriptor

function loadCompiled(code, imports) {
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'exports', 'module', js)(
    (name) => {
      assert.ok(name in imports, `Unexpected dependency: ${name}`)
      return imports[name]
    },
    module.exports,
    module,
  )
  return module.exports
}

const peerRow = loadCompiled(
  compileScript(sfc('ClassroomPeerRow'), {
    id: 'peer-row',
    inlineTemplate: true,
    templateOptions: { compilerOptions: { hoistStatic: false } },
  }).content,
  { vue: Vue, '../ClassroomPeer': peerPresentation },
).default

function findTemplateNode(node, className) {
  if (
    node.props?.some(
      (prop) => prop.name === 'class' && prop.value?.content.split(' ').includes(className),
    )
  )
    return node
  for (const child of node.children || []) {
    const found = findTemplateNode(child, className)
    if (found) return found
  }
}
// Compile the real roster markup, including its component props, listeners and details.
const rosterTemplate = findTemplateNode(sfc('ClassRoom').template.ast, 'roster-list').loc.source
const rosterRender = loadCompiled(
  compileTemplate({
    source: rosterTemplate,
    filename: 'ClassRoom.vue',
    id: 'roster',
    compilerOptions: { hoistStatic: false },
  }).code,
  { vue: Vue },
).render

function rosterFixture() {
  const document = { activeElement: null }
  class Element {
    constructor(type, text = '') {
      this.type = type
      this.text = text
      this.children = []
      this.props = {}
      this.parent = null
      // Real DOM elements are not made reactive by Vue.
      Vue.markRaw(this)
    }
    get isConnected() {
      return this === document.body || !!this.parent?.isConnected
    }
    focus() {
      document.activeElement = this
    }
    scrollIntoView() {}
  }
  document.body = new Element('body')
  document.activeElement = document.body
  const renderer = Vue.createRenderer({
    createElement: (type) => new Element(type),
    createText: (text) => new Element('#text', text),
    createComment: (text) => new Element('#comment', text),
    setText: (node, text) => {
      node.text = text
    },
    setElementText: (node, text) => {
      node.text = text
      node.children = []
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] || null,
    patchProp: (node, key, _old, value) => {
      node.props[key] = value
    },
    insert(node, parent, anchor = null) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
      parent.children.splice(index, 0, node)
      node.parent = parent
    },
    remove(node) {
      node.parent?.children.splice(node.parent.children.indexOf(node), 1)
      node.parent = null
    },
  })
  const peers = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [
      `peer-${i}`,
      {
        metadata: { callsign: `STUDENT-${i}`, name: `Student ${i}`, status: 'running' },
        conn: Vue.markRaw({ open: true }),
        lastSeen: Date.now(),
        latency: 5,
        exercise: { id: 'test', name: 'Flight test', status: 'running', checkpoints: [] },
      },
    ]),
  )
  const deps = {
    computed: Vue.computed,
    ref: Vue.ref,
    nextTick: Vue.nextTick,
    Fuse,
    ...peerPresentation,
    nextClassroomFocus,
    HTMLElement: Element,
    document,
    incomingConns: Vue.ref(peers),
    peerRosterOrder: Vue.ref(Object.keys(peers)),
    rosterSearch: Vue.ref(''),
    rosterFilter: Vue.ref('all'),
    selectedPeerIds: Vue.ref([]),
    focusedPeerId: Vue.ref(''),
    detailsPeerId: Vue.ref(''),
    clock: Vue.ref(Date.now()),
    aiJobs: Vue.ref([]),
    rosterRowRefs: new Map(),
    rosterDetailRef: Vue.ref(null),
    classroomShellRef: Vue.ref(document.body),
    batchMenuOpen: Vue.ref(false),
    feedbackProviderConfig: { provider: 'test' },
    sendEnvelopeToConnection() {},
    logSessionEvent() {},
    openExercisePalette() {},
    sendExerciseControl() {},
    unassignPeer() {},
    openMessageComposer() {},
    disconnectPeer() {},
    suggestPeerFeedback() {},
    approveFeedback() {},
    dismissFeedback() {},
    cancelAIJob() {},
  }
  const names = [
    'participantRecords',
    'filteredParticipants',
    'collapsedExerciseGroups',
    'toggleExerciseGroup',
    'participantExerciseGroups',
    'visibleParticipantRows',
    'aiJobIndex',
    'visibleAIJobs',
    'pendingAI',
    'isPeerSelected',
    'connectionAge',
    'focusInteractionVersion',
    'focusPeer',
    'focusPeerRow',
    'togglePeerSelection',
    'togglePeerCheckbox',
    'acknowledgeHandRequest',
    'openPeerDetails',
    'closePeerDetails',
    'togglePeerDetails',
    'setRosterRowRef',
    'setRosterDetailRef',
    'restoreRosterFocus',
    'formatCheckpointTime',
    'formatAssignmentDeadline',
    'recordCheckpoint',
  ]
  const state = {
    ...deps,
    ...evaluate(`${declarations(classroom, names)}; return {${names.join(',')}}`, deps),
  }
  const updates = new Map()
  const Row = {
    ...peerRow,
    setup(props, context) {
      Vue.onBeforeUpdate(() => updates.set(props.peerId, (updates.get(props.peerId) || 0) + 1))
      return peerRow.setup(props, context)
    },
  }
  let parentUpdates = 0
  const app = renderer.createApp({
    components: { ClassroomPeerRow: Row },
    setup() {
      Vue.onBeforeUpdate(() => parentUpdates++)
      return state
    },
    render: rosterRender,
  })
  app.mount(document.body)
  return {
    state,
    updates,
    document,
    app,
    row: (id) => state.rosterRowRefs.get(id),
    parentUpdates: () => parentUpdates,
  }
}

function findElement(node, predicate) {
  if (predicate(node)) return node
  for (const child of node.children) {
    const found = findElement(child, predicate)
    if (found) return found
  }
}
const textContent = (node) =>
  node.type === '#comment' ? '' : node.text + node.children.map(textContent).join('')
const event = (extra = {}) => ({ stopPropagation() {}, preventDefault() {}, ...extra })
const job = (peerId, state = 'queued') => ({ id: peerId, peerId, state, request: { evidence: {} } })

test('running exercise uses a static IN PROGRESS label, updated when stopped', async () => {
  const f = rosterFixture()
  try {
    const peer = f.state.incomingConns.value['peer-0']
    peer.exercise.status = 'running'
    await Vue.nextTick()
    assert.match(f.row('peer-0').props.class, /text-simActiveButton/)
    const status = findElement(f.row('peer-0'), (node) =>
      node.props.class?.includes('roster-exercise-status'),
    )
    assert.equal(status.type, 'span')
    assert.match(textContent(status), /IN PROGRESS/)
    assert.doesNotMatch(textContent(status), /▶/)
    const dot = findElement(status, (node) => node.props.class?.includes('roster-running-dot'))
    assert.equal(dot, undefined)
    peer.exercise.status = 'stopped'
    await Vue.nextTick()
    assert.match(textContent(status), /STOP/)
    assert.equal(
      findElement(status, (node) => node.props.class?.includes('roster-running-dot')),
      undefined,
    )
    assert.doesNotMatch(sfc('ClassroomPeerRow').styles[0].content, /roster-running-pulse/)
  } finally {
    f.app.unmount()
  }
})

test('ping updates retain a fixed-width tabular field', async () => {
  const f = rosterFixture()
  try {
    const peer = f.state.incomingConns.value['peer-0']
    const ping = findElement(f.row('peer-0'), (node) => node.props.class === 'roster-ping')
    for (const latency of [12, 123, 1234]) {
      peer.latency = latency
      await Vue.nextTick()
      assert.equal(textContent(ping), `${latency}ms`)
    }
    const css = sfc('ClassroomPeerRow').styles[0].content
    assert.match(css, /\.roster-ping\s*\{[^}]*width: 7ch;/)
    assert.match(css, /\.roster-ping\s*\{[^}]*font-variant-numeric: tabular-nums;/)
  } finally {
    f.app.unmount()
  }
})

test('one peer update does not render the parent roster or the other 29 peer rows', async () => {
  const f = rosterFixture()
  try {
    assert.equal(f.state.rosterRowRefs.size, 30)
    const peer = f.state.incomingConns.value['peer-0']
    for (let i = 0; i < 20; i++) {
      peer.latency = i + 10
      peer.lastSeen = Date.now()
      f.state.recordCheckpoint(peer, `Answer ${i} selected`, Date.now())
      await Vue.nextTick()
    }
    assert.deepEqual([...f.updates], [['peer-0', 20]])
    assert.equal(f.parentUpdates(), 0)
    assert.match(f.row('peer-0').props.title, /Answer 19 selected/)
    assert.equal(peer.exercise.checkpoints.length, 20)
  } finally {
    f.app.unmount()
  }
})

test('AI badges are indexed once and only the changed peer badge rerenders', async () => {
  const f = rosterFixture()
  try {
    f.state.aiJobs.value.push(job('peer-0'), job('peer-1', 'finished'))
    await Vue.nextTick()
    assert.deepEqual([...f.updates], [['peer-0', 1]])
    const index = f.state.aiJobIndex.value
    assert.equal(index.pendingCount, 1)
    for (let i = 0; i < 30; i++) f.state.pendingAI(`peer-${i}`)
    assert.equal(f.state.aiJobIndex.value, index)
    assert.equal(index.byPeer.get('peer-1')[0].state, 'finished')
    f.state.aiJobs.value[0].state = 'generating'
    await Vue.nextTick()
    assert.equal(f.updates.get('peer-0'), 1, 'queued and generating share the same pending badge')
    f.state.aiJobs.value[0].state = 'review'
    await Vue.nextTick()
    assert.deepEqual([...f.updates], [['peer-0', 2]])
    assert.match(textContent(f.row('peer-0')), /AI review/)
    f.state.aiJobs.value[0].state = 'finished'
    await Vue.nextTick()
    assert.equal(f.state.aiJobIndex.value.pendingCount, 0)
    assert.equal(f.state.pendingAI('peer-0'), false)
    assert.doesNotMatch(textContent(f.row('peer-0')), /AI review|AI pending/)
  } finally {
    f.app.unmount()
  }
})

test('assignment sections stay name-sorted and preserve selection and details when peers move', async () => {
  const f = rosterFixture()
  try {
    const peer = f.state.incomingConns.value['peer-2']
    const exercise = peer.exercise
    f.state.selectedPeerIds.value = ['peer-2']
    f.state.detailsPeerId.value = 'peer-2'
    peer.exercise = undefined
    await Vue.nextTick()
    assert.deepEqual(
      f.state.participantExerciseGroups.value.map((g) => g.key),
      ['unassigned', 'assigned'],
    )
    assert.match(textContent(f.row('peer-2')), /No lesson assigned/)
    assert.equal(f.row('peer-2').props['aria-selected'], true)
    peer.exercise = { ...exercise, name: 'Different lesson' }
    await Vue.nextTick()
    assert.deepEqual(
      f.state.participantExerciseGroups.value.map((g) => g.key),
      ['assigned'],
    )
    assert.equal(f.state.detailsPeerId.value, 'peer-2')
    assert.equal(f.row('peer-2').props['aria-selected'], true)
    assert.match(textContent(f.row('peer-2')), /Different lesson/)
    const order = f.state.visibleParticipantRows.value.map((p) => p.peerId)
    assert.deepEqual(order.slice(0, 4), ['peer-0', 'peer-1', 'peer-2', 'peer-3'])
    peer.exercise.status = 'completed'
    await Vue.nextTick()
    assert.deepEqual(
      f.state.visibleParticipantRows.value.map((p) => p.peerId),
      order,
    )
    assert.ok(f.state.rosterDetailRef.value, 'details remain visible after assignment')
  } finally {
    f.app.unmount()
  }
})

test('assignment status and selection leave unchanged row props stable', async () => {
  const f = rosterFixture()
  try {
    f.state.incomingConns.value['peer-0'].exercise.status = 'completed'
    await Vue.nextTick()
    assert.deepEqual([...f.updates], [['peer-0', 1]])
    assert.match(textContent(f.row('peer-0')), /DONE/)
    f.state.selectedPeerIds.value = ['peer-2']
    await Vue.nextTick()
    assert.equal(f.row('peer-2').props['aria-selected'], true)
    assert.deepEqual(
      [...f.updates],
      [
        ['peer-0', 1],
        ['peer-2', 1],
      ],
    )
    f.state.rosterSearch.value = 'STUDENT-2'
    await Vue.nextTick()
    assert.ok(f.row('peer-2'), 'search retains the matching row')
    f.state.rosterFilter.value = 'active'
    await Vue.nextTick()
    assert.equal(
      f.state.filteredParticipants.value.some((p) => p.peerId === 'peer-0'),
      false,
    )
  } finally {
    f.app.unmount()
  }
  await Vue.nextTick()
  assert.equal(f.state.rosterRowRefs.size, 0)
})

test('row clicks, checkboxes and details arrows retain their peer identity and focus', async () => {
  const f = rosterFixture()
  try {
    const row = f.row('peer-2')
    row.props.onClick(event({ currentTarget: row }))
    await Vue.nextTick()
    assert.equal(f.document.activeElement, row)
    assert.equal(f.state.focusedPeerId.value, 'peer-2')
    findElement(row, (node) => node.type === 'input').props.onClick(event())
    await Vue.nextTick()
    assert.deepEqual(f.state.selectedPeerIds.value, ['peer-2'])
    const details = findElement(row, (node) => node.props.class?.includes('peer-details-toggle'))
    details.props.onClick(event())
    await Vue.nextTick()
    assert.equal(f.state.detailsPeerId.value, 'peer-2')
    assert.equal(details.props['aria-expanded'], true)
    assert.equal(f.document.activeElement, row)
    // Expanded details remain immediately beneath the selected peer.
    assert.equal(
      row.parent.children[row.parent.children.indexOf(row) + 1],
      f.state.rosterDetailRef.value,
    )
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      const handlers = [].concat(details.props.onKeydown)
      for (const handler of handlers) handler(event({ key }))
      await Vue.nextTick()
      assert.equal(f.state.detailsPeerId.value, key === 'ArrowLeft' ? '' : 'peer-2')
    }
    const parentUpdates = f.parentUpdates()
    f.state.incomingConns.value['peer-3'].latency = 42
    await Vue.nextTick()
    assert.equal(f.parentUpdates(), parentUpdates, 'unrelated latency does not redraw open history')
    assert.equal(f.document.activeElement, row, 'another peer update does not move keyboard focus')
    f.state.recordCheckpoint(f.state.incomingConns.value['peer-2'], 'Score: 4/6', Date.now(), {
      score: 4,
    })
    await Vue.nextTick()
    assert.match(textContent(f.state.rosterDetailRef.value), /Score: 4\/6/)
  } finally {
    f.app.unmount()
  }
})

test('the existing health clock still refreshes stale connections and raised-hand durations', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 })
  const f = rosterFixture()
  try {
    const peer = f.state.incomingConns.value['peer-0']
    peer.handState = 'raised'
    peer.handRaisedAt = Date.now()
    await Vue.nextTick()
    t.mock.timers.tick(20_000)
    f.state.clock.value = Date.now()
    await Vue.nextTick()
    assert.match(textContent(f.row('peer-0')), /STALE\s*0:20/)
    peer.lastSeen = Date.now()
    await Vue.nextTick()
    assert.doesNotMatch(textContent(f.row('peer-0')), /STALE/)
  } finally {
    f.app.unmount()
  }
})

function messageFixture(isDevelopment = false) {
  const calls = [],
    sent = [],
    diagnostics = []
  const deps = {
    isDevelopment,
    incomingConns: Vue.ref({
      student: { metadata: {}, lastSeen: 0, exercise: { id: 'test', checkpoints: [] } },
    }),
    isInstructor: Vue.ref(true),
    isOnline: Vue.ref(true),
    instructorConnection: { open: true },
    instructorConnectionOpen: true,
    followMode: Vue.ref(false),
    trace: (text) => diagnostics.push(text),
    onError: (text) => calls.push(['error', text]),
    emit: (...args) => calls.push(args),
    sendEnvelopeToConnection: (...args) => sent.push(args),
    JSON: {
      stringify: (value) => {
        calls.push(['stringify'])
        return JSON.stringify(value)
      },
    },
  }
  const api = evaluate(
    `${declarations(classroom, ['onData', 'isEnvelope', 'handleEnvelope', 'recordCheckpoint', 'sendCheckPoint'])}; return {onData, sendCheckPoint}`,
    deps,
  )
  return { ...api, deps, calls, sent, diagnostics }
}

test('production messages skip debug serialization and deliver checkpoints synchronously', () => {
  const f = messageFixture()
  const evidence = { score: 4, total: 6 }
  f.onData(
    {
      version: 1,
      type: 'checkpoint',
      timestamp: 123,
      payload: { checkpoint: 'Test complete', data: evidence },
    },
    { peer: 'student' },
  )
  const peer = f.deps.incomingConns.value.student
  assert.equal(peer.metadata.checkPoint, 'Test complete')
  assert.deepEqual(peer.exercise.checkpoints, [
    { timestamp: 123, message: 'Test complete', data: evidence },
  ])
  assert.deepEqual(f.calls, [])
  assert.deepEqual(f.diagnostics, [])
  for (const follow of [false, true]) {
    f.deps.followMode.value = follow
    f.sendCheckPoint('Test complete', evidence)
  }
  assert.equal(f.sent.length, 2, 'checkpoint delivery remains independent of mirror mode')
})

test('development tracing remains available and the existing connection authorization is preserved', () => {
  const f = messageFixture(true)
  f.onData({ status: 'paused' }, { peer: 'student' })
  assert.equal(f.deps.incomingConns.value.student.metadata.status, 'paused')
  assert.equal(f.calls.filter(([type]) => type === 'stringify').length, 1)
  assert.match(f.diagnostics[0], /Received data from student.*paused/)
  f.onData({ version: 1, type: 'api', payload: { api: 'do not execute' } }, { peer: 'student' })
  assert.ok(f.calls.some(([type]) => type === 'error'))
  assert.ok(!f.calls.some(([type]) => type === 'apiDataEvent'))
})
