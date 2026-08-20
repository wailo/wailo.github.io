<template>
  <!-- <div  class="container max-w-full h-screen gap-2 p-5 bg-simBackground"> -->

  <div
    ref="fullscreenContainer"
    class="container relative max-w-full h-screen gap-1 p-1 bg-simBackground"
    :class="`layout-${layout}`"
    :style="layoutGridStyle"
  >
    <!-- Panel 1 -->
    <Panel
      panel-id="cockpit"
      :status="simulationStatus"
      :flash="FlightSimModule?.simulation.simulation_pause || FlightSimModule?.flightModel.damaged"
      :active="FlightSimModule?.simulation.simulation_pause || FlightSimModule?.flightModel.damaged"
      class="panel-cockpit"
      data-layout="focus instructor pilot classroom"
    >
      <template #Cockpit>
        <div class="relative w-full h-full overflow-hidden">
          <!-- Background map -->
          <OpenLayersMap
            v-if="sim_module_loaded && isVisuals"
            ref="openLayersMapRef"
            :lat="FlightSimModule.flightModel.latitude"
            :lon="FlightSimModule.flightModel.longitude"
            :alt-ft="FlightSimModule.flightModel.altitude_ft"
            :heading-deg="FlightSimModule.flightModel.yaw_deg"
            :pitch-deg="FlightSimModule.flightModel.pitch_deg"
            :bank-deg="FlightSimModule.flightModel.bank_deg"
            @set-map="simFunctions.setMap"
            class="absolute inset-0 w-full h-full z-0"
          />

          <!-- Cockpit overlay -->
          <div
            id="fullscreen-container"
            class="absolute inset-0 z-10 flex w-full h-full bg-transparent pointer-events-none"
          >
            <div
              id="canvas-container"
              :class="['h-full', openLayersMapRef?.showNavMap ? 'w-[65%]' : 'w-full']"
            >
              <canvas
                id="canvas"
                class="emscripten bg-transparent h-full w-full"
                @contextmenu.prevent
                tabindex="-1"
              ></canvas>
            </div>
          </div>

          <CockpitControls
            v-if="sim_module_loaded"
            :pfd-group="cockpitPfdGroup"
            :six-group="cockpitSixGroup"
            :utility-controls="cockpitUtilityControls"
          />
        </div>
      </template>
    </Panel>
    <!-- Panel 2 -->
    <Panel
      panel-id="realtime"
      :status="`${1000 / update_interval_ms} HZ`"
      class="panel-realtimedata gap-1"
      data-layout="focus instructor pilot"
    >
      <template #Real-Time-Data display="Real Time Data">
        <SimDataDisplay
          ref="dataDisplayRef"
          :simProps="{ ...simulationControlsProps, ...flightModelProps }"
          :plotPause="FlightSimModule.simulation.simulation_pause"
          :plotUpdateIntervals="update_interval_ms"
          v-if="sim_module_loaded"
        />
      </template>
      <template #Airflow>
        <Airflow
          v-if="sim_module_loaded"
          class="h-full w-full"
          :sim-props="{ ...simulationControlsProps, ...flightModelProps }"
          :lift-coefficient="FlightSimModule.flightModel.cl"
          :max-angle-of-attack="FlightSimModule.flightModel.max_aoa_deg"
          :stalling="FlightSimModule.flightModel.stalling"
        />
      </template>
    </Panel>
    <!-- Panel 3 -->
    <Panel
      panel-id="simulation"
      v-if="sim_module_loaded"
      :status="
        FlightSimModule.simulation.simulation_pause
          ? `PAUSED`
          : FlightSimModule.simulation.simulation_speed == 1
            ? `RUNNING`
            : `${FlightSimModule.simulation.simulation_speed}x`
      "
      :active="
        FlightSimModule.simulation.simulation_pause ||
        FlightSimModule.simulation.simulation_speed != 1
      "
      :flash="FlightSimModule.simulation.simulation_pause"
      class="panel-simulationcontrols"
      data-layout="focus"
    >
      <template #Simulation>
        <div v-if="sim_module_loaded" class="w-full h-full grid grid-cols-3 gap-1">
          <template
            v-for="input in Object.values(simulationControlsProps)
              .flatMap((arr) => arr)
              .filter((v: SimulationProperties) => v.group === 'simulation' && v.setterFunc)
              .sort((a: SimulationProperties) => (['boolean', 'void'].includes(a.type) ? -1 : 1))"
            :key="input.id"
          >
            <!-- Boolean & Void -->
            <wButton
              v-if="['boolean', 'void'].includes(input.type)"
              :buttonLabel="input.label"
              :buttonClick="() => input.setterFunc?.()"
              :button-state="input?.inputValue as boolean"
              class="border border-simElementBorder"
            />

            <!-- Everything else -->
            <ButtonSwitch
              v-if="['string', 'number'].includes(input.type)"
              :buttonLabel="input.label"
              :buttonClick="() => input.setterFunc?.()"
              :textInput="input?.inputValue"
              :inputChange="input.setterFunc"
              :button-state="input.type === 'boolean' && input?.inputValue == 1"
              :inputMin="input.min"
              :inputMax="input.max"
              :inputStep="input.step"
              class="border border-simElementBorder"
            />
            <select
              v-else-if="input.type === 'enum' && input.enumValues"
              class="border border-simElementBorder bg-simInputBackground text-secondary"
              :value="input.inputValue"
              @change="
                (e) => {
                  const value = (e.target as HTMLSelectElement).value
                  const selected = input.enumValues?.find((v) => String(v.enumValue) === value)
                  input.setterFunc?.(selected?.enumValue)
                }
              "
            >
              <option
                v-for="value in input.enumValues"
                :key="value.enumName"
                :value="String(value.enumValue)"
              >
                {{ value.enumName }}
              </option>
            </select>
          </template>
        </div>
      </template>
    </Panel>

    <!-- Panel 2 -->
    <Panel
      panel-id="learning-modules"
      class="panel-learningmodules"
      data-layout="instructor classroom"
      :status="scriptComponentStatus"
      :active="scriptComponentStatus != 'IDLE'"
    >
      <template #Learning-Modules>
        <Editor
          v-if="sim_module_loaded && dataDisplayRef && classroomComponentRef"
          :context-object="FlightSimModule"
          :simProps="flightModelProps"
          :is-dark-mode="isDarkMode"
          :aircraft-type="activeAircraftType"
          :utility-funcs="{
            plotView: dataDisplayRef.setPlotView,
            dataView: dataDisplayRef.setDataView,
            dataDisplayReset: dataDisplayRef.reset,
            notifyUser: simFunctions.notifyUser,
            setLayout: simFunctions.setLayout,
            checkPoint: classroomComponentRef.sendCheckPoint,
            setVisuals: simFunctions.setVisuals,
            setMap: simFunctions.setMap,
            setTab: simFunctions.setTab,
          }"
          @start="
            (_code: string) => {
              scriptComponentStatus = 'IN-PROGRESS'
            }
          "
          @reset="scriptComponentStatus = 'IDLE'"
          @completed="
            (title: string) =>
              classroomComponentRef?.reportExerciseResult('completed', title, title)
          "
          @error="
            (error: any, title?: string) => {
              simFunctions.notifyUser('Editor Error', error, 5000)
              scriptComponentStatus = 'ERROR'
              classroomComponentRef?.reportExerciseResult('error', String(error), title)
            }
          "
          class="w-full h-full"
          ref="editorComponentRef"
        />
      </template>
    </Panel>
    <!-- Panel 5 -->
    <Panel
      panel-id="autopilot"
      v-if="sim_module_loaded"
      :status="FlightSimModule.flightModel.autopilot_master_switch ? 'Engaged' : 'Disengaged'"
      :active="FlightSimModule.flightModel.autopilot_master_switch"
      class="panel-autopilot"
      data-layout="instructor pilot classroom"
    >
      <template #Autopilot>
        <div class="w-full h-full">
          <div class="col-span-1 grid grid-cols-4 gap-1">
            <button-switch
              v-if="sim_module_loaded"
              v-for="(input, i) in autopilotControls"
              :key="i"
              class="w-full"
              :buttonClick="(_e: MouseEvent) => input.stateCommand.setterFunc?.()"
              :buttonState="input.stateCommand?.inputValue as boolean"
              :buttonLabel="input.label.replace('Hold', '').replace('Angle', '').trim()"
              :textInput="input.targetCommand?.inputValue"
              :inputChange="input.targetCommand?.setterFunc"
              :inputMin="input.targetCommand?.min"
              :inputMax="input.targetCommand?.max"
              :inputStep="input.targetCommand?.step"
            ></button-switch>
          </div>
        </div>
      </template>
    </Panel>
    <!-- Panel 6 -->
    <Panel
      panel-id="flight-model"
      :status="FlightSimModule.flightModel.name"
      v-if="sim_module_loaded"
      class="panel-flightmodel"
      data-layout="instructor pilot"
    >
      <template #Flight-Model>
        <div class="w-full min-w-[24rem] self-start">
          <div
            class="sticky top-0 z-20 flex h-6 items-center border-b border-simElementBorder bg-panelHeaderBackground"
          >
            <span aria-hidden="true" class="px-1 text-secondary">/</span>
            <input
              v-model="flightModelFilter"
              type="search"
              placeholder="Filter controls"
              aria-label="Filter flight model controls"
              class="min-w-0 flex-1 bg-transparent px-1 text-secondary outline-none placeholder:text-secondary/60"
            />
            <button
              v-if="flightModelFilter"
              type="button"
              class="h-full border-l border-simElementBorder px-2 text-secondary hover:bg-simInputBackground"
              title="Clear filter"
              aria-label="Clear filter"
              @click="flightModelFilter = ''"
            >
              ×
            </button>
            <button
              type="button"
              class="h-full border-l border-simElementBorder px-2 text-secondary hover:bg-simInputBackground"
              title="Collapse all categories"
              aria-label="Collapse all categories"
              @click="collapseAllFlightModelGroups"
            >
              −
            </button>
            <button
              type="button"
              class="h-full border-l border-simElementBorder px-2 text-secondary hover:bg-simInputBackground"
              title="Expand all categories"
              aria-label="Expand all categories"
              @click="expandAllFlightModelGroups"
            >
              +
            </button>
          </div>

          <template
            v-if="sim_module_loaded"
            v-for="[groupName, simGroup] in filteredGroupedSimProps"
            :key="groupName"
          >
            <button
              type="button"
              class="sticky top-6 z-10 grid h-5 w-full grid-cols-[1rem_minmax(0,1fr)_3rem] items-center border-b border-simElementBorder bg-panelHeaderBackground px-1 text-left font-bold text-secondary"
              :aria-expanded="
                flightModelFilter !== '' || !collapsedFlightModelGroups.has(groupName)
              "
              @click="toggleFlightModelGroup(groupName)"
            >
              <span aria-hidden="true">{{
                flightModelFilter || !collapsedFlightModelGroups.has(groupName) ? '▼' : '▶'
              }}</span>
              <span class="truncate">{{ groupName.toUpperCase() }}</span>
              <span class="text-right font-normal">{{ simGroup.length }}</span>
            </button>

            <div
              v-for="sim_prop in flightModelFilter || !collapsedFlightModelGroups.has(groupName)
                ? simGroup
                : []"
              :key="sim_prop.id"
              class="grid min-h-6 grid-cols-[minmax(10rem,1fr)_minmax(9rem,12rem)] items-stretch py-px hover:bg-simInputBackground/40"
            >
              <span
                class="flex min-w-0 items-center gap-1 self-center overflow-hidden px-1"
                :title="sim_prop.label"
              >
                <span class="shrink truncate">
                  {{ sim_prop.label }}
                  <span v-if="sim_prop.unit" class="text-secondary">
                    ({{ sim_prop.unit.toLowerCase() === 'x' ? '×' : sim_prop.unit }})
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  class="min-w-3 flex-1 border-b border-dotted border-simElementBorder opacity-40"
                ></span>
              </span>
              <label
                v-if="sim_prop.type === 'number'"
                class="flightmodel-value flex min-w-0 items-stretch border border-simElementBorder bg-simInputBackground"
              >
                <wInput
                  type="number"
                  class="min-w-0 w-full !border-0 !bg-transparent"
                  :textInput="sim_prop.inputValue as number"
                  :inputChange="sim_prop.setterFunc"
                  :inputMin="sim_prop.min"
                  :inputMax="sim_prop.max"
                  :inputStep="sim_prop.step"
                />
              </label>
              <div v-else-if="sim_prop.type === 'boolean'" class="min-h-0">
                <wButton
                  class="h-full w-full"
                  :buttonLabel="sim_prop.inputValue ? 'On' : 'Off'"
                  :buttonClick="() => sim_prop.setterFunc?.()"
                  :buttonState="sim_prop.inputValue as boolean"
                />
              </div>
              <div v-else-if="sim_prop.type === 'void'" class="min-h-0">
                <wButton
                  class="h-full w-full"
                  buttonLabel="▶"
                  :buttonClick="() => sim_prop.setterFunc?.()"
                />
              </div>
              <!-- Enum Input -->
              <label
                v-else-if="sim_prop.type === 'enum' && sim_prop.enumValues"
                class="flightmodel-value flex min-w-0 items-stretch border border-simElementBorder bg-simInputBackground"
              >
                <select
                  class="h-full min-w-0 flex-1 bg-transparent px-1 text-secondary"
                  :value="sim_prop.inputValue"
                  @change="
                    (e) => {
                      const value = (e.target as HTMLSelectElement).value
                      const selected = sim_prop.enumValues?.find(
                        (v) => String(v.enumValue) === value,
                      )
                      sim_prop.setterFunc?.(selected?.enumValue)
                    }
                  "
                >
                  <option
                    v-for="value in sim_prop.enumValues"
                    :key="value.enumName"
                    :value="String(value.enumValue)"
                  >
                    {{ value.enumName }}
                  </option>
                </select>
              </label>
            </div>
          </template>

          <div
            v-if="flightModelFilter && filteredGroupedSimProps.length === 0"
            class="border-b border-simElementBorder p-3 text-center text-secondary"
          >
            No matching controls
          </div>
        </div>
      </template>

      <template #Joystick>
        <Joystick
          v-if="FlightSimModule"
          :external-inputs="computedJoystickInputs"
          :flap-options="computedJoystickOptions.flaps"
          :gear-options="computedJoystickOptions.gear"
          @input="
            (val) => {
              FlightSimModule.flightModel.set_aileron_position(val.aileron)
              FlightSimModule.flightModel.set_elevator_position(val.elevator)
              FlightSimModule.flightModel.set_rudder_position(val.rudder)
              FlightSimModule.flightModel.set_engine_throttle_position(val.throttle)
              if (val.mixture !== undefined) {
                ;(FlightSimModule.flightModel as c172).set_engine_mixture_position(val.mixture)
              }
              if (val.flaps !== FlightSimModule.flightModel.flaps_selector_position) {
                ;(FlightSimModule.flightModel as any).set_flaps_selector_position(val.flaps)
              }
              if (val.gear !== FlightSimModule.flightModel.landing_gear_selector_position) {
                ;(FlightSimModule.flightModel as any).set_landing_gear_selector_position(val.gear)
              }
              FlightSimModule.flightModel.set_aileron_trim_position(val.aileronTrim)
              FlightSimModule.flightModel.set_elevator_trim_position(val.elevatorTrim)
              FlightSimModule.flightModel.set_rudder_trim_position(val.rudderTrim)
            }
          "
          class="w-full h-full p-1"
        />
      </template>
    </Panel>
    <!-- Panel 7 -->
    <Panel
      panel-id="classroom"
      :status="classRoomComponentState ? 'Online' : 'Offline'"
      class="panel-classroom"
      data-layout="instructor pilot classroom"
      :active="classRoomComponentState"
    >
      <template #Classroom>
        <div class="flex flex-col h-full w-full">
          <Accounts
            v-if="sim_module_loaded"
            @onLogin="
              (url: string, authToken: string, name: string) => {
                accountName = name
                FlightSimModule.check_licence(url, authToken)
              }
            "
            @onLogout="
              () => {
                accountName = ''
                FlightSimModule.check_licence('', '')
              }
            "
            ref="accountsComponentRef"
          />
          <ClassRoom
            v-if="dataDisplayRef"
            class="min-h-0 flex-1"
            :account-name="accountName"
            @apiDataEvent="
              (receivedApiCall: PeerApiData) => manager.handleIncomingMessage(receivedApiCall?.api)
            "
            @apiScriptEvent="
              (receviedScript: PeerScriptData) =>
                editorComponentRef?.executeExternalCode(receviedScript.tite, receviedScript.script)
            "
            @wb-event="
              (receivedData: PeerWhiteBoardata) => {
                whiteBoardComponentRef?.UpdateState(receivedData.wb)
              }
            "
            @instructor-command="handleInstructorCommand"
            @announcement="handleClassroomAnnouncement"
            @exercise-start="
              (exercise: ClassroomExerciseAssignment) =>
                editorComponentRef?.executeExternalCode(exercise.name, exercise.source)
            "
            @exercise-stop="editorComponentRef?.reset()"
            ref="classroomComponentRef"
            @classroomConnection="
              (isOnline) => {
                classRoomComponentState = isOnline
              }
            "
          />
        </div>
      </template>
    </Panel>
    <!-- Panel 8 -->
    <Panel
      panel-id="prompt"
      class="panel-userprompt"
      data-layout="focus instructor pilot classroom"
    >
      <template #Prompt>
        <MarkDown ref="markdownRef" class="w-full h-full p-1" />
      </template>
      <template #whiteboard>
        <Whiteboard
          ref="whiteBoardComponentRef"
          v-if="sim_module_loaded"
          class="w-full h-full p-1"
          @history-updated="handleWhiteboardHistory"
        />
      </template>
    </Panel>

    <button
      v-for="divider in verticalDividers"
      :key="divider"
      data-layout="focus instructor pilot classroom"
      type="button"
      class="layout-divider layout-divider-vertical border-simElementBorder bg-panelHeaderBackground"
      :class="`layout-divider-${divider}`"
      :aria-label="`Resize layout column ${divider}`"
      title="Drag to resize columns · Double-click to reset layout"
      @pointerdown="startLayoutResize('column', divider, $event)"
      @dblclick="resetLayoutSizing"
    >
      <span class="bg-panelBorder"></span>
    </button>
    <button
      type="button"
      data-layout="focus instructor pilot classroom"
      class="layout-divider layout-divider-horizontal border-simElementBorder bg-panelHeaderBackground"
      aria-label="Resize layout rows"
      title="Drag to resize rows · Double-click to reset layout"
      @pointerdown="startLayoutResize('row', 0, $event)"
      @dblclick="resetLayoutSizing"
    >
      <span class="bg-panelBorder"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  watch,
  ComputedRef,
  computed,
  ref,
  onMounted,
  onUnmounted,
  onBeforeMount,
  nextTick,
} from 'vue'
import Panel from './Panel.vue'
import ButtonSwitch from './ButtonSwitch.vue'
import wButton from './wButton.vue'
import wInput from './wInput.vue'
import ClassRoom from './ClassRoom.vue'
import Accounts from './Accounts.vue'
import SimDataDisplay from './DataDisplay.vue'
import MarkDown from './MarkDown.vue'
import { RemoteCallManager, RemoteCall, RemoteEvent } from '../RemoteCallManager'
import Joystick, { JoystickInput } from './Joystick.vue'
import Whiteboard from './Whiteboard.vue'

import {
  initializeModule,
  fetchSimData,
  SimulationProperties,
  AutopilotProperties,
  getFlightModelParameters,
  getSimulationControlsParameters,
  getAutopilotProperties,
  ExtendedMainModule,
  LayoutTypes,
} from '../wasm/siminterface.ts'

import Editor, { ScriptStatus } from './Editor.vue'
import { c172, MainModule } from '../../src/wasm/generated/flightsimulator_exec'
import OpenLayersMap from './OpenLayersMap.vue'
import Airflow from './Airflow.vue'
import CockpitControls from './CockpitControls.vue'

const renderSignal = ref(0)

// Define a decorator function
function broadcast(call: RemoteCall | RemoteEvent) {
  if (classroomComponentRef.value) {
    classroomComponentRef.value.sendApiCall(JSON.stringify(call))
  }
}

const handleWhiteboardHistory = (obj: { serialized: string }) => {
  classroomComponentRef.value?.sendWhiteboardState(obj.serialized)
}

const handleInstructorCommand = (command: ClassroomCommand) => {
  if (!FlightSimModule) return
  switch (command) {
    case 'pause':
      FlightSimModule.simulation.set_simulation_pause(true)
      break
    case 'resume':
      FlightSimModule.simulation.set_simulation_pause(false)
      break
    case 'reset':
      FlightSimModule.simulation.reset_simulation()
      dataDisplayRef.value?.reset()
      break
    case 'layout-instructor':
      simFunctions.setLayout(LayoutTypes.INSTRUCTOR)
      break
    case 'layout-pilot':
      simFunctions.setLayout(LayoutTypes.PILOT)
      break
    case 'layout-focus':
      simFunctions.setLayout(LayoutTypes.FOCUS)
      break
    case 'clear-whiteboard':
      whiteBoardComponentRef.value?.clear()
      break
  }
}

const handleClassroomAnnouncement = (message: string) => {
  if (message) simFunctions.notifyUser('Instructor', message, 8000)
}

const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await fullscreenContainer.value?.requestFullscreen()
    window.dispatchEvent(new Event('resize'))
  } else {
    await document.exitFullscreen()
  }
}

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

const simulationStatus = computed(() => {
  renderSignal.value // depend on render signal to update when sim data is fetched
  if (!FlightSimModule) return 'Loading'
  if (FlightSimModule.simulation.simulation_pause) return 'Paused'
  if (FlightSimModule.flightModel.damaged) return 'Structural Damage'
  if (FlightSimModule.simulation.simulation_speed === 1) {
    return isLicenceValid.value ? 'Running' : 'Trial'
  }
  return `${FlightSimModule.simulation.simulation_speed}x`
})

// These functions will be mirrored to the clients
// They need to be inside an object to have a path.
const simFunctions = {
  notifyUser: async function (
    title: string,
    message?: string,
    time: number = 0,
    options?: { append?: boolean },
  ) {
    await markdownRef.value?.write(title, message, time, options)
  },

  // Logic to reset components, triggered with simulation module is reset
  resetComponents: function () {
    // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
    editorComponentRef.value?.reset()
    classroomComponentRef.value?.reset()
    dataDisplayRef.value?.reset()
    markdownRef.value?.reset()
    openLayersMapRef.value?.reset()
    this.setVisuals(false)
    this.setMap(false)
    this.setLayout(LayoutTypes.INSTRUCTOR)
  },
  setPlotView: function (item: SimulationProperties, state: boolean) {
    dataDisplayRef.value?.setPlotView(item, state)
  },
  setLayout: function (mode: typeof layout.value) {
    layout.value = mode

    // delay a resize event to allow components to adjust
    // This is needed resize event is not dispatched when component size change but the window size stay the same
    // So the openGL context will not resize.
    // The delay is to ensure the DOM has updated before the resize event is dispatched
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 20)
  },
  setVisuals: function (state: boolean) {
    isVisuals.value = state
  },
  setMap: async function (state: boolean) {
    if (state && !isVisuals.value) {
      this.setVisuals(true)
      await nextTick()
    }
    openLayersMapRef.value?.setMap(state)
  },
  setTab: function (panelId: string, tabName: string) {
    window.dispatchEvent(
      new CustomEvent('sim:set-panel-tab', { detail: { panelId, tabName } }),
    )
  },
}

let GLFWModule: MainModule
let FlightSimModule: ExtendedMainModule
const activeAircraftType = computed(() => {
  renderSignal.value
  if (!FlightSimModule) return 'UNKNOWN'

  const activeModel = FlightSimModule.simulation.flight_model
  const modelName = Object.entries(FlightSimModule.GRAPHICSEFlightModel).find(
    ([, enumValue]) => enumValue === activeModel,
  )?.[0]

  return modelName || `UNKNOWN (${activeModel})`
})
// let utilsFuncs: any;
let sim_module_loaded = ref(false)
let isLicenceValid = ref(false)
let classRoomComponentState = ref(false)
let accountName = ref('')
let scriptComponentStatus = ref<ScriptStatus>('IDLE')
const update_interval_ms = 200
const isFullscreen = ref(false)
const fullscreenContainer = ref<HTMLElement | null>(null)
const isDarkMode = ref(true)
const isVisuals = ref(false)
const layout = ref<LayoutTypes>(LayoutTypes.INSTRUCTOR)

type LayoutSizing = { columns: [number, number, number]; row: number }
const defaultLayoutSizing: Record<LayoutTypes, LayoutSizing> = {
  [LayoutTypes.INSTRUCTOR]: { columns: [50, 25, 25], row: 62.5 },
  [LayoutTypes.PILOT]: { columns: [50, 25, 25], row: 87.5 },
  [LayoutTypes.FOCUS]: { columns: [25, 50, 25], row: 87.5 },
  [LayoutTypes.CLASSROOM]: { columns: [50, 25, 25], row: 62.5 },
}
const layoutSizing = ref<LayoutSizing>({ ...defaultLayoutSizing[layout.value] })
const verticalDividers = [0, 1] as const

const layoutGridStyle = computed(() => ({
  '--layout-column-1': `${layoutSizing.value.columns[0]}fr`,
  '--layout-column-2': `${layoutSizing.value.columns[1]}fr`,
  '--layout-column-3': `${layoutSizing.value.columns[2]}fr`,
  '--layout-divider-1': `${layoutSizing.value.columns[0]}%`,
  '--layout-divider-2': `${layoutSizing.value.columns[0] + layoutSizing.value.columns[1]}%`,
  '--layout-row-top': `${layoutSizing.value.row}%`,
  '--layout-row-top-track': `${layoutSizing.value.row / 5}fr`,
  '--layout-row-top-track-seven': `${layoutSizing.value.row / 7}fr`,
  '--layout-row-bottom-track': `${(100 - layoutSizing.value.row) / 3}fr`,
  '--layout-row-bottom': `${100 - layoutSizing.value.row}fr`,
}))

const layoutSizingStorageKey = (mode: LayoutTypes) => `sim-layout-sizing-${mode}`

const loadLayoutSizing = (mode: LayoutTypes) => {
  const fallback = defaultLayoutSizing[mode]
  try {
    const saved = JSON.parse(localStorage.getItem(layoutSizingStorageKey(mode)) || '')
    if (
      Array.isArray(saved?.columns) &&
      saved.columns.length === 3 &&
      saved.columns.every((value: unknown) => typeof value === 'number') &&
      typeof saved.row === 'number'
    ) {
      layoutSizing.value = saved
      return
    }
  } catch {
    // Ignore missing or stale layout preferences.
  }
  layoutSizing.value = { columns: [...fallback.columns], row: fallback.row }
}

const saveLayoutSizing = () => {
  localStorage.setItem(layoutSizingStorageKey(layout.value), JSON.stringify(layoutSizing.value))
}

const resetLayoutSizing = () => {
  const fallback = defaultLayoutSizing[layout.value]
  layoutSizing.value = { columns: [...fallback.columns], row: fallback.row }
  saveLayoutSizing()
  window.dispatchEvent(new Event('resize'))
}

const startLayoutResize = (
  axis: 'column' | 'row',
  divider: (typeof verticalDividers)[number] | 0,
  event: PointerEvent,
) => {
  const container = fullscreenContainer.value
  if (!container) return
  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  const startX = event.clientX
  const startY = event.clientY
  const start = {
    columns: [...layoutSizing.value.columns] as [number, number, number],
    row: layoutSizing.value.row,
  }
  const minimumColumnPercent = Math.min(20, (180 / container.clientWidth) * 100)
  const minimumRowPercent = Math.min(25, (140 / container.clientHeight) * 100)

  const onPointerMove = (moveEvent: PointerEvent) => {
    if (axis === 'column') {
      const delta = ((moveEvent.clientX - startX) / container.clientWidth) * 100
      const leftIndex = divider
      const rightIndex = divider + 1
      const combined = start.columns[leftIndex] + start.columns[rightIndex]
      const left = Math.max(
        minimumColumnPercent,
        Math.min(combined - minimumColumnPercent, start.columns[leftIndex] + delta),
      )
      const columns = [...start.columns] as [number, number, number]
      columns[leftIndex] = left
      columns[rightIndex] = combined - left
      layoutSizing.value = { ...layoutSizing.value, columns }
    } else {
      const delta = ((moveEvent.clientY - startY) / container.clientHeight) * 100
      layoutSizing.value = {
        ...layoutSizing.value,
        row: Math.max(minimumRowPercent, Math.min(100 - minimumRowPercent, start.row + delta)),
      }
    }
    window.dispatchEvent(new Event('resize'))
  }
  const onPointerUp = () => {
    target.removeEventListener('pointermove', onPointerMove)
    target.removeEventListener('pointerup', onPointerUp)
    target.removeEventListener('pointercancel', onPointerUp)
    saveLayoutSizing()
  }
  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', onPointerUp)
}

watch(layout, (mode) => loadLayoutSizing(mode))

// Initialize theme from localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  isDarkMode.value = savedTheme === 'dark'
  applyTheme(isDarkMode.value)
}

const applyTheme = (dark: boolean) => {
  if (!dark) {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light')

  // notify anything that cares (charts, canvas, etc.)
  window.dispatchEvent(new Event('theme-change'))
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  applyTheme(isDarkMode.value)
}

// Components refs
const classroomComponentRef = ref<InstanceType<typeof ClassRoom> | null>(null) // Use the ClassRoom component type
const editorComponentRef = ref<InstanceType<typeof Editor> | null>(null) // Use the Editor component type
const dataDisplayRef = ref<InstanceType<typeof SimDataDisplay> | null>(null) // Use the SimDataDisplay component type
const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null) // Use the MarkDown component type
// const accountsComponentRef = ref<InstanceType<typeof Accounts> | null>(null); // Use the Accounts component type
const openLayersMapRef = ref<InstanceType<typeof OpenLayersMap> | null>(null) // Use the OpenLayersMap component type
const whiteBoardComponentRef = ref<InstanceType<typeof Whiteboard> | null>(null)

const cockpitPfdGroup = computed(() => {
  renderSignal.value
  const model = FlightSimModule.simulation
  return {
    master: {
      id: 'pfd',
      label: 'PFD',
      value: model.pfd_display,
      setValue: (state: boolean) => model.set_pfd_display(state),
    },
    children: [
      {
        id: 'pfd-alt',
        label: 'ALT',
        value: model.pfd_altimeter_visible,
        setValue: (state: boolean) => model.set_pfd_altimeter_visible(state),
      },
      {
        id: 'pfd-speed',
        label: 'SPD',
        value: model.pfd_speed_indicator_visible,
        setValue: (state: boolean) => model.set_pfd_speed_indicator_visible(state),
      },
      {
        id: 'pfd-vsi',
        label: 'VSI',
        value: model.pfd_vertical_speed_indicator_visible,
        setValue: (state: boolean) => model.set_pfd_vertical_speed_indicator_visible(state),
      },
      {
        id: 'pfd-heading',
        label: 'HDG',
        value: model.pfd_heading_indicator_visible,
        setValue: (state: boolean) => model.set_pfd_heading_indicator_visible(state),
      },
      {
        id: 'pfd-attitude',
        label: 'ATT',
        value: model.pfd_attitude_indicator_visible,
        setValue: (state: boolean) => model.set_pfd_attitude_indicator_visible(state),
      },
      {
        id: 'pfd-turn',
        label: 'TURN',
        value: model.pfd_turn_coordinator_visible,
        setValue: (state: boolean) => model.set_pfd_turn_coordinator_visible(state),
      },
      {
        id: 'pfd-horizon',
        label: 'HORIZ',
        value: model.pfd_horizon_visible,
        setValue: (state: boolean) => model.set_pfd_horizon_visible(state),
      },
      {
        id: 'pfd-fma',
        label: 'FMA',
        value: model.pfd_flight_mode_annunciator_visible,
        setValue: (state: boolean) => model.set_pfd_flight_mode_annunciator_visible(state),
      },
    ],
  }
})

const cockpitSixGroup = computed(() => {
  renderSignal.value
  const model = FlightSimModule.simulation
  return {
    master: {
      id: 'six',
      label: 'SIX',
      value: model.six_instruments_display,
      setValue: (state: boolean) => model.set_six_instruments_display(state),
    },
    children: [
      {
        id: 'six-alt',
        label: 'ALT',
        value: model.analog_altimeter_visible,
        setValue: (state: boolean) => model.set_analog_altimeter_visible(state),
      },
      {
        id: 'six-speed',
        label: 'SPD',
        value: model.analog_speed_indicator_visible,
        setValue: (state: boolean) => model.set_analog_speed_indicator_visible(state),
      },
      {
        id: 'six-vsi',
        label: 'VSI',
        value: model.analog_vertical_speed_indicator_visible,
        setValue: (state: boolean) => model.set_analog_vertical_speed_indicator_visible(state),
      },
      {
        id: 'six-heading',
        label: 'HDG',
        value: model.analog_heading_indicator_visible,
        setValue: (state: boolean) => model.set_analog_heading_indicator_visible(state),
      },
      {
        id: 'six-attitude',
        label: 'ATT',
        value: model.analog_attitude_indicator_visible,
        setValue: (state: boolean) => model.set_analog_attitude_indicator_visible(state),
      },
      {
        id: 'six-turn',
        label: 'TURN',
        value: model.analog_turn_coordinator_visible,
        setValue: (state: boolean) => model.set_analog_turn_coordinator_visible(state),
      },
    ],
  }
})

const cockpitUtilityControls = computed(() => {
  renderSignal.value
  const model = FlightSimModule.simulation
  return [
    {
      id: 'visual',
      label: '3D WORLD',
      value: isVisuals.value,
      setValue: (state: boolean) => simFunctions.setVisuals(state),
    },
    {
      id: 'map',
      label: '2D MAP',
      value: Boolean(openLayersMapRef.value?.showNavMap),
      setValue: (state: boolean) => simFunctions.setMap(state),
    },
    {
      id: 'motion',
      label: 'MOTION',
      value: model.motion_cues,
      setValue: (state: boolean) => model.set_motion_cues(state),
    },
    {
      id: 'audio',
      label: 'AUDIO',
      value: model.audio,
      setValue: (state: boolean) => model.set_audio(state),
    },
  ]
})

// Layout controls as computed
const layoutControls: ComputedRef<Record<string, SimulationProperties>> = computed(() => ({
  toggle_fullscreen: {
    id: 'fullscreen',
    type: 'void' as const,
    label: 'Fullscreen',
    setterFunc: () => toggleFullscreen(),
    group: 'simulation',
  },

  layout: {
    id: 'layout',
    type: 'enum',
    label: 'Layout',
    inputValue: layout.value,
    group: 'simulation',
    enumValues: [
      { enumName: 'Instructor', enumValue: LayoutTypes.INSTRUCTOR },
      { enumName: 'Classroom', enumValue: LayoutTypes.CLASSROOM },
      { enumName: 'Pilot', enumValue: LayoutTypes.PILOT },
      { enumName: 'Focus', enumValue: LayoutTypes.FOCUS },
    ],
    setterFunc: (val: string) => simFunctions.setLayout(val as LayoutTypes),
  },
  toggle_theme: {
    id: 'toggle_theme',
    type: 'boolean',
    label: 'Dark Theme',
    setterFunc: () => toggleTheme(),
    inputValue: isDarkMode.value,
    group: 'simulation',
  },
  toggle_visuals: {
    id: 'toggle_visuals',
    type: 'boolean',
    label: 'Visuals',
    setterFunc: () => simFunctions.setVisuals(!isVisuals.value),
    inputValue: isVisuals.value,
    group: 'simulation',
  },
  toggle_map: {
    id: 'toggle_map',
    type: 'boolean',
    label: 'Map',
    setterFunc: () => simFunctions.setMap(!openLayersMapRef.value?.showNavMap),
    inputValue: Boolean(openLayersMapRef.value?.showNavMap),
    group: 'simulation',
  },
}))

let autopilotControls: ComputedRef<ReturnType<typeof getAutopilotProperties>>
let flightModelProps: ComputedRef<ReturnType<typeof getFlightModelParameters>>
let simulationControlsProps: ComputedRef<ReturnType<typeof getSimulationControlsParameters>>
let groupedSimProps: ComputedRef<Record<string, SimulationProperties[]>>
let filteredGroupedSimProps: ComputedRef<Array<[string, SimulationProperties[]]>>

const flightModelFilter = ref('')
const collapsedFlightModelGroups = ref(new Set<string>())
const flightModelGroupsStorageKey = 'sim-flight-model-collapsed-groups'

const saveCollapsedFlightModelGroups = () => {
  localStorage.setItem(
    flightModelGroupsStorageKey,
    JSON.stringify([...collapsedFlightModelGroups.value]),
  )
}

const toggleFlightModelGroup = (groupName: string) => {
  if (flightModelFilter.value) return
  const next = new Set(collapsedFlightModelGroups.value)
  if (next.has(groupName)) next.delete(groupName)
  else next.add(groupName)
  collapsedFlightModelGroups.value = next
  saveCollapsedFlightModelGroups()
}

const collapseAllFlightModelGroups = () => {
  collapsedFlightModelGroups.value = new Set(Object.keys(groupedSimProps.value))
  saveCollapsedFlightModelGroups()
}

const expandAllFlightModelGroups = () => {
  collapsedFlightModelGroups.value = new Set()
  saveCollapsedFlightModelGroups()
}

let computedJoystickInputs: ComputedRef<JoystickInput>
let computedJoystickOptions: ComputedRef<{
  flaps: Array<{ label: string; value: number }>
  gear: Array<{ label: string; value: number }>
}>

let simUpdateInterval: ReturnType<typeof setInterval>
let manager: RemoteCallManager

const handlePanelTabRequest = (event: Event) => {
  const detail = (event as CustomEvent<{ panelId: string; tabName: string }>).detail
  if (detail?.panelId && detail?.tabName) simFunctions.setTab(detail.panelId, detail.tabName)
}

// Lifecycle hooks
onBeforeMount(() => {
  initializeTheme()
  loadLayoutSizing(layout.value)
  try {
    const savedGroups = JSON.parse(localStorage.getItem(flightModelGroupsStorageKey) || '[]')
    if (Array.isArray(savedGroups)) {
      collapsedFlightModelGroups.value = new Set(
        savedGroups.filter((group): group is string => typeof group === 'string'),
      )
    }
  } catch {
    collapsedFlightModelGroups.value = new Set()
  }
})

