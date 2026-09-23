import assert from 'node:assert/strict'
import test from 'node:test'
import * as Cesium from 'cesium'
import RenderFeature from 'ol/render/Feature.js'
import { createMapStyle, createOpenFreeMapImagery, mapStyleUrl } from '../src/OpenFreeMapImagery.ts'

const dark = {
  version: 8,
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': 'rgb(12,12,12)' } },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': '#202030' },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      paint: { 'fill-color': '#444444' },
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      layout: { 'text-field': '{name}' },
    },
  ],
}
const feature = (layer) =>
  new RenderFeature('Polygon', [0, 0, 10, 0, 10, 10, 0, 0], [8], 2, { layer, name: 'Place' }, 1)
test('map style retains source colors and building footprints but excludes labels', () => {
  const { style, background } = createMapStyle(dark)
  assert.equal(background, 'rgb(12,12,12)')
  const water = style(feature('water'), 100)
  assert.equal(water.length, 1)
  assert.equal(water[0].getText(), null)
  assert.equal(water[0].getFill().getColor(), 'rgba(32,32,48,1)')
  assert.ok(!style(feature('place'), 100)?.length)
  assert.equal(style(feature('building'), 100).length, 1)
})

test('provider follows the style source and metadata zoom ceiling', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const originalCesium = globalThis.Cesium
  globalThis.Cesium = Cesium
  globalThis.document = {
    createElement: () => ({ getContext: () => ({ fillRect() {}, clearRect() {} }) }),
  }
  let metadata = {
    tiles: ['https://tiles.openfreemap.org/test/{z}/{x}/{y}.pbf'],
    minzoom: 0,
    maxzoom: 14,
  }
  const urls = []
  globalThis.fetch = async (url) => {
    urls.push(url)
    return Response.json(url === mapStyleUrl ? dark : metadata)
  }
  try {
    const provider = await createOpenFreeMapImagery()
    assert.deepEqual(urls, [mapStyleUrl, dark.sources.openmaptiles.url])
    assert.equal(provider.maximumLevel, 14)
    assert.match(provider.credit.html, /OpenStreetMap/)
    metadata = { tiles: [], maxzoom: 14 }
    await assert.rejects(createOpenFreeMapImagery(), /Invalid/)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    globalThis.Cesium = originalCesium
  }
})
