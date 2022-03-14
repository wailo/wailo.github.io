<template>
  <div>
    <div v-show="!is_running">
      <b-card bg-variant="transparent" border-variant="dark">
        <b-card-text>
          <b-form-text variant="default">
            <p>
              A simulation of a generic airplane using graphical representation
              of the main six flight instruments and basic Autopilot
              functionality. Also, augmentation of physical, aerodynamics and
              atmosphere properties is supported to help understanding flight
              mechanics
            </p>
            <ul>
              <li>Core simulation logic is written in C++</li>
              <li>
                Simulation visuals are developed with
                <b-link href="https://www.opengl.org">OpenGL</b-link>
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
              variant="outline-danger"
              style="width: 100%; height: 100%; border-color: #ff0000;"
              @click="startSimulator"
              >{{ simulatorButtonText }}</b-button
            ></span
          >
        </b-card-text></b-card
      >
    </div>

    <div v-show="FlightSimulator" id="status" class="emscripten">
      Downloading...
    </div>

    <b-row
      v-show="is_running"
      style="max-height: 488px;"
      class="emscripten_border"
    >
      <!-- Controls Panel -->
      <b-col
        v-show="is_running"
        style="max-height: inherit; overflow-y: scroll;"
        sm="12"
        xl="4"
        order="2"
      >
        <b-list-group>
          <legend>Simulation</legend>
          <b-list-group-item class="flex-column align-items-start">
            <fieldset class="control-group">
              <b-button block variant="default" @click="requestFullScreen"
                >Fullscreen
                <b-icon icon="arrows-fullscreen" variant="default"></b-icon
              ></b-button>
              <b-button
                :class="api_simulation_pause ? 'pressed flash-button' : ''"
                block
                variant="default"
                @click="
                  api_simulation_pause = !api_simulation_pause
                  api_setSimulationPause(api_simulation_pause)
                "
                >{{ api_simulation_pause ? 'Resume' : 'Pause' }}
                <b-icon
                  :icon="api_simulation_pause ? 'play-fill' : 'pause-fill'"
                  variant="default"
                ></b-icon
              ></b-button>

              <b-button
                block
                variant="default"
                @click="api_setSimulationReset()"
                >Reset Simulation
                <b-icon icon="x-circle" variant="default"></b-icon
              ></b-button>
            </fieldset>
          </b-list-group-item>
          <legend>Autopilot Controls</legend>
          <b-list-group-item class="flex-column align-items-start">
            <fieldset class="control-group" border-variant="dark">
              <b-button
                ref="autopilot"
                :class="'btn-block ' + (api_autopilot ? 'pressed' : '')"
                variant="default"
                @click="api_toggleAutopilot(!api_autopilot)"
                >Autopilot</b-button
              >

              <b-row
                v-for="parameters in autopilot_controls"
                :key="parameters.button_title"
                container
              >
                <b-col cols="8">
                  <nobr>{{ parameters.button_title }}</nobr>
                </b-col>
                <b-col cols="4">
                  <KnobComponent
                    :key="parameters.status"
                    v-model="parameters.setter_model"
                    :fgcolor="parameters.status === 1 ? '#F00' : '#FFF'"
                    :min="parameters.min"
                    :max="parameters.max"
                    :step="parameters.step"
                    :label="`${parameters.setter_model}${parameters.unit}`"
                    @change="
                      (value) => {
                        parameters.setter(value)
                      }
                    "
                    @inputEnd="
                      (value) => {
                        parameters.setter(value)
                      }
                    "
                    @toggle="parameters.toggle(!parameters.status)"
                  ></KnobComponent>
                </b-col>
              </b-row>
            </fieldset>
          </b-list-group-item>

          <template v-for="(simulation_group, title) in simulation_parameters">
            <legend :key="title">{{ title }}</legend>
            <b-list-group-item
              v-for="parameter in simulation_group"
              :key="parameter.title"
              class="flex-column align-items-start"
            >
              <fieldset class="control-group" fluid>
                <b-row class="flex-nowrap">
                  <b-col>
                    <nobr>{{ parameter.title }}</nobr>
                  </b-col>
                  <b-col cols="4">
                    <label style="display: table-cell;" class="float-right">{{
                      `${parameter.value}${
                        parameter.unit ? parameter.unit : ''
                      }`
                    }}</label>
                    <b-form-input
                      v-model="parameter.value"
                      :min="parameter.min"
                      :max="parameter.max"
                      :step="parameter.step"
                      type="range"
                      style="display: table-cell; width: 50%;"
                      @update="parameter.setter"
                    ></b-form-input>
                  </b-col>
                </b-row>
              </fieldset>
            </b-list-group-item>
          </template>

          <fieldset class="control-group" fluid>
            <legend>
              Real Time Data
            </legend>
            <b-button
              v-b-toggle.collapse-data
              variant="outline-light"
              class="border border-light"
              @click="isRealTimeDataDisplayed = !isRealTimeDataDisplayed"
            >
              {{ isRealTimeDataDisplayed ? 'Hide' : 'Show' }}
            </b-button>
            <b-card-text v-if="isRealTimeDataDisplayed">
              <b-collapse id="collapse-data">
                <ul>
                  <li>
                    fps:
                    {{ ~~(1 / api_iteration_time) }}
                  </li>
                  <li>Weight: {{ ~~api_weight }}</li>
                  <li>Altitude: {{ ~~api_altitude }}</li>
                  <li>
                    Elevator angle: {{ Number(api_alpha_tail).toFixed(2) }}%
                  </li>
                  <li>
                    Aileron angle: {{ Number(api_alpha_aileron).toFixed(2) }}%
                  </li>
                  <li>Throttle: {{ ~~(api_throttle * 100) }}%</li>
                  <li>
                    Speed (IAS) knots:
                    {{ ~~api_ias_speed_knots }}
                  </li>
                  <li>Heading: {{ ~~api_psi_deg }}°</li>
                  <li>Bank: {{ ~~api_theta_deg }}°</li>
                  <li>Pitch: {{ ~~api_attitude_deg }}°</li>
                </ul>
              </b-collapse>
            </b-card-text>
          </fieldset>

          <fieldset class="control-group" fluid>
            <legend>
              Keyboard Controls
            </legend>
            <b-button
              v-b-toggle.collapse-keyboard-controls
              class="border border-light"
              variant="outline-light"
              @click="
                isKeyboardControlsDisplayed = !isKeyboardControlsDisplayed
              "
            >
              {{ isKeyboardControlsDisplayed ? 'Hide' : 'Show' }}
            </b-button>
            <b-card-text>
              <b-form-text variant="dark">
                <template #title>Commands (For desktop use only)</template>
                <b-collapse id="collapse-keyboard-controls">
                  <ul style="list-style-type: none; margin: 0; padding: 0;">
                    <li
                      v-for="command in instructions.commands"
                      :key="command.command"
                      style="margin: 3px 0 0 0;"
                    >
                      <kbd
                        v-for="k in command.key"
                        :key="k"
                        style="margin-right: 2px;"
                        >{{ k }}</kbd
                      >
                      <span>{{ command.command }}</span>
                      <span v-show="command.isActive && !command.isActive()">
                        <b-icon icon="info-circle" variant="light"></b-icon>
                        {{ command.msg }}
                      </span>
                    </li>
                  </ul>
                </b-collapse>
              </b-form-text>
            </b-card-text>
          </fieldset>
        </b-list-group>

        <div class="emscripten">
          <progress id="progress" value="0" max="100" hidden="1"></progress>
        </div> </b-col
      ><b-col
        style="max-height: inherit; overflow: none;"
        sm="12"
        xl="8"
        order="1"
        order-xl="2"
      >
        <!-- Simulation Screen -->

        <canvas
          id="canvas"
          class="emscripten"
          oncontextmenu="event.preventDefault()"
          tabindex="-1"
        >
        </canvas>
      </b-col>
    </b-row>

    <textarea v-if="is_development" id="output" rows="3"></textarea>

    <b-container v-if="is_running" fluid>
      <b-row>
        <b-col> </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import Vue from 'vue'