onMounted(async () => {
  window.addEventListener('sim:request-panel-tab', handlePanelTabRequest)
  initializeModule({
    locateFile: (path: string, prefix: string) => {
      if (path.endsWith('.wasm') || path.endsWith('.data')) {
        // In Vite, files in /public are accessed via the root '/'
        // use import.meta.env.BASE_URL to handle subdirectories automatically
        const base = import.meta.env.BASE_URL // Usually '/'
        // Remove any leading slash from the path to avoid '//'
        const cleanPath = path.startsWith('/') ? path.substring(1) : path
        return base + cleanPath
      }
      return prefix + path
    },
    canvas: (() => {
      const canvas = document.getElementById('canvas')
      return canvas
    })(),
    // Functions to be called from C++
    notifyUser: simFunctions.notifyUser,
    resetComponents: simFunctions.resetComponents,
    onLicenceState: (LicenceState: boolean) => (isLicenceValid.value = LicenceState), // Update licence state
    syncFlightModel: () => fetchSimData(FlightSimModule, initFlightModelParams), // Sync flightmodel
  })
    .then((modules) => {
      GLFWModule = modules[0]
      FlightSimModule = modules[1]
      GLFWModule.GLFW.requestFullscreen = toggleFullscreen // Replace with custom implementation

      initFlightModelParams()

      // key presses are handled inside the canvas only
      window.removeEventListener('keydown', GLFWModule.GLFW.onKeydown, true)
      window.removeEventListener('keypress', GLFWModule.GLFW.onKeyPress, true)
      window.removeEventListener('keyup', GLFWModule.GLFW.onKeyup, true)
      window.removeEventListener('blur', GLFWModule.GLFW.onBlur, true)

      // Wrap keyboard handlers only after detaching Emscripten's original window listeners.
      // addEventListener/removeEventListener require the same function reference; wrapping first
      // leaves the original global handler active and causes Backspace/Tab to be prevented in inputs.
      manager = createRemoteManager(FlightSimModule)

      const canvas = document.getElementById('canvas')
      canvas?.focus()
      canvas?.addEventListener(
        'keydown',
        (e) => {
          GLFWModule.GLFW.onKeydown(e)
        },
        true,
      )
      canvas?.addEventListener('keyup', (e) => GLFWModule.GLFW.onKeyup(e), true)

      function isTextInput() {
        const activeElement = document.activeElement
        return (
          activeElement?.role === 'textbox' ||
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          activeElement?.tagName === 'SELECT' ||
          (activeElement as HTMLElement)?.isContentEditable
        )
      }

      window.addEventListener(
        'blur',
        (_event) => {
          // When defocuses (blur), revert back to canvas to enable keyboard controls
          setTimeout(() => {
            if (document.activeElement == canvas || isTextInput()) {
              return
            }
            canvas?.focus()
          }, 1000)
        },
        true,
      )

      document.addEventListener('fullscreenchange', onFullscreenChange)
      sim_module_loaded.value = true
      simFunctions.notifyUser(
        'Flight Sim',
        `SIM: ${FlightSimModule.FLIGHTMODEL_VERSION} ${FlightSimModule.FLIGHTMODEL_BUILD_TIMESTAMP}
      UI: ${import.meta.env.VITE_GIT_SHA}`,
        2000,
      )

      document.addEventListener('keydown', (e: KeyboardEvent) => {
        // When editing a text input, we don't want the global keybindings to trigger.
        if (isTextInput()) {
          return
        }

        // Ctrl + Shift + F to toggle fullscreen
        if (e.code === 'KeyL') {
          // cycle through layouts with L key
          const nextLayout = {
            [LayoutTypes.INSTRUCTOR]: LayoutTypes.PILOT,
            [LayoutTypes.PILOT]: LayoutTypes.FOCUS,
            [LayoutTypes.FOCUS]: LayoutTypes.CLASSROOM,
            [LayoutTypes.CLASSROOM]: LayoutTypes.INSTRUCTOR,
          }
          simFunctions.setLayout(nextLayout[layout.value])
        }
        if (e.code === 'KeyF' && e.ctrlKey && e.shiftKey) {
          toggleFullscreen()
        }
      })

      watch(simulationStatus, (newStatus) => {
        if (classroomComponentRef.value) {
          classroomComponentRef.value.sendStatus(newStatus)
        }
      })

      simUpdateInterval = setInterval(() => {
        renderSignal.value++
        fetchSimData(FlightSimModule, initFlightModelParams)
        dataDisplayRef.value?.tickPlot()

        openLayersMapRef.value?.updateMap(
          FlightSimModule.flightModel.latitude,
          FlightSimModule.flightModel.longitude,
          FlightSimModule.flightModel.altitude_ft,
          FlightSimModule.flightModel.pitch,
          FlightSimModule.flightModel.bank,
          FlightSimModule.flightModel.yaw,
        )
      }, update_interval_ms)
    })
    .catch(console.error)
})

onUnmounted(() => {
  clearInterval(simUpdateInterval)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('sim:request-panel-tab', handlePanelTabRequest)
})

function initFlightModelParams() {
  flightModelProps = computed(() => {
    renderSignal.value
    return getFlightModelParameters(FlightSimModule.flightModel)
  })
  autopilotControls = computed(() => {
    renderSignal.value
    return getAutopilotProperties(FlightSimModule.flightModel).sort(
      (a: AutopilotProperties, b: AutopilotProperties) =>
        (a.targetCommand === undefined ? 0 : 1) - (b.targetCommand === undefined ? 0 : 1),
    )
  })
  simulationControlsProps = computed(() => {
    renderSignal.value
    const base = getSimulationControlsParameters(FlightSimModule)
    return { ...base, ...layoutControls.value }
  })

  groupedSimProps = computed(() => {
    const all = { ...simulationControlsProps.value, ...flightModelProps.value }
    return Object.values(all)
      .filter((v: SimulationProperties) => v.setterFunc !== undefined)
      .reduce(
        (acc: Record<string, SimulationProperties[]>, item: SimulationProperties) => {
          // Group by group
          const parentKey = item.group
          if (!acc[parentKey]) {
            acc[parentKey] = []
          }
          // Push the item to the corresponding group
          acc[parentKey].push(item)
          return acc
        },
        {} as Record<string, SimulationProperties[]>,
      )
  })

  filteredGroupedSimProps = computed(() => {
    const query = flightModelFilter.value.trim().toLocaleLowerCase()
    return Object.entries(groupedSimProps.value)
      .map(([groupName, controls]) => {
        if (!query) return [groupName, controls] as [string, SimulationProperties[]]
        const matchingControls = controls.filter((control) =>
          [groupName, control.label, control.id, control.unit]
            .filter((value) => value != null)
            .some((value) => String(value).toLocaleLowerCase().includes(query)),
        )
        return [groupName, matchingControls] as [string, SimulationProperties[]]
      })
      .filter(([, controls]) => controls.length > 0)
  })

  computedJoystickInputs = computed(() => {
    renderSignal.value
    return {
      aileron: FlightSimModule.flightModel.aileron_position,
      elevator: FlightSimModule.flightModel.elevator_position,
      rudder: FlightSimModule.flightModel.rudder_position,
      throttle: FlightSimModule.flightModel.engine_throttle_position,
      mixture: (FlightSimModule.flightModel as c172).engine_mixture_position, // if the property does not exist, it will be undefined, and the joystick component will ignore it
      flaps: FlightSimModule.flightModel.flaps_selector_position,
      gear: FlightSimModule.flightModel.landing_gear_selector_position,
      aileronTrim: FlightSimModule.flightModel.aileron_trim_position,
      elevatorTrim: FlightSimModule.flightModel.elevator_trim_position,
      rudderTrim: FlightSimModule.flightModel.rudder_trim_position,
    } as JoystickInput
  })

  computedJoystickOptions = computed(() => {
    renderSignal.value
    const isB747 =
      FlightSimModule.simulation.flight_model === FlightSimModule.GRAPHICSEFlightModel.B747
    return isB747
      ? {
          flaps: [0, 1, 5, 10, 20, 25, 30].map((value) => ({ label: String(value), value })),
          gear: [
            { label: 'DN', value: 0 },
            { label: 'UP', value: 1 },
            { label: 'OFF', value: 2 },
          ],
        }
      : {
          flaps: [0, 10, 20, 30].map((value) => ({ label: String(value), value })),
          gear: [{ label: 'FIXED', value: 0 }],
        }
  })

}

