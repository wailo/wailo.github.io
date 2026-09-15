<template>
  <div
    ref="fullscreenContainer"
    class="container relative max-w-full h-screen gap-1 p-1 bg-simBackground"
    :class="`layout-${layout}`"
  >
    <div
      v-if="!sim_module_loaded"
      class="sim-loading-overlay absolute inset-0 z-50 flex items-center justify-center bg-primary text-secondary"
      role="status"
      aria-live="polite"
      :aria-label="loadingStatus"
    >
      <div class="flex min-w-52 flex-col items-center gap-4 px-6 text-center">
        <div class="sim-loading-matrix" aria-hidden="true">
          <span v-for="dot in 25" :key="dot" class="sim-loading-dot"></span>
        </div>

        <div class="space-y-1">
          <div class="text-xs font-medium tracking-widest">Loading</div>
          <div class="min-h-4 text-[10px] text-secondary/60">{{ loadingStatus }}</div>
        </div>

        <div class="h-px w-52 overflow-hidden bg-secondary/20">
          <div
            class="h-full bg-secondary transition-[width] duration-150"
            :class="loadingProgress === null ? 'sim-loading-indeterminate' : ''"
            :style="loadingProgress === null ? undefined : { width: `${loadingProgress}%` }"
          ></div>
        </div>

        <div v-if="loadingProgress !== null" class="text-[10px] tabular-nums text-secondary/50">
          {{ loadingProgress }}%
          <template v-if="loadingDownloadedBytes !== null && loadingTotalBytes !== null">
            · {{ formatMegabytes(loadingDownloadedBytes) }} /
            {{ formatMegabytes(loadingTotalBytes) }} MB
          </template>
        </div>
      </div>
    </div>

    <ResizableSimLayout
      ref="resizableLayoutRef"
      :layout="layout"
      :maximized-panel="maximizedPanelId"
    >
      <template #cockpit>
        <!-- Panel 1 -->
        <Panel
          panel-id="cockpit"
          @click="focusCockpitCanvas"
          @header-dblclick="togglePanelMaximize"
          :status="simulationStatus"
          :flash="
            FlightSimModule?.simulation.simulation_pause || FlightSimModule?.flightModel.damaged
          "
          :active="
            FlightSimModule?.simulation.simulation_pause || FlightSimModule?.flightModel.damaged
          "
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
                  ref="canvasContainerRef"
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
                :theme-control="cockpitThemeControl"
                :fullscreen-control="cockpitFullscreenControl"
                :layout-controls="cockpitLayoutControls"
              />
            </div>
          </template>
        </Panel>
      </template>
      <template #realtime>
        <!-- Panel 2 -->
        <Panel
          panel-id="realtime"
          @header-dblclick="togglePanelMaximize"
          :status="`${1000 / update_interval_ms} HZ`"
          class="gap-1"
        >
          <template #Real-Time-Data display="Real Time Data">
            <SimDataDisplay
              ref="dataDisplayRef"
              :simProps="allSimProps"
              :plotPause="FlightSimModule.simulation.simulation_pause"
              :plotUpdateIntervals="update_interval_ms"
              v-if="sim_module_loaded"
              @set-data-view="simFunctions.setDataView"
              @set-plot-view="simFunctions.setPlotView"
              @replace-plot="simFunctions.replacePlot"
              @remove-plot="simFunctions.removePlot"
            />
          </template>
          <template #Airflow>
            <Airflow
              v-if="sim_module_loaded"
              class="h-full w-full"
              :sim-props="allSimProps"
              :lift-coefficient="airflowState.liftCoefficient"
              :max-angle-of-attack="airflowState.maxAngleOfAttack"
              :stalling="airflowState.stalling"
            />
          </template>
        </Panel>
      </template>
      <template #simulation>
        <!-- Panel 3 -->
        <Panel
          panel-id="simulation"
          @header-dblclick="togglePanelMaximize"
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
        >
          <template #Simulation>
            <div v-if="sim_module_loaded" class="w-full h-full grid grid-cols-3 gap-1">
              <template v-for="input in simulationPanelControls" :key="input.id">
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
      </template>
      <template #learningmodules>
        <!-- Panel 2 -->
        <Panel
          panel-id="learning-modules"
          @header-dblclick="togglePanelMaximize"
          :status="scriptComponentStatus"
          :active="scriptComponentStatus != 'IDLE'"
        >
          <template #Learning-Modules>
            <Editor
              v-if="sim_module_loaded && dataDisplayRef"
              :context-object="FlightSimModule"
              :simProps="flightModelProps"
              :is-dark-mode="isDarkMode"
              :aircraft-type="activeAircraftType"
              :utility-funcs="{
                plotView: simFunctions.setPlotView,
                dataView: simFunctions.setDataView,
                dataDisplayReset: dataDisplayRef.reset,
                notifyUser: simFunctions.notifyUser,
                waitForUser: simFunctions.waitForUser,
                askQuestion: simFunctions.askQuestion,
                cancelPromptInteractions: simFunctions.cancelPromptInteractions,
                setLayout: simFunctions.setLayout,
                checkPoint: (content: string, data?: CheckpointData) =>
                  classroomComponentRef?.sendCheckPoint(content, data),
                requestAI: requestLessonAI,
                setVisuals: simFunctions.setVisuals,
                setMap: simFunctions.setMap,
                setTheme: simFunctions.setTheme,
                setTab: simFunctions.setTab,
                resetPanels: simFunctions.resetPanels,
              }"
              @start="
                (_code: string) => {
                  scriptComponentStatus = 'IN-PROGRESS'
                }
              "
              @reset="scriptComponentStatus = 'IDLE'"
              @error="
                (error: any) => {
                  simFunctions.notifyUser('Editor Error', error, 5000)
                  scriptComponentStatus = 'ERROR'
                }
              "
              class="w-full h-full"
              ref="editorComponentRef"
            />
          </template>
        </Panel>
      </template>
      <template #autopilot>
        <!-- Panel 5 -->
        <Panel
          panel-id="autopilot"
          @header-dblclick="togglePanelMaximize"
          v-if="sim_module_loaded"
          :status="FlightSimModule.flightModel.autopilot_master_switch ? 'Engaged' : 'Disengaged'"
          :active="FlightSimModule.flightModel.autopilot_master_switch"
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
      </template>
      <template #flightmodel>
        <!-- Panel 6 -->
        <Panel
          panel-id="flight-model"
          @header-dblclick="togglePanelMaximize"
          :status="activeAircraftType"
          v-if="sim_module_loaded"
        >
          <template #Flight-Model>
            <div class="w-full min-w-0 self-start">
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
                  class="grid min-h-6 min-w-0 grid-cols-[minmax(6rem,1fr)_minmax(4.5rem,40%)] items-stretch py-px hover:bg-simInputBackground/40"
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
                  <div v-else-if="sim_prop.type === 'boolean'" class="min-h-0 min-w-0">
                    <wButton
                      class="h-full w-full min-w-0 overflow-hidden text-ellipsis"
                      :buttonLabel="sim_prop.inputValue ? 'On' : 'Off'"
                      :buttonClick="() => sim_prop.setterFunc?.()"
                      :buttonState="sim_prop.inputValue as boolean"
                    />
                  </div>
                  <div v-else-if="sim_prop.type === 'void'" class="min-h-0 min-w-0">
                    <wButton
                      class="h-full w-full min-w-0 overflow-hidden text-ellipsis"
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
              @input="(changes) => applyJoystickChanges(FlightSimModule.flightModel, changes)"
              class="w-full h-full p-1"
            />
          </template>
        </Panel>
      </template>
      <template #classroom>
        <!-- Panel 7 -->
        <Panel
          panel-id="classroom"
          @header-dblclick="togglePanelMaximize"
          :status="classRoomComponentState ? classRoomId || 'Online' : 'Offline'"
          :active="classRoomComponentState"
          :flash="classroomHandAttention"
        >
          <template #Classroom>
            <div class="flex flex-col h-full w-full">
              <Accounts
                v-if="sim_module_loaded"
                @onLogin="
                  (url: string, authToken: string, name: string) => {
                    isAccountAuthenticated = true
                    accountName = name
                    FlightSimModule.check_licence(url, authToken)
                  }
                "
                @onLogout="
                  () => {
                    isAccountAuthenticated = false
                    accountName = ''
                    classRoomComponentState = false
                    FlightSimModule.check_licence('', '')
                  }
                "
                ref="accountsComponentRef"
              />
              <ClassRoom
                v-if="dataDisplayRef && isAccountAuthenticated"
                class="min-h-0 flex-1"
                :account-name="accountName"
                @apiDataEvent="
                  (receivedApiCall: PeerApiData) =>
                    manager.handleIncomingMessage(receivedApiCall?.api)
                "
                @apiScriptEvent="
                  (receviedScript: PeerScriptData) =>
                    editorComponentRef?.executeExternalCode(
                      receviedScript.tite,
                      receviedScript.script,
                    )
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
                    editorComponentRef?.executeExternalCode(
                      exercise.name,
                      exercise.source,
                      exercise.id,
                      exercise.lessonId,
                    )
                "
                @exercise-stop="editorComponentRef?.reset()"
                ref="classroomComponentRef"
                @classroomConnection="
                  (isOnline) => {
                    classRoomComponentState = isOnline
                  }
                "
                @classroomRoom="(roomId) => (classRoomId = roomId)"
                @hand-attention="(pending) => (classroomHandAttention = pending)"
              />
            </div>
          </template>
        </Panel>
      </template>
      <template #prompt>
        <!-- Panel 8 -->
        <Panel
          panel-id="prompt"
          @header-dblclick="togglePanelMaximize"
          :status="userActionPending ? 'ACTION' : 'READY'"
          :active="userActionPending"
          :flash="userActionPending"
        >
          <template #Prompt>
            <MarkDown
              ref="markdownRef"
              class="w-full h-full"
              @action-pending="userActionPending = $event"
            />
          </template>
          <template #whiteboard>
            <Whiteboard
              ref="whiteBoardComponentRef"
              v-if="sim_module_loaded"
              class="w-full h-full"
              @history-updated="handleWhiteboardHistory"
            />
          </template>
        </Panel>
      </template>
    </ResizableSimLayout>
  </div>
