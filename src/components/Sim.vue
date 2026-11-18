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
      :pilot-console-open="pilotConsoleOpen"
      :pilot-plots-open="pilotPlotsOpen"
      :pilot-autopilot-open="pilotAutopilotOpen"
    >
      <template #cockpit>
        <!-- Panel 1 -->
        <Panel
          panel-id="cockpit"
          @click="focusCockpitCanvas"
          @header-dblclick="togglePanelMaximize"
          :status="simulationStatus"
          :flash="
            FlightSimModule?.simulation.simulation_pause ||
            FlightSimModule?.flightModel.damaged ||
            (pilotAttentionPulse && pilotAttention === 'instruments')
          "
          :active="
            FlightSimModule?.simulation.simulation_pause ||
            FlightSimModule?.flightModel.damaged ||
            pilotAttention === 'instruments'
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

              <MissionHUD
                v-if="sim_module_loaded && isPilotMode"
                :phase="lessonPhase"
                :title="missionTitle || 'Free flight'"
                :message-title="latestPrompt.title"
                :message-text="latestPrompt.text"
                :pending="userActionPending"
                :console-open="pilotConsoleOpen"
                :plots-open="pilotPlotsOpen"
                :autopilot-open="pilotAutopilotOpen"
                :airport-open="airportDrawerOpen"
                :controls-open="controlsDrawerOpen"
                :classroom-open="classroomDrawerOpen"
                :lessons-open="lessonsOpen"
                :airflow-open="airflowOpen"
                :whiteboard-open="whiteboardOpen"
                :classroom-status="classRoomComponentState ? 'Online' : 'Offline'"
                :attention="pilotAttention"
                @toggle-console="toggleConsolePanel"
                @toggle-plots="togglePlotsPanel"
                @toggle-airflow="toggleAirflowPanel"
                @toggle-whiteboard="toggleWhiteboardPanel"
                @toggle-autopilot="toggleAutopilotPanel"
                @toggle-airport="toggleAirportPanel"
                @toggle-controls="toggleControlsDrawer"
                @toggle-lessons="toggleLessonsPanel"
                @toggle-classroom="toggleClassroomDrawer"
              />

              <aside
                v-if="sim_module_loaded && isPilotMode && controlsDrawerOpen"
                class="absolute right-2 top-2 bottom-14 z-20 flex w-[30rem] max-w-[94%] flex-col overflow-hidden rounded border border-panelBorder bg-transparent shadow-2xl backdrop-blur-sm"
                aria-label="Flight controls"
                @click.stop
                @keydown.esc="controlsDrawerOpen = false"
              >
                <FlightModelSurface
                  variant="drawer"
                  translucent
                  :status="activeAircraftType"
                  :groups="groupedSimProps"
                  :joystick-props="joystickProps"
                  :hidden-tabs="['Airport']"
                  @joystick-input="handleJoystickInput"
                  @close="controlsDrawerOpen = false"
                />
              </aside>

              <!-- Airport floats in pilot view. It is a primary overlay peer to
                   Controls, so only one drawer is open at a time. -->
              <aside
                v-if="sim_module_loaded && isPilotMode && airportDrawerOpen"
                class="absolute right-2 top-2 bottom-14 z-20 flex w-[26rem] max-w-[92%] flex-col overflow-hidden rounded border border-panelBorder bg-panelContentBackground/95 shadow-2xl backdrop-blur-sm"
                aria-label="Airport and approaches"
                @click.stop
                @keydown.esc="airportDrawerOpen = false"
              >
                <AirportSurface
                  :airport="airportView"
                  :layers="airportLayers"
                  @select-approach="selectAirportApproach"
                  @reposition-approach="repositionApproach"
                  @toggle-layer="toggleAirportLayer"
                  @set-airport-visible="setAirportWorldVisible"
                  @close="airportDrawerOpen = false"
                />
              </aside>

              <aside
                v-if="sim_module_loaded && isPilotMode && classroomDrawerOpen"
                class="absolute right-2 top-2 bottom-14 z-20 flex w-[26rem] max-w-[92%] flex-col overflow-hidden rounded border border-panelBorder bg-panelContentBackground/95 shadow-2xl backdrop-blur-sm"
                aria-label="Classroom and account"
                @click.stop
                @keydown.esc="classroomDrawerOpen = false"
              >
                <ClassroomSurface
                  ref="classroomComponentRef"
                  variant="drawer"
                  :sim-module-loaded="sim_module_loaded"
                  :account-authenticated="isAccountAuthenticated"
                  :account-name="accountName"
                  :licence-state="licenceState"
                  :licence-detail="licenceDetail"
                  :online="classRoomComponentState"
                  :room-id="classRoomId"
                  :hand-attention="classroomHandAttention"
                  :data-display-ready="Boolean(dataDisplayRef)"
                  @login="handleClassroomLogin"
                  @logout="handleClassroomLogout"
                  @maximize="togglePanelMaximize('classroom')"
                  @close="classroomDrawerOpen = false"
                  @api-data="handleClassroomApiData"
                  @api-script="handleClassroomApiScript"
                  @whiteboard="handleClassroomWhiteboard"
                  @instructor-command="handleInstructorCommand"
                  @announcement="handleClassroomAnnouncement"
                  @exercise-start="handleClassroomExerciseStart"
                  @exercise-stop="editorComponentRef?.reset()"
                  @connection="(online: boolean) => (classRoomComponentState = online)"
                  @room="(roomId: string) => (classRoomId = roomId)"
                  @hand-attention="(pending: boolean) => (classroomHandAttention = pending)"
                />
              </aside>

              <aside
                v-if="sim_module_loaded"
                v-show="lessonsOpen && isPilotMode"
                class="absolute inset-x-2 top-2 bottom-14 z-20 flex min-h-0 flex-col overflow-hidden rounded border border-panelBorder bg-panelContentBackground/95 shadow-2xl backdrop-blur-sm"
                aria-label="Lessons"
                @click.stop
                @keydown.esc="lessonsOpen = false"
              >
                <!-- One lesson surface for both layouts. It stays mounted while the
                     layout changes, so a running lesson is not cancelled. -->
                <Teleport :to="lessonHost" :disabled="!lessonHost">
                  <LearningModulesSurface
                    ref="editorComponentRef"
                    :variant="isPilotMode ? 'drawer' : 'panel'"
                    panel-id="learning-modules"
                    :context-object="FlightSimModule"
                    :sim-props="flightModelProps"
                    :is-dark-mode="isDarkMode"
                    :aircraft-type="activeAircraftType"
                    :utility-funcs="lessonUtilityFuncs"
                    :status="scriptComponentStatus"
                    :active="scriptComponentStatus != 'IDLE'"
                    @maximize="togglePanelMaximize"
                    @start="handleLessonStart"
                    @reset="handleLessonReset"
                    @completed="handleLessonCompleted"
                    @error="handleLessonError"
                    @close="lessonsOpen = false"
                  />
                </Teleport>
              </aside>

              <div
                v-if="sim_module_loaded && isPilotMode"
                v-show="airflowOpen || whiteboardOpen"
                class="pilot-tool-overlays absolute inset-x-2 top-8 bottom-14 z-20"
                :data-paired="airflowOpen && whiteboardOpen ? 'true' : 'false'"
              >
                <aside v-if="airflowOpen" class="min-h-0 min-w-0" aria-label="Airflow">
                  <Panel :status="`${1000 / update_interval_ms} HZ`" class="h-full">
                    <template #header-actions>
                      <button
                        type="button"
                        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
                        title="Hide airflow"
                        aria-label="Hide airflow"
                        @click.stop="airflowOpen = false"
                      >
                        ×
                      </button>
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
                </aside>

                <aside v-show="whiteboardOpen" class="min-h-0 min-w-0" aria-label="Whiteboard">
                  <Panel status="READY" class="h-full">
                    <template #header-actions>
                      <button
                        type="button"
                        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
                        title="Hide whiteboard"
                        aria-label="Hide whiteboard"
                        @click.stop="whiteboardOpen = false"
                      >
                        ×
                      </button>
                    </template>
                    <template #Whiteboard>
                      <Whiteboard
                        ref="whiteBoardComponentRef"
                        v-if="sim_module_loaded"
                        class="w-full h-full"
                        @history-updated="handleWhiteboardHistory"
                      />
                    </template>
                  </Panel>
                </aside>
              </div>
            </div>
          </template>
          <template #Keyboard-Commands>
            <CockpitKeyboardCommands :aircraft-type="activeAircraftType" />
          </template>
        </Panel>
      </template>
      <template #realtime>
        <!-- Panel 2 -->
        <Panel
          panel-id="realtime"
          @header-dblclick="togglePanelMaximize"
          :status="`${1000 / update_interval_ms} HZ`"
          :active="pilotAttention === 'plots'"
          :flash="pilotAttentionPulse && pilotAttention === 'plots'"
          :hidden-tabs="isPilotMode ? ['Airflow'] : []"
          class="gap-1"
        >
          <template #Flight-Data>
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
          <template #Airflow="{ active }">
            <Airflow
              v-if="sim_module_loaded && active"
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
                  :momentary="input.type === 'void'"
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
                <label
                  v-else-if="input.type === 'enum' && input.enumValues"
                  class="enum-control relative flex min-w-0 cursor-pointer items-stretch border border-simElementBorder bg-simInputBackground text-secondary"
                  @click="openEnumPicker"
                >
                  <select
                    class="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent px-1 text-secondary outline-none"
                    :value="input.inputValue"
                    @change="
                      (e) => {
                        const value = (e.target as HTMLSelectElement).value
                        const selected = input.enumValues?.find(
                          (v) => String(v.enumValue) === value,
                        )
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
                  <span class="enum-chevron" aria-hidden="true">⌄</span>
                </label>
              </template>
            </div>
          </template>
        </Panel>
      </template>
      <template #learningmodules>
        <!-- Panel 2 · host for the single lesson surface, which is teleported here
             in the instructor layout so a running lesson survives layout changes. -->
        <div ref="instructorLessonHost" class="h-full w-full"></div>
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
        <FlightModelSurface
          v-if="sim_module_loaded && !isPilotMode"
          variant="panel"
          panel-id="flight-model"
          :status="activeAircraftType"
          :airport-status="airportStatus(airportView)"
          :groups="groupedSimProps"
          :joystick-props="joystickProps"
          @maximize="togglePanelMaximize"
          @joystick-input="handleJoystickInput"
        >
          <template #airport>
            <AirportBody
              :airport="airportView"
              :layers="airportLayers"
              @select-approach="selectAirportApproach"
              @reposition-approach="repositionApproach"
              @toggle-layer="toggleAirportLayer"
              @set-airport-visible="setAirportWorldVisible"
            />
          </template>
        </FlightModelSurface>
      </template>
      <template #classroom>
        <!-- Panel 7 -->
        <ClassroomSurface
          ref="classroomComponentRef"
          variant="panel"
          :sim-module-loaded="sim_module_loaded"
          :account-authenticated="isAccountAuthenticated"
          :account-name="accountName"
          :licence-state="licenceState"
          :licence-detail="licenceDetail"
          :online="classRoomComponentState"
          :room-id="classRoomId"
          :hand-attention="classroomHandAttention"
          :data-display-ready="Boolean(dataDisplayRef)"
          @login="handleClassroomLogin"
          @logout="handleClassroomLogout"
          @maximize="togglePanelMaximize('classroom')"
          @api-data="handleClassroomApiData"
          @api-script="handleClassroomApiScript"
          @whiteboard="handleClassroomWhiteboard"
          @instructor-command="handleInstructorCommand"
          @announcement="handleClassroomAnnouncement"
          @exercise-start="handleClassroomExerciseStart"
          @exercise-stop="editorComponentRef?.reset()"
          @connection="(online: boolean) => (classRoomComponentState = online)"
          @room="(roomId: string) => (classRoomId = roomId)"
          @hand-attention="(pending: boolean) => (classroomHandAttention = pending)"
        />
      </template>
      <template #prompt>
        <!-- Panel 8 -->
        <Panel
          panel-id="prompt"
          @header-dblclick="togglePanelMaximize"
          :status="userActionPending ? 'ACTION' : 'READY'"
          :active="userActionPending || pilotAttention === 'console'"
          :flash="
            userActionPending ||
            promptAttention ||
            (pilotAttentionPulse && pilotAttention === 'console')
          "
          :hidden-tabs="isPilotMode ? ['whiteboard'] : []"
        >
          <template #Console>
            <MarkDown
              ref="markdownRef"
              class="w-full h-full"
              @action-pending="userActionPending = $event"
              @latest="handleLatestPrompt"
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
import type {
  CheckpointData,
  LessonAIRequest,
  LessonAIResponse,
  PilotAttention,
  PilotViewOptions,
} from '../ScriptContext'
import ButtonSwitch from './ButtonSwitch.vue'
import wButton from './wButton.vue'
import ClassroomSurface from './ClassroomSurface.vue'
import FlightModelSurface from './FlightModelSurface.vue'
import LearningModulesSurface from './LearningModulesSurface.vue'
import SimDataDisplay from './DataDisplay.vue'
import MarkDown from './MarkDown.vue'
import MissionHUD from './MissionHUD.vue'
import AirportBody from './AirportBody.vue'
import AirportSurface from './AirportSurface.vue'
import { RemoteCallManager, RemoteCall, RemoteEvent } from '../RemoteCallManager'
import type { JoystickInput } from './Joystick.vue'
import { applyJoystickChanges } from '../JoystickControls'
import { trackSimulationValues } from '../SimulationValues'
import { airportStatus, snapshotAirport, type ApproachRepositionRequest } from '../AirportState'
import Whiteboard from './Whiteboard.vue'
import { pb } from '../Pocketbase/pocketbase'
import {
  ensureFreshSession,
  licenceBaseUrl,
  licenceResolved,
  probeLicence,
  type LicenceState,
} from '../Pocketbase/licence'

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

import type { ScriptStatus } from './Editor.vue'
import { c172, MainModule } from '../../src/wasm/generated/flightsimulator_exec'
import OpenLayersMap from './OpenLayersMap.vue'
import Airflow from './Airflow.vue'
import CockpitControls from './CockpitControls.vue'
import CockpitKeyboardCommands from './CockpitKeyboardCommands.vue'
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
    case 'clear-whiteboard':
      whiteBoardComponentRef.value?.UpdateState('[]')
      break
  }
}

// How long to wait for the wasm licence callback before reporting the check as
// failed. The endpoint is local, so a request that never answers is a real
// problem (blocked by CORS or an extension) rather than a slow server.
const LICENCE_CHECK_TIMEOUT_MS = 15000
// One failed check used to leave the simulator on "Trial" for the rest of the
// session, so an unanswered check is retried before the failure is final.
const LICENCE_RETRY_DELAYS_MS = [2000, 6000, 15000]
// The two account surfaces and the startup check can ask for the same check
// within a second of each other; repeating it only doubles the requests.
const LICENCE_DUPLICATE_WINDOW_MS = 5000
let licenceWatchdog: ReturnType<typeof setTimeout> | null = null
let licenceRetryTimer: ReturnType<typeof setTimeout> | null = null
let licenceRetries = 0
let licenceRetryPending = false
// True once the wasm client accepted a URL/token pair, i.e. when its "invalid"
// pushes describe this account rather than an unprimed client.
let licenceRequestAccepted = false
// The last request handed to the client, used to drop duplicates.
let licenceLastRequest = { url: '', token: '', at: 0 }

const clearLicenceWatchdog = () => {
  if (licenceWatchdog === null) return
  clearTimeout(licenceWatchdog)
  licenceWatchdog = null
}

const clearLicenceRetry = () => {
  licenceRetryPending = false
  if (licenceRetryTimer === null) return
  clearTimeout(licenceRetryTimer)
  licenceRetryTimer = null
}