import { BootstrapVueIcons } from 'bootstrap-vue'
import 'bootstrap-vue/dist/bootstrap-vue-icons.min.css'
import FlightSimulator from '~/static/flightSimulator.js'
import KnobComponent from '~/components/Knob.vue'

Vue.use(BootstrapVueIcons)

export default {
  name: 'FlightSim',
  components: {
    KnobComponent,
  },

  data() {
    return {
      FlightSimulator: null,
      is_running: false,
      simulatorButtonText: 'Start simulation',
      is_development: process.env.NODE_ENV === 'development',
      api_autopilot: null,
      api_heading_hold: 0,
      api_altitude_hold: 0,
      api_speed_hold: 0,
      api_toggleAutopilot: null,
      api_toggleHeadingHold: null,
      api_setHeadingHoldValue: null,
      api_toggleAltitudeHold: null,
      api_setAltitudeHoldValue: null,
      api_toggleSpeedHold: null,
      api_setSpeedHoldValue: null,
      api_setAtmosphereSeaLevelTemperature: null,
      api_setAtmosphereSeaLevelDensity: null,
      api_target_altitude: null,
      api_target_heading_deg: null,
      api_target_speed: null,
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
      api_simulation_pause: null,
      api_simulation_speed: null,
      api_atmosphere_sea_level_temperature: null,
      api_atmosphere_sea_level_density: null,
      isRealTimeDataDisplayed: false,
      isKeyboardControlsDisplayed: false,
    }
  },
  computed: {
    autopilot_controls() {
      return [
        {
          button_title: 'Heading Hold',
          toggle: this.api_toggleHeadingHold,
          status: this.api_heading_hold,
          setter: this.api_setHeadingHoldValue,
          setter_model: this.api_target_heading_deg,
          unit: '°',
          min: 0,
          max: 359,
          step: 1.0,
        },
        {
          button_title: 'Altitude Hold',
          toggle: this.api_toggleAltitudeHold,
          status: this.api_altitude_hold,
          setter: this.api_setAltitudeHoldValue,
          setter_model: this.api_target_altitude,
          unit: 'ft',
          min: 0,
          max: 50000,
          step: 1.0,
        },
        {
          button_title: 'Speed Hold',
          toggle: this.api_toggleSpeedHold,
          status: this.api_speed_hold,
          setter: this.api_setSpeedHoldValue,
          setter_model: this.api_target_speed,
          unit: 'kt',
          min: 0,
          max: 350,
          step: 1,
        },
      ]
    },

    simulation_parameters() {
      return {
        Simulation: [
          {
            title: 'Simulation Speed',
            value: this.api_simulation_speed,
            setter: this.api_setSimulationSpeed,
            unit: 'x',
            min: 0.5,
            max: 16,
            step: 0.5,
          },
          {
            title: 'Frame Rate (FPS)',
            value: 60,
            setter: this.api_setFramesRate,
            // unit: 'fps',
            min: 1,
            max: 120,
            step: 10,
          },
        ],
        Geometry: [
          {
            title: 'Wing Area Ft&sup2;',
            value: 530,
            setter: this.api_setWingAreaValue,
            min: 10,
            max: 1000,
            step: 1,
          },
        ],
        Performance: [
          {
            title: 'Thrust to Weight Ratio',
            value: 0.3,
            setter: this.api_setThrustToWeightRatio,
            min: 0.1,
            max: 5,
            step: 0.1,
          },
        ],
        Aerodynamics: [
          {
            title: 'Lift Cofficient Slope',
            value: 3.53,
            setter: this.api_setClSlopeValue,
            min: 0.1,
            max: 5,
            step: 0.1,
          },
          {
            title: 'Drag Cofficient',
            value: 0.02,
            setter: this.api_setCdValue,
            min: 0.01,
            max: 1.0,
            step: 0.01,
          },
        ],
        Atmosphere: [
          {
            title: 'Sea Level Temperature',
            unit: ' Rankin',
            value: this.api_atmosphere_sea_level_temperature,
            setter: this.api_setAtmosphereSeaLevelTemperature,
            min: 311,
            max: 672,
            step: 1.0,
          },
          {
            title: 'Sea Level Density',
            value: this.api_atmosphere_sea_level_density,
            setter: this.api_setAtmosphereSeaLevelDensity,
            min: 0.001756,
            max: 0.002939,
            step: 0.0001,
          },
        ],
      }
    },
    instructions() {
      const obj = {
        commands: [
          {
            key: ['w', '↑'],
            command: ' pitch -',
            isActive: () => {
              return !this.api_altitude_hold
            },
            msg: 'Inactive: Altitude Hold Enganged',
          },
          {
            key: ['s', '↓'],
            command: ' pitch +',
            isActive: () => {
              return !this.api_altitude_hold
            },
            msg: 'Inactive: Altitude Hold Enganged',
          },
          {
            key: ['a', '←'],
            command: ' roll -',
            isActive: () => {
              return !this.api_heading_hold
            },
            msg: 'Inactive: Heading Hold Enganged',
          },
          {
            key: ['d', '→'],
            command: ' roll +',
            isActive: () => {
              return !this.api_heading_hold
            },
            msg: 'Inactive: Heading Hold Enganged',
          },
          {
            key: ['F1'],
            command: 'idle throttle',
            isActive: () => {
              return !this.api_speed_hold
            },
            msg: 'Inactive: Speed Hold Enganged',
          },
          {
            key: ['F2'],
            command: 'throttle -',
            isActive: () => {
              return !this.api_speed_hold
            },
            msg: 'Inactive: Speed Hold Enganged',
          },
          {
            key: ['F3'],
            command: 'throttle +',
            isActive: () => {
              return !this.api_speed_hold
            },
            msg: 'Inactive: Speed Hold Enganged',
          },
          {
            key: ['F4'],
            command: 'max throttle',
            isActive: () => {
              return !this.api_speed_hold
            },
            msg: 'Inactive: Speed Hold Enganged',
          },
          {
            key: ['f'],
            command: 'reset all surface controls to neutral position',
          },
          {
            key: ['h'],
            command: 'reset flight model',
          },
        ],
      }

      return obj
    },
  },
  mounted() {
    this.startSimulator()
  },
  methods: {
    notifyUser(title, msg, duration = 1000) {
      this.$bvToast.toast(msg, {
        title,
        noAutoHide: duration === -1,
        autoHideDelay: duration,
        appendToast: false,
        variant: 'dark',
        'body-class': 'strong',
      })
    },
    requestFullScreen() {
      this.FlightSimulator.requestFullscreen(false, true)
    },
    startSimulator() {
      const statusElement = document.getElementById('status')
      const progressElement = document.getElementById('progress')

      FlightSimulator({
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
        print: (function () {
          const element = document.getElementById('output')
          if (element) element.value = '' // clear browser cache
          return function (text) {
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

        canvas: (() => {
          const canvas = document.getElementById('canvas')
          return canvas
        })(),
      }).then((FlightSimulatorModule) => {
        this.FlightSimulator = FlightSimulatorModule
        this.is_running = true

        // Link C++ functions
        // Setters
        this.api_toggleAutopilot = this.FlightSimulator._set_autopilot
        this.api_toggleHeadingHold = this.FlightSimulator._set_heading_hold
        this.api_toggleAltitudeHold = this.FlightSimulator._set_altitude_hold
        this.api_toggleSpeedHold = this.FlightSimulator._set_speed_hold
        this.api_setHeadingHoldValue = this.FlightSimulator._set_target_heading_deg
        this.api_setAltitudeHoldValue = this.FlightSimulator._set_target_altitude
        this.api_setSpeedHoldValue = this.FlightSimulator._set_target_speed
        this.api_setWingAreaValue = this.FlightSimulator._set_wing_area
        this.api_setThrustToWeightRatio = this.FlightSimulator._set_thrust_to_weight
        this.api_setClSlopeValue = this.FlightSimulator._set_dcl
        this.api_setCdValue = this.FlightSimulator._set_cdo
        this.api_setAtmosphereSeaLevelTemperature = this.FlightSimulator._set_atmosphere_sea_level_temperature
        this.api_setAtmosphereSeaLevelDensity = this.FlightSimulator._set_atmosphere_sea_level_density
        this.api_setSimulationSpeed = this.FlightSimulator._set_simulation_speed
        this.api_setFramesRate = this.FlightSimulator._set_frames_rate
        this.api_setSimulationPause = this.FlightSimulator._set_simulation_pause
        this.api_setSimulationReset = this.FlightSimulator._set_simulation_reset

        // Getters
        let HEAPF32 = null
        let HEAP8 = null
        let ptrApiIterationTime = null
        let ptrApiWeight = null
        let ptrApiAltitude = null
        let ptrApiAlphaTail = null
        let ptrApiAlphaAileron = null
        let ptrApiThrottle = null
        let ptrApiIasSpeedKnots = null
        let ptrApiPsiDeg = null
        let ptrApiThetaDeg = null
        let ptrApiAttitudeDeg = null
        let ptrApiAutopilot = null
        let ptrApiHeadingHold = null
        let ptrApiLevelHold = null
        let ptrApiSpeedHold = null
        let ptrApiAltitudeHold = null
        let ptrApiTargetHeadingDeg = null
        let ptrApiTargetAltitude = null
        let ptrApiTargetSpeed = null
        let ptrApiAtmosphereSeaLevelTemperature = null
        let ptrApiAtmosphereSeaLevelDensity = null
        let ptrApiSimulationPause = null
        let ptrApiSimulationSpeed = null

        const updateSimData = () => {
          if (ptrApiWeight !== this.FlightSimulator._api_weight()) {
            HEAPF32 = this.FlightSimulator.HEAPF32
            HEAP8 = this.FlightSimulator.HEAP8
            ptrApiIterationTime = this.FlightSimulator._api_iteration_time()
            ptrApiWeight = this.FlightSimulator._api_weight()
            ptrApiAltitude = this.FlightSimulator._api_altitude()
            ptrApiAlphaTail = this.FlightSimulator._api_alpha_tail()
            ptrApiAlphaAileron = this.FlightSimulator._api_alpha_aileron()
            ptrApiThrottle = this.FlightSimulator._api_throttle()
            ptrApiIasSpeedKnots = this.FlightSimulator._api_ias_speed_knots()
            ptrApiPsiDeg = this.FlightSimulator._api_psi_deg()
            ptrApiThetaDeg = this.FlightSimulator._api_theta_deg()
            ptrApiAttitudeDeg = this.FlightSimulator._api_attitude_deg()
            ptrApiAutopilot = this.FlightSimulator._api_autopilot()
            ptrApiHeadingHold = this.FlightSimulator._api_heading_hold()
            ptrApiLevelHold = this.FlightSimulator._api_level_hold()
            ptrApiSpeedHold = this.FlightSimulator._api_speed_hold()
            ptrApiAltitudeHold = this.FlightSimulator._api_altitude_hold()
            ptrApiTargetHeadingDeg = this.FlightSimulator._api_target_heading_deg()
            ptrApiTargetAltitude = this.FlightSimulator._api_target_altitude()
            ptrApiTargetSpeed = this.FlightSimulator._api_target_speed()
            ptrApiAtmosphereSeaLevelTemperature = this.FlightSimulator._api_atmosphere_sea_level_temperature()
            ptrApiAtmosphereSeaLevelDensity = this.FlightSimulator._api_atmosphere_sea_level_density()
            ptrApiSimulationPause = this.FlightSimulator._api_simulation_pause()
            ptrApiSimulationSpeed = this.FlightSimulator._api_simulation_speed()
          }

          this.api_iteration_time = HEAPF32[ptrApiIterationTime >> 2]
          this.api_simulation_speed = HEAPF32[ptrApiSimulationSpeed >> 2]
          this.api_weight = HEAPF32[ptrApiWeight >> 2]
          this.api_altitude = HEAPF32[ptrApiAltitude >> 2]
          this.api_alpha_tail = HEAPF32[ptrApiAlphaTail >> 2]
          this.api_alpha_aileron = HEAPF32[ptrApiAlphaAileron >> 2]
          this.api_throttle = HEAPF32[ptrApiThrottle >> 2]
          this.api_ias_speed_knots = HEAPF32[ptrApiIasSpeedKnots >> 2]
          this.api_psi_deg = HEAPF32[ptrApiPsiDeg >> 2]
          this.api_theta_deg = HEAPF32[ptrApiThetaDeg >> 2]
          this.api_attitude_deg = HEAPF32[ptrApiAttitudeDeg >> 2]
          this.api_simulation_pause = HEAP8[ptrApiSimulationPause]
          this.api_autopilot = HEAP8[ptrApiAutopilot]
          this.api_heading_hold = HEAP8[ptrApiHeadingHold]
          this.api_level_hold = HEAP8[ptrApiLevelHold]
          this.api_speed_hold = HEAP8[ptrApiSpeedHold]
          this.api_altitude_hold = HEAP8[ptrApiAltitudeHold]
          this.api_target_heading_deg = HEAPF32[ptrApiTargetHeadingDeg >> 2]
          this.api_target_altitude = HEAPF32[ptrApiTargetAltitude >> 2]
          this.api_target_speed = HEAPF32[ptrApiTargetSpeed >> 2]
          this.api_atmosphere_sea_level_temperature =
            HEAPF32[ptrApiAtmosphereSeaLevelTemperature >> 2] | 0
          this.api_atmosphere_sea_level_density = Number(
            HEAPF32[ptrApiAtmosphereSeaLevelDensity >> 2]
          ).toFixed(4)

          // Execute every milliseconds
          setTimeout(updateSimData, 200)
        }

        updateSimData()
        // Main function
        const main = this.FlightSimulator._main
        main()
      })

      // Pause the simulation when tab loses focus
      document.addEventListener('visibilitychange', () => {
        if (!this.api_simulation_pause) {
          this.api_setSimulationPause(!document.hidden)
        }
      })

      // this.$nextTick(() => {})
    },
    beforeCreate() {},
  },
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
  padding: 2px;
  /* max-height: 488px; */
  /* overflow: scroll; */
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
.control-group {
  padding: 2px;
}
div .control-group .row {
  align-items: center;
}
.list-group-item {
  background-color: rgba(0, 0, 0, 0);
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
  width: 100%;
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
