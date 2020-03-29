<template>
  <div>
    <span>
      <b-button
        v-show="!is_running"
        v-on:click="startSimulator"
        variant="danger"
        >{{ simulatorButtonText }}</b-button
      ></span
    >
    <div v-show="is_running">
      <div id="status" class="emscripten">Downloading...</div>
      <span id="controls">
        <span>
          <b-button id="popover-target-1">
            Instructions
          </b-button>
          <b-popover
            variant="dark"
            target="popover-target-1"
            triggers="hover"
            placement="bottom"
          >
            <template v-slot:title>Commands</template>
            <ul style="list-style-type:none;margin: 0; padding: 0">
              <li v-for="command in instructions.commands" :key="command.key">
                <kbd>{{ command.key }}</kbd> {{ command.command }}
              </li>
            </ul>
          </b-popover>

          <b-button v-on:click="requestFullScreen" variant="dark"
            >Fullscreen</b-button
          >
        </span>

        <div>
          <b-button
            v-on:click="toggle_autopilot"
            :variant="api_ap_enabled ? 'success' : 'outline-danger'"
            >Toggle autopilot</b-button
          >
          <b-button
            v-on:click="toggle_heading_hold"
            :variant="headingHoldEnabled ? 'success' : 'outline-danger'"
            >Toggle Heading Hold</b-button
          >
          <label for="range-2">Target Heading: {{ target_heading }}</label>
          <b-form-input
            id="range-2"
            :disabled="!api_ap_enabled"
            v-model="target_heading"
            v-on:update="set_heading_hold_value"
            type="range"
            min="0"
            max="359"
            step="1.0"
          ></b-form-input>
        </div>
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
        >
        </canvas>
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
      simulatorButtonText: 'Start simulation',
      is_development: process.env.NODE_ENV === 'development',
      api_ap_enabled: false,
      headingHoldEnabled: false,
      target_heading: 45,
      api_toggleAutopilot: null,
      api_toggleHeadingHold: null,
      api_setHeadingHoldValue: null,
      instructions: {
        commands: [
          { key: 'w', command: ' pitch down' },
          { key: 's', command: ' pitch up' },
          { key: 'a', command: ' bank left' },
          { key: 'd', command: ' bank right' },
          { key: 'F1', command: 'set throttle to idle' },
          { key: 'F2', command: 'increment throttle' },
          { key: 'F3', command: 'decrement throttle' },
          { key: 'F4', command: 'set throttle to max' },
          { key: '=', command: 'increment target heading' },
          { key: '-', command: 'decrement target heading' }
        ]
      }
    }
  },

  mounted() {},
  methods: {
    toggle_autopilot() {
      this.api_toggleAutopilot(!this.api_ap_enabled)
    },
    toggle_heading_hold() {
      this.api_toggleHeadingHold(!this.headingHoldEnabled)
      this.headingHoldEnabled = !this.headingHoldEnabled
    },
    aileron_right() {
      const aileronRight = this.FlightSimulator.cwrap('aileron_right')
      aileronRight()
    },
    aileron_left() {
      const aileronLeft = this.FlightSimulator.cwrap('aileron_left')
      aileronLeft()
    },
    set_heading_hold_value(heading) {
      this.api_setHeadingHoldValue(heading)
    },
    requestFullScreen() {
      this.FlightSimulator.requestFullscreen(false, false)
    },
    startSimulator() {
      const statusElement = document.getElementById('status')
      const progressElement = document.getElementById('progress')

      this.FlightSimulator = FlightSimulator({
        vue: this,
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
        this.is_running = true
        this.simulatorButtonText = 'Stop'

        // Link C++ functions
        this.api_toggleAutopilot = this.FlightSimulator.cwrap(
          'set_autopilot',
          null,
          ['bool']
        )

        this.api_toggleHeadingHold = this.FlightSimulator.cwrap(
          'set_heading_hold',
          null,
          ['bool']
        )

        // Follow this steps to access memory from c++ without copying
        // First export a getter function in c++ that return a pointer to the value
        // THen the value can be accessed using
        // this.FlightSimulator.HEAP32[addr >> 2]

        this.api_setHeadingHoldValue = this.FlightSimulator._set_target_heading
        const main = this.FlightSimulator._main
        main()
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