const licenceRetriesExhausted = () => licenceRetries >= LICENCE_RETRY_DELAYS_MS.length

/**
 * Retry a check that could not be completed.
 *
 * The client caches the last credentials it accepted, so re-issuing with the
 * current token also replaces a token that went stale after a refresh.
 */
const scheduleLicenceRetry = () => {
  if (licenceRetriesExhausted()) return
  const delay = LICENCE_RETRY_DELAYS_MS[licenceRetries++]
  clearLicenceRetry()
  licenceRetryPending = true
  licenceRetryTimer = setTimeout(() => {
    licenceRetryTimer = null
    licenceRetryPending = false
    if (!pb.authStore.isValid || !pb.authStore.token) return
    requestLicenceCheck(pb.baseURL, pb.authStore.token)
  }, delay)
}

const setLicenceState = (state: LicenceState, detail = '') => {
  licenceState.value = state
  licenceDetail.value = detail
  if (licenceResolved(state)) clearLicenceWatchdog()
}

/**
 * Drop the credentials cached by the wasm client.
 *
 * The client has no setter, so the only way to clear them is to hand it a known
 * URL with an empty token: it overwrites the cached pair with an unusable one.
 * The server rejects that request, which is the point.
 */
const clearLicenceToken = () => {
  licenceRequestAccepted = false
  licenceLastRequest = { url: '', token: '', at: 0 }
  FlightSimModule?.check_licence(pb.baseURL, '')
}

/**
 * Ask the wasm client to check the licence for `token`.
 *
 * `check_licence` returns false when the client refuses the base URL. That used
 * to fall through to a "Trial" badge indistinguishable from a server-verified
 * answer, so the URL is normalised first and a refusal is reported as a failure.
 */