</template>

<script setup lang="ts">
import {
  watch,
  ComputedRef,
  computed,
  ref,
  shallowRef,
  onMounted,
  onUnmounted,
  onBeforeMount,
  nextTick,
} from 'vue'
import Panel from './Panel.vue'
import type { CheckpointData, LessonAIRequest, LessonAIResponse } from '../ScriptContext'
import ButtonSwitch from './ButtonSwitch.vue'
import wButton from './wButton.vue'
import wInput from './wInput.vue'
import ClassRoom from './ClassRoom.vue'
import Accounts from './Accounts.vue'
import SimDataDisplay from './DataDisplay.vue'
import MarkDown from './MarkDown.vue'
import { RemoteCallManager, RemoteCall, RemoteEvent } from '../RemoteCallManager'
import Joystick, { JoystickInput } from './Joystick.vue'
import { applyJoystickChanges } from '../JoystickControls'
import { trackSimulationValues } from '../SimulationValues'
import Whiteboard from './Whiteboard.vue'
import { pb } from '../Pocketbase/pocketbase'

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
import ResizableSimLayout from './ResizableSimLayout.vue'
import type {
  ActiveFlightModelSimProps,
  AskQuestionOptions,
  QuestionResult,
  WaitForUserOptions,
} from '../ScriptContext.ts'

