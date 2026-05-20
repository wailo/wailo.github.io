// ============================================================
// SMOOTH CESIUM CAMERA INTERPOLATION
// ============================================================
//
// WHAT CHANGED
// -------------
//
// BEFORE:
// updateMap() directly called camera.setView()
// at telemetry frequency (20 Hz)
//
// RESULT:
// visible stepping
//
// NOW:
// updateMap() ONLY updates target state
//
// requestAnimationFrame()
// smoothly interpolates camera every frame
//
// RESULT:
// smooth 60+ FPS motion
// low CPU usage
// no need for 60 Hz telemetry
//
// ============================================================

<template>
    <div class="map-wrapper">
        <div ref="mapContainer" class="map"></div>
    </div>
</template>

<script setup lang="ts">

declare global {
    interface Window {
        Cesium: typeof Cesium
    }
}

import { onMounted, onUnmounted, ref } from 'vue'

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
import CircleStyle from 'ol/style/Circle'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'

import XYZ from 'ol/source/XYZ'

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

let ol3d: OLCesium
let cesiumScene: Cesium.Scene

// animation frame id
let animationFrameId: number | null = null

// ============================================================
// PROPS
// ============================================================

const props = defineProps<{
    lat: number
    lon: number
    altFt: number
    pitchDeg: number
    bankDeg: number
    headingDeg: number
}>()

defineExpose({
    updateMap
})

// ============================================================
// MAP
// ============================================================

const mapContainer = ref<HTMLDivElement | null>(null)
let map: Map | null = null

// ============================================================
// VEHICLE MARKER
// ============================================================

// reuse geometry object
const vehiclePoint = new Point(fromLonLat([props.lon, props.lat]))

const vehicleFeature = new Feature({
    geometry: vehiclePoint
})

// reuse style
const markerStyle = new Style({
    image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#ff0000' }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
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

// ============================================================
// HELPERS
// ============================================================

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
// TELEMETRY UPDATE (20 Hz)
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
    pitchDeg: number,
    bankDeg: number,
    headingDeg: number
) {
    if (!map || !cesiumScene) return

    // --------------------------------------------------------
    // update marker immediately
    // --------------------------------------------------------

    vehiclePoint.setCoordinates(
        fromLonLat([lon, lat])
    )

    // --------------------------------------------------------
    // update TARGET camera state
    // --------------------------------------------------------

    Cesium.Cartesian3.fromDegrees(
        lon,
        lat,
        altFt * 0.3048,
        Cesium.Ellipsoid.WGS84,
        targetCamera.position
    )

    targetCamera.heading =
        Cesium.Math.toRadians(headingDeg)

    targetCamera.pitch =
        Cesium.Math.toRadians(pitchDeg)

    targetCamera.roll =
        Cesium.Math.toRadians(bankDeg)
}

// ============================================================
// ANIMATION LOOP
// ============================================================

let lastFrameTime = performance.now()

function animate(now: number) {

    animationFrameId =
        requestAnimationFrame(animate)

    if (!cesiumScene) return

    const dt =
        Math.min((now - lastFrameTime) / 1000, 0.1)

    lastFrameTime = now

    const t = damp(dt)

    // --------------------------------------------------------
    // interpolate position
    // --------------------------------------------------------

    Cesium.Cartesian3.lerp(
        currentCamera.position,
        targetCamera.position,
        t,
        interpolatedPosition
    )

    Cesium.Cartesian3.clone(
        interpolatedPosition,
        currentCamera.position
    )

    // --------------------------------------------------------
    // interpolate orientation
    // --------------------------------------------------------

    currentCamera.heading =
        lerpAngle(
            currentCamera.heading,
            targetCamera.heading,
            t
        )

    currentCamera.pitch =
        lerp(
            currentCamera.pitch,
            targetCamera.pitch,
            t
        )

    currentCamera.roll =
        lerp(
            currentCamera.roll,
            targetCamera.roll,
            t
        )

    // --------------------------------------------------------
    // apply to camera
    // --------------------------------------------------------

    const camera = cesiumScene.camera

    // direct mutation is cheaper than setView()
    camera.position = currentCamera.position

    camera.setView({
        orientation: {
            heading: currentCamera.heading,
            pitch: currentCamera.pitch,
            roll: currentCamera.roll,
        }
    })
}

// ============================================================
// MOUNT
// ============================================================

onMounted(() => {

    if (!mapContainer.value) return

    const vectorLayer = new VectorLayer({
        source: new VectorSource({
            features: [vehicleFeature],
        }),
        style: markerStyle
    })

    map = new Map({
        target: mapContainer.value,
        layers: [
            new TileLayer({
                source: new XYZ({
                    url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png'
                })
            }),

            new TileLayer({
                opacity: 0.7,
                source: new XYZ({
                    url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png'
                })
            }),

            vectorLayer,
        ],
        view: new View({
            center: fromLonLat([props.lon, props.lat]),
            zoom: 17,
        }),
    })

    // --------------------------------------------------------
    // cesium
    // --------------------------------------------------------

    ol3d = new OLCesium({
        map: map,
    })

    ol3d.setEnabled(true)

    cesiumScene = ol3d.getCesiumScene()

    // cesiumScene.backgroundColor =    Cesium.Color.fromCssColorString('#111827')
    //  if (cesiumScene.skyAtmosphere) cesiumScene.skyAtmosphere.show = true

    // if (cesiumScene.skyBox) cesiumScene.skyBox.show = false
    // if (cesiumScene.skyAtmosphere) cesiumScene.skyAtmosphere.show = false
    // if (cesiumScene.sun) cesiumScene.sun.show = true
    // if (cesiumScene.moon) cesiumScene.moon.show = true

    // cesiumScene.backgroundColor = Cesium.Color.BLACK



    // --------------------------------------------------------
    // initialize camera states
    // --------------------------------------------------------

    Cesium.Cartesian3.fromDegrees(
        props.lon,
        props.lat,
        props.altFt * 0.3048,
        Cesium.Ellipsoid.WGS84,
        currentCamera.position
    )

    Cesium.Cartesian3.clone(
        currentCamera.position,
        targetCamera.position
    )

    currentCamera.heading =
        targetCamera.heading =
        Cesium.Math.toRadians(props.headingDeg)

    currentCamera.pitch =
        targetCamera.pitch =
        Cesium.Math.toRadians(props.pitchDeg)

    currentCamera.roll =
        targetCamera.roll =
        Cesium.Math.toRadians(props.bankDeg)

    // --------------------------------------------------------
    // start animation loop
    // --------------------------------------------------------

    animationFrameId =
        requestAnimationFrame(animate)

    // initial telemetry update
    updateMap(
        props.lat,
        props.lon,
        props.altFt,
        props.pitchDeg,
        props.bankDeg,
        props.headingDeg,
    )
})

// ============================================================
// CLEANUP
// ============================================================

onUnmounted(() => {

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
    }

    if (map) {
        map.setTarget(undefined)
        map = null
    }
})

</script>

<style scoped>
.map-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.map {
    width: 100%;
    height: 100vh;
}

.map {
    filter:

        invert(100%) hue-rotate(180deg);
}
</style>