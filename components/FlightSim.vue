<template>
  <div>
    <div v-show="!is_running">
      <b-card bg-variant="transparent" border-variant="dark">
        <b-card-text>
          <b-form-text variant="default">
            <p>
              A simulation of a generic airplane using graphical representation
              of the main six flight instruments and basic Autopilot
              functionality.
            </p>
            <ul>
              <li>Core simulation logic is written in C++</li>
              <li>
                Simulation visuals are developed with
                <b-link target="_blank" href="https://www.opengl.org"
                  >OpenGL</b-link
                >
              </li>
              <li>
                Ported to WebAssembly with
                <b-link target="_blank" href="https://emscripten.org"
                  >Emscripten</b-link
                >
              </li>
              <li>
                User interface is developed with
                <b-link target="_blank" href="https://vuejs.org">
                  Vue.js</b-link
                >
                and
                <b-link target="_blank" href="https://getbootstrap.com"
                  >Bootstrap</b-link
                >
              </li>
            </ul>
          </b-form-text>
          <span>
            <b-button
              v-on:click="startSimulator"
              variant="outline-danger"
              style="width: 100%; height: 100%; border-color:#FF0000"
              >{{ simulatorButtonText }}</b-button
            ></span
          >
        </b-card-text></b-card
      >
    </div>

    <div id="status" v-show="FlightSimulator" class="emscripten">
      Downloading...
    </div>

    <div v-show="is_running" class="emscripten_border">
      <b-row>
        <b-col cols="5">
          <div v-show="is_running">
            <div fluid>
              <h4>Simulation</h4>
              <b-button
                v-on:click="requestFullScreen"
                class="btn-block"
                variant="default"
                >Fullscreen</b-button
              >
              <b-button
                :class="
                  simulation_pause
                    ? 'pressed text-responsive'
                    : 'text-responsive'
                "
                v-on:click="
                  simulation_pause = !simulation_pause
                  set_simulation_pause(simulation_pause)
                "
                block
                variant="default"
                >Pause</b-button
              >
              <b-dropdown block style="padding-left:2px; padding-bottom:2px;">
                <template v-slot:button-content>
                  <span class="text-responsive">
                    {{ 'Simulation Speed ' + simulation_speed + 'x' }}
                  </span>
                </template>
                <b-form-input
                  id="sb-inline"
                  v-model="simulation_speed"
                  v-on:update="set_simulation_speed(simulation_speed)"
                  :min="0.5"
                  :max="32"
                  :step="0.5"
                  type="range"
                  variant="default"
                ></b-form-input>
              </b-dropdown>
              <h4>Autopilot Controls</h4>
              <b-button
                ref="autopilot"
                v-on:click="toggle_autopilot"
                :class="api_ap_enabled ? 'pressed' : ''"
                variant="default"
                class="btn-block"
                >Autopilot</b-button
              >
              <b-container fluid>
                <b-row
                  :key="parameters.button_title"
                  v-for="parameters in autopilot_controls"
                  container
                >
                  <b-col>
                    <b-button
                      :class="
                        parameters.status()
                          ? 'pressed text-responsive'
                          : 'text-responsive'
                      "
                      v-on:click="parameters.toggle"
                      block
                      variant="default"
                      >{{ parameters.button_title }}</b-button
                    >
                  </b-col>
                  <b-col cols="4">
                    <b-dropdown
                      :disabled="!parameters.status"
                      block
                      style="padding-left:2px; padding-bottom:2px;"
                    >
                      <template v-slot:button-content>
                        <span class="text-responsive">
                          {{ parameters.setter_model + parameters.unit }}
                        </span>
                      </template>
                      <b-form-input
                        id="sb-inline"
                        v-model="parameters.setter_model"
                        v-on:update="parameters.setter"
                        :min="parameters.min"
                        :max="parameters.max"
                        :step="parameters.step"
                        type="range"
                        variant="default"
                      ></b-form-input>
                    </b-dropdown>
                  </b-col>
                </b-row>
              </b-container>
            </div>
            <template v-for="(parameters, title) in simulation_parameters">
              <h4>{{ title }}</h4>
              <b-container fluid>
                <b-row
                  v-for="parameter in parameters"
                  :key="parameter.title"
                  class="flex-nowrap"
                >
                  <b-col>
                    <nobr
                      v-html="parameter.title"
                      class="text-responsive"
                    ></nobr>
                  </b-col>
                  <b-col cols="4">
                    <b-dropdown
                      block
                      style="padding-left:2px; padding-bottom:2px;"
                    >
                      <template v-slot:button-content>
                        <span class="text-responsive">
                          {{ parameter.value }}
                        </span>
                      </template>
                      <b-form-input
                        :min="parameter.min"
                        :max="parameter.max"
                        :step="parameter.step"
                        v-on:update="parameter.setter"
                        v-model="parameter.value"
                        type="range"
                      ></b-form-input>
                    </b-dropdown>
                  </b-col>
                </b-row>
              </b-container>
            </template>

            <div class="emscripten">
              <progress id="progress" value="0" max="100" hidden="1"></progress>
            </div>
          </div> </b-col
        ><b-col>
          <canvas
            id="canvas"
            class="emscripten"
            oncontextmenu="event.preventDefault()"
            tabindex="-1"
          >
          </canvas>
        </b-col>
      </b-row>
    </div>
    <textarea id="output" v-show="is_development" rows="3"></textarea>

    <b-container v-if="is_running" fluid>
      <b-row>
        <b-col>
          <b-card
            title="Keyboard Controls"
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
    // eslint-disable-next-line camelcase, prefer-const
    let api_target_heading = 45

    // eslint-disable-next-line camelcase, prefer-const
    let api_target_altitude = 25000

    // eslint-disable-next-line camelcase, prefer-const
    let api_target_speed = 180

    return {
      FlightSimulator: null,
      is_running: false,
      simulatorButtonText: 'Start simulation',
      is_development: process.env.NODE_ENV === 'development',
      api_ap_enabled: false,
      api_toggleAutopilot: null,
      api_headingHoldEnabled: false,
      // api_target_heading: 45,
      api_toggleHeadingHold: null,
      api_setHeadingHoldValue: null,
      api_altitudeHoldEnabled: false,
      // api_target_altitude: 25000,
      api_toggleAltitudeHold: null,
      api_setAltitudeHoldValue: null,
      api_speedHoldEnabled: false,
      // api_target_speed: 180,
      api_toggleSpeedHold: null,
      api_setSpeedHoldValue: null,
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
      simulation_pause: false,
      simulation_speed: 1.0,
      instructions: {
        commands: [
          {
            key: ['w', '↑'],
            command: ' pitch -',
            isActive: () => {
              return !this.api_altitudeHoldEnabled
            },
            msg: 'Inactive: Altitude Hold Enganged'
          },
          {
            key: ['s', '↓'],
            command: ' pitch +',
            isActive: () => {
              return !this.api_altitudeHoldEnabled
            },
            msg: 'Inactive: Altitude Hold Enganged'
          },
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
          {
            key: ['F1'],
            command: 'idle throttle',
            isActive: () => {
              return !this.api_speedHoldEnabled
            },
            msg: 'Inactive: Speed Hold Enganged'
          },
          {
            key: ['F2'],
            command: 'throttle -',
            isActive: () => {
              return !this.api_speedHoldEnabled
            },
            msg: 'Inactive: Speed Hold Enganged'
          },
          {
            key: ['F3'],
            command: 'throttle +',
            isActive: () => {
              return !this.api_speedHoldEnabled
            },
            msg: 'Inactive: Speed Hold Enganged'
          },
          {
            key: ['F4'],
            command: 'max throttle',
            isActive: () => {
              return !this.api_speedHoldEnabled
            },
            msg: 'Inactive: Speed Hold Enganged'
          },
          {
            key: ['f'],
            command: 'reset all surface controls to neutral position'
          }
        ]
      },
      autopilot_controls: [
        {
          button_title: 'Heaading Hold',
          toggle: this.toggle_heading_hold,
          status: () => {
            return this.api_headingHoldEnabled
          },
          setter: this.set_heading_hold_value,
          setter_model: api_target_heading,
          unit: '°',
          min: 0,
          max: 359,
          step: 1.0
        },
        {
          button_title: 'Altitude Hold',
          toggle: this.toggle_altitude_hold,
          status: () => {
            return this.api_altitudeHoldEnabled
          },
          setter: this.set_altitude_hold_value,
          setter_model: api_target_altitude,
          unit: 'ft',
          min: 0,
          max: 50000,
          step: 1.0
        },
        {
          button_title: 'Speed Hold',
          toggle: this.toggle_speed_hold,
          status: () => {
            return this.api_speedHoldEnabled
          },
          setter: this.set_speed_hold_value,
          setter_model: api_target_speed,
          unit: 'kt',
          min: 0,
          max: 350,
          step: 1
        }
      ],
      simulation_parameters: {
        Geometry: [
          {
            title: 'Wing Area Ft&sup2;',
            value: 530,
            setter: this.set_wing_area_value,
            min: 10,
            max: 1000,
            step: 1
          }
        ],
        Performance: [
          {
            title: 'Thrust to Weight Ratio',
            value: 0.3,
            setter: this.set_thrust_to_weight_ratio_value,
            min: 0.1,
            max: 5,
            step: 0.1
          }
        ],
        Aerodynamics: [
          {
            title: 'Lift Cofficient Slope',
            value: 3.53,
            setter: this.set_cl_slope_value,
            min: 0.1,
            max: 5,
            step: 0.1
          },
          {
            title: 'Drag Cofficient',
            value: 0.02,
            setter: this.set_cd_value,
            min: 0.01,
            max: 1.0,
            step: 0.01
          }
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
    toggle_altitude_hold() {
      this.api_toggleAltitudeHold(!this.api_altitudeHoldEnabled)
    },
    toggle_speed_hold() {
      this.api_toggleSpeedHold(!this.api_speedHoldEnabled)
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
    set_altitude_hold_value(altitude) {
      this.api_setAltitudeHoldValue(altitude)
    },
    set_speed_hold_value(speed) {
      this.api_setSpeedHoldValue(speed)
    },
    set_wing_area_value(wingArea) {
      this.api_setWingAreaValue(wingArea)
    },
    set_thrust_to_weight_ratio_value(thrustToWeightRatio) {
      this.api_setThrustToWeightRatio(thrustToWeightRatio)
    },
    set_cl_slope_value(clSlope) {
      this.api_setClSlopeValue(clSlope)
    },
    set_cd_value(cd) {
      this.api_setCdValue(cd)
    },
    set_simulation_speed(simulationSpeed) {
      this.api_setSimulationSpeed(simulationSpeed)
    },
    set_simulation_pause(state) {
      this.api_setSimulationPause(state)
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

        this.api_toggleAltitudeHold = this.FlightSimulator.cwrap(
          'set_altitude_hold',
          null,
          ['bool']
        )

        this.api_toggleSpeedHold = this.FlightSimulator.cwrap(
          'set_speed_hold',
          null,
          ['bool']
        )

        // Follow this steps to access memory from c++ without copying
        // First export a getter function in c++ that return a pointer to the value
        // THen the value can be accessed using
        // this.FlightSimulator.HEAP32[addr >> 2]

        this.api_setHeadingHoldValue = this.FlightSimulator._set_target_heading
        this.api_setAltitudeHoldValue = this.FlightSimulator._set_target_altitude
        this.api_setSpeedHoldValue = this.FlightSimulator._set_target_speed

        this.api_setWingAreaValue = this.FlightSimulator._set_wing_area
        this.api_setThrustToWeightRatio = this.FlightSimulator._set_thrust_to_weight
        this.api_setClSlopeValue = this.FlightSimulator._set_dcl
        this.api_setCdValue = this.FlightSimulator._set_cdo

        this.api_setSimulationSpeed = this.FlightSimulator._set_simulation_speed
        this.api_setSimulationPause = this.FlightSimulator._set_simulation_pause
        // Main function
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

.btn:focus {
  outline: none;
  box-shadow: none;
}

.btn-default.pressed {
  border-color: orange;
}
.btn-default {
  border-color: grey;
}

.btn-group {
  padding-left: 2px;
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

.text-responsive {
  font-size: 1vw;
}
</style>