const renderSignal = ref(0)
const canvasContainerRef = ref<HTMLElement | null>(null)
const focusCockpitCanvas = (event: MouseEvent) => {
  if (!(event.target instanceof Element)) return
  if (
    event.target.closest(
      'button, input, select, textarea, a, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"]',
    )
  ) {
    return
  }
  canvasContainerRef.value?.querySelector('canvas')?.focus({ preventScroll: true })
}
let canvasResizeObserver: ResizeObserver | null = null
let canvasResizeFrame: number | null = null
let observedCanvasWidth = 0
let observedCanvasHeight = 0

const observeCanvasContainer = () => {
  canvasResizeObserver?.disconnect()
  const container = canvasContainerRef.value
  if (!container) return

  canvasResizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width)
    const height = Math.round(entry.contentRect.height)
    if (!width || !height || (width === observedCanvasWidth && height === observedCanvasHeight))
      return

    observedCanvasWidth = width
    observedCanvasHeight = height
    if (canvasResizeFrame !== null) cancelAnimationFrame(canvasResizeFrame)
    canvasResizeFrame = requestAnimationFrame(() => {
      canvasResizeFrame = null
      // Emscripten owns the canvas drawing-buffer dimensions. Trigger its existing
      // browser-resize path after the containing panel has reached its new size.
      window.dispatchEvent(new Event('resize'))
    })
  })
  canvasResizeObserver.observe(container)
}

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
      whiteBoardComponentRef.value?.UpdateState('[]')
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
    return isLicenceValid.value ? 'Normal' : 'Trial'
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
    options?: { append?: boolean; replace?: boolean },
  ) {
    await markdownRef.value?.write(title, message, time, options)
  },
  waitForUser: async function (options: WaitForUserOptions) {
    await markdownRef.value?.waitForUser(options)
  },
  askQuestion: async function (options: AskQuestionOptions): Promise<QuestionResult> {
    if (!markdownRef.value) {
      return {
        questionId: options.id,
        type: options.type,
        answer: '',
        attempts: 0,
        elapsedMs: 0,
        cancelled: true,
      }
    }
    return markdownRef.value.askQuestion(options)
  },
  cancelPromptInteractions: function () {
    markdownRef.value?.cancelPromptInteractions()
  },

  // Logic to reset components, triggered with simulation module is reset
  resetComponents: function () {
    // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
    editorComponentRef.value?.reset()
    classroomComponentRef.value?.reset()
    simFunctions.resetPanels()
  },
  resetPanels: function () {
    dataDisplayRef.value?.reset()
    markdownRef.value?.reset()
    openLayersMapRef.value?.reset()
    isVisuals.value = false
    maximizedPanelId.value = null
    layout.value = LayoutTypes.INSTRUCTOR
    resizableLayoutRef.value?.reset(LayoutTypes.INSTRUCTOR)
    window.dispatchEvent(new Event('sim:reset-panel-tabs'))
  },
  setDataView: function (item: SimulationProperties, state: boolean) {
    dataDisplayRef.value?.setDataView(item, state)
  },
  setPlotView: function (item: SimulationProperties | SimulationProperties[], state: boolean) {
    dataDisplayRef.value?.setPlotView(item, state)
  },
  replacePlot: function (plotId: string, sourceIds: string[]) {
    dataDisplayRef.value?.replacePlot(plotId, sourceIds)
  },
  removePlot: function (plotId: string) {
    dataDisplayRef.value?.removePlot(plotId)
  },
  setLayout: function (mode: typeof layout.value) {
    maximizedPanelId.value = null
    layout.value = Object.values(LayoutTypes).includes(mode) ? mode : LayoutTypes.INSTRUCTOR

    // delay a resize event to allow components to adjust
    // This is needed resize event is not dispatched when component size change but the window size stay the same
    // So the openGL context will not resize.
    // The delay is to ensure the DOM has updated before the resize event is dispatched
    clearTimeout(layoutResizeTimer)
    layoutResizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 20)
  },
  setVisuals: function (state: boolean) {
    isVisuals.value = state
  },
  setTheme: function (dark: boolean) {
    isDarkMode.value = dark
    applyTheme(dark)
  },
  setMap: async function (state: boolean) {
    if (state && !isVisuals.value) {
      this.setVisuals(true)
      await nextTick()
    }
    openLayersMapRef.value?.setMap(state)
  },
  setTab: function (panelId: string, tabName: string) {
    window.dispatchEvent(new CustomEvent('sim:set-panel-tab', { detail: { panelId, tabName } }))
  },
}

