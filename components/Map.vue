<template>
  <div id="map"></div>
</template>

<script>
import mapPolygons from '@/assets/map.json'

export default {
  name: 'TravelMap',

  props: {},
  data() {
    return {
      polygons: mapPolygons,
      map: null
    }
  },

  mounted() {
    // Update flight plans

    this.$nextTick(() => {
      this.map = L.map('map', {
        keyboard: false,
        dragging: false,
        zoomControl: false,
        boxZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        tap: false,
        touchZoom: false,
        minZoom: 1,
        maxZoom: 5
      })
      this.map.setView([0, 0], 1)

      this.tileLayer = L.tileLayer(
        'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        // "https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        {
          maxZoom: 18,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        }
      )

      this.map.touchZoom.disable()
      this.map.doubleClickZoom.disable()
      this.map.scrollWheelZoom.disable()
      this.map.boxZoom.disable()
      this.map.keyboard.disable()

      const myStyle = {
        color: '#ffffff',
        fillColor: '#ffffff',
        weight: 1,
        opacity: 0.5,
        fillOpacity: 0.0
      }

      L.geoJSON(this.polygons, {
        style: (feature) => {
          if (feature.properties.visited === true) {
            return {
              color: '#ffffff',
              fillColor: '#444444',
              weight: 1,
              opacity: 1,
              fillOpacity: 1
            }
          } else {
            return myStyle
          }
        }
      }).addTo(this.map)

      this.map.invalidateSize()
    })
  },
  methods: {}
}
</script>

<style scoped>
#map {
  width: 400px;
  height: 400px;
}
</style>