const requestLicenceCheck = (url: string, token: string): boolean => {
  if (!FlightSimModule) {
    setLicenceState('unreachable', 'The simulator has not finished loading.')
    return false
  }

  // The client compares its argument to a fixed list, so give it the spelling it
  // knows instead of letting it refuse the check silently.
  const base = licenceBaseUrl(url)
  if (!base) {
    licenceRequestAccepted = false
    console.error(
      `[licence] "${url}" is not one of the licence servers the simulator client was built with`,
    )
    setLicenceState(
      'unreachable',
      `The simulator client does not accept ${url} as a licence server.`,
    )
    return false
  }
  if (!token) {
    setLicenceState('signed-out', 'Sign in to check the licence.')
    return false
  }

  const now = Date.now()
  if (
    licenceLastRequest.url === base &&
    licenceLastRequest.token === token &&
    now - licenceLastRequest.at < LICENCE_DUPLICATE_WINDOW_MS
  ) {
    return true
  }
  licenceLastRequest = { url: base, token, at: now }

  setLicenceState('checking')
  clearLicenceWatchdog()
  licenceWatchdog = setTimeout(() => {
    licenceWatchdog = null
    if (licenceState.value !== 'checking') return
    scheduleLicenceRetry()
    setLicenceState('unreachable', `No answer from ${base} within 15 seconds.`)
  }, LICENCE_CHECK_TIMEOUT_MS)

  const sent = FlightSimModule.check_licence(base, token)
  // Without an accepted request the client keeps reporting its empty-token
  // "trial" state every couple of minutes, which is not an answer about this
  // account. Remember that so those pushes cannot turn a failed check into a
  // believable "Trial mode".
  licenceRequestAccepted = sent
  if (!sent) {
    console.error(`[licence] the simulator client refused the check for "${base}"`)
    setLicenceState('unreachable', `The simulator client refused the licence check for ${base}.`)
    return false
  }
  return true
}

/**
 * Explain a "no licence" push from C++.
 *
 * The client only reports valid/invalid, so an invalid result may mean the
 * account really has no licence, the session was rejected, or the request never
 * completed. Asking the endpoint gives the user a state they can act on.
 */
const explainLicenceFailure = async () => {
  const answer = await probeLicence(pb.baseURL, pb.authStore.token)
  if (licenceState.value === 'signed-out' || licenceState.value === 'session-expired') return
  if (answer === 'valid') {
    // The server confirms the licence, so the client either never sent the
    // request or did not accept the answer. Retry before reporting a failure.
    console.error(
      '[licence] the server confirmed a valid licence, but the simulator client did not accept it',
    )
    scheduleLicenceRetry()
    setLicenceState(
      'unreachable',
      `The simulator client did not accept the licence answer from ${pb.baseURL}. A cached copy of that URL in the browser can cause this: reload with "Empty cache and hard reload".`,
    )
    return
  }
  if (answer === 'expired') {
    pb.authStore.clear()
    isAccountAuthenticated.value = false
    accountName.value = ''
    setLicenceState('session-expired', 'Your session expired, so the licence cannot be checked.')
    return
  }
  if (answer === 'trial') {
    licenceRetries = 0
    setLicenceState('trial', 'No active licence for this account.')
    return
  }
  if (answer === 'wrong-server') {
    // Retrying cannot fix a wrong host, so report it at once instead of burning
    // the retry budget on a port that will keep answering with a web page.
    console.error(
      `[licence] ${pb.baseURL} answered with a web page instead of PocketBase: another service is using that port`,
    )
    setLicenceState(
      'unreachable',
      `${pb.baseURL} answered with a web page instead of PocketBase, so another service is using that port.`,
    )
    return
  }
  scheduleLicenceRetry()
  setLicenceState('unreachable', `The licence server at ${pb.baseURL} could not be reached.`)
}

/**
 * Resolve the licence once at startup instead of waiting for the account panel to
 * mount. In the pilot layout no account UI exists until the classroom drawer is
 * opened, which previously left the cockpit status stuck on "Trial".
 *
 * The stored session is refreshed first: `authStore.isValid` only checks the
 * token's local expiry, so a token the server already rejects would fail every
 * licence check while the app kept claiming the user was signed in.
 */
const resolveLicence = async () => {
  const session = await ensureFreshSession(pb)
  licenceRetries = 0
  clearLicenceRetry()
  if (session !== 'valid') {
    isAccountAuthenticated.value = false
    accountName.value = ''
    setLicenceState(
      session === 'expired' ? 'session-expired' : 'signed-out',
      session === 'expired'
        ? 'Your session expired, so the licence cannot be checked.'
        : 'Sign in to check the licence.',
    )
    if (session === 'expired') {
      // Drop the rejected token cached by the wasm client, otherwise its periodic
      // check keeps re-sending credentials the server has already refused.
      clearLicenceToken()
      simFunctions.notifyUser('Session expired', 'Sign in again to use your licence.', 10000)
    }
    return
  }

  isAccountAuthenticated.value = true
  accountName.value = String(pb.authStore.record?.name || '')
  requestLicenceCheck(pb.baseURL, pb.authStore.token)
}

const handleClassroomAnnouncement = (message: string) => {
  if (message) simFunctions.notifyUser('Instructor', message, 8000)
}

const handleClassroomLogin = (url: string, authToken: string, name: string) => {
  isAccountAuthenticated.value = true
  accountName.value = name
  // The panel can hand over the token it captured before the startup refresh, so
  // prefer the current one. The duplicate that the second account surface causes
  // is then dropped by requestLicenceCheck instead of replacing the client's
  // cached token with an older one.
  requestLicenceCheck(url, pb.authStore.token || authToken)
}

const handleClassroomLogout = () => {
  isAccountAuthenticated.value = false
  accountName.value = ''
  classRoomComponentState.value = false
  licenceRetries = 0
  clearLicenceRetry()
  setLicenceState('signed-out', 'Sign in to check the licence.')
  clearLicenceToken()
}

const handleClassroomApiData = (receivedApiCall: PeerApiData) => {
  manager.handleIncomingMessage(receivedApiCall?.api)
}