let GLFWModule: MainModule
let FlightSimModule: ExtendedMainModule
const activeAircraftType = computed(() => {
  flightModelProps.value // Model metadata changes on switch/reset, not on each UI tick.
  if (!FlightSimModule) return 'UNKNOWN'

  const activeModel = FlightSimModule.simulation.flight_model
  const modelName = Object.entries(FlightSimModule.GRAPHICSEFlightModel).find(
    ([, enumValue]) => enumValue === activeModel,
  )?.[0]

  return modelName || `UNKNOWN (${activeModel})`
})
let sim_module_loaded = ref(false)
const loadingStatus = ref('Preparing download')
const loadingProgress = ref<number | null>(null)
const loadingDownloadedBytes = ref<number | null>(null)
const loadingTotalBytes = ref<number | null>(null)
let maximumRunDependencies = 0

const formatMegabytes = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024)
  return megabytes.toFixed(megabytes >= 10 ? 1 : 2)
}

const updateLoadingStatus = (status: string) => {
  const progressMatch = status.match(/\((\d+)\/(\d+)\)/)
  if (progressMatch) {
    const loaded = Number(progressMatch[1])
    const total = Number(progressMatch[2])
    loadingProgress.value = total > 0 ? Math.round((loaded / total) * 100) : null
    loadingDownloadedBytes.value = loaded
    loadingTotalBytes.value = total
    loadingStatus.value = 'Downloading assets'
    return
  }

  if (status.startsWith('Downloading data')) {
    loadingStatus.value = 'Downloading assets'
  } else if (status === 'Running...') {
    loadingStatus.value = 'Starting'
    loadingProgress.value = null
  } else if (status) {
    loadingStatus.value = status
  }
}

