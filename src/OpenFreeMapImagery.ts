import * as Cesium from 'cesium'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import VectorTileSource from 'ol/source/VectorTile.js'
import MVT from 'ol/format/MVT.js'
import { toContext } from 'ol/render.js'
import { stylefunction } from 'ol-mapbox-style'

export const mapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

export function createMapStyle(document: any, spriteData?: any) {
  // The Cesium basemap is flat; omit text/icon layers and 3D extrusions.
  const layers = document.layers.filter((layer: any) => ['fill', 'line'].includes(layer.type))
  const source = Object.keys(document.sources).find(
    (key) => document.sources[key].type === 'vector',
  )
  if (!source) throw new Error('OpenFreeMap style has no vector source')
  const background = document.layers.find((layer: any) => layer.type === 'background')?.paint?.[
    'background-color'
  ]
  const layer = new VectorTileLayer({
    source: new VectorTileSource({ format: new MVT({ layerName: 'layer' }) }),
  })
  const style = stylefunction(
    layer,
    { ...document, layers },
    source,
    undefined,
    spriteData,
    spriteData ? `${document.sprite}.png` : undefined,
  )
  if (!style || typeof background !== 'string') throw new Error('Invalid OpenFreeMap style')
  return { style, background, layer, metadataUrl: document.sources[source].url }
}

export async function createOpenFreeMapImagery(signal?: AbortSignal) {
  const styleResponse = await fetch(mapStyleUrl, { signal })
  if (!styleResponse.ok) throw new Error(`OpenFreeMap style returned HTTP ${styleResponse.status}`)
  const styleDocument = await styleResponse.json()
  let spriteData
  if (styleDocument.sprite) {
    const response = await fetch(`${styleDocument.sprite}.json`, { signal })
    if (!response.ok) throw new Error('OpenFreeMap sprites could not load')
    spriteData = await response.json()
  }
  const { style, background, metadataUrl, layer } = createMapStyle(styleDocument, spriteData)
  if (spriteData) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('OpenFreeMap sprite image timed out')), 15000)
      layer.once('change', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
  const response = await fetch(metadataUrl, { signal })
  if (!response.ok) throw new Error(`OpenFreeMap metadata returned HTTP ${response.status}`)
  const metadata = await response.json()
  if (
    !Array.isArray(metadata.tiles) ||
    !metadata.tiles.length ||
    !metadata.tiles.every(
      (url: unknown) => typeof url === 'string' && url.startsWith('https://'),
    ) ||
    !Number.isInteger(metadata.maxzoom) ||
    metadata.maxzoom < 0 ||
    metadata.maxzoom > 24
  ) {
    throw new Error('Invalid OpenFreeMap tile metadata')
  }
  const { default: MVTImageryProvider } = await import('olcs/MVTImageryProvider.js')
  signal?.throwIfAborted()
  const provider = new MVTImageryProvider({
    urls: metadata.tiles,
    minimumLevel: metadata.minzoom ?? 0,
    rectangle: new Cesium.WebMercatorTilingScheme().rectangle,
    credit: new Cesium.Credit(
      '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      true,
    ),
    styleFunction: style,
  })
  // OL-Cesium defaults to z20, but this source ends at z14. Cesium upscales
  // the last available level instead of requesting nonexistent z18+ tiles.
  Object.defineProperty(provider, 'maximumLevel', { value: metadata.maxzoom })
  provider.rasterizeFeatures = (features, styleFunction, resolution) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const renderer = toContext(context, { size: [provider.tileWidth, provider.tileHeight] })
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    // MapLibre layer order matters: road casings must precede road interiors.
    // The adapter reuses style objects, so snapshot them before the next feature.
    const draws = features
      .flatMap((feature) => {
        const result = styleFunction(feature, resolution)
        const styles = result ? (Array.isArray(result) ? result : [result]) : []
        return styles.map((style) => ({ feature, style: style.clone() }))
      })
      .sort((a, b) => (a.style.getZIndex() ?? 0) - (b.style.getZIndex() ?? 0))
    for (const { feature, style } of draws) {
      renderer.setStyle(style)
      renderer.drawGeometry(feature)
    }
    return canvas
  }
  return provider
}
