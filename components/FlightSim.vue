<template>
  <div>
    <span>
      <b-button
        v-show="!is_running"
        v-on:click="startSimulator"
        variant="outline-danger"
        style="width: 100%; height: 100%; border-color:#FF0000"
        >{{ simulatorButtonText }}</b-button
      ></span
    >

    <div id="status" v-show="FlightSimulator" class="emscripten">
      Downloading...
    </div>

    <div v-show="is_running" class="emscripten_border">
      <div v-show="is_running" class="emscripten">
        <span id="controls">
          <span>
            <b-button v-on:click="requestFullScreen" variant="dark"
              >Fullscreen</b-button
            >
          </span>

          <span>
            <b-button
              ref="autopilot"
              v-on:click="toggle_autopilot"
              :variant="api_ap_enabled ? 'success' : 'outline-danger'"
              >{{
                api_ap_enabled ? 'Autopilot Engaged' : 'Engage Autopilot'
              }}</b-button
            >

            <b-button
              ref="heading_hold"
              v-on:click="toggle_heading_hold"
              :variant="api_headingHoldEnabled ? 'success' : 'outline-danger'"
              :class="api_headingHoldEnabled ? 'flash-button' : ''"
              >{{
                api_headingHoldEnabled
                  ? 'Heading Hold Engaged [' + api_target_heading + ']'
                  : 'Engage Heading Hold'
              }}</b-button
            >
            <b-input
              id="range-2"
              :disabled="!api_ap_enabled"
              v-model="api_target_heading"
              v-on:update="set_heading_hold_value"
              type="range"
              min="0"
              max="359"
              step="1.0"
            ></b-input>
          </span>
        </span>

        <div class="emscripten">
          <progress id="progress" value="0" max="100" hidden="1"></progress>
        </div>
      </div>
      <canvas
        id="canvas"
        class="emscripten"
        oncontextmenu="event.preventDefault()"
        tabindex="-1"
      >
      </canvas>
    </div>
    <textarea id="output" v-show="is_development" rows="3"></textarea>

    <b-container v-if="is_running" fluid>
      <b-row>
        <b-col>
          <b-form-text variant="dark">
            <template v-slot:title>Commands (For desktop use only)</template>
            <ul style="list-style-type:none;margin: 0; padding: 0">
              <li
                v-for="command in instructions.commands"
                :key="command.key"
                style="margin: 3px 0 0 0;"
              >
                <kbd>{{ command.key }}</kbd> {{ command.command }}
              </li>
            </ul>
          </b-form-text></b-col
        >
        <b-col>
          <b-button v-b-toggle.collapse-data></b-button>

          <b-collapse id="collapse-data">
            <ul>
              <li>
                fps:
                {{ Number(1 / api_iteration_time).toFixed(0) }}
              </li>
              <li>weight: {{ Number(api_weight).toFixed(2) }}</li>
              <li>altitude: {{ Number(api_altitude).toFixed(2) }}</li>
              <li>alpha_tail: {{ Number(api_alpha_tail).toFixed(2) }}%</li>
              <li>
                alpha_aileron: {{ Number(api_alpha_aileron).toFixed(2) }}%
              </li>
              <li>throttle: {{ Number(api_throttle).toFixed(2) }}%</li>
              <li>Speed (IAS): {{ Number(api_ias_speed_knots).toFixed(0) }}</li>
              <li>Heading: {{ Number(api_psi_deg).toFixed(0) }}</li>
              <li>Bank Angle: {{ Number(api_theta_deg).toFixed(0) }}</li>
              <li>Pitch Angle: {{ Number(api_attitude_deg).toFixed(0) }}</li>
            </ul>
          </b-collapse></b-col
        >
      </b-row>
    </b-container>
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
      api_headingHoldEnabled: false,
      api_target_heading: 45,
      api_toggleAutopilot: null,
      api_toggleHeadingHold: null,
      api_setHeadingHoldValue: null,
      api_iteration_time: 0,
      api_weight: null,
      api_attitude: null,
      api_alpha_tail: null,
      api_alpha_aileron: null,
      api_throttle: null,
      api_ias_speed_knots: null,
      api_psi_deg: null,
      api_theta_deg: null,
      api_altitude_deg: null,
      instructions: {
        commands: [
          { key: 'w', command: ' pitch -' },
          { key: 's', command: ' pitch +' },
          { key: 'a', command: ' bank -' },
          { key: 'd', command: ' bank +' },
          { key: 'F1', command: 'idle throttle' },
          { key: 'F2', command: 'throttle +' },
          { key: 'F3', command: 'throttle -' },
          { key: 'F4', command: 'max throttle' },
          { key: '=', command: 'heading hold +' },
          { key: '-', command: 'heading hold -' }
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
      this.api_toggleHeadingHold(!this.api_headingHoldEnabled)
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

        // Enable heading hold when the sim start
        setTimeout(() => {
          this.$refs.heading_hold.click()
        }, 1000)
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
  width: 80%;
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

.flash-button {
  animation-name: flash;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes flash {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
.collapse.show {
  visibility: visible;
}
</style>