const monitorLoadingDependencies = (remaining: number) => {
  maximumRunDependencies = Math.max(maximumRunDependencies, remaining)
  if (remaining <= 0) {
    loadingStatus.value = 'Starting simulator'
    loadingProgress.value = null
    return
  }

  // Dependency counts describe runtime preparation, not downloaded bytes.
  if (loadingProgress.value === null && maximumRunDependencies > 0) {
    const prepared = maximumRunDependencies - remaining
    loadingStatus.value = `Preparing assets ${prepared}/${maximumRunDependencies}`
  }
}

let isLicenceValid = ref(false)
let classRoomComponentState = ref(false)
let classRoomId = ref('')
const classroomHandAttention = ref(false)
const isAccountAuthenticated = ref(pb.authStore.isValid)
let accountName = ref(String(pb.authStore.record?.name || ''))
let scriptComponentStatus = ref<ScriptStatus>('IDLE')
const update_interval_ms = 200
const isFullscreen = ref(false)
const fullscreenContainer = ref<HTMLElement | null>(null)
const resizableLayoutRef = ref<InstanceType<typeof ResizableSimLayout> | null>(null)
const isDarkMode = ref(true)
const isVisuals = ref(false)
const layout = ref<LayoutTypes>(LayoutTypes.INSTRUCTOR)
const maximizedPanelId = ref<string | null>(null)
const togglePanelMaximize = (panelId: string) => {
  maximizedPanelId.value = maximizedPanelId.value === panelId ? null : panelId
}

// Initialize theme from localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
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
const requestLessonAI = (
  request: LessonAIRequest,
  runId: string,
  signal: AbortSignal,
): Promise<LessonAIResponse> =>
  classroomComponentRef.value?.requestLessonAI(request, runId, signal) ??
  Promise.resolve({ status: 'unavailable', reason: 'Classroom unavailable.' })
const editorComponentRef = ref<InstanceType<typeof Editor> | null>(null) // Use the Editor component type
const dataDisplayRef = ref<InstanceType<typeof SimDataDisplay> | null>(null) // Use the SimDataDisplay component type
const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null) // Use the MarkDown component type
const userActionPending = ref(false)
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

const cockpitThemeControl = computed(() => ({
  id: 'dark-theme',
  label: 'DARK THEME',
  value: isDarkMode.value,
  setValue: (state: boolean) => {
    isDarkMode.value = state
    applyTheme(state)
  },
}))

