<template>
  <div class="map-wrapper">
    <!-- =====================================================
         MAIN 3D
    ====================================================== -->

    <div ref="map3dContainer" class="map-3d" />

    <!-- =====================================================
     FLOATING 2D NAV MAP
===================================================== -->

    <div v-show="showNavMap" class="nav-map-container">
      <!-- MAP -->
      <div ref="map2dContainer" class="nav-map" />

      <!-- ===================================================
       CONTROLS
  ==================================================== -->

      <div class="nav-map-controls">
        <!-- RECENTER -->
        <button class="nav-map-btn" @click="recenterNavMap" title="Center aircraft">◎</button>

        <!-- CLOSE -->
        <button class="nav-map-btn" @click="requestMap(false)" title="Close navigation map">
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
declare global {
  interface Window {
    Cesium: typeof Cesium
  }
}

import { onMounted, onUnmounted, ref, watch } from 'vue'

const showNavMap = ref(false)
const emit = defineEmits<{
  setMap: [state: boolean]
}>()

function setMap(state: boolean) {
  showNavMap.value = state
}

function requestMap(state: boolean) {
  emit('setMap', state)
}

import Map from 'ol/Map'
import View from 'ol/View'

import OLCesium from 'olcs'
import * as Cesium from 'cesium'

window.Cesium = Cesium

import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'

// import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'

import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'

import { fromLonLat } from 'ol/proj'

import Style from 'ol/style/Style'
import RegularShape from 'ol/style/RegularShape'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'

import XYZ from 'ol/source/XYZ'
import OSM from 'ol/source/OSM'

import 'ol/ol.css'

// ============================================================
// TYPES
// ============================================================

interface CameraState {
  position: Cesium.Cartesian3
  heading: number
  pitch: number
  roll: number
}

// ============================================================
// CESIUM
// ============================================================

let ol3d: OLCesium | undefined
let cesiumScene: Cesium.Scene | undefined

let removeCameraUpdate: (() => void) | undefined
let resizeObserver: ResizeObserver | undefined
let intersectionObserver: IntersectionObserver | undefined
let disposed = false
let containerIntersecting = true
let mapRenderingActive = false
let navMapActive = false

// ============================================================
// PROPS
// ============================================================

const props = withDefaults(
  defineProps<{
    lat: number
    lon: number
    altFt: number
    pitchDeg: number
    bankDeg: number
    headingDeg: number
    /** Map-only frame cap; does not affect the simulator or instrument update rates. */
    maxFrameRate?: number
  }>(),
  { maxFrameRate: 30 },
)

defineExpose({
  updateMap,
  setMap,
  showNavMap,
  reset() {
    showNavMap.value = false
  },
})

// ============================================================
// MAP
// ============================================================

const followAircraft = ref(true)
const currentLonLat = ref<[number, number]>([props.lon, props.lat])
let currentAltitudeFt = props.altFt
let navPositionDirty = true
let navHeadingDirty = true

const map3dContainer = ref<HTMLDivElement | null>(null)
const map2dContainer = ref<HTMLDivElement | null>(null)

let map3d: Map | null = null
let map2d: Map | null = null
// ============================================================
// VEHICLE MARKER
// ============================================================

// Create an airplace icon marker for the 2D map

// 1. Correctly create the Point geometry using coordinates
const vehiclePoint2D = new Point(fromLonLat([props.lon, props.lat]))

// 2. Create the Feature and pass the Point geometry into it
const vehicleFeature2D = new Feature({
  geometry: vehiclePoint2D,
})

