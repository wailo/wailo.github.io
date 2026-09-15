import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import * as Cesium from 'cesium'
import { componentScript, evaluate } from './helpers/vue-script.mjs'

// Run the component's actual setup/mount/teardown with real Cesium camera math.
// Only the browser, GPU renderer and OpenLayers surfaces are replaced.
function mapFixture(options = {}) {
  const props = {
    lat: 51,
    lon: 0,
    altFt: 1000,
    pitchDeg: 0,
    bankDeg: 0,
    headingDeg: 0,
    ...options.props,
  }
  let now = 0,
    mount,
    unmount,
    exposed,
    renderer
  const maps = [],
    points = [],
    features = [],
    shapes = [],
    watchers = []
  const observers = {},
    listeners = new Map(),
    cameraWrites = []
  const host = { isConnected: true, offsetWidth: 600, offsetHeight: 400, ...options.host }
  const navHost = { isConnected: true, offsetWidth: 210, offsetHeight: 220 }
  const document = {
    hidden: options.hidden ?? false,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      assert.equal(listeners.get(name), fn)
      listeners.delete(name)
    },
  }
  const scene = {
    preUpdate: new Cesium.Event(),
    requests: 0,
    requestRender() {
      this.requests++
    },
    camera: {
      setView({ destination, orientation }) {
        cameraWrites.push({ position: Cesium.Cartesian3.clone(destination), ...orientation })
      },
    },
  }
  class FakeMap {
    constructor(options) {
      this.target = options.target
      this.view = options.view
      this.events = {}
      this.sizeUpdates = 0
      this.disposals = 0
      maps.push(this)
    }
    getView() {
      return this.view
    }
    setTarget(target) {
      this.target = target
    }
    updateSize() {
      this.sizeUpdates++
    }
    on(name, callback) {
      this.events[name] = callback
    }
    dispose() {
      this.disposals++
    }
  }
  class FakeView {
    constructor(options) {
      Object.assign(this, options)
      this.centerWrites = 0
      this.cancelledAnimations = 0
    }
    setCenter(center) {
      this.center = center
      this.centerWrites++
    }
    animate(options) {
      this.animation = options
    }
    cancelAnimations() {
      this.cancelledAnimations++
    }
  }
  class FakeOLCesium {
    constructor() {
      renderer = this
      this.destroyed = 0
    }
    setBlockCesiumRendering(blocked) {
      this.blocked = blocked
    }
    setEnabled(enabled) {
      // OL-Cesium syncs the 2D view on disable; Cesium cannot pick a detached canvas.
      if (!enabled && (!host.isConnected || !host.offsetWidth || !host.offsetHeight)) {
        throw new Error('ray is required')
      }
      this.enabled = enabled
    }
    setTargetFrameRate(rate) {
      this.rate = rate
    }
    setRefresh2DAfterCameraMoveEndOnly(value) {
      this.sync2DAtRest = value
    }
    getCesiumScene() {
      return scene
    }
    destroy() {
      this.destroyed++
    }
  }
  class Point {
    constructor(coordinates) {
      this.coordinates = coordinates
      this.writes = 0
      points.push(this)
    }
    setCoordinates(coordinates) {
      this.coordinates = coordinates
      this.writes++
    }
  }
  class Feature {
    constructor() {
      this.changes = 0
      features.push(this)
    }
    changed() {
      this.changes++
    }
  }
  class RegularShape {
    constructor() {
      this.writes = 0
      shapes.push(this)
    }
    setRotation(rotation) {
      this.rotation = rotation
      this.writes++
    }
  }
  class Style {
    constructor(options) {
      this.image = options.image
    }
    getImage() {
      return this.image
    }
  }
  class LayerOrSource {}
  function observer(type) {
    return class {
      constructor(callback) {
        this.callback = callback
        this.disconnected = false
        observers[type] = this
      }
      observe(target) {
        this.target = target
      }
      disconnect() {
        this.disconnected = true
      }
    }
  }
  const source = componentScript('OpenLayersMap')
  const code = source.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(source))
    .join('\n')
  const containers = evaluate(`${code}; return {map3dContainer, map2dContainer, recenterNavMap}`, {
    Cesium,
    window: {},
    document,
    performance: { now: () => now },
    ref: (value) => ({ value }),
    watch: (source, callback) => watchers.push({ source, callback }),
    defineProps: () => props,
    withDefaults: (values, defaults) => Object.assign(values, { ...defaults, ...values }),
    defineEmits: () => () => {},
    defineExpose: (api) => {
      exposed = api
    },
    onMounted: (fn) => {
      mount = fn
    },
    onUnmounted: (fn) => {
      unmount = fn
    },
    ResizeObserver: observer('resize'),
    IntersectionObserver: observer('intersection'),
    Map: FakeMap,
    View: FakeView,
    OLCesium: FakeOLCesium,
    Point,
    Feature,
    RegularShape,
    Style,
    TileLayer: LayerOrSource,
    VectorLayer: LayerOrSource,
    VectorSource: LayerOrSource,
    XYZ: LayerOrSource,
    OSM: LayerOrSource,
    Fill: LayerOrSource,
    Stroke: LayerOrSource,
    fromLonLat: (coordinates) => [...coordinates],
  })
  containers.map3dContainer.value = host
  containers.map2dContainer.value = navHost
  mount()
  return {
    exposed,
    props,
    scene,
    renderer,
    host,
    navHost,
    maps,
    points,
    features,
    shapes,
    observers,
    listeners,
    document,
    cameraWrites,
    unmount,
    recenterNavMap: containers.recenterNavMap,
    frame(ms = 1000 / renderer.rate) {
      now += ms
      if (renderer.enabled && !renderer.blocked) scene.preUpdate.raiseEvent()
    },
    telemetry({
      lat = props.lat,
      lon = props.lon,
      altFt = props.altFt,
      pitch = Cesium.Math.toRadians(props.pitchDeg),
      bank = Cesium.Math.toRadians(props.bankDeg),
      heading = Cesium.Math.toRadians(props.headingDeg),
    } = {}) {
      exposed.updateMap(lat, lon, altFt, pitch, bank, heading)
    },
    setNavVisible(visible) {
      exposed.setMap(visible)
      watchers.find((watcher) => watcher.source === exposed.showNavMap).callback()
    },
    setRate(rate) {
      props.maxFrameRate = rate
      watchers.find((watcher) => typeof watcher.source === 'function').callback()
    },
    setHidden(hidden) {
      document.hidden = hidden
      listeners.get('visibilitychange')?.()
    },
    intersect(isIntersecting) {
      observers.intersection.callback([{ isIntersecting }])
    },
    resize() {
      observers.resize.callback()
    },
  }
}

