import assert from 'node:assert/strict'
import test from 'node:test'
import { RemoteCallManager } from '../src/RemoteCallManager.ts'

class MockKeyboardEvent {
  constructor(type, init = {}) {
    this.type = type
    this.key = init.key ?? ''
    this.code = init.code ?? ''
    this.keyCode = init.keyCode ?? 0
    this.charCode = init.charCode ?? 0
    this.ctrlKey = init.ctrlKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
    this.metaKey = init.metaKey ?? false
  }
}

Object.defineProperty(globalThis, 'KeyboardEvent', {
  configurable: true,
  value: MockKeyboardEvent,
})

function createFlightModelPeer(send) {
  const state = { flightModel: null }
  const model = {
    throttle: 1,
    set_engine_throttle_position(value) {
      this.throttle = value
    },
  }
  const simulation = {
    set_flight_model_b747() {
      return model
    },
  }

  let manager
  manager = new RemoteCallManager(send, (path, result) => {
    if (path[0] !== 'FlightSimModule.simulation') return
    if (path.at(-1) !== 'set_flight_model_b747') return

    state.flightModel = result
    manager.wrapObject('FlightSimModule.flightModel', result, ['set'])
  })
  manager.wrapObject('FlightSimModule.simulation', simulation, ['set'])

  return { manager, model, simulation, state }
}

test('wraps a newly selected flight model and mirrors its throttle setter', () => {
  const outbound = []
  const echoes = []
  const instructor = createFlightModelPeer((call) => outbound.push(call))
  const student = createFlightModelPeer((call) => echoes.push(call))

  const selectedModel = instructor.simulation.set_flight_model_b747()
  selectedModel.set_engine_throttle_position(0)

  assert.deepEqual(
    outbound.map((call) => call.path),
    [
      ['FlightSimModule.simulation', 'set_flight_model_b747'],
      ['FlightSimModule.flightModel', 'set_engine_throttle_position'],
    ],
  )

  outbound.forEach((call) => student.manager.handleIncomingMessage(JSON.stringify(call)))

  assert.equal(student.state.flightModel, student.model)
  assert.equal(student.model.throttle, 0)
  assert.equal(echoes.length, 0, 'received calls must not be broadcast back')
})

test('does not wrap the same object more than once', () => {
  const outbound = []
  const model = {
    set_engine_throttle_position() {},
  }
  const manager = new RemoteCallManager((call) => outbound.push(call))

  manager.wrapObject('FlightSimModule.flightModel', model, ['set'])
  manager.wrapObject('FlightSimModule.flightModel', model, ['set'])
  model.set_engine_throttle_position(0.5)

  assert.equal(outbound.length, 1)
})

test('mirrors WASM keydown and keyup without echoing received events', () => {
  const outbound = []
  const echoes = []
  const received = []
  const instructorGlfw = {
    onKeydown() {},
    onKeyup() {},
  }
  const studentGlfw = {
    onKeydown(event) {
      received.push(event)
    },
    onKeyup(event) {
      received.push(event)
    },
  }
  const instructor = new RemoteCallManager((call) => outbound.push(call))
  const student = new RemoteCallManager((call) => echoes.push(call))
  instructor.wrapObject('GLFW', instructorGlfw, ['onKeydown', 'onKeyup'])
  student.wrapObject('GLFW', studentGlfw, ['onKeydown', 'onKeyup'])

  instructorGlfw.onKeydown(
    new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      code: 'ArrowUp',
      keyCode: 38,
      shiftKey: true,
    }),
  )
  instructorGlfw.onKeyup(
    new KeyboardEvent('keyup', {
      key: 'ArrowUp',
      code: 'ArrowUp',
      keyCode: 38,
      shiftKey: true,
    }),
  )

  outbound.forEach((event) => student.handleIncomingMessage(JSON.stringify(event)))

  assert.deepEqual(
    outbound.map((event) => event.type),
    ['onKeydown', 'onKeyup'],
  )
  assert.deepEqual(
    received.map((event) => ({
      type: event.type,
      code: event.code,
      shiftKey: event.shiftKey,
    })),
    [
      { type: 'keydown', code: 'ArrowUp', shiftKey: true },
      { type: 'keyup', code: 'ArrowUp', shiftKey: true },
    ],
  )
  assert.equal(echoes.length, 0, 'received keyboard events must not be broadcast back')
})
