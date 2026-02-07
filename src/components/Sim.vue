<template>
  <!-- <div  class="container max-w-full h-screen gap-2 p-5 bg-simBackground"> -->

      <div
    ref="fullscreenContainer"
    class="container max-w-full h-screen gap-2 p-5 bg-simBackground"
    :class="`layout-${layout}`">
    <!-- Panel 1 -->
    <Panel
      :status="simulationStatus()"
      :flash="FlightSimModule?.simData?.api_simulation_pause || FlightSimModule?.simData?.api_ground_collision"
      :active="FlightSimModule?.simData?.api_simulation_pause || FlightSimModule?.simData?.api_ground_collision"
      class="panel-cockpit"
      data-layout="focus instructor pilot"
    >
    <template #Cockpit>
      <div id="fullscreen-container" class="flex w-full h-full bg-simBackground">

  <!-- Canvas container -->
  <div id="canvas-container" class="flex-grow h-full">
    <canvas
      class="emscripten w-full h-full bg-openglCanvasBackground"
      id="canvas"
      @contextmenu.prevent
      tabindex="-1"
    ></canvas>
  </div>
</div>
    </template>
    </Panel>
    <!-- Panel 2 -->
    <Panel
      :status="`${1000 / update_interval_ms} HZ`"
      class="panel-realtimedata gap-1"
      data-layout="focus instructor pilot"
    >
         <template #Real-Time-Data display="Real Time Data">
       <SimDataDisplay
    ref="dataDisplayRef"
    :sim-props="getSimulationParameters(FlightSimModule)"
    :plotPause="FlightSimModule.simData.api_simulation_pause"
    :plotUpdateIntervals="update_interval_ms"
    v-if="sim_module_loaded"
  />
</template>

    </Panel>
    <!-- Panel 3 -->
    <Panel
    v-if="sim_module_loaded"
      :status="FlightSimModule.simData.api_simulation_pause ? `PAUSED` : FlightSimModule.simData.api_simulation_speed == 1 ? `RUNNING` :`${FlightSimModule.simData.api_simulation_speed}x`"
      :active="FlightSimModule.simData.api_simulation_pause || FlightSimModule.simData.api_simulation_speed != 1"
      :flash="FlightSimModule.simData.api_simulation_pause"
      class="panel-simulationcontrols"
      data-layout="focus instructor pilot"
    >
    <template #Simulation>
      <div  v-if="sim_module_loaded" class="w-full h-full grid grid-cols-3 gap-1">
        <wButton
          class="border border-simElementBorder col-span-1"
          buttonLabel="Fullscreen"
          :buttonClick="toggleFullscreen"
          />
          <wButton
          v-for="(input, i) in Object.values(simulationProps).filter(v => v.group === 'simulation' && v.setterFunc && ['boolean', 'void'].includes(v.type)).sort((a) => a.type == 'boolean' || a.type == 'void' ? -1 : 1)"
          :key="i"
          :buttonLabel="input.label"
          :buttonClick="() => input.setterFunc?.()"
          :button-state="input.inputValue == 1"
          class="border border-simElementBorder"
          :class="!['boolean', 'void'].includes(input.type) ? 'col-span-3' : ''"
        />
        <ButtonSwitch
        v-for="(input, i) in Object.values(simulationProps).filter(v => v.group === 'simulation' && v.setterFunc && !['boolean', 'void'].includes(v.type)).sort((a) => a.type == 'boolean' || a.type == 'void' ? -1 : 1)"
          :key="i"
          :buttonLabel="input.label"
          :buttonClick="() => input.setterFunc?.()"
          :textInput="input.inputValue"
          :inputChange="input.setterFunc"
          :button-state="input.type === 'boolean' && input.inputValue == 1"
          :inputMin="input.min"
          :inputMax="input.max"
          :inputStep="input.step"
          class="border border-simElementBorder col-span-3"
        >
        </ButtonSwitch>
        <wButton buttonLabel="Instructor Layout" :button-state="layout == 'instructor'" :buttonClick="() => setLayout('instructor')" />
        <wButton buttonLabel="Pilot Layout" :button-state="layout == 'pilot'" :buttonClick="() => setLayout('pilot')" />
        <wButton buttonLabel="Focus Layout" :button-state="layout == 'focus'" :buttonClick="() =>setLayout('focus')" />
      </div>
      </template>
    </Panel>
          <!-- Panel 4 -->
  <Panel
  class="panel-learningmodules"
  data-layout="instructor"
  :status=scriptComponentStatus
  :active="scriptComponentStatus != 'IDLE'">