const handleClassroomApiScript = (receivedScript: PeerScriptData) => {
  editorComponentRef.value?.executeExternalCode(receivedScript.tite, receivedScript.script)
}

const handleClassroomWhiteboard = (receivedData: PeerWhiteBoardata) => {
  whiteBoardComponentRef.value?.UpdateState(receivedData.wb)
}

const handleClassroomExerciseStart = (exercise: ClassroomExerciseAssignment) => {
  editorComponentRef.value?.executeExternalCode(
    exercise.name,
    exercise.source,
    exercise.id,
    exercise.lessonId,
  )
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
    if (!licenceChecked.value) return 'Checking'
    return licenceState.value === 'valid' ? 'Normal' : 'Trial'
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
    options?: { append?: boolean; replace?: boolean; hud?: boolean },
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
    controlsDrawerOpen.value = false
    classroomDrawerOpen.value = false
    lessonsOpen.value = false
    airportDrawerOpen.value = false
    airflowOpen.value = false
    whiteboardOpen.value = false
    pilotConsoleOpen.value = true
    pilotPlotsOpen.value = true
    pilotAutopilotOpen.value = true
    clearPilotAttention()
    promptAttention.value = false
    if (promptAttentionTimer !== null) {
      clearTimeout(promptAttentionTimer)
      promptAttentionTimer = null
    }
    lessonPhase.value = 'brief'
    missionTitle.value = ''
    lessonJustCompleted = false
    resizableLayoutRef.value?.reset(layout.value)
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
  setPilotView: function (view: PilotViewOptions) {
    applyPilotView(view)
  },
  setLayout: function (mode: typeof layout.value) {
    maximizedPanelId.value = null
    controlsDrawerOpen.value = false
    classroomDrawerOpen.value = false
    lessonsOpen.value = false
    airportDrawerOpen.value = false
    airflowOpen.value = false
    whiteboardOpen.value = false
    const nextLayout = Object.values(LayoutTypes).includes(mode) ? mode : LayoutTypes.PILOT
    layout.value = nextLayout
    localStorage.setItem(LAYOUT_STORAGE_KEY, nextLayout)

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
    if (isPilotMode.value) {
      if (panelId === 'realtime' && tabName === 'Airflow') {
        setPilotOverlay(null)
        airflowOpen.value = true
        return
      }
      if (panelId === 'realtime' && tabName === 'Flight-Data') {
        airflowOpen.value = false
        return
      }
      if (panelId === 'prompt' && tabName === 'whiteboard') {
        setPilotOverlay(null)
        whiteboardOpen.value = true
        return
      }
      if (panelId === 'prompt' && tabName === 'Console') {
        whiteboardOpen.value = false
        return
      }
    }
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

const openEnumPicker = (event: MouseEvent) => {
  if (event.target instanceof HTMLSelectElement) return
  const select = (event.currentTarget as HTMLElement).querySelector('select')
  if (!select) return

  const picker = select as HTMLSelectElement & { showPicker?: () => void }
  event.preventDefault()
  try {
    if (picker.showPicker) picker.showPicker()
    else picker.click()
  } catch {
    picker.focus()
  }
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

// The licence state is pushed from C++ (onLicenceState) and set by the session
// checks below. Until an answer arrives the state is unknown, so the UI must not
// claim "Trial".
const licenceState = ref<LicenceState>('unknown')
// Why the licence state is what it is. The cockpit header can only say "Normal"
// or "Trial" (classroom peers read that string), so the reason lives here.
const licenceDetail = ref('')
const licenceChecked = computed(() => licenceResolved(licenceState.value))

// The cockpit header can only say "Normal" or "Trial" (the classroom peers read
// that string), so the reason a check failed is announced in the console panel
// as well. A retry is still pending after most failures, so only a final one is
// announced.
watch(licenceState, (state) => {
  if (state === 'unreachable' && !licenceRetryPending) {
    simFunctions.notifyUser(
      'Licence check failed',
      licenceDetail.value || 'The simulator could not verify your licence.',
      10000,
    )
  } else if (state === 'trial') {
    simFunctions.notifyUser(
      'Trial mode',
      licenceDetail.value || 'No active licence for this account.',
      10000,
    )
  }
})
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
const LAYOUT_STORAGE_KEY = 'sim-workspace-layout'
const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
const initialLayout = Object.values(LayoutTypes).includes(savedLayout as LayoutTypes)
  ? (savedLayout as LayoutTypes)
  : LayoutTypes.PILOT
const layout = ref<LayoutTypes>(initialLayout)
const isPilotMode = computed(() => layout.value !== LayoutTypes.INSTRUCTOR)
const maximizedPanelId = ref<string | null>(null)
const lessonPhase = ref<'brief' | 'fly' | 'debrief'>('brief')
const missionTitle = ref('')
const controlsDrawerOpen = ref(false)
const classroomDrawerOpen = ref(false)
const lessonsOpen = ref(false)
const airflowOpen = ref(false)
const whiteboardOpen = ref(false)
const pilotConsoleOpen = ref(true)
const pilotPlotsOpen = ref(true)
const pilotAutopilotOpen = ref(true)
const airportDrawerOpen = ref(false)
const pilotAttention = ref<PilotAttention | null>(null)
const pilotAttentionPulse = ref(false)
let pilotAttentionTimer: number | null = null
const latestPrompt = ref<{ title: string; text: string }>({ title: '', text: '' })
const promptAttention = ref(false)
let promptAttentionTimer: number | null = null
let lessonJustCompleted = false

const handleLatestPrompt = (prompt: { title: string; text: string }) => {
  latestPrompt.value = prompt
}

const clearPilotAttention = () => {
  pilotAttention.value = null
  pilotAttentionPulse.value = false
  if (pilotAttentionTimer !== null) {
    clearTimeout(pilotAttentionTimer)
    pilotAttentionTimer = null
  }
}

const setPilotAttention = (target: PilotAttention | null) => {
  if (!target) {
    clearPilotAttention()
    return
  }
  if (target === 'console') pilotConsoleOpen.value = true
  if (target === 'plots') pilotPlotsOpen.value = true
  maximizedPanelId.value = null
  pilotAttention.value = target
  pilotAttentionPulse.value = false
  if (pilotAttentionTimer !== null) clearTimeout(pilotAttentionTimer)
  void nextTick(() => {
    pilotAttentionPulse.value = true
    pilotAttentionTimer = window.setTimeout(() => {
      pilotAttentionPulse.value = false
      pilotAttentionTimer = null
    }, 1400)
  })
}

const focusConsolePanel = () => {
  pilotConsoleOpen.value = true
  if (maximizedPanelId.value && maximizedPanelId.value !== 'prompt') {
    maximizedPanelId.value = null
  }
  simFunctions.setTab('prompt', 'Console')
  if (promptAttentionTimer !== null) clearTimeout(promptAttentionTimer)
  promptAttention.value = true
  promptAttentionTimer = window.setTimeout(() => {
    promptAttention.value = false
    promptAttentionTimer = null
  }, 1400)
  void nextTick(() => markdownRef.value?.showLatest())
}

const toggleConsolePanel = () => {
  if (userActionPending.value) {
    focusConsolePanel()
    return
  }
  if (pilotConsoleOpen.value) {
    pilotConsoleOpen.value = false
    if (maximizedPanelId.value === 'prompt') maximizedPanelId.value = null
    return
  }
  focusConsolePanel()
}

const togglePlotsPanel = () => {
  pilotPlotsOpen.value = !pilotPlotsOpen.value
  if (!pilotPlotsOpen.value && maximizedPanelId.value === 'realtime') {
    maximizedPanelId.value = null
  }
}

const toggleAutopilotPanel = () => {
  pilotAutopilotOpen.value = !pilotAutopilotOpen.value
  if (!pilotAutopilotOpen.value && maximizedPanelId.value === 'autopilot') {
    maximizedPanelId.value = null
  }
}

const toggleAirportPanel = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(airportDrawerOpen.value ? null : 'airport')
}

type PilotOverlay = 'controls' | 'classroom' | 'lessons' | 'airport'

const setPilotOverlay = (target: PilotOverlay | null) => {
  controlsDrawerOpen.value = target === 'controls'
  classroomDrawerOpen.value = target === 'classroom'
  lessonsOpen.value = target === 'lessons'
  airportDrawerOpen.value = target === 'airport'
  if (target) {
    airflowOpen.value = false
    whiteboardOpen.value = false
  }
}

const toggleAirflowPanel = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(null)
  airflowOpen.value = !airflowOpen.value
}

const toggleWhiteboardPanel = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(null)
  whiteboardOpen.value = !whiteboardOpen.value
}