const cockpitFullscreenControl = computed(() => ({
  id: 'fullscreen',
  label: 'FULLSCREEN',
  value: isFullscreen.value,
  setValue: () => void toggleFullscreen(),
}))

const cockpitLayoutControls = computed(() =>
  [
    { id: LayoutTypes.INSTRUCTOR, label: 'INSTR' },
    { id: LayoutTypes.PILOT, label: 'PILOT' },
    { id: LayoutTypes.FOCUS, label: 'FOCUS' },
  ].map(({ id, label }) => ({
    id,
    label,
    value: layout.value === id,
    setValue: () => simFunctions.setLayout(id),
  })),
)

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
    get inputValue() {
      return layout.value
    },
    group: 'simulation',
    enumValues: [
      { enumName: 'Instructor', enumValue: LayoutTypes.INSTRUCTOR },
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
    get inputValue() {
      return isDarkMode.value
    },
    group: 'simulation',
  },
  toggle_visuals: {
    id: 'toggle_visuals',
    type: 'boolean',
    label: 'Visuals',
    setterFunc: () => simFunctions.setVisuals(!isVisuals.value),
    get inputValue() {
      return isVisuals.value
    },
    group: 'simulation',
  },
  toggle_map: {
    id: 'toggle_map',
    type: 'boolean',
    label: 'Map',
    setterFunc: () => simFunctions.setMap(!openLayersMapRef.value?.showNavMap),
    get inputValue() {
      return Boolean(openLayersMapRef.value?.showNavMap)
    },
    group: 'simulation',
  },
}))

// Keep generated metadata out of deep reactivity. Its live getters subscribe to renderSignal.
const flightModelProps = shallowRef<ActiveFlightModelSimProps>({} as ActiveFlightModelSimProps)
const simulationProperties = shallowRef<Record<string, SimulationProperties>>({})
const simulationControlsProps = computed(() => ({
  ...simulationProperties.value,
  ...layoutControls.value,
}))
const allSimProps = computed(() => ({
  ...simulationControlsProps.value,
  ...flightModelProps.value,
}))
// WASM getters are not reactive; sample airflow state on the existing UI tick.
const airflowState = computed(() => {
  renderSignal.value
  const model = FlightSimModule?.flightModel
  return {
    liftCoefficient: model?.cl ?? 0,
    maxAngleOfAttack: model?.max_aoa_deg ?? 0,
    stalling: model?.stalling ?? false,
  }
})
const simulationPanelControls = computed(() =>
  Object.values(simulationControlsProps.value)
    .filter((control) => control.group === 'simulation' && control.setterFunc)
    .sort(
      (a, b) =>
        Number(!['boolean', 'void'].includes(a.type)) -
        Number(!['boolean', 'void'].includes(b.type)),
    ),
)
const autopilotControls = computed<AutopilotProperties[]>(() => {
  const properties: Record<string, SimulationProperties> = flightModelProps.value
  if (!FlightSimModule) return []
  return getAutopilotProperties(FlightSimModule.flightModel)
    .map((control) => ({
      ...control,
      // Share the same live definitions as the flight-model panel and plots.
      stateCommand: properties[control.stateCommand.id],
      targetCommand: control.targetCommand ? properties[control.targetCommand.id] : undefined,
    }))
    .sort(
      (a: AutopilotProperties, b: AutopilotProperties) =>
        Number(a.targetCommand !== undefined) - Number(b.targetCommand !== undefined),
    )
})
const groupedSimProps = computed(() =>
  Object.values(allSimProps.value)
    .filter((control) => control.setterFunc !== undefined)
    .reduce((groups: Record<string, SimulationProperties[]>, control) => {
      ;(groups[control.group] ??= []).push(control)
      return groups
    }, {}),
)

const flightModelFilter = ref('')
const filteredGroupedSimProps = computed(() => {
  const query = flightModelFilter.value.trim().toLocaleLowerCase()
  return Object.entries(groupedSimProps.value)
    .map(([groupName, controls]): [string, SimulationProperties[]] => {
      if (!query) return [groupName, controls]
      return [
        groupName,
        controls.filter((control) =>
          [groupName, control.label, control.id, control.unit].some(
            (value) => value != null && String(value).toLocaleLowerCase().includes(query),
          ),
        ),
      ]
    })
    .filter(([, controls]) => controls.length > 0)
})
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