<template #Learning-Modules>
      <Editor
        v-if="sim_module_loaded && dataDisplayRef && classroomComponentRef"
        :context-object="FlightSimModule"
        :simProps="simulationProps"
        :utility-funcs="{
          plotView:dataDisplayRef.setPlotView,
          dataView:dataDisplayRef.setDataView,
          dataDisplayReset: dataDisplayRef.reset,
          notifyUser: simFunctions.notifyUser,
          checkPoint: classroomComponentRef.sendCheckPoint}"
        @start="(_code: string) => {
          scriptComponentStatus = 'IN-PROGRESS';
        }"
        @reset="scriptComponentStatus = 'IDLE'"
        @error="(error: any) => {
          simFunctions.notifyUser('Editor Error', error, 5000);
          scriptComponentStatus = 'ERROR';
        }"
        @broadcastScript="(title:string, content:string) => {classroomComponentRef?.sendScript(title, content)}"
        class="w-full h-full"
        ref="editorComponentRef"
      />
</template>
  </Panel>
    <!-- Panel 5 -->
    <Panel
    v-if="sim_module_loaded"
      :status="FlightSimModule.simData.api_autopilot ? 'Engaged' : 'Disengaged'"
      class="panel-autopilot"
      data-layout="instructor pilot"
    >
    <template #Autopilot>
  <div class="w-full h-full grid grid-cols-4 gap-1 auto-rows-fr">
    <div class="col-span-1 grid grid-cols-1 gap-1 auto-rows-fr">
      <wButton
      v-if="sim_module_loaded"
      v-for="(input, i) in autopilotControlsButtons"
      :key="i"
      class="border border-simElementBorder w-full h-full"
      :buttonLabel="input.label"
      :buttonClick="() => input.stateCommand.setterFunc()"
      :buttonState="input.stateCommand.value"
    ></wButton>
    </div>
  <div class="col-span-3 grid grid-cols-3 gap-1 auto-rows-fr">
    <button-switch
      v-if="sim_module_loaded"
      v-for="(input, i) in autopilotControlsButtonsInputs"
      :key="i"
      class="border border-simElementBorder w-full h-full"

      :buttonClick="
        () => {
          input.stateCommand.setterFunc();
        }
      "
      :buttonState="input.stateCommand.value"
      :buttonLabel="input.label.replace('Hold', '').replace('Angle', '').trim()"
      :textInput="input.targetCommand?.value"
      :inputChange="
        (newVal: number) => {
          input.targetCommand?.setterFunc(newVal);
        }
      "
      :inputMin="input.targetCommand?.min"
      :inputMax="input.targetCommand?.max"
      :inputStep="input.targetCommand?.step"
    ></button-switch>
    </div>
  </div>