const toggleControlsDrawer = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(controlsDrawerOpen.value ? null : 'controls')
}

const toggleClassroomDrawer = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(classroomDrawerOpen.value ? null : 'classroom')
}

const toggleLessonsPanel = () => {
  if (!isPilotMode.value) return
  setPilotOverlay(lessonsOpen.value ? null : 'lessons')
}

const applyPilotView = (view: PilotViewOptions) => {
  if (view.console !== undefined) {
    pilotConsoleOpen.value = view.console
    if (!view.console && maximizedPanelId.value === 'prompt') maximizedPanelId.value = null
  }
  if (view.plots !== undefined) {
    pilotPlotsOpen.value = view.plots
    if (!view.plots && maximizedPanelId.value === 'realtime') maximizedPanelId.value = null
  }
  if (view.autopilot !== undefined) {
    pilotAutopilotOpen.value = view.autopilot
    if (!view.autopilot && maximizedPanelId.value === 'autopilot') maximizedPanelId.value = null
  }
  // HUD overlays share the same layer. If a lesson requests more than one,
  // the last one in this priority list wins; otherwise respect explicit flags.
  const requestedOverlay = (
    [
      ['controls', view.controls === true],
      ['lessons', view.lessons === true],
      ['airport', view.airport === true],
      ['classroom', view.classroom === true],
    ] as const
  )
    .filter(([, open]) => open)
    .at(-1)?.[0]
  if (requestedOverlay) {
    setPilotOverlay(requestedOverlay)
  } else {
    if (view.airflow === true || view.whiteboard === true) setPilotOverlay(null)
    if (view.controls !== undefined) controlsDrawerOpen.value = view.controls
    if (view.lessons !== undefined) lessonsOpen.value = view.lessons
    if (view.airport !== undefined) airportDrawerOpen.value = view.airport
    if (view.classroom !== undefined) classroomDrawerOpen.value = view.classroom
    if (view.airflow !== undefined) airflowOpen.value = view.airflow
    if (view.whiteboard !== undefined) whiteboardOpen.value = view.whiteboard
  }
  if (view.attention !== undefined) setPilotAttention(view.attention)
  void nextTick(() => window.dispatchEvent(new Event('resize')))
}

const togglePanelMaximize = (panelId: string) => {
  maximizedPanelId.value = maximizedPanelId.value === panelId ? null : panelId
}

watch([pilotConsoleOpen, pilotPlotsOpen, pilotAutopilotOpen], () => {
  void nextTick(() => window.dispatchEvent(new Event('resize')))
})

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
const classroomComponentRef = ref<InstanceType<typeof ClassroomSurface> | null>(null)
const requestLessonAI = (
  request: LessonAIRequest,
  runId: string,
  signal: AbortSignal,
): Promise<LessonAIResponse> =>
  classroomComponentRef.value?.requestLessonAI(request, runId, signal) ??
  Promise.resolve({ status: 'unavailable', reason: 'Classroom unavailable.' })
