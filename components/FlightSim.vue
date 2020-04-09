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
          <b-button
            v-on:click="requestFullScreen"
            variant="dark"
            class="border border-light btn btn-dark"
            >Fullscreen</b-button
          >

          <b-button
            ref="autopilot"
            v-on:click="toggle_autopilot"
            :variant="api_ap_enabled ? 'outline-warning' : 'outline-light'"
            class="border border-light"
            >{{
              api_ap_enabled ? 'Autopilot Engaged' : 'Engage Autopilot'
            }}</b-button
          >
          <b-button-group class="border border-light">
            <b-button
              ref="heading_hold"
              :class="api_headingHoldEnabled ? 'flash-button' : ''"
              v-on:click="toggle_heading_hold"
              :variant="
                api_headingHoldEnabled ? 'outline-warning' : 'outline-light'
              "
              class="border border-light"
              >{{
                api_headingHoldEnabled
                  ? 'Heading Hold Engaged [' + api_target_heading + ']'
                  : 'Engage Heading Hold'
              }}</b-button
            >

            <b-dropdown v-show="api_headingHoldEnabled">
              <b-form-input
                id="sb-inline"
                :disabled="!api_ap_enabled"
                v-model="api_target_heading"
                v-on:update="set_heading_hold_value"
                type="range"
                min="0"
                max="359"
                step="1.0"
                variant="dark"
              ></b-form-input>
            </b-dropdown>
          </b-button-group>
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
          <b-card
            title="Controls"
            bg-variant="transparent"
            border-variant="dark"
          >
            <b-card-text>
              <b-form-text variant="dark">
                <template v-slot:title
                  >Commands (For desktop use only)</template
                >
                <ul style="list-style-type:none;margin: 0; padding: 0">
                  <li
                    v-for="command in instructions.commands"
                    style="margin: 3px 0 0 0;"
                  >
                    <kbd v-for="k in command.key">{{ k }}</kbd>
                    <span>{{ command.command }}</span>
                    <span
                      v-show="command.isActive && !command.isActive()"
                      class="flash-button"
                    >
                      <b-icon icon="info-circle" variant="success"></b-icon>
                      {{ command.msg }}
                    </span>
                  </li>
                </ul>
              </b-form-text>
            </b-card-text></b-card
          ></b-col
        >
        <b-col>
          <b-card bg-variant="transparent" border-variant="dark">
            <b-card-title>
              Simulation Data
              <b-button
                v-b-toggle.collapse-data
                @click="isDataDisplayed = true"
                v-show="!isDataDisplayed"
                class="border border-light"
                variant="outline-light"
              >
                +
              </b-button>
            </b-card-title>
            <b-card-text>
              <div id="app">
                <b-button
                  v-b-toggle.collapse-data
                  @click="isDataDisplayed = false"
                  v-show="isDataDisplayed"
                  class="border border-light btn-light"
                  variant="outline-light"
                >
                  -
                </b-button>
              </div>
              <b-collapse id="collapse-data">
                <ul>
                  <li>
                    fps:
                    {{ Number(1 / api_iteration_time).toFixed(0) }}
                  </li>
                  <li>Weight: {{ Number(api_weight).toFixed(2) }}</li>
                  <li>Altitude: {{ Number(api_altitude).toFixed(2) }}</li>
                  <li>
                    Elevator angle: {{ Number(api_alpha_tail).toFixed(2) }}%
                  </li>
                  <li>
                    Aileron angle: {{ Number(api_alpha_aileron).toFixed(2) }}%
                  </li>
                  <li>Throttle: {{ Number(api_throttle).toFixed(2) }}%</li>
                  <li>
                    Speed (IAS) knots:
                    {{ Number(api_ias_speed_knots).toFixed(0) }}
                  </li>
                  <li>Heading: {{ Number(api_psi_deg).toFixed(0) }}</li>
                  <li>Bank: {{ Number(api_theta_deg).toFixed(0) }}</li>
                  <li>Pitch: {{ Number(api_attitude_deg).toFixed(0) }}</li>
                </ul>
              </b-collapse></b-card-text
            ></b-card
          >
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import Vue from 'vue'
import { BootstrapVueIcons } from 'bootstrap-vue'
import 'bootstrap-vue/dist/bootstrap-vue-icons.min.css'
import FlightSimulator from '~/static/flightSimulator.js'

Vue.use(BootstrapVueIcons)

export default {
  name: 'FlightSim',

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
      api_altitude: null,
      api_alpha_tail: null,
      api_alpha_aileron: null,
      api_throttle: null,
      api_ias_speed_knots: null,
      api_psi_deg: null,
      api_theta_deg: null,
      api_attitude_deg: null,
      isDataDisplayed: false,
      instructions: {
        commands: [
          { key: ['w', '↑'], command: ' pitch -' },
          { key: ['s', '↓'], command: ' pitch +' },
          {
            key: ['a', '←'],
            command: ' roll -',
            isActive: () => {
              return !this.api_headingHoldEnabled
            },
            msg: 'Inactive: Heading Hold Enganged'
          },
          {
            key: ['d', '→'],
            command: ' roll +',
            isActive: () => {
              return !this.api_headingHoldEnabled
            },
            msg: 'Inactive: Heading Hold Enganged'
          },
          { key: ['F1'], command: 'idle throttle' },
          { key: ['F2'], command: 'throttle +' },
          { key: ['F3'], command: 'throttle -' },
          { key: ['F4'], command: 'max throttle' },
          { key: ['='], command: 'heading hold +' },
          { key: ['-'], command: 'heading hold -' },
          { key: ['f'], command: 'reset controls to zero' }
        ]
      }
    }
  },

  mounted() {},
  methods: {
    notifyUser(title, msg) {
      this.$bvToast.toast(msg, {
        title,
        autoHideDelay: 1000,
        appendToast: false,
        variant: 'dark',
        'body-class': 'strong'
      })
    },
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
  width: 50%;
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
  /* width: 100%; */
  /* height: 200px; */
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
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
.collapse.show {
  visibility: visible;
}
</style>