</template>

    </Panel>
    <!-- Panel 6 -->
    <Panel status="Running"
    class="panel-flightmodel"
    data-layout="instructor pilot">
      <template #Flight-Model>
      <div class="w-full max-h-full grid gap-1">
        <template
          v-if="sim_module_loaded"
          v-for="sim_group in Object.values(simulationProps).filter(v => v.setterFunc !== undefined).reduce((acc: Record<string, SimulationProperties[]>, item: SimulationProperties) => {

            // Group by label
            const parentKey = item.group;
            if (!acc[parentKey]) {
              acc[parentKey] = [];
            }
            // Push the item to the corresponding group
            acc[parentKey].push(item)
            return acc;
          }, {} as Record<string, SimulationProperties[]>)"
        >
          <span class="font-bold">{{ sim_group[0].group.toUpperCase() }}</span>
          <!-- label + control -->
          <div
            v-for="sim_prop in Object.values(sim_group)"
            :key="sim_prop.id"
            class="flex items-center pl-1 border border-simElementBorder"
          >
            <span class="w-3/5">
              {{ sim_prop.label }} <span v-if="sim_prop.unit">({{ sim_prop.unit }})</span>
            </span>
            <wInput
            v-if="!['boolean', 'void'].includes(sim_prop.type)"
              type="number"
              class="bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary w-2/5"
              :textInput="sim_prop.inputValue"
              :inputChange="sim_prop.setterFunc"
              :inputMin="sim_prop.min"
              :inputMax="sim_prop.max"
              :inputStep="sim_prop.step"
            />
            <wButton
              v-else-if="['boolean', 'void'].includes(sim_prop.type)"
              class="border-l border-simElementBorder w-2/5 text-left pl-1"
              :class="sim_prop.inputValue ? 'bg-simActiveButton text-primary' : 'text-secondary'"
              :buttonLabel="sim_prop.inputValue ? 'On' : 'Off'"
              :buttonClick="() => sim_prop.setterFunc?.()"
              :buttonState="sim_prop.stateValue"
              />

             <!-- Enum Input -->



          </div>

        </template>
      </div>
      </template>
    </Panel>
    <!-- Panel 7 -->
    <Panel
      :status="classRoomComponentState ? 'Online' : 'Offline'"
      class="panel-classroom"
      data-layout="instructor pilot"
      :active="classRoomComponentState"
      >
      <template #ClassRoom>
        <div class="flex flex-col h-full w-full">
          <Accounts
          v-if="sim_module_loaded"
          @onLogin="(url: string, authToken: string) => {
            FlightSimModule.api_check_licence(url, authToken);
          }"
          @onLogout="() => {
            FlightSimModule.api_check_licence('', '');
          }"
          ref="accountsComponentRef" />
          <ClassRoom
          v-if="dataDisplayRef"
            @apiDataEvent="(receivedApiCall: PeerApiData) => manager.handleIncomingMessage(receivedApiCall?.api)"
            @apiScriptEvent="(receviedScript: PeerScriptData) => editorComponentRef?.executeExternalCode(receviedScript.tite, receviedScript.script)"
            ref="classroomComponentRef"
            @classroomConnection='(isOnline) => {
              classRoomComponentState = isOnline;
              // if the connection to the server is established, create a proxy object that mirrors all actions
              if (isOnline === true) {
                // todo, enable broadcast only if instructor
                // Rationale: student does not send data
                manager = new RemoteCallManager(broadcast);
                manager.wrapObject("SimFunctions", simFunctions, ["notifyUser"]);
                manager.wrapObject("FlightSimModule", FlightSimModule, ["api_set", "onKeydown", "onKeyup"]);

                if (dataDisplayRef) {
                  manager.wrapObject("dataDisplayRef", dataDisplayRef, ["setDataView", "setPlotView", "reset"]);
                }
                if (editorComponentRef) {
                manager.wrapObject("editorComponentRef", editorComponentRef, ["reset"]);
                }

                // Dont mirror checkPoint, it defies its purpose. checkpoint is meant to be used as indicator when a simulaton
                // manager.wrapObject("classroomComponentRef", classroomComponentRef, ["sendCheckPoint"])
              }
            }'
          />
        </div>
    </template>
  </Panel>
      <!-- Panel 8 -->
  <Panel
      :status="userPromptStatus"
      :active="userPromptActive"
      class="panel-userprompt"
      data-layout="focus instructor pilot"
      >
      <template #Prompt>
          <MarkDown
          class="w-full h-full p-1"
          :content="userPromptText"
          />
    </template>
  </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, onBeforeMount } from "vue";
import Panel from "./Panel.vue";
import ButtonSwitch from "./ButtonSwitch.vue";
import wButton from "./wButton.vue"
import wInput from "./wInput.vue"
import ClassRoom from "./ClassRoom.vue";
import Accounts from "./Accounts.vue";
import SimDataDisplay from './DataDisplay.vue'
import MarkDown from "./MarkDown.vue";
import { RemoteCallManager, RemoteCall, RemoteEvent } from '../RemoteCallManager';

//import PeerData from "./ClassRoom.vue";
// import NacaAirfoil from "./NacaAirfoil.vue";
import {
  initializeModule,
  fetchSimData,
  SimData,
  SimulationProperties,
  getAutopilotProperties,
  getSimulationParameters,
  ExtendedMainModule
} from "../siminterfac.ts";

import Editor, { ScriptStatus } from "./Editor.vue";