const computedJoystickInputs = computed(() => {
  renderSignal.value
  flightModelProps.value
  return {
    aileron: FlightSimModule.flightModel.aileron_position,
    elevator: FlightSimModule.flightModel.elevator_position,
    rudder: FlightSimModule.flightModel.rudder_position,
    throttle: FlightSimModule.flightModel.engine_throttle_position,
    mixture: (FlightSimModule.flightModel as c172).engine_mixture_position,
    flaps: FlightSimModule.flightModel.flaps_selector_position,
    gear: FlightSimModule.flightModel.landing_gear_selector_position,
    aileronTrim: FlightSimModule.flightModel.aileron_trim_position,
    elevatorTrim: FlightSimModule.flightModel.elevator_trim_position,
    rudderTrim: FlightSimModule.flightModel.rudder_trim_position,
  } as JoystickInput
})
const computedJoystickOptions = computed(() =>
  activeAircraftType.value === 'B747'
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
      },
)

let metadataModel: ExtendedMainModule['flightModel'] | undefined
let metadataSimulation: ExtendedMainModule['simulation'] | undefined
let metadataModelId: number | undefined

let simUpdateInterval: ReturnType<typeof setInterval>
let layoutResizeTimer: ReturnType<typeof setTimeout> | undefined
let simDisposed = false
let cleanupSimListeners = () => {}
let manager: RemoteCallManager

const handlePanelTabRequest = (event: Event) => {
  const detail = (event as CustomEvent<{ panelId: string; tabName: string }>).detail
  if (detail?.panelId && detail?.tabName) simFunctions.setTab(detail.panelId, detail.tabName)
}

// Lifecycle hooks
onBeforeMount(() => {
  initializeTheme()
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
    setStatus: updateLoadingStatus,
    monitorRunDependencies: monitorLoadingDependencies,
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
      if (simDisposed) {
        // Loading may finish after navigation. Do not install frontend work then.
        const glfw = modules[0].GLFW
        window.removeEventListener('keydown', glfw.onKeydown, true)
        window.removeEventListener('keypress', glfw.onKeyPress, true)
        window.removeEventListener('keyup', glfw.onKeyup, true)
        window.removeEventListener('blur', glfw.onBlur, true)
        return
      }
      GLFWModule = modules[0]
      FlightSimModule = modules[1]
      GLFWModule.GLFW.requestFullscreen = toggleFullscreen // Replace with custom implementation

      initFlightModelParams()
      observeCanvasContainer()

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
      const handleCanvasKeydown = (e: KeyboardEvent) => GLFWModule.GLFW.onKeydown(e)
      const handleCanvasKeyup = (e: KeyboardEvent) => GLFWModule.GLFW.onKeyup(e)
      canvas?.addEventListener('keydown', handleCanvasKeydown, true)
      canvas?.addEventListener('keyup', handleCanvasKeyup, true)

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

      document.addEventListener('fullscreenchange', onFullscreenChange)
      loadingProgress.value = 100
      loadingStatus.value = 'Ready'
      sim_module_loaded.value = true
      simFunctions.notifyUser(
        'Flight Sim',
        `SIM: ${FlightSimModule.FLIGHTMODEL_VERSION} ${FlightSimModule.FLIGHTMODEL_BUILD_TIMESTAMP}
      UI: ${import.meta.env.VITE_GIT_SHA}`,
        2000,
      )

      const handleGlobalKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (document.activeElement !== canvas) {
            e.preventDefault()
            canvas?.focus({ preventScroll: true })
          }
          return
        }

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
            [LayoutTypes.FOCUS]: LayoutTypes.INSTRUCTOR,
          }
          simFunctions.setLayout(nextLayout[layout.value])
        }
        if (e.code === 'KeyF' && e.ctrlKey && e.shiftKey) {
          toggleFullscreen()
        }
      }
      document.addEventListener('keydown', handleGlobalKeydown)

      const stopStatusWatch = watch(simulationStatus, (newStatus) => {
        if (classroomComponentRef.value) {
          classroomComponentRef.value.sendStatus(newStatus)
        }
      })
      cleanupSimListeners = () => {
        document.removeEventListener('keydown', handleGlobalKeydown)
        canvas?.removeEventListener('keydown', handleCanvasKeydown, true)
        canvas?.removeEventListener('keyup', handleCanvasKeyup, true)
        stopStatusWatch()
      }

      simUpdateInterval = setInterval(updateSim, update_interval_ms)
    })
    .catch((error) => {
      if (simDisposed) return
      loadingStatus.value = 'Unable to load simulator'
      loadingProgress.value = null
      console.error(error)
    })
})