const editorComponentRef = ref<InstanceType<typeof LearningModulesSurface> | null>(null)
// The lesson surface must outlive layout changes: switching layout used to destroy
// the editor, and its unmount cancelled the running lesson. It is mounted once in the
// cockpit drawer and teleported into the instructor panel when that layout is active.
const instructorLessonHost = ref<HTMLElement | null>(null)
const lessonHost = ref<HTMLElement | null>(null)
watch(
  [isPilotMode, instructorLessonHost],
  async () => {
    // Wait for the active layout to render its host before re-targeting.
    await nextTick()
    lessonHost.value = isPilotMode.value ? null : instructorLessonHost.value
  },
  { immediate: true, flush: 'post' },
)
const dataDisplayRef = ref<InstanceType<typeof SimDataDisplay> | null>(null) // Use the SimDataDisplay component type
const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null) // Use the MarkDown component type
const userActionPending = ref(false)
const openLayersMapRef = ref<InstanceType<typeof OpenLayersMap> | null>(null) // Use the OpenLayersMap component type
const whiteBoardComponentRef = ref<InstanceType<typeof Whiteboard> | null>(null)

const lessonUtilityFuncs = computed(() => ({
  plotView: simFunctions.setPlotView,
  dataView: simFunctions.setDataView,
  dataDisplayReset: () => dataDisplayRef.value?.reset(),
  notifyUser: simFunctions.notifyUser,
  waitForUser: simFunctions.waitForUser,
  askQuestion: simFunctions.askQuestion,
  cancelPromptInteractions: simFunctions.cancelPromptInteractions,
  setPilotView: simFunctions.setPilotView,
  setLayout: simFunctions.setLayout,
  checkPoint: (content: string, data?: CheckpointData) =>
    classroomComponentRef.value?.sendCheckPoint(content, data),
  requestAI: requestLessonAI,
  setVisuals: simFunctions.setVisuals,
  setMap: simFunctions.setMap,
  setTheme: simFunctions.setTheme,
  setTab: simFunctions.setTab,
  resetPanels: simFunctions.resetPanels,
}))

const handleLessonStart = (_code: string, title: string) => {
  missionTitle.value = title
  lessonPhase.value = 'fly'
  lessonJustCompleted = false
  scriptComponentStatus.value = 'IN-PROGRESS'
  if (isPilotMode.value) {
    lessonsOpen.value = false
    airportDrawerOpen.value = false
    pilotConsoleOpen.value = true
    simFunctions.setTab('prompt', 'Console')
  }
}

const handleLessonReset = () => {
  scriptComponentStatus.value = 'IDLE'
  if (!lessonJustCompleted) {
    lessonPhase.value = 'brief'
    missionTitle.value = ''
  }
  lessonJustCompleted = false
}

const handleLessonCompleted = (title: string) => {
  missionTitle.value = title
  lessonPhase.value = 'debrief'
  lessonJustCompleted = true
}

const handleLessonError = (error: any) => {
  simFunctions.notifyUser('Editor Error', error, 5000)
  scriptComponentStatus.value = 'ERROR'
  lessonPhase.value = 'brief'
}

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
    { id: LayoutTypes.PILOT, label: 'PILOT' },
    { id: LayoutTypes.INSTRUCTOR, label: 'INSTRUCTOR' },
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

// Airport and approach data come from the same generated bindings, so they are
// resampled on the UI tick as well.
const airportView = computed(() => {
  renderSignal.value
  if (!FlightSimModule) return null
  return snapshotAirport(FlightSimModule.simulation)
})

const refreshAirportView = () => {
  renderSignal.value++
}

const setAirportWorldVisible = (visible: boolean) => {
  FlightSimModule?.simulation.set_airport_visible(visible)
  refreshAirportView()
}

// The panel mirrors the Controls airport group instead of hand-coding the flags,
// so a new airport layer needs no panel change.
const toggleAirportLayer = (layer: SimulationProperties) => {
  layer.setterFunc?.()
  refreshAirportView()
}

const selectAirportApproach = (runwayIndex: number, endIndex: number) => {
  const world = FlightSimModule?.simulation.world
  if (!world) return
  if (world.select_runway_end(runwayIndex, endIndex)) refreshAirportView()
}

/**
 * Repositions the aircraft onto an approach. The engine owns every calculation:
 * the panel only names the airport and runway end and passes the diagram's
 * distance and lateral offset, the two offset fields and the target speed.
 */
const repositionApproach = (request: ApproachRepositionRequest) => {
  const module = FlightSimModule
  if (!module) return
  module.approachReposition(
    request.airportId,
    request.runwayId,
    request.distanceNm,
    request.lateralOffsetNm,
    request.headingOffsetDeg,
    request.altitudeOffsetFt,
    request.targetSpeedKt,
  )
  refreshAirportView()
}

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

const airportLayers = computed(() =>
  (groupedSimProps.value.airport ?? []).filter((layer) => layer.type === 'boolean'),
)