const markerStyle = new Style({
  image: new RegularShape({
    fill: new Fill({ color: '#3388ff' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
    points: 3,
    radius: 16, // Length from center to the sharp front tip (makes it longer)
    radius2: 6, // Length from center to the two back corners (makes it narrower)
    rotation: 0,
    scale: [0.5, 1],
    rotateWithView: true,
  }),
})

// ============================================================
// CAMERA STATES
// ============================================================

// current rendered camera state
const currentCamera: CameraState = {
  position: new Cesium.Cartesian3(),
  heading: 0,
  pitch: 0,
  roll: 0,
}

// latest telemetry target
const targetCamera: CameraState = {
  position: new Cesium.Cartesian3(),
  heading: 0,
  pitch: 0,
  roll: 0,
}

// reusable temp object
const interpolatedPosition = new Cesium.Cartesian3()

// ============================================================
// CONFIG
// ============================================================

// smoothing speed
//
// larger = snappier
// smaller = smoother
//
const SMOOTHING = 8.0
// Stop interpolating below 1 cm / approximately 0.0006 degrees, then snap exactly.
const POSITION_EPSILON_METERS = 0.01
const ANGLE_EPSILON_RADIANS = 0.00001
let cameraNeedsUpdate = true

// ============================================================
// HELPERS
// ============================================================

function recenterNavMap() {
  if (!map2d) return

  followAircraft.value = true
  map2d.getView().animate({
    center: fromLonLat(currentLonLat.value),
    duration: 350,
  })
}

function configureFrameRate() {
  const rate = props.maxFrameRate
  ol3d?.setTargetFrameRate(Number.isFinite(rate) && rate > 0 ? rate : 30)
}

watch(() => props.maxFrameRate, configureFrameRate)

function updateNavMap() {
  if (!navMapActive || !map2d) return

  if (navPositionDirty) {
    const center = fromLonLat(currentLonLat.value)
    vehiclePoint2D.setCoordinates(center)
    if (followAircraft.value) map2d.getView().setCenter(center)
    navPositionDirty = false
  }
  if (navHeadingDirty) {
    markerStyle.getImage()?.setRotation(targetCamera.heading)
    vehicleFeature2D.changed()
    navHeadingDirty = false
  }
}

function syncNavMapVisibility() {
  if (disposed || !map2d) return
  const active = mapRenderingActive && showNavMap.value && !!map2dContainer.value
  if (active === navMapActive) return

  navMapActive = active
  // Keep the view and layers, but stop OpenLayers drawing/requesting tiles while closed.
  if (!active) map2d.getView().cancelAnimations()
  map2d.setTarget(active ? map2dContainer.value! : undefined)
  if (active) {
    // Restore follow position even if hiding interrupted a recenter animation.
    navPositionDirty = true
    map2d.updateSize()
    updateNavMap()
  }
}

watch(showNavMap, syncNavMapVisibility, { flush: 'post' })

function snapCameraToTarget() {
  Cesium.Cartesian3.clone(targetCamera.position, currentCamera.position)
  currentCamera.heading = targetCamera.heading
  currentCamera.pitch = targetCamera.pitch
  currentCamera.roll = targetCamera.roll
}

function syncMapVisibility() {
  if (disposed || !ol3d || !cesiumScene) return
  const host = map3dContainer.value
  const active = !!(
    !document.hidden &&
    containerIntersecting &&
    host?.isConnected &&
    host.offsetWidth > 0 &&
    host.offsetHeight > 0
  )

  if (active !== mapRenderingActive) {
    mapRenderingActive = active
    if (active) {
      // Hidden time is not animation time: resume at the latest aircraft state.
      snapCameraToTarget()
      cameraNeedsUpdate = true
      lastFrameTime = performance.now()
    }
  }
  // Blocking cancels OL-Cesium's RAF without toggling 2D/3D mode or resetting its view.
  ol3d.setBlockCesiumRendering(!active)
  syncNavMapVisibility()
  if (active) {
    map3d?.updateSize()
    if (navMapActive) map2d?.updateSize()
    cesiumScene.requestRender()
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// angle-safe interpolation
function lerpAngle(a: number, b: number, t: number): number {
  let delta = b - a

  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2
  }

  return a + delta * t
}

// framerate-independent smoothing
function damp(dt: number): number {
  return 1.0 - Math.exp(-SMOOTHING * dt)
}

// ============================================================
// TELEMETRY UPDATE (called by the simulator's UI update loop)
// ============================================================
//
// IMPORTANT:
// This NO LONGER updates the camera directly.
//
// It ONLY updates target state.
//
// ============================================================

function updateMap(
  lat: number,
  lon: number,
  altFt: number,
  pitch: number,
  bank: number,
  heading: number,
) {
  if (!map3d || !map2d || !cesiumScene) return

  const locationChanged = lon !== currentLonLat.value[0] || lat !== currentLonLat.value[1]
  if (locationChanged) {
    currentLonLat.value = [lon, lat]
    navPositionDirty = true
  }
  if (locationChanged || altFt !== currentAltitudeFt) {
    currentAltitudeFt = altFt
    Cesium.Cartesian3.fromDegrees(
      lon,
      lat,
      altFt * 0.3048,
      Cesium.Ellipsoid.WGS84,
      targetCamera.position,
    )
    cameraNeedsUpdate = true
  }
  if (
    heading !== targetCamera.heading ||
    pitch !== targetCamera.pitch ||
    bank !== targetCamera.roll
  ) {
    navHeadingDirty ||= heading !== targetCamera.heading
    targetCamera.heading = heading
    targetCamera.pitch = pitch
    targetCamera.roll = bank
    cameraNeedsUpdate = true
  }
  // Hidden maps retain only the latest telemetry; there is no rendering backlog.
  updateNavMap()
}

// ============================================================
// ANIMATION LOOP
// ============================================================
let lastFrameTime = performance.now()
function animate(now: number) {
  if (!mapRenderingActive || !cesiumScene) return
  const dt = Math.min((now - lastFrameTime) / 1000, 0.1)
  lastFrameTime = now
  if (!cameraNeedsUpdate) return
  const t = damp(dt)

  // --------------------------------------------------------
  // interpolate position
  // --------------------------------------------------------
  Cesium.Cartesian3.lerp(currentCamera.position, targetCamera.position, t, interpolatedPosition)
  Cesium.Cartesian3.clone(interpolatedPosition, currentCamera.position)

  // --------------------------------------------------------
  // interpolate orientation
  // --------------------------------------------------------
  currentCamera.heading = lerpAngle(currentCamera.heading, targetCamera.heading, t)
  currentCamera.pitch = lerp(currentCamera.pitch, targetCamera.pitch, t)
  currentCamera.roll = lerp(currentCamera.roll, targetCamera.roll, t)

  if (
    Cesium.Cartesian3.distanceSquared(currentCamera.position, targetCamera.position) <=
      POSITION_EPSILON_METERS ** 2 &&
    Math.abs(lerpAngle(currentCamera.heading, targetCamera.heading, 1) - currentCamera.heading) <=
      ANGLE_EPSILON_RADIANS &&
    Math.abs(currentCamera.pitch - targetCamera.pitch) <= ANGLE_EPSILON_RADIANS &&
    Math.abs(currentCamera.roll - targetCamera.roll) <= ANGLE_EPSILON_RADIANS
  ) {
    snapCameraToTarget()
    cameraNeedsUpdate = false
  }

  // --------------------------------------------------------
  // apply to camera
  // --------------------------------------------------------
  const camera = cesiumScene.camera

  camera.setView({
    destination: currentCamera.position,
    orientation: {
      heading: currentCamera.heading,
      pitch: currentCamera.pitch,
      roll: currentCamera.roll,
    },
  })
  cesiumScene.requestRender()
}

// ============================================================
// MOUNT
// ============================================================

onMounted(() => {
  if (!map3dContainer.value) return
  if (!map2dContainer.value) return

  // =====================================================
  // VECTOR LAYERS
  // =====================================================

  const vectorLayer3D = new VectorLayer({
    source: new VectorSource({
      //   features: [vehicleFeature],
    }),
    // style: markerStyle,
  })

  const vectorLayer2D = new VectorLayer({
    source: new VectorSource({
      features: [vehicleFeature2D],
    }),
    style: markerStyle,
  })

  // =====================================================
  // 3D MAP
  // =====================================================

  map3d = new Map({
    target: map3dContainer.value,

    layers: [
      new TileLayer({
        source: new XYZ({
          url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        }),
      }),

      // new TileLayer({
      //   opacity: 0.7,
      //   source: new XYZ({
      //     url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
      //   }),
      // }),

      vectorLayer3D,
    ],

    view: new View({
      center: fromLonLat([props.lon, props.lat]),
      zoom: 9,
    }),
  })

  // =====================================================
  // 2D NAVIGATION MAP
  // =====================================================

  map2d = new Map({
    // Attached only when the navigation map is visible.
    layers: [
      new TileLayer({
        source: new OSM(),
      }),

      new TileLayer({
        source: new XYZ({
          url: 'https://{a-c}://{z}/{x}/{y}{r}.png',
          // attributions: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors © <a href="https://carto.com">CARTO</a>'
        }),
      }),

      //   new TileLayer({
      //     opacity: 0.7,
      //     source: new XYZ({
      //       url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
      //     }),
      //   }),

      vectorLayer2D,
    ],

    view: new View({
      center: fromLonLat([props.lon, props.lat]),
      zoom: 9,
    }),
  })

  map2d.on('pointerdrag', () => {
    followAircraft.value = false
  })

  map3d.on('click', () => {
    const active: HTMLElement | null = document.activeElement as HTMLElement
    // Only blur actual form controls, not <body> or <html>
    if (active && active !== document.body && active !== document.documentElement) {
      active.blur()
    }
  })

  // =====================================================
  // CESIUM
  // =====================================================

  ol3d = new OLCesium({
    map: map3d,
  })

  ol3d.setBlockCesiumRendering(true)
  configureFrameRate()
  // This backing 2D view is not the navigation map; avoid syncing it on every 3D frame.
  ol3d.setRefresh2DAfterCameraMoveEndOnly(true)
  ol3d.setEnabled(true)

  cesiumScene = ol3d.getCesiumScene()
  // Tile loads and camera changes still trigger renders. Wall-clock time alone does not.
  cesiumScene.requestRenderMode = true
  cesiumScene.maximumRenderTimeChange = Infinity

  // =====================================================
  // CAMERA INIT
  // =====================================================

  Cesium.Cartesian3.fromDegrees(
    props.lon,
    props.lat,
    props.altFt * 0.3048,
    Cesium.Ellipsoid.WGS84,
    currentCamera.position,
  )

  Cesium.Cartesian3.clone(currentCamera.position, targetCamera.position)
  currentCamera.heading = targetCamera.heading = Cesium.Math.toRadians(props.headingDeg)
  currentCamera.pitch = targetCamera.pitch = Cesium.Math.toRadians(props.pitchDeg)
  currentCamera.roll = targetCamera.roll = Cesium.Math.toRadians(props.bankDeg)

  // =====================================================
  // RENDER / VISIBILITY LIFECYCLE
  // =====================================================

  // Reuse OL-Cesium's capped loop. preUpdate runs even when a draw is not requested,
  // and runs before Cesium checks whether the camera or scene needs a new frame.
  removeCameraUpdate = cesiumScene.preUpdate.addEventListener(() => animate(performance.now()))
  resizeObserver = new ResizeObserver(syncMapVisibility)
  resizeObserver.observe(map3dContainer.value)
  intersectionObserver = new IntersectionObserver(([entry]) => {
    if (disposed || !entry) return
    containerIntersecting = entry.isIntersecting
    syncMapVisibility()
  })
  intersectionObserver.observe(map3dContainer.value)
  document.addEventListener('visibilitychange', syncMapVisibility)
  syncMapVisibility()
})

// ============================================================
// CLEANUP
// ============================================================

onUnmounted(() => {
  if (disposed) return
  disposed = true
  mapRenderingActive = false
  navMapActive = false
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  document.removeEventListener('visibilitychange', syncMapVisibility)
  removeCameraUpdate?.()

  // OL-Cesium owns the only 3D render loop and its WebGL resources.
  ol3d?.setBlockCesiumRendering(true)
  ol3d?.setEnabled(false)
  ol3d?.destroy()
  ol3d = undefined
  cesiumScene = undefined

  map2d?.dispose()
  map3d?.dispose()
  map2d = null
  map3d = null
})
</script>

<style scoped>
.map-wrapper {
  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;
}

/* =========================================================
   FULLSCREEN 3D
========================================================= */

.map-3d {
  position: absolute;
  inset: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  filter: invert(100%) hue-rotate(180deg);
}

/* =========================================================
   FLOATING NAV MAP
========================================================= */

.nav-map-container {
  position: absolute;

  right: 0px;
  bottom: 0px;

  width: 35%;
  height: 55%;

  z-index: 100;

  border-radius: 14px;

  overflow: hidden;

  background: rgba(15, 23, 42, 0.78);

  border: 1px solid rgba(255, 255, 255, 0.15);

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);

  backdrop-filter: blur(10px);
}

.nav-map {
  width: 100%;
  height: 100%;

  /* filter: invert(100%) hue-rotate(180deg); */
}

/* =========================================================
   NAV MAP CONTROLS
========================================================= */

.nav-map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200;
}

.nav-map-btn {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-size: 18px;
  background: rgba(0, 60, 136, 0.75);
  backdrop-filter: blur(6px);
  transition:
    background 0.15s ease,
    transform 0.12s ease;
}

.nav-map-btn:hover {
  background: rgba(0, 60, 136, 0.95);
  transform: scale(1.05);
}
</style>