onUnmounted(() => {
  simDisposed = true
  cleanupSimListeners()
  clearInterval(simUpdateInterval)
  clearTimeout(layoutResizeTimer)
  canvasResizeObserver?.disconnect()
  if (canvasResizeFrame !== null) cancelAnimationFrame(canvasResizeFrame)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('sim:request-panel-tab', handlePanelTabRequest)
})

async function updateSim() {
  fetchSimData(FlightSimModule, initFlightModelParams)
  renderSignal.value++
  // Let children receive a replacement aircraft catalog before sampling plots.
  await nextTick()
  if (simDisposed) return
  dataDisplayRef.value?.tickPlot()
  openLayersMapRef.value?.updateMap(
    FlightSimModule.flightModel.latitude,
    FlightSimModule.flightModel.longitude,
    FlightSimModule.flightModel.altitude_ft,
    FlightSimModule.flightModel.pitch,
    FlightSimModule.flightModel.bank,
    FlightSimModule.flightModel.yaw,
  )
}

function initFlightModelParams() {
  const { flightModel, simulation } = FlightSimModule
  const modelId = simulation.flight_model_id
  if (
    metadataModel === flightModel &&
    metadataSimulation === simulation &&
    metadataModelId === modelId
  )
    return

  flightModelProps.value = trackSimulationValues(
    getFlightModelParameters(flightModel),
    renderSignal,
  ) as ActiveFlightModelSimProps
  simulationProperties.value = trackSimulationValues(
    getSimulationControlsParameters(FlightSimModule),
    renderSignal,
  )
  metadataModel = flightModel
  metadataSimulation = simulation
  metadataModelId = modelId
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
    'resetPanels',
    'setDataView',
    'setPlotView',
    'replacePlot',
    'removePlot',
    'setLayout',
    'setVisuals',
    'setTheme',
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
.sim-loading-overlay {
  font-family: 'Orbitron', sans-serif;
}

.sim-loading-matrix {
  display: grid;
  grid-template-columns: repeat(5, 0.375rem);
  gap: 0.375rem;
}

.sim-loading-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: rgb(var(--color-secondary));
  opacity: 0.14;
  animation: sim-loading-scan 1.25s ease-in-out infinite;
}

.sim-loading-dot:nth-child(5n + 1) {
  animation-delay: 0ms;
}

.sim-loading-dot:nth-child(5n + 2) {
  animation-delay: 80ms;
}

.sim-loading-dot:nth-child(5n + 3) {
  animation-delay: 160ms;
}

.sim-loading-dot:nth-child(5n + 4) {
  animation-delay: 240ms;
}

.sim-loading-dot:nth-child(5n + 5) {
  animation-delay: 320ms;
}

.sim-loading-indeterminate {
  width: 35%;
  animation: sim-loading-progress 1.2s ease-in-out infinite;
}

@keyframes sim-loading-scan {
  0%,
  55%,
  100% {
    opacity: 0.14;
    transform: scale(0.72);
  }
  25% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes sim-loading-progress {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(310%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sim-loading-dot,
  .sim-loading-indeterminate {
    animation: none;
  }

  .sim-loading-dot:nth-child(2n + 1) {
    opacity: 0.65;
    transform: none;
  }
}

/* Canvas fit */
#canvas {
  object-fit: contain;
}
</style>