function createRemoteManager(FlightSimModule: ExtendedMainModule) {
  // todo, enable broadcast only if instructor
  // Rationale: student does not send data
  let remoteManager: RemoteCallManager
  remoteManager = new RemoteCallManager(broadcast, (path, result) => {
    const root = path[0]
    const method = path.at(-1)
    const isFlightModelSwitch =
      root === 'FlightSimModule.simulation' &&
      (method === 'set_flight_model_b747' || method === 'set_flight_model_c172')

    if (!isFlightModelSwitch || !result) return

    FlightSimModule.flightModel = result as ExtendedMainModule['flightModel']
    remoteManager.wrapObject('FlightSimModule.flightModel', FlightSimModule.flightModel, ['set'])
    initFlightModelParams()
  })
  remoteManager.wrapObject('simFunctions', simFunctions, [
    'notifyUser',
    'resetComponents',
    'setPlotView',
    'setLayout',
    'setVisuals',
    'setMap',
    'setTab',
  ])
  remoteManager.wrapObject('GLFW', GLFWModule.GLFW, ['onKeydown', 'onKeyup'])
  remoteManager.wrapObject('FlightSimModule.simulation', FlightSimModule.simulation, [
    'set',
    'reset',
  ])
  remoteManager.wrapObject('FlightSimModule.flightModel', FlightSimModule.flightModel, ['set'])

  if (dataDisplayRef && dataDisplayRef.value) {
    remoteManager.wrapObject('dataDisplayRef.value', dataDisplayRef.value, [
      'setDataView',
      'setPlotView',
      'reset',
      'showAll',
      'hideAll',
    ])
  }
  if (editorComponentRef) {
    remoteManager.wrapObject('editorComponentRef', editorComponentRef, ['reset'])
  }
  return remoteManager

  // Dont mirror checkPoint, it defies its purpose. checkpoint is meant to be used as indicator when a simulaton
  // manager.wrapObject("classroomComponentRef", classroomComponentRef, ["sendCheckPoint"])
}
</script>

<style scoped>
/* Hide panels not participating in the active layout */
.container.layout-focus > *:not([data-layout~='focus']) {
  display: none;
}

.container.layout-instructor > *:not([data-layout~='instructor']) {
  display: none;
}

.container.layout-pilot > *:not([data-layout~='pilot']) {
  display: none;
}

.container.layout-classroom > *:not([data-layout~='classroom']) {
  display: none;
}

/* ===== Instructor LAYOUT ===== */
.container.layout-instructor {
  display: grid;
  grid-template-columns: var(--layout-column-1) var(--layout-column-2) var(--layout-column-3);
  grid-template-rows: repeat(5, minmax(0, var(--layout-row-top-track))) repeat(
      3,
      minmax(0, var(--layout-row-bottom-track))
    );
  grid-template-areas:
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'autopilot userprompt realtimedata'
    'learningmodules classroom flightmodel'
    'learningmodules classroom flightmodel'
    'learningmodules classroom flightmodel';
}

/* ===== Pilot LAYOUT ===== */
.container.layout-pilot {
  display: grid;
  grid-template-columns: var(--layout-column-1) var(--layout-column-2) var(--layout-column-3);
  grid-template-rows: repeat(7, minmax(0, var(--layout-row-top-track-seven))) minmax(
      0,
      var(--layout-row-bottom)
    );
  grid-template-areas:
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'cockpit userprompt realtimedata'
    'cockpit userprompt flightmodel'
    'cockpit userprompt flightmodel'
    'cockpit userprompt flightmodel'
    'autopilot classroom flightmodel';
}

/* ===== Focus LAYOUT ===== */
.container.layout-focus {
  display: grid;
  grid-template-columns: var(--layout-column-1) var(--layout-column-2) var(--layout-column-3);
  grid-template-rows: repeat(7, minmax(0, var(--layout-row-top-track-seven))) minmax(
      0,
      var(--layout-row-bottom)
    );
  grid-template-areas:
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata cockpit userprompt'
    'realtimedata simulationcontrols userprompt';
}

/* ===== Classroom LAYOUT ===== */
.container.layout-classroom {
  display: grid;
  grid-template-columns: var(--layout-column-1) var(--layout-column-2) var(--layout-column-3);
  grid-template-rows: repeat(5, minmax(0, var(--layout-row-top-track))) repeat(
      3,
      minmax(0, var(--layout-row-bottom-track))
    );
  grid-template-areas:
    'cockpit userprompt classroom'
    'cockpit userprompt classroom'
    'cockpit userprompt classroom'
    'cockpit userprompt classroom'
    'autopilot userprompt classroom'
    'learningmodules userprompt classroom'
    'learningmodules userprompt classroom'
    'learningmodules userprompt classroom';
}

/* Panel bindings */
.panel-cockpit {
  grid-area: cockpit;
}

.panel-realtimedata {
  grid-area: realtimedata;
}

.panel-simulationcontrols {
  grid-area: simulationcontrols;
}

.panel-learningmodules {
  grid-area: learningmodules;
}

.panel-autopilot {
  grid-area: autopilot;
}

.panel-flightmodel {
  grid-area: flightmodel;
}

.panel-classroom {
  grid-area: classroom;
}

.panel-userprompt {
  grid-area: userprompt;
}

.layout-divider {
  position: absolute;
  z-index: 40;
  margin: 0;
  padding: 0;
  touch-action: none;
  opacity: 0.45;
}

.layout-divider:hover,
.layout-divider:focus-visible {
  opacity: 1;
}

.layout-divider-vertical {
  top: 0.25rem;
  bottom: 0.25rem;
  width: 0.5rem;
  transform: translateX(-50%);
  cursor: col-resize;
  border-left-width: 1px;
  border-right-width: 1px;
}

.layout-divider-vertical span {
  display: block;
  width: 1px;
  height: 2rem;
  margin: calc(50vh - 1rem) auto 0;
}

.layout-divider-0 {
  left: var(--layout-divider-1);
}

.layout-divider-1 {
  left: var(--layout-divider-2);
}

.layout-divider-horizontal {
  left: 0.25rem;
  right: 0.25rem;
  top: var(--layout-row-top);
  height: 0.5rem;
  transform: translateY(-50%);
  cursor: row-resize;
  border-top-width: 1px;
  border-bottom-width: 1px;
}

.layout-divider-horizontal span {
  display: block;
  width: 2rem;
  height: 1px;
  margin: 0.2rem auto 0;
}

/* Canvas fit */
#canvas {
  object-fit: contain;
}
</style>