const computedJoystickInputs = computed(() => {
  renderSignal.value
  flightModelProps.value
  return {
    aileron: FlightSimModule.flightModel.aileron_position,
    elevator: FlightSimModule.flightModel.elevator_position,
    rudder: FlightSimModule.flightModel.rudder_position,
    throttle: FlightSimModule.flightModel.engine_throttle_position,
    reverseCommand: (
      FlightSimModule.flightModel as c172 & { engine_throttle_reverser_position?: number }
    ).engine_throttle_reverser_position,
    mixture: (FlightSimModule.flightModel as c172).engine_mixture_position,
    flaps: FlightSimModule.flightModel.flaps_selector_position,
    actualFlaps: FlightSimModule.flightModel.flaps_position,
    actualGear: FlightSimModule.flightModel.gear_position,
    gear: FlightSimModule.flightModel.landing_gear_selector_position,
    aileronTrim: FlightSimModule.flightModel.aileron_trim_position,
    elevatorTrim: FlightSimModule.flightModel.elevator_trim_position,
    rudderTrim: FlightSimModule.flightModel.rudder_trim_position,
  } satisfies JoystickInput & { actualFlaps: number; actualGear: number }
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

const joystickProps = computed(() => ({
  externalInputs: computedJoystickInputs.value,
  combinedThrottle: activeAircraftType.value === 'B747',
  actualFlaps: computedJoystickInputs.value.actualFlaps,
  actualGear: computedJoystickInputs.value.actualGear,
  flapOptions: computedJoystickOptions.value.flaps,
  gearOptions: computedJoystickOptions.value.gear,
}))

const handleJoystickInput = (changes: Partial<JoystickInput>) => {
  if (!FlightSimModule) return
  applyJoystickChanges(FlightSimModule.flightModel, changes)
}

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
    onLicenceState: (valid: boolean) => {
      // The periodic wasm check keeps the credentials of a session the app has
      // already discarded; it must not overwrite a more precise state.
      if (licenceState.value === 'signed-out' || licenceState.value === 'session-expired') return
      if (valid) {
        licenceRetries = 0
        clearLicenceRetry()
        setLicenceState('valid')
        return
      }
      // A client that never accepted our URL/token reports "invalid" forever;
      // that is not an answer about this account.
      if (!licenceRequestAccepted) return
      void explainLicenceFailure()
    }, // Update licence state
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

      // Resolve the licence once at startup instead of waiting for the account panel to
      // mount. In the pilot layout no account UI exists until the classroom drawer is
      // opened, which previously left the cockpit status stuck on "Trial".
      // The session is re-validated first so a server-rejected token cannot keep
      // producing a "Trial" state with no way to recover.
      void resolveLicence().catch((error) => {
        console.error('Unable to start the licence check', error)
        setLicenceState('unreachable')
      })

      GLFWModule.GLFW.requestFullscreen = toggleFullscreen // Replace with custom implementation

      initFlightModelParams()
      observeCanvasContainer()

      // Emscripten registers its keyboard handlers on window. Detach them first,
      // then install guarded window-level handlers so the flight keys keep working
      // when a control (for example an autopilot toggle) takes focus. Listening on
      // the canvas alone silently disabled the keyboard as soon as focus left it.
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

      // Keys typed into form fields and editable content belong to the UI, not the sim.
      const isTypingTarget = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return false
        if (target instanceof HTMLElement && target.isContentEditable) return true
        return (
          target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
          ) !== null
        )
      }

      // Space/Enter belong to the focused control, or keyboard users could no
      // longer activate buttons and menu items.
      const isControlActivation = (event: KeyboardEvent) => {
        if (event.key !== ' ' && event.key !== 'Enter') return false
        return (
          event.target instanceof Element &&
          event.target.closest(
            'button, a[href], summary, [role="button"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="option"]',
          ) !== null
        )
      }

      // A focused slider (the throttle) owns its arrow/Home/End keys.
      const isSliderNavigation = (event: KeyboardEvent) => {
        const isNavigationKey =
          event.key.startsWith('Arrow') ||
          event.key === 'Home' ||
          event.key === 'End' ||
          event.key === 'PageUp' ||
          event.key === 'PageDown'
        return (
          isNavigationKey &&
          event.target instanceof Element &&
          event.target.closest('[role="slider"]') !== null
        )
      }

      const handleSimKeydown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.isComposing) return
        // Tab moves focus between controls; the simulator does not use it.
        if (event.key === 'Tab') return
        // Escape is the app's "return focus to the cockpit" shortcut unless the
        // cockpit already owns the keyboard, where it keeps its native behaviour.
        if (event.key === 'Escape' && document.activeElement !== canvas) return
        if (isTypingTarget(event.target)) return
        // UI regions with their own shortcut layer (the classroom roster) opt out.
        if (
          event.target instanceof Element &&
          event.target.closest('[data-sim-keys-ignore]') !== null
        )
          return
        if (isControlActivation(event)) return
        if (isSliderNavigation(event)) return
        GLFWModule.GLFW.onKeydown(event)
      }

      // Forward every release so a key cannot stick if focus changes between its
      // keydown and keyup.
      const handleSimKeyup = (event: KeyboardEvent) => GLFWModule.GLFW.onKeyup(event)
      window.addEventListener('keydown', handleSimKeydown, true)
      window.addEventListener('keyup', handleSimKeyup, true)
      window.addEventListener('blur', GLFWModule.GLFW.onBlur, true)

      document.addEventListener('fullscreenchange', onFullscreenChange)
      loadingProgress.value = 100
      loadingStatus.value = 'Ready'
      sim_module_loaded.value = true
      simFunctions.notifyUser(
        'Flight Sim',
        `SIM: ${FlightSimModule.FLIGHTMODEL_VERSION} ${FlightSimModule.FLIGHTMODEL_BUILD_TIMESTAMP}
      UI: ${import.meta.env.VITE_GIT_SHA}`,
        2000,
        { hud: false },
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
        if (isTypingTarget(document.activeElement)) {
          return
        }

        // Ctrl + Shift + F to toggle fullscreen
        if (e.code === 'KeyL') {
          // Toggle between the two workspace layouts with the L key.
          const nextLayout =
            layout.value === LayoutTypes.INSTRUCTOR ? LayoutTypes.PILOT : LayoutTypes.INSTRUCTOR
          simFunctions.setLayout(nextLayout)
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
        window.removeEventListener('keydown', handleSimKeydown, true)
        window.removeEventListener('keyup', handleSimKeyup, true)
        window.removeEventListener('blur', GLFWModule.GLFW.onBlur, true)
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
  if (promptAttentionTimer !== null) clearTimeout(promptAttentionTimer)
  if (pilotAttentionTimer !== null) clearTimeout(pilotAttentionTimer)
  clearLicenceWatchdog()
  clearLicenceRetry()
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
    'setPilotView',
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
.pilot-tool-overlays {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-auto-rows: minmax(0, 1fr);
  gap: 0.5rem;
}

.pilot-tool-overlays[data-paired='true'] {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 1280px) {
  .pilot-tool-overlays[data-paired='true'] {
    grid-template-columns: minmax(0, 1fr);
  }
}

.enum-chevron {
  display: flex;
  width: 2.5rem;
  flex: 0 0 2.5rem;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgb(var(--color-simElementBorder));
  color: rgb(var(--color-secondary));
  pointer-events: none;
}

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