// Define a decorator function
function broadcast(call: RemoteCall | RemoteEvent) {
  if (classroomComponentRef.value) {
    classroomComponentRef.value.sendApiCall(JSON.stringify(call));
  }
}


function setLayout(mode: typeof layout.value) {
  layout.value = mode
  // delay a resize event to allow components to adjust
  // This is needed resize event is not dispatched when component size change but the window size stay the same
  // So the openGL context will not resize.
  // The delay is to ensure the DOM has updated before the resize event is dispatched
  setTimeout(() => {
  window.dispatchEvent(new Event('resize'))
  }, 20)

}

const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    await fullscreenContainer.value?.requestFullscreen()
  } else {
    await document.exitFullscreen()
  }
}

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

function simulationStatus(): string {
  let status: string;
  if (!FlightSimModule) {
    status = "Loading";
  } else if (FlightSimModule.simData.api_simulation_pause) {
    status = "Paused";
  } else if (FlightSimModule.simData.api_ground_collision) {
    simFunctions.notifyUser("Collision Detected", "The aircraft has collided with the ground.", 5000);
    status = "Collision";
  } else if (FlightSimModule.simData.api_simulation_speed == 1) {
    status = isLicenceValid.value ? "Running" : "Trial";
  } else {
    status = `${FlightSimModule.simData.api_simulation_speed}x`;
  }

   if (classroomComponentRef.value) {
    classroomComponentRef.value.sendStatus(status);
  }

  return status;
}

// These functions will be mirrored to the clients
// They need to be inside an object to have a path.
const simFunctions = {
notifyUser : function(title: string, message: string, time: number = 500) {
  // icon for the notification
  userPromptStatus.value = "☀︎"
  userPromptText.value = `## ${title}\n\n${message || ""}`
  // set Prompt status to New for 3 seconds then revert to empty
  userPromptActive.value = true;
  setTimeout(() => {
    userPromptActive.value = false
  }, time);

    },

// Logic to reset components, triggered with simulation module is reset
resetComponents : function() {
  // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
    editorComponentRef.value?.reset();
    classroomComponentRef.value?.reset();
    dataDisplayRef.value?.reset();
    markdownRef.value?.reset();
}
}


let FlightSimModule: ExtendedMainModule;
// let utilsFuncs: any;
let sim_module_loaded = ref(false);
let isLicenceValid = ref(false);
let classRoomComponentState = ref(false);
let scriptComponentStatus = ref<ScriptStatus>("IDLE");
const update_interval_ms = 200;
const userPromptText = ref<string>("");
const userPromptStatus = ref<string>("----");
const userPromptActive = ref<boolean>(false);
const isFullscreen = ref(false);
const fullscreenContainer = ref<HTMLElement | null>(null)
const layout = ref<'focus' | 'instructor' | 'pilot'>('instructor');


// Components refs
const classroomComponentRef = ref<InstanceType<typeof ClassRoom> | null>(null); // Use the ClassRoom component type
const editorComponentRef = ref<InstanceType<typeof Editor> | null>(null); // Use the Editor component type
const dataDisplayRef = ref<InstanceType<typeof SimDataDisplay> | null>(null); // Use the SimDataDisplay component type
const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null); // Use the MarkDown component type
const accountsComponentRef = ref<InstanceType<typeof Accounts> | null>(null); // Use the Accounts component type

let autopilotControlsButtons: ReturnType<
  typeof computed<ReturnType<typeof getAutopilotProperties>>
>;

let autopilotControlsButtonsInputs: ReturnType<
  typeof computed<ReturnType<typeof getAutopilotProperties>>
>;


let simulationProps: ReturnType<
  typeof computed<ReturnType<typeof getSimulationParameters>>
>;

let simUpdateInterval: number | undefined;
let manager: RemoteCallManager;

