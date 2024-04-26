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
            </ul>
          </b-form-text>
          <span>
            <b-button
              variant="outline-danger"
              style="width: 100%; height: 100%; border-color: #ff0000"
              @click="startSimulator"
              >{{ simulatorButtonText }}</b-button
            ></span
          >
        </b-card-text></b-card
      >
    </div>

    <div v-show="FlightSimulator === null" id="status" class="emscripten" />

    <splitpanes
      v-show="is_running"
      :style="
        'max-height: 90vh;' +
        ($mq === 'sm' ? 'flex-direction: column-reverse;' : '')
      "
      class="emscripten_border default-theme"
      :horizontal="$mq === 'sm'"
    >
      <!-- Controls Panel -->
      <pane
        size="40"
        min-size="20"
        max-size="80"
        style="
          max-height: inherit;
          overflow-y: scroll;
          background-color: rgba(0, 0, 0, 0);
        "
      >
        <b-card header="Pilot Controls" no-body bg-variant="transparent">
          <b-tabs card small fill no-key-nav>
            <b-tab title="Autpilot">
              <b-button
                :class="'btn-block ' + (api_autopilot ? 'pressed' : '')"
                variant="default"
                @click="api_setAutopilot(!api_autopilot)"
                >Autopilot</b-button
              >

              <div
                v-for="parameters in autopilot_controls"
                :key="parameters.button_title"
                container
              >
                <div class="input-group">
                  <b-input-group>
                    <!-- <b-input-group-prepend style="width: 30%"> -->
                    <SvgButton
                      :label="parameters.button_title"
                      :is-pressed="parameters.status"
                      @click="parameters.toggle(!parameters.status)"
                    />
                    <!-- <b-button
                        block
                        style="text-align: left"
                        :variant="
                          parameters.status
                            ? 'outline-success'
                            : 'outline-danger'
                        "
                        @click="parameters.toggle(!parameters.status)"
                        >{{ parameters.button_title }}</b-button
                      > -->
                    <!-- </b-input-group-prepend> -->

                    <b-form-input
                      style="width: 50%; height: 100%"
                      type="number"
                      :min="parameters.min"
                      :max="parameters.max"
                      :step="parameters.step"
                      :value="parameters.setter_model"
                      @change="
                        (value) => {
                          parameters.setter(value)
                        }
                      "
                    ></b-form-input>

                    <b-input-group-append style="flex: 0 0 10%">
                      <b-input-group-text
                        style="
                          width: 100%;
                          background-color: transparent;
                          border: none;
                          font-size: inherit;
                          color: inherit;
                        "
                      >
                        {{ parameters.unit }}
                      </b-input-group-text>
                    </b-input-group-append>
                  </b-input-group>
                </div>
              </div>
            </b-tab>
            <b-tab title="Keyboard Controls">
              <b-form-text variant="dark">
                <template #title>Commands (For desktop use only)</template>

                <ul style="list-style-type: none; margin: 0; padding: 0">
                  <li
                    v-for="command in instructions.commands"
                    :key="command.command"
                    style="margin: 3px 0 0 0"
                  >
                    <kbd
                      v-for="k in command.key"
                      :key="k"
                      style="margin-right: 2px"
                      >{{ k }}</kbd
                    >
                    <span>{{ command.command }}</span>
                    <!-- <span v-show="command.isActive && !command.isActive()">
                      <b-icon icon="info-circle" variant="light"></b-icon>
                      {{ command.msg }}
                    </span> -->
                  </li>
                </ul>
              </b-form-text>
            </b-tab>
          </b-tabs>
        </b-card>

        <b-card
          header="Instructor Operating Station"
          no-body
          bg-variant="transparent"
        >
          <b-tabs card small fill no-key-nav>
            <template
              v-for="(simulation_group, title) in simulation_parameters"
            >
              <b-tab :key="title" :title="title">
                <template v-for="parameter in simulation_group">
                  <b-form-group
                    :key="parameter.title"
                    :label="`${parameter.title} ${
                      parameter.unit ? '(' + parameter.unit + ')' : ''
                    }`"
                    :label-for="parameter.title"
                    label-size="sm"
                    label-cols="6"
                    label-align="right"
                    style="margin-bottom: 1px"
                  >
                    <b-button
                      v-if="parameter.icon"
                      variant="default"
                      block
                      @click="parameter.setter(!parameter.value)"
                    >
                      <b-icon :icon="parameter.icon" variant="default"></b-icon
                    ></b-button>

                    <div v-else class="input-group">
                      <b-input-group>
                        <b-form-input
                          :id="parameter.title"
                          v-model="parameter.value"
                          variant="default"
                          type="number"
                          number
                          :min="parameter.min"
                          :max="parameter.max"
                          :step="parameter.step"
                          @update="parameter.setter"
                        ></b-form-input>
                      </b-input-group>
                    </div>
                  </b-form-group>
                </template>
              </b-tab>
            </template>
            <b-tab title="Script">
              <ScriptEditor
                ref="scriptEditor"
                :context="this"
                @run="sendScriptToPeer"
                @finish="null"
                @error="(e) => notifyUser('Script Error', e.message, 3000)"
              />
            </b-tab>
            <b-tab title="Classroom">
              <WebRTC
                ref="WebRTC"
                @dataEvent="peerEvent"
                @error="
                  (e) => notifyUser('Peer Connection Error', e.message, 3000)
                "
              />
            </b-tab>
          </b-tabs>
        </b-card>

        <b-card header="Real Time Data" no-body bg-variant="transparent">
          <b-button
            variant="default"
            @click="isRealTimeDataDisplayed = !isRealTimeDataDisplayed"
          >
            {{ isRealTimeDataDisplayed ? 'Hide' : 'Show' }}
          </b-button>
          <b-card-text v-if="isRealTimeDataDisplayed" ref="real_time_data">
            <b-collapse id="collapse-data" v-model="isRealTimeDataDisplayed">
              <b-table
                table-variant="default"
                borderless
                small
                disable
                sticky-header
                :fields="['title', 'value']"
                :items="SimulatorData"
              >
                <template #cell()="data">
                  <b-form-text>{{ data.value }}</b-form-text>
                </template>
                <template #cell(title)="data">
                  <b-form-text>
                    {{ `${data.item.title} ${data.item.unit || ''}` }}
                  </b-form-text>
                </template>
                <!-- {{ simData.title }}: {{ simData.value()
                  }}{{ simData.unit || '' }} -->
              </b-table>
            </b-collapse>
          </b-card-text>
        </b-card> </pane
      ><pane
        class="default-theme"
        style="
          background-color: transparent;
          max-height: inherit;
          overflow: none;
        "
      >
        <!-- Simulation Screen -->

        <canvas
          id="canvas"
          class="emscripten"
          oncontextmenu="event.preventDefault()"
          tabindex="-1"
        >
        </canvas>

        <!-- <b-form-textarea
          ref="promptElement"
          variant="default"
          plaintext
          value="Hello this is a temporary text to be removed!"
        ></b-form-textarea> -->

        <!-- <typewriter
          ref="typewriter"
          style="font-size: 12x; color: black"
          :type-interval="10"
          :replace-interval="1000"
        >
          <div>Typewriter Vue</div>
        </typewriter> -->

        <b-form-text
          style="min-height: 5rem; background: transparent"
          variant="danger"
        >
          <vue-typer
            ref="typewriter"
            erase-style="select-back"
            :repeat="0"
            :type-delay="20"
            :erase-delay="10"
            :text="promptText"
            :pre-erase-delay="promptTextEraseDelay"
            :erase-on-complete="true"
            variant="light"
          ></vue-typer>
        </b-form-text>

        <!-- <textarea v-if="is_development" id="output" rows="3"></textarea> -->
      </pane>
    </splitpanes>
  </div>
</template>

<script>
import Vue from 'vue'
import VueMq from 'vue-mq'
import { BootstrapVueIcons } from 'bootstrap-vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import 'bootstrap-vue/dist/bootstrap-vue-icons.min.css'
import { VueTyper } from 'vue-typer'
import SvgButton from '~/components/fcuButton.vue'
import ScriptEditor from '~/components/ScriptEditor.vue'
import WebRTC from '~/components/peerJs.vue'
import FlightSimulator from '~/static/flightsimulator_exec.js'

Vue.use(BootstrapVueIcons)
Vue.use(VueMq)

export default {
  name: 'FlightSim',
  components: { Splitpanes, Pane, ScriptEditor, WebRTC, SvgButton, VueTyper },

  data() {
    return {
      FlightSimulator: null,
      is_running: false,
      simulatorButtonText: 'Start simulation',
      is_development: process.env.NODE_ENV === 'development',
      api_autopilot: null,
      api_heading_hold: 0,
      api_bank_hold: 0,
      api_altitude_hold: 0,
      api_vertical_speed_hold: 0,
      api_speed_hold: 0,
      api_setAutopilot: null,
      api_setHeadingHold: null,
      api_setHeadingHoldValue: null,
      api_setBankHold: null,
      api_setBankHoldValue: null,
      api_setAltitudeHold: null,
      api_setAltitudeHoldValue: null,
      api_setVerticalSpeedHold: null,
      api_setVerticalSpeedValue: null,
      api_setSpeedHold: null,
      api_setSpeedHoldValue: null,
      api_setAtmosphereSeaLevelTemperature: null,
      api_setAtmosphereSeaLevelDensity: null,
      api_setUpdateRate: null,
      api_setSimulationPause: null,
      api_setSimulationReset: null,
      api_setSimulationSpeed: null,
      api_incrementAileron: null,
      api_decrementAileron: null,
      api_incrementElevator: null,
      api_decrementElevator: null,
      api_target_altitude: null,
      api_target_vertical_speed: null,
      api_target_heading_deg: null,
      api_target_bank_deg: null,
      api_target_speed: null,
      api_fps: null,
      api_ups: null,
      api_weight: null,
      api_altitude: null,
      api_vertical_speed: null,
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
      api_thrust_to_weight: null,
      api_cl0: null,
      api_cdo: null,
      api_wing_area: null,
      api_true_speed_knots: null,
      api_mach: null,
      api_vstall_speed_knots: null,
      api_atmosphere_temperature: null,
      api_atmosphere_density: null,
      api_total_drag: null,
      api_cl: null,
      api_cdi: null,
      isRealTimeDataDisplayed: false,
      promptText: '',
      promptTextEraseDelay: 5000,
    }
  },
  computed: {
    autopilot_controls() {
      return [
        {
          button_title: 'HDG Hold',
          toggle: this.api_setHeadingHold,
          status: this.api_heading_hold,
          setter: this.api_setHeadingHoldValue,
          setter_model: this.api_target_heading_deg,
          unit: '°',
          min: 0,
          max: 359,
          step: 1.0,
        },
        {
          button_title: 'Roll Hold',
          toggle: this.api_setBankHold,
          status: this.api_bank_hold,
          setter: this.api_setBankHoldValue,
          setter_model: this.api_target_bank_deg,
          unit: '°',
          min: -30,
          max: 30,
          step: 1.0,
        },
        {
          button_title: 'ALT Hold',
          toggle: this.api_setAltitudeHold,
          status: this.api_altitude_hold,
          setter: this.api_setAltitudeHoldValue,
          setter_model: this.api_target_altitude,
          unit: 'ft',
          min: 0,
          max: 50000,
          step: 100.0,
        },
        {
          button_title: 'Vert Spd Hold',
          toggle: this.api_setVerticalSpeedHold,
          status: this.api_vertical_speed_hold,
          setter: this.api_setVerticalSpeedValue,
          setter_model: this.api_target_vertical_speed,
          unit: 'fpm',
          min: -6000,
          max: 6000,
          step: 100,
        },
        {
          button_title: 'SPD Hold',
          toggle: this.api_setSpeedHold,
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
            title: this.api_simulation_pause ? 'Resume' : 'Pause',
            value: this.api_simulation_pause,
            setter: this.api_setSimulationPause,
            icon: this.api_simulation_pause ? 'play-fill' : 'pause-fill',
          },
          {
            title: 'Reset',
            value: null,
            setter: this.reset,
            icon: 'x-circle',
          },
          {
            title: 'Fullscreen',
            value: null,
            setter: this.requestFullScreen,
            icon: 'arrows-fullscreen',
          },

          {
            title: 'Simulation Speed',
            value: this.api_simulation_speed,
            setter: this.api_setSimulationSpeed,
            unit: 'x',
            min: 0.5,
            max: 100,
            step: 0.5,
          },
          {
            title: 'Update Rate',
            value: 60,
            setter: this.api_setUpdateRate,
            unit: 'fps',
            min: 1,
            max: 1000,
            step: 10,
          },
        ],
        Aircraft: [
          {
            title: 'Thrust to Weight Ratio',
            value: this.api_thrust_to_weight,
            setter: this.api_setThrustToWeightRatio,
            min: 0.1,
            max: 5,
            step: 0.1,
          },
          {
            title: 'Wing Area',
            value: this.api_wing_area,
            setter: this.api_setWingAreaValue,
            unit: 'Ft²',
            min: 10,
            max: 1000,
            step: 1,
          },
        ],
        Aerodynamics: [
          {
            title: 'Lift Cofficient Slope',
            value: this.api_cl0,
            setter: this.api_setClSlopeValue,
            min: 0.1,
            max: 5,
            step: 0.01,
          },
          {
            title: 'Drag Cofficient',
            value: this.api_cdo,
            setter: this.api_setCdValue,
            min: 0.01,
            max: 1.0,
            step: 0.01,
          },
        ],
        Atmosphere: [
          {
            title: 'Sea Level Temperature',
            unit: 'R',
            value: this.api_atmosphere_sea_level_temperature,
            setter: this.api_setAtmosphereSeaLevelTemperature,
            min: 311,
            max: 672,
            step: 1.0,
          },
          {
            title: 'Sea Level Density',
            unit: 'Slug/ft³',
            value: Number(this.api_atmosphere_sea_level_density).toFixed(4),
            setter: this.api_setAtmosphereSeaLevelDensity,
            min: 0.001756,
            max: 0.002939,
            step: 0.000001,
          },
        ],
      }
    },
    instructions() {
      return {
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
            command: 'reset surface controls positions',
          },
          {
            key: ['h'],
            command: 'reset simulation',
          },
        ],
      }
    },
    SimulatorData() {
      return [
        { title: 'Frame rate', value: this.api_fps, unit: 'Hz' },
        { title: 'Update rate', value: this.api_ups, unit: 'Hz' },
        { title: 'Weight', value: ~~this.api_weight, unit: 'lbs' },
        { title: 'Altitude', value: ~~this.api_altitude, unit: 'ft' },
        {
          title: 'Vertical Speed',
          value: ~~(this.api_vertical_speed * 60),
          unit: 'fpm',
        },
        {
          title: 'Temperature',
          value: ~~this.api_atmosphere_temperature,
          unit: 'R',
        },
        {
          title: 'Density',
          value: Number(this.api_atmosphere_density).toFixed(6),
          unit: 'Slug/ft³',
        },
        { title: 'Total Drag', value: ~~this.api_total_drag, unit: 'lbs' },
        {
          title: 'Lift Coefficient',
          value: Number(this.api_cl).toFixed(4),
        },
        {
          title: 'Drag Coefficient',
          value: Number(this.api_cdi).toFixed(4),
        },
        {
          title: 'Elevator angle',
          value: Number(this.api_alpha_tail).toFixed(2),
          unit: '%',
        },
        {
          title: 'Aileron angle',
          value: Number(this.api_alpha_aileron).toFixed(2),
          unit: '%',
        },
        {
          title: 'Throttle',
          value: ~~(this.api_throttle * 100),
          unit: '%',
        },
        {
          title: 'Indicated Airspeed',
          value: ~~this.api_ias_speed_knots,
          unit: 'kts',
        },
        {
          title: 'True Airspeed',
          value: ~~this.api_true_speed_knots,
          unit: 'kts',
        },
        {
          title: 'Mach speed',
          value: Number(this.api_mach).toFixed(2),
          unit: 'M',
        },
        {
          title: 'Stall Airspeed',
          value: ~~this.api_vstall_speed_knots,
          unit: 'kts',
        },
        {
          title: 'Heading',
          value: Number(this.api_psi_deg).toFixed(2),
          unit: '°',
        },
        {
          title: 'Bank',
          value: Number(this.api_theta_deg).toFixed(2),
          unit: '°',
        },
        {
          title: 'Pitch',
          value: Number(this.api_attitude_deg).toFixed(2),
          unit: '°',
        },
      ]
    },
  },
  mounted() {},
  methods: {
    sendScriptToPeer(script) {
      const payload = this.$refs.WebRTC.createMessageObject('script', script)
      this.$refs.WebRTC.send(payload)
    },
    peerEvent(event) {
      const data = event.data
      if (data.topic === 'script') {
        this.$refs.scriptEditor.codeInterpret(this, data.content)
      }
    },
    notifyUser(title, msg, duration = 1000) {
      this.promptTextEraseDelay = duration - 200
      this.promptText = title + ':  ' + msg

      // this.$bvToast.toast(msg, {
      //   title,
      //   noAutoHide: duration === -1,
      //   autoHideDelay: duration,
      //   appendToast: false,
      //   variant: 'dark',
      //   'body-class': 'strong',
      // })
    },
    reset() {
      this.$refs.scriptEditor.reset()
      this.api_setSimulationReset()
    },
    requestFullScreen() {
      this.FlightSimulator.requestFullscreen(false, true)
    },
    startSimulator() {
      const statusElement = document.getElementById('status')

      FlightSimulator({
        vue: this,

        setStatus(text) {
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
        this.api_setAutopilot = this.FlightSimulator._api_set_autopilot
        this.api_setHeadingHold = this.FlightSimulator._api_set_heading_hold
        this.api_setBankHold = this.FlightSimulator._api_set_bank_hold
        this.api_setAltitudeHold = this.FlightSimulator._api_set_altitude_hold
        this.api_setVerticalSpeedHold =
          this.FlightSimulator._api_set_vertical_speed_hold
        this.api_setSpeedHold = this.FlightSimulator._api_set_speed_hold
        this.api_setHeadingHoldValue =
          this.FlightSimulator._api_set_target_heading_deg
        this.api_setBankHoldValue =
          this.FlightSimulator._api_set_target_bank_deg
        this.api_setAltitudeHoldValue =
          this.FlightSimulator._api_set_target_altitude
        this.api_setVerticalSpeedValue =
          this.FlightSimulator._api_set_target_vertical_speed
        this.api_setSpeedHoldValue = this.FlightSimulator._api_set_target_speed
        this.api_setWingAreaValue = this.FlightSimulator._api_set_wing_area
        this.api_setThrustToWeightRatio =
          this.FlightSimulator._api_set_thrust_to_weight
        this.api_setClSlopeValue = this.FlightSimulator._api_set_dcl
        this.api_setCdValue = this.FlightSimulator._api_set_cdo
        this.api_setAtmosphereSeaLevelTemperature =
          this.FlightSimulator._api_set_atmosphere_sea_level_temperature
        this.api_setAtmosphereSeaLevelDensity =
          this.FlightSimulator._api_set_atmosphere_sea_level_density
        this.api_setSimulationSpeed =
          this.FlightSimulator._api_set_simulation_speed
        this.api_setUpdateRate = this.FlightSimulator._api_set_update_rate
        this.api_setSimulationPause =
          this.FlightSimulator._api_set_simulation_pause
        this.api_setSimulationReset =
          this.FlightSimulator._api_set_simulation_reset
        this.api_incrementAileron = this.FlightSimulator._api_increment_aileron
        this.api_decrementAileron = this.FlightSimulator._api_decrement_aileron
        this.api_incrementElevator =
          this.FlightSimulator._api_increment_elevator
        this.api_decrementElevator =
          this.FlightSimulator._api_decrement_elevator

        // Getters
        let HEAPF32 = null
        let HEAP32 = null
        let HEAP8 = null
        let ptrApiFps = null
        let ptrApiUps = null
        let ptrApiWeight = null
        let ptrApiAltitude = null
        let ptrApiVerticalSpeed = null
        let ptrApiAlphaTail = null
        let ptrApiAlphaAileron = null
        let ptrApiThrottle = null
        let ptrApiIasSpeedKnots = null
        let ptrApiPsiDeg = null
        let ptrApiThetaDeg = null
        let ptrApiAttitudeDeg = null
        let ptrApiAutopilot = null
        let ptrApiHeadingHold = null
        let ptrApiBankHold = null
        let ptrApiLevelHold = null
        let ptrApiSpeedHold = null
        let ptrApiAltitudeHold = null
        let ptrApiVerticalSpeedHold = null
        let ptrApiTargetHeadingDeg = null
        let ptrApiTargetBankDeg = null
        let ptrApiTargetAltitude = null
        let ptrApiTargetVerticalSpeed = null
        let ptrApiTargetSpeed = null
        let ptrApiAtmosphereSeaLevelTemperature = null
        let ptrApiAtmosphereSeaLevelDensity = null
        let ptrApiSimulationPause = null
        let ptrApiSimulationSpeed = null
        let ptrApiThrustToWeight = null
        let ptrApiCl0 = null
        let ptrApiCdo = null
        let ptrApiWingArea = null
        let ptrApiTrueSpeedKnots = null
        let ptrApiVstallSpeedKnots = null
        let ptrApiAtmosphereTemperature = null
        let ptrApiAtmosphereDensity = null
        let ptrApiMach = null
        let PtrApiTotalDrag = null
        let ptrApiCl = null
        let ptrApiCdi = null

        const updateSimData = () => {
          // A hacky way to detect if flightsim reset was called from WASM
          // By checking if the pointer address has changed
          if (ptrApiWeight !== this.FlightSimulator._api_weight()) {
            HEAPF32 = this.FlightSimulator.HEAPF32
            HEAP32 = this.FlightSimulator.HEAP32
            HEAP8 = this.FlightSimulator.HEAP8
            ptrApiFps = this.FlightSimulator._api_fps()
            ptrApiUps = this.FlightSimulator._api_ups()
            ptrApiWeight = this.FlightSimulator._api_weight()
            ptrApiAltitude = this.FlightSimulator._api_altitude()
            ptrApiVerticalSpeed = this.FlightSimulator._api_vertical_speed()
            ptrApiAlphaTail = this.FlightSimulator._api_alpha_tail()
            ptrApiAlphaAileron = this.FlightSimulator._api_alpha_aileron()
            ptrApiThrottle = this.FlightSimulator._api_throttle()
            ptrApiIasSpeedKnots = this.FlightSimulator._api_ias_speed_knots()
            ptrApiPsiDeg = this.FlightSimulator._api_psi_deg()
            ptrApiThetaDeg = this.FlightSimulator._api_theta_deg()
            ptrApiAttitudeDeg = this.FlightSimulator._api_attitude_deg()
            ptrApiAutopilot = this.FlightSimulator._api_autopilot()
            ptrApiHeadingHold = this.FlightSimulator._api_heading_hold()
            ptrApiBankHold = this.FlightSimulator._api_bank_hold()
            ptrApiLevelHold = this.FlightSimulator._api_level_hold()
            ptrApiSpeedHold = this.FlightSimulator._api_speed_hold()
            ptrApiAltitudeHold = this.FlightSimulator._api_altitude_hold()
            ptrApiVerticalSpeedHold =
              this.FlightSimulator._api_vertical_speed_hold()
            ptrApiTargetHeadingDeg =
              this.FlightSimulator._api_target_heading_deg()
            ptrApiTargetBankDeg = this.FlightSimulator._api_target_bank_deg()
            ptrApiTargetAltitude = this.FlightSimulator._api_target_altitude()
            ptrApiTargetVerticalSpeed =
              this.FlightSimulator._api_target_vertical_speed()
            ptrApiTargetSpeed = this.FlightSimulator._api_target_speed()
            ptrApiAtmosphereSeaLevelTemperature =
              this.FlightSimulator._api_atmosphere_sea_level_temperature()
            ptrApiAtmosphereSeaLevelDensity =
              this.FlightSimulator._api_atmosphere_sea_level_density()
            ptrApiSimulationPause = this.FlightSimulator._api_simulation_pause()
            ptrApiSimulationSpeed = this.FlightSimulator._api_simulation_speed()
            ptrApiThrustToWeight = this.FlightSimulator._api_thrust_to_weight()
            ptrApiCl0 = this.FlightSimulator._api_dcl()
            ptrApiCdo = this.FlightSimulator._api_cdo()
            ptrApiWingArea = this.FlightSimulator._api_wing_area()
            ptrApiTrueSpeedKnots = this.FlightSimulator._api_true_speed_knots()
            ptrApiMach = this.FlightSimulator._api_mach()
            ptrApiVstallSpeedKnots =
              this.FlightSimulator._api_vstall_speed_knots()
            ptrApiAtmosphereTemperature =
              this.FlightSimulator._api_atmosphere_temperature()
            ptrApiAtmosphereDensity =
              this.FlightSimulator._api_atmosphere_density()
            PtrApiTotalDrag = this.FlightSimulator._api_total_drag()
            ptrApiCl = this.FlightSimulator._api_cl()
            ptrApiCdi = this.FlightSimulator._api_cdi()
          }

          this.api_fps = HEAP32[ptrApiFps >> 2]
          this.api_ups = HEAP32[ptrApiUps >> 2]
          this.api_simulation_speed = HEAPF32[ptrApiSimulationSpeed >> 2]
          this.api_weight = HEAPF32[ptrApiWeight >> 2]
          this.api_altitude = HEAPF32[ptrApiAltitude >> 2]
          this.api_vertical_speed = HEAPF32[ptrApiVerticalSpeed >> 2]
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
          this.api_bank_hold = HEAP8[ptrApiBankHold]
          this.api_level_hold = HEAP8[ptrApiLevelHold]
          this.api_speed_hold = HEAP8[ptrApiSpeedHold]
          this.api_altitude_hold = HEAP8[ptrApiAltitudeHold]
          this.api_vertical_speed_hold = HEAP8[ptrApiVerticalSpeedHold]
          this.api_target_heading_deg = HEAPF32[ptrApiTargetHeadingDeg >> 2]
          this.api_target_bank_deg = HEAPF32[ptrApiTargetBankDeg >> 2]
          this.api_target_altitude = HEAPF32[ptrApiTargetAltitude >> 2]
          this.api_target_vertical_speed =
            HEAPF32[ptrApiTargetVerticalSpeed >> 2]

          this.api_target_speed = HEAPF32[ptrApiTargetSpeed >> 2]
          this.api_atmosphere_sea_level_temperature =
            HEAPF32[ptrApiAtmosphereSeaLevelTemperature >> 2] | 0
          this.api_atmosphere_sea_level_density =
            HEAPF32[ptrApiAtmosphereSeaLevelDensity >> 2]

          this.api_thrust_to_weight = HEAPF32[ptrApiThrustToWeight >> 2]
          this.api_cl0 = HEAPF32[ptrApiCl0 >> 2]
          this.api_cdo = HEAPF32[ptrApiCdo >> 2]
          this.api_wing_area = HEAPF32[ptrApiWingArea >> 2]
          this.api_true_speed_knots = HEAPF32[ptrApiTrueSpeedKnots >> 2]
          this.api_mach = HEAPF32[ptrApiMach >> 2]
          this.api_vstall_speed_knots = HEAPF32[ptrApiVstallSpeedKnots >> 2]
          this.api_atmosphere_temperature =
            HEAPF32[ptrApiAtmosphereTemperature >> 2]
          this.api_atmosphere_density = HEAPF32[ptrApiAtmosphereDensity >> 2]
          this.api_total_drag = HEAPF32[PtrApiTotalDrag >> 2]
          this.api_cl = HEAPF32[ptrApiCl >> 2]
          this.api_cdi = HEAPF32[ptrApiCdi >> 2]

          // Execute every milliseconds
          setTimeout(updateSimData, 200)
        }

        updateSimData()

        // This is a workaround for emscripten default event handling.
        // It interferes with interacting with other UI elements
        function isTextInput(ele) {
          if (!['INPUT', 'TEXTAREA'].includes(ele.tagName)) {
            return false
          }

          return [
            'textarea',
            'text',
            'password',
            'number',
            'email',
            'tel',
            'url',
            'search',
            'date',
            'datetime',
            'datetime-local',
            'time',
            'month',
            'week',
          ].includes(ele.type)
        }

        const GLFW = this.FlightSimulator.GLFW
        const canvas = this.FlightSimulator.canvas
        window.removeEventListener('keydown', GLFW.onKeydown, true)
        window.removeEventListener('keypress', GLFW.onKeyPress, true)
        window.removeEventListener('keyup', GLFW.onKeyup, true)
        window.removeEventListener('blur', GLFW.onBlur, true)

        canvas.addEventListener('keydown', GLFW.onKeydown, true)
        canvas.addEventListener('keypress', GLFW.onKeyPress, true)
        canvas.addEventListener('keyup', GLFW.onKeyup, true)
        window.addEventListener(
          'blur',
          (event) => {
            setTimeout(() => {
              // When defocuses (blur), revert back to canvas to enable keyboard controls
              if (isTextInput(document.activeElement)) return
              canvas.focus()
            }, 100)
          },
          true
        )

        // Main function
        const main = this.FlightSimulator._main
        main()
      })

      // FIXME: Pauses when fullscreen is set in Safari
      // Pause the simulation when tab loses focus
      document.addEventListener('visibilitychange', () => {
        if (!this.api_simulation_pause) {
          // this.api_setSimulationPause(!document.hidden)
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
  height: 100%;
}
div.emscripten {
  text-align: center;
}
div.emscripten_border {
  padding: 0px;
  /* max-height: 488px; */
  /* overflow: scroll; */
}
/* the canvas *must not* have any border or padding, or mouse coords will be wrong */
canvas.emscripten {
  background-color: black;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
.input-group {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  width: 100%;
  overflow: inherit;
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

.vue-typer {
  font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
}

::v-deep .typed {
    color: #dcdcdc !important;
  }

.vue-typer .custom.char.selected {
  color: #e91e63;
}

.vue-typer .custom.caret {
  animation: rocking 1s ease-in-out 0s infinite;
}
.vue-typer .custom.caret.typing {
  background-color: #009688;
}
.vue-typer .custom.caret.selecting {
  display: inline-block;
  background-color: #e91e63;
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
