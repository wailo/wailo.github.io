import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { markRaw, ref } from 'vue'
import { componentScript, declarations, hook, evaluate } from './helpers/vue-script.mjs'

function fixture() {
  const peers = []
  const timers = new Map()
  let timerId = 0
  class Connection extends EventEmitter {
    constructor(peer) {
      super()
      this.peer = peer
      this.metadata = {}
      this.open = false
      this.closed = false
    }
    send() {}
    close() {
      this.closed = true
      this.open = false
      this.emit('close')
    }
  }
  class Peer extends EventEmitter {
    constructor(id) {
      super()
      this.id = id
      this.connections = []
      this.destroyed = false
      this.disconnected = false
      peers.push(this)
    }
    connect(id) {
      const connection = new Connection(id)
      this.connections.push(connection)
      return connection
    }
    destroy() {
      this.destroyed = true
      for (const connection of this.connections) connection.close()
      this.emit('close')
    }
  }
  const deps = {
    PeerJS: { Peer },
    applicationTimers: {
      setTimeout: (callback) => {
        timers.set(++timerId, callback)
        return timerId
      },
      clearTimeout: (id) => timers.delete(id),
    },
    markRaw,
    isOnline: ref(false),
    isInstructor: ref(true),
    selfPeerId: ref('SIM-1'),
    requestedRoomId: ref('SIM-1'),
    displayname: ref('TEST'),
    incomingConns: ref({}),
    peerRosterOrder: ref([]),
    selectedPeerIds: ref([]),
    focusedPeerId: ref(''),
    detailsPeerId: ref(''),
    isDevelopment: true,
    props: { accountName: 'Test' },
    aiCoordinator: { dispose() {} },
    aiClient: { dispose() {} },
    manualAIRequests: new Set(),
    trace() {},
    onError() {},
    onData() {},
    sendEnvelopeToConnection() {},
    window: { removeEventListener() {} },
    document: { removeEventListener() {} },
    dismissPeerDetailsOnOutsideClick() {},
    recordFocusInteraction() {},
    healthTimer: undefined,
    clearInterval() {},
    emit() {},
  }
  const source = componentScript('ClassRoom')
  const api = evaluate(
    `${declarations(source, [
      'selfPeer',
      'instructorConnection',
      'instructorConnectionOpen',
      'classroomDisposed',
      'reconnectTimer',
      'clearReconnectTimer',
      'onDisconnected',
      'onPeerClose',
      'onConnectionClose',
      'setupConnection',
      'connectToPeerJsServer',
      'disconnect',
      'connectToPeer',
    ])}
  return {connectToPeerJsServer, disconnect, connectToPeer, setupConnection,
    dispose: ${hook(source, 'onUnmounted')}}`,
    deps,
  )
  return { ...api, peers, timers, deps, Connection }
}

test('unmount destroys a connecting peer and ignores a delayed open callback', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  const peer = f.peers[0]
  const lateOpen = peer.listeners('open')[0]
  f.dispose()
  assert.equal(peer.destroyed, true)
  lateOpen('SIM-1')
  assert.equal(f.deps.isOnline.value, false)
  assert.equal(peer.connections.length, 0)
})

test('manual disconnect closes open and pending clients and does not reconnect', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  const peer = f.peers[0]
  peer.emit('open', 'SIM-1')
  const connection = peer.connect('student')
  f.setupConnection(connection)
  connection.open = true
  connection.emit('open')
  const pending = peer.connect('not-open-yet')
  f.setupConnection(pending)
  const lateOpen = pending.listeners('open')[0]
  f.disconnect()
  lateOpen()
  assert.equal(connection.closed, true)
  assert.equal(pending.closed, true)
  assert.equal(peer.destroyed, true)
  assert.deepEqual(f.deps.incomingConns.value, {})
  assert.equal(f.timers.size, 0)
})

test('lost instructor schedules one reconnect which unmount cancels', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  f.peers[0].emit('error', { type: 'unavailable-id' })
  assert.equal(f.peers[0].destroyed, true)
  const student = f.peers[1]
  student.id = 'student'
  student.emit('open', 'student')
  const connection = student.connections[0]
  connection.open = true
  connection.emit('open')
  connection.close()
  assert.equal(f.timers.size, 1)
  const delayedReconnect = [...f.timers.values()][0]
  f.dispose()
  assert.equal(f.timers.size, 0)
  delayedReconnect()
  assert.equal(student.connections.length, 1)
})

test('offline then reconnect to the same room creates a fresh working peer', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  f.peers[0].emit('open', 'SIM-1')
  f.disconnect()
  f.connectToPeerJsServer('SIM-1')
  f.peers[1].emit('open', 'SIM-1')
  assert.equal(f.deps.isOnline.value, true)
  assert.equal(f.deps.isInstructor.value, true)
  f.dispose()
})

test('late events from a replaced peer cannot change the current session', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  const old = f.peers[0]
  const lateOpen = old.listeners('open')[0]
  const lateClose = old.listeners('close')[0]
  f.connectToPeerJsServer('SIM-2')
  f.peers[1].emit('open', 'SIM-2')
  lateOpen('SIM-1')
  lateClose()
  assert.equal(f.deps.isOnline.value, true)
  assert.equal(f.deps.selfPeerId.value, 'SIM-2')
  f.dispose()
})

test('a pending client from an old session cannot join the replacement session', () => {
  const f = fixture()
  f.connectToPeerJsServer('SIM-1')
  f.peers[0].emit('open', 'SIM-1')
  const connection = f.peers[0].connect('student')
  f.setupConnection(connection)
  const lateOpen = connection.listeners('open')[0]
  f.connectToPeerJsServer('SIM-2')
  f.peers[1].emit('open', 'SIM-2')
  lateOpen()
  assert.deepEqual(f.deps.incomingConns.value, {})
  assert.equal(connection.closed, true)
  f.dispose()
})
