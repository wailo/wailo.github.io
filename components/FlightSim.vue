<template>
  <div lang="en-us">
    <div id="spinner" class="spinner"></div>
    <div id="status" class="emscripten">Downloading...</div>
    <span id="controls">
      <span><input id="resize" type="checkbox" />Resize canvas</span>
      <span
        ><input id="pointerLock" type="checkbox" checked />Lock/hide mouse
        pointer &nbsp;&nbsp;&nbsp;</span
      >
      <span>
        <b-button v-on:click="requestFullScreen" variant="dark"
          >Fullscreen</b-button
        >
      </span>
      <span>
        <b-button v-on:click="startSimulator" variant="dark"
          >Start the sim</b-button
        ></span
      >
    </span>

    <div class="emscripten">
      <progress id="progress" value="0" max="100" hidden="1"></progress>
    </div>

    <div class="emscripten_border">
      <canvas
        id="canvas"
        class="emscripten"
        oncontextmenu="event.preventDefault()"
        tabindex="-1"
      ></canvas>
    </div>
    <textarea id="output" rows="8"></textarea>
  </div>
</template>

<script>
import FlightSimulator from '~/static/flightSimulator.js'

export default {
  name: 'FlightSim',

  props: {},
  data() {
    return {
      FlightSimulator: null
    }
  },

  mounted() {},
  methods: {
    requestFullScreen() {
      this.FlightSimulator.requestFullscreen(
        document.getElementById('pointerLock').checked,
        document.getElementById('resize').checked
      )
    },
    startSimulator() {
      const statusElement = document.getElementById('status')
      const progressElement = document.getElementById('progress')
      const spinnerElement = document.getElementById('spinner')
      return FlightSimulator({
        setStatus(text) {
          progressElement.value = null
          progressElement.max = null
          progressElement.hidden = true
          if (!text) spinnerElement.style.display = 'none'

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
body {
  font-family: arial;
  margin: 0;
  padding: none;
}

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
}

#emscripten_logo {
  display: inline-block;
  margin: 0;
}

.spinner {
  height: 30px;
  width: 30px;
  margin: 0;
  margin-top: 20px;
  margin-left: 20px;
  display: inline-block;
  vertical-align: top;

  -webkit-animation: rotation 0.8s linear infinite;
  -moz-animation: rotation 0.8s linear infinite;
  -o-animation: rotation 0.8s linear infinite;
  animation: rotation 0.8s linear infinite;

  border-left: 5px solid rgb(235, 235, 235);
  border-right: 5px solid rgb(235, 235, 235);
  border-bottom: 5px solid rgb(235, 235, 235);
  border-top: 5px solid rgb(120, 120, 120);

  border-radius: 100%;
  background-color: rgb(189, 215, 46);
}

@-webkit-keyframes rotation {
  from {
    -webkit-transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
  }
}
@-moz-keyframes rotation {
  from {
    -moz-transform: rotate(0deg);
  }
  to {
    -moz-transform: rotate(360deg);
  }
}
@-o-keyframes rotation {
  from {
    -o-transform: rotate(0deg);
  }
  to {
    -o-transform: rotate(360deg);
  }
}
@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