// Lifecycle hooks
onMounted(async () => {
  initializeModule({
    canvas: (() => {
      const canvas = document.getElementById("canvas");
      return canvas;
    })(),
    notifyUser: simFunctions.notifyUser, // to be called from c++
    resetComponents: simFunctions.resetComponents, // to be called from c++
    onLicenceState: (LicenceState: boolean) => isLicenceValid.value = LicenceState, // Update licence state
  })
    .then((module) => {
      module.simData = reactive(new SimData());
      FlightSimModule = module;
      FlightSimModule.GLFW.requestFullscreen = toggleFullscreen; // Replace with custom implementation

      simulationProps = computed(() =>
        getSimulationParameters(FlightSimModule),
      );

      autopilotControlsButtons = computed(() =>
        getAutopilotProperties(FlightSimModule).filter(item => item.targetCommand === undefined),
      );
      autopilotControlsButtonsInputs = computed(() =>
        getAutopilotProperties(FlightSimModule).filter(item => item.targetCommand !== undefined),
      );

      // key presses are handled inside the canvas only
      window.removeEventListener(
        "keydown",
        FlightSimModule.GLFW.onKeydown,
        true,
      );
      window.removeEventListener(
        "keypress",
        FlightSimModule.GLFW.onKeyPress,
        true,
      );
      window.removeEventListener("keyup", FlightSimModule.GLFW.onKeyup, true);
      window.removeEventListener("blur", FlightSimModule.GLFW.onBlur, true);
      const canvas = document.getElementById("canvas");
      canvas?.focus();
      canvas?.addEventListener("keydown", (e) => {
        FlightSimModule.GLFW.onKeydown(e)}
        , true);
      canvas?.addEventListener("keyup", (e) => FlightSimModule.GLFW.onKeyup(e), true);

      function isTextInput() {
        const activeElement = document.activeElement;
        return (
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement)?.isContentEditable
        );
      }

      window.addEventListener(
        "blur",
        (_event) => {
          // When defocuses (blur), revert back to canvas to enable keyboard controls
          setTimeout(() => {
            if (document.activeElement == canvas || isTextInput()) {
              return;
            }
            canvas?.focus();
          }, 1000);
        },
        true,
      );

      document.addEventListener('fullscreenchange', onFullscreenChange)
      sim_module_loaded.value = true;
      simFunctions.notifyUser("Flight Sim", `Version: ${FlightSimModule.FLIGHTMODEL_VERSION}`,2000)
      simUpdateInterval = setInterval(() => {
        fetchSimData(FlightSimModule);
        dataDisplayRef.value?.tickPlot();
      }, update_interval_ms);
    })
    .catch(console.error);
});

onBeforeMount(() => {
  document.removeEventListener('fullscreenchange', () => isFullscreen.value = document.fullscreenElement !== null);;
});

onUnmounted(() => {
  clearInterval(simUpdateInterval);
  document.removeEventListener('fullscreenchange', onFullscreenChange)
});
</script>



<style scoped>

/* Hide panels not participating in the active layout */
.container.layout-focus > *:not([data-layout~="focus"]) {
  display: none;
}

.container.layout-instructor > *:not([data-layout~="instructor"]) {
  display: none;
}

.container.layout-pilot > *:not([data-layout~="pilot"]) {
  display: none;
}

/* ===== Instructor LAYOUT ===== */
.container.layout-instructor {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: repeat(6, 1fr);
  grid-template-areas:
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "autopilot userprompt simulationcontrols"
    "learningmodules classroom flightmodel"
    "learningmodules classroom flightmodel";
}

/* ===== Pilot LAYOUT ===== */
.container.layout-pilot {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: repeat(6, 1fr);
  grid-template-areas:
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt simulationcontrols"
    "cockpit userprompt flightmodel"
    "autopilot classroom flightmodel"
}

/* ===== Focus LAYOUT ===== */
.container.layout-focus {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: repeat(6, 1fr);
  grid-template-areas:
    "realtimedata cockpit userprompt"
    "realtimedata cockpit userprompt"
    "realtimedata cockpit userprompt"
    "realtimedata cockpit userprompt"
    "realtimedata cockpit userprompt"
    "realtimedata simulationcontrols userprompt";
}

/* Panel bindings */
.panel-cockpit { grid-area: cockpit; }
.panel-realtimedata { grid-area: realtimedata; }
.panel-simulationcontrols { grid-area: simulationcontrols; }
.panel-learningmodules { grid-area: learningmodules; }
.panel-autopilot { grid-area: autopilot; }
.panel-flightmodel { grid-area: flightmodel; }
.panel-classroom { grid-area: classroom; }
.panel-userprompt { grid-area: userprompt; }

/* Canvas fit */
#canvas {
  object-fit: contain;
}
</style>