test('map uses a configurable 30 FPS renderer with on-demand drawing and no second RAF', () => {
  const f = mapFixture()
  assert.equal(f.renderer.rate, 30)
  assert.equal(f.renderer.sync2DAtRest, true)
  assert.equal(f.scene.requestRenderMode, true)
  assert.equal(f.scene.maximumRenderTimeChange, Infinity)
  assert.equal(f.scene.preUpdate.numberOfListeners, 1)
  assert.equal(f.maps[1].target, undefined, 'closed navigation map has no drawing surface')
  assert.doesNotMatch(componentScript('OpenLayersMap').text, /requestAnimationFrame\(/)
  f.setRate(15)
  assert.equal(f.renderer.rate, 15)
  for (const invalid of [0, -1, NaN, Infinity]) {
    f.setRate(invalid)
    assert.equal(f.renderer.rate, 30)
  }
  assert.equal(mapFixture({ props: { maxFrameRate: 24 } }).renderer.rate, 24)
})

test('settled cameras do not write views or request frames on identical telemetry', () => {
  const f = mapFixture()
  f.frame()
  assert.equal(f.cameraWrites.length, 1)
  const requests = f.scene.requests
  for (let i = 0; i < 300; i++) {
    f.telemetry()
    f.frame()
  }
  assert.equal(f.cameraWrites.length, 1)
  assert.equal(f.scene.requests, requests)
  assert.equal(f.points[0].writes, 0)
})

test('new telemetry restarts interpolation and finishes exactly at the target', () => {
  const f = mapFixture()
  f.frame()
  const initial = f.cameraWrites.at(-1).position
  const target = Cesium.Cartesian3.fromDegrees(1, 52, 2000 * 0.3048)
  f.telemetry({ lat: 52, lon: 1, altFt: 2000, heading: 1, pitch: 0.2, bank: -0.1 })
  f.frame()
  const intermediate = f.cameraWrites.at(-1)
  assert.ok(
    Cesium.Cartesian3.distance(initial, target) >
      Cesium.Cartesian3.distance(intermediate.position, target),
  )
  assert.ok(Cesium.Cartesian3.distance(intermediate.position, target) > 0.01)
  assert.ok(intermediate.heading > 0 && intermediate.heading < 1)
  for (let i = 0; i < 300; i++) f.frame()
  assert.deepEqual(f.cameraWrites.at(-1), { position: target, heading: 1, pitch: 0.2, roll: -0.1 })
  const writes = f.cameraWrites.length
  for (let i = 0; i < 30; i++) f.frame()
  assert.equal(f.cameraWrites.length, writes)
  f.telemetry({ lat: 52, lon: 1, altFt: 2000, heading: 1.1, pitch: 0.2, bank: -0.1 })
  f.frame()
  assert.equal(f.cameraWrites.length, writes + 1)
})

test('heading interpolation crosses north by the shortest angle and settles', () => {
  const f = mapFixture({ props: { headingDeg: 359 } })
  f.frame()
  f.telemetry({ heading: Cesium.Math.toRadians(1) })
  f.frame()
  assert.ok(f.cameraWrites.at(-1).heading > Cesium.Math.toRadians(359))
  for (let i = 0; i < 100; i++) f.frame()
  assert.equal(f.cameraWrites.at(-1).heading, Cesium.Math.toRadians(1))
  const writes = f.cameraWrites.length
  f.frame()
  assert.equal(f.cameraWrites.length, writes)
})

test('hidden tabs block rendering and resume from the latest target without replay', () => {
  const f = mapFixture()
  f.setNavVisible(true)
  f.frame()
  f.setHidden(true)
  const writes = f.cameraWrites.length,
    markerWrites = f.points[0].writes
  const requests = f.scene.requests
  assert.equal(f.renderer.blocked, true)
  assert.equal(f.renderer.enabled, true, 'suspension does not toggle 2D/3D mode')
  assert.equal(f.maps[1].target, undefined)
  for (let i = 0; i < 20; i++) {
    f.telemetry({ lat: 53, lon: i / 10, altFt: 2000, heading: 0.5 })
    f.frame(1000)
  }
  assert.equal(f.cameraWrites.length, writes)
  assert.equal(f.points[0].writes, markerWrites)
  assert.equal(f.scene.requests, requests)
  f.setHidden(false)
  assert.equal(f.renderer.blocked, false)
  assert.equal(f.maps[1].target, f.navHost)
  assert.deepEqual(f.points[0].coordinates, [1.9, 53])
  f.frame()
  assert.deepEqual(
    f.cameraWrites.at(-1).position,
    Cesium.Cartesian3.fromDegrees(1.9, 53, 2000 * 0.3048),
  )
  assert.equal(f.cameraWrites.at(-1).heading, 0.5)
})

test('zero-size, detached and offscreen map containers suspend the renderer', () => {
  const f = mapFixture({ host: { offsetWidth: 0 } })
  assert.equal(f.renderer.blocked, true)
  f.host.offsetWidth = 600
  f.resize()
  assert.equal(f.renderer.blocked, false)
  f.intersect(false)
  assert.equal(f.renderer.blocked, true)
  f.resize()
  assert.equal(f.renderer.blocked, true, 'resize does not override offscreen visibility')
  f.intersect(true)
  assert.equal(f.renderer.blocked, false)
  f.host.isConnected = false
  f.resize()
  assert.equal(f.renderer.blocked, true)
  assert.equal(mapFixture({ hidden: true }).renderer.blocked, true)
})

test('resizing a stationary visible map requests a fresh frame', () => {
  const f = mapFixture()
  f.frame()
  const requests = f.scene.requests
  f.host.offsetWidth = 700
  f.resize()
  assert.ok(f.scene.requests > requests)
  assert.ok(f.maps[0].sizeUpdates > 1)
  f.frame()
  assert.equal(f.cameraWrites.length, 1, 'a resize need not rewrite the camera pose')
})

test('closed navigation maps defer marker writes; reopening preserves manual pan and zoom', () => {
  const f = mapFixture()
  f.telemetry({ lat: 52, lon: 1, heading: 1 })
  assert.equal(f.points[0].writes, 0)
  f.setNavVisible(true)
  const nav = f.maps[1]
  assert.deepEqual(nav.view.center, [1, 52])
  assert.equal(f.shapes[0].rotation, 1)
  const writes = f.points[0].writes,
    changes = f.features[0].changes
  f.telemetry({ lat: 52, lon: 1, heading: 1 })
  assert.equal(f.points[0].writes, writes)
  assert.equal(f.features[0].changes, changes)
  f.telemetry({ lat: 52, lon: 1, heading: 1.5 })
  assert.equal(f.points[0].writes, writes)
  assert.equal(f.features[0].changes, changes + 1, 'heading-only changes invalidate the marker')
  nav.events.pointerdrag()
  nav.view.setCenter([10, 20])
  nav.view.zoom = 12
  f.setNavVisible(false)
  assert.equal(nav.view.cancelledAnimations, 1)
  f.telemetry({ lat: 53, lon: 2, heading: 2 })
  assert.equal(f.points[0].writes, writes)
  f.setNavVisible(true)
  assert.deepEqual(f.points[0].coordinates, [2, 53])
  assert.deepEqual(nav.view.center, [10, 20])
  assert.equal(nav.view.zoom, 12)
  assert.equal(f.shapes[0].rotation, 2)
})

test('reopening after an interrupted recenter still follows a stationary aircraft', () => {
  const f = mapFixture()
  f.setNavVisible(true)
  const nav = f.maps[1]
  nav.events.pointerdrag()
  nav.view.setCenter([10, 20])
  f.recenterNavMap()
  assert.deepEqual(nav.view.animation.center, [0, 51])
  // Hide before the animation completes, without receiving new telemetry.
  f.setNavVisible(false)
  f.setNavVisible(true)
  assert.deepEqual(nav.view.center, [0, 51])
})

test('map teardown skips view synchronization on a detached canvas and releases resources once', () => {
  const f = mapFixture()
  f.frame()
  f.host.isConnected = false
  f.host.offsetWidth = 0
  f.host.offsetHeight = 0
  f.unmount()
  f.unmount()
  assert.equal(f.renderer.blocked, true)
  assert.equal(f.renderer.enabled, true, 'destroy directly without switching back to 2D')
  assert.equal(f.renderer.destroyed, 1)
  assert.equal(f.scene.preUpdate.numberOfListeners, 0)
  assert.equal(f.observers.resize.disconnected, true)
  assert.equal(f.observers.intersection.disconnected, true)
  assert.equal(f.listeners.size, 0)
  assert.deepEqual(
    f.maps.map((map) => map.disposals),
    [1, 1],
  )
  const requests = f.scene.requests
  f.resize()
  f.intersect(true)
  f.telemetry({ lat: 55 })
  f.frame()
  assert.equal(f.scene.requests, requests)
  assert.equal(f.cameraWrites.length, 1)
})
