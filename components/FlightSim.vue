<template>
  <div>
    <span>
      <b-button
        v-show="!is_running"
        v-on:click="startSimulator"
        variant="dark"
        >{{ simulatorButtonText }}</b-button
      ></span
    >
    <div v-show="is_running">
      <div id="status" class="emscripten">Downloading...</div>
      <span id="controls">
        <span>
          <b-button v-on:click="requestFullScreen" variant="dark"
            >Fullscreen</b-button
          >
        </span>
      </span>

      <div class="emscripten">
        <progress id="progress" value="0" max="100" hidden="1"></progress>
      </div>

      <div width="200" height="200" class="emscripten_border">
        <canvas
          id="canvas"
          class="emscripten"
          oncontextmenu="event.preventDefault()"
          tabindex="-1"
        ></canvas>
      </div>
      <textarea id="output" v-show="is_development" rows="8"></textarea>
    </div>
  </div>
</template>

<script>
import FlightSimulator from '~/static/flightSimulator.js'

export default {
  name: 'FlightSim',

  props: {},
  data() {
    return {
      FlightSimulator: null,
      is_running: false,
      simulatorButtonText: 'Start',
      is_development: process.env.NODE_ENV === 'development'
    }
  },

  mounted() {},
  methods: {
    requestFullScreen() {
      this.FlightSimulator.requestFullscreen(true, true)
    },
    startSimulator() {
      this.is_running = true

      this.simulatorButtonText = 'Stop'
      const statusElement = document.getElementById('status')
      const progressElement = document.getElementById('progress')

      this.FlightSimulator = FlightSimulator({
        setStatus(text) {
          progressElement.value = null
          progressElement.max = null
          progressElement.hidden = true

          statusElement.innerHTML = text
        },

        monitorRunDependencies(left) {},
        locateFile(path, srcDirectory) {
          // Return the path to .wasm and data file
          return path
        },
        print: (function() {
          const element = document.getElementById('output')
          if (element) element.value = '' // clear browser cache
          return function(text) {
            if (arguments.length > 1)
              text = Array.prototype.slice.call(arguments).join(' ')

            if (element) {
              element.value += text + '\n'
              element.scrollTop = element.scrollHeight // focus on bottom
            }
          }
        })(),
        printErr(text) {
          if (arguments.length > 1)
            text = Array.prototype.slice.call(arguments).join(' ')
        },

        canvas: (() => document.getElementById('canvas'))()
      }).then(() => {
        // eslint-disable-next-line no-console
        console.log('Loaded!')
      })

      // this.$nextTick(() => {})
    },
    beforeCreate() {}
  }
}
</script>

<style scoped>
.emscripten {
  padding-right: 0;
  margin-left: auto;
  margin-right: auto;
  display: block;
}
div.emscripten {
  text-align: center;
}
div.emscripten_border {
  border: 1px solid black;
}
/* the canvas *must not* have any border or padding, or mouse coords will be wrong */
canvas.emscripten {
  border: 0px none;
  background-color: black;
  width: 100%;
}

#status {
  display: inline-block;
  vertical-align: top;
  margin-top: 30px;
  margin-left: 20px;
  font-weight: bold;
  color: rgb(120, 120, 120);
}

#progress {
  height: 20px;
  width: 300px;
}

#controls {
  display: inline-block;
  float: right;
  vertical-align: top;
  margin-top: 30px;
  margin-right: 20px;
}

#output {
  width: 100%;
  height: 200px;
  margin: 0 auto;
  margin-top: 10px;
  border-left: 0px;
  border-right: 0px;
  padding-left: 0px;
  padding-right: 0px;
  display: block;
  background-color: black;
  color: white;
  font-family: 'Lucida Console', Monaco, monospace;
  outline: none;
}
</style>
