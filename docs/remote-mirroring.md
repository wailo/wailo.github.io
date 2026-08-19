# Remote simulator mirroring

`RemoteCallManager` mirrors selected instructor actions to connected classroom peers. It wraps approved functions in place, sends their path and arguments, and resolves the same path on each receiving peer.

## Synchronization contract

- Only functions registered with `wrapObject()` are mirrored.
- Received calls execute locally and must never be sent back to the instructor.
- Objects returned by a flight-model switch are new WASM handles. Both peers must replace `FlightSimModule.flightModel` and wrap the returned handle before later setters are called.
- Registering the same object again must not wrap its functions twice.
- Cockpit keyboard input is handled by `GLFWModule.GLFW`, not by `FlightSimModule`. Both `onKeydown` and `onKeyup` must be registered.
- UI actions that need synchronization must call a wrapped simulator utility or setter. Directly changing component-local state bypasses mirroring.

## Flight-model switching

A call to `set_flight_model_b747()` or `set_flight_model_c172()` returns a new model object. The result handler in `Sim.vue` performs three operations before returning control to the caller:

1. Assigns the result to `FlightSimModule.flightModel`.
2. Registers the new object under `FlightSimModule.flightModel`.
3. Refreshes computed controls so the UI reads the new model.

Consequently, a learning module may safely use the returned object:

```ts
const model = context.controls.simulation.set_flight_model_b747()
model.set_engine_throttle_position(0)
```

The model selection and throttle setter are sent as two ordered calls. The peer registers its own returned B747 before resolving the throttle path.

## Cockpit keyboard events

The canvas forwards cockpit input to `GLFW.onKeydown` and `GLFW.onKeyup`. The manager serializes the key identity and modifier state instead of attempting to serialize a browser `KeyboardEvent` object. The receiver reconstructs the corresponding `keydown` or `keyup` event and invokes its local WASM handler.

## Adding a mirrored action

1. Prefer a stable function owned by `simFunctions`, `simulation`, or the current `flightModel`.
2. Add its exact name or a narrow prefix to the appropriate `wrapObject()` registration in `Sim.vue`.
3. Make UI controls call that wrapped function rather than changing local state directly.
4. Add a unit test that asserts the outgoing path, receiving-side state, and zero echo messages.

Avoid recreating `RemoteCallManager` after classroom connection or routine model refreshes. Reusing one manager preserves its remote-execution guard and prevents stacked wrappers.

## Tests

Run:

```sh
npm test
```

The test suite currently protects:

- wrapping and assigning a newly selected flight model;
- throttle propagation after a model switch;
- idempotent object registration;
- suppression of received-call echoes;
- WASM cockpit keydown and keyup reconstruction.
