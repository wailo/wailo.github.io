<template>
  <!-- <div  class="container max-w-full h-screen gap-2 p-5 bg-simBackground"> -->

      <div
    ref="fullscreenContainer"
    class="container max-w-full h-screen gap-1 p-1 bg-simBackground"
    :class="`layout-${layout}`">
    <!-- Panel 1 -->
    <Panel
      :status="simulationStatus()"
      :flash="FlightSimModule?.simulation.simulation_pause"
      :active="FlightSimModule?.simulation.simulation_pause"
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
    :simProps="{...simulationControlsProps,...flightModelProps}"
    :plotPause="FlightSimModule.simulation.simulation_pause"
    :plotUpdateIntervals="update_interval_ms"
    v-if="sim_module_loaded"
  />
</template>

    </Panel>
    <!-- Panel 3 -->
    <Panel
    v-if="sim_module_loaded"
      :status="FlightSimModule.simulation.simulation_pause ? `PAUSED` : FlightSimModule.simulation.simulation_speed == 1 ? `RUNNING` :`${FlightSimModule.simulation.simulation_speed}x`"
      :active="FlightSimModule.simulation.simulation_pause || FlightSimModule.simulation.simulation_speed != 1"
      :flash="FlightSimModule.simulation.simulation_pause"
      class="panel-simulationcontrols"
      data-layout="focus"
    >
    <template #Simulation>
      <div  v-if="sim_module_loaded" class="w-full h-full grid grid-cols-3 gap-1">
          <wButton
          v-for="(input) in Object.values(simulationControlsProps)
  .flatMap(arr => arr).filter((v: SimulationProperties) => v.group === 'simulation' && v.setterFunc && ['boolean', 'void'].includes(v.type)).sort((a: SimulationProperties) => a.type == 'boolean' || a.type == 'void' ? -1 : 1)"
          :key="input.id"
          :buttonLabel="input.label"
          :buttonClick="() => input.setterFunc?.()"
          :button-state="input?.inputValue as boolean"
          class="border border-simElementBorder"
          :class="!['boolean', 'void'].includes(input.type) ? 'col-span-3' : ''"
        />
        <ButtonSwitch
        v-for="input in Object.values(simulationControlsProps).filter(v => v.setterFunc && !['boolean', 'void'].includes(v.type)).sort((a) => a.type == 'boolean' || a.type == 'void' ? -1 : 1)"
          :key="input.id"
          :buttonLabel="input.label"
          :buttonClick="() => input.setterFunc?.()"
          :textInput="input?.inputValue"
          :inputChange="input.setterFunc"
          :button-state="input.type === 'boolean' && input?.inputValue == 1"
          :inputMin="input.min"
          :inputMax="input.max"
          :inputStep="input.step"
          class="border border-simElementBorder col-span-3"
        >
        </ButtonSwitch>
      </div>
      </template>
    </Panel>

           <!-- Panel 2 -->
  <Panel
  class="panel-learningmodules"
  data-layout="instructor"
  :status=scriptComponentStatus
  :active="scriptComponentStatus != 'IDLE'">

<template #Learning-Modules>
      <Editor
        v-if="sim_module_loaded && dataDisplayRef && classroomComponentRef"
        :context-object="FlightSimModule"
        :simProps="flightModelProps"
        :is-dark-mode="isDarkMode"
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
      :status="FlightSimModule.flightModel.autopilot_master_switch ? 'Engaged' : 'Disengaged'"
      :active="FlightSimModule.flightModel.autopilot_master_switch"
      class="panel-autopilot"
      data-layout="instructor pilot"
    >
    <template #Autopilot>
  <div class="w-full h-full">
  <div class="col-span-1 grid grid-cols-4 gap-1">
    <button-switch
      v-if="sim_module_loaded"
      v-for="(input, i) in autopilotControls"
      :key="i"
      class="border border-simElementBorder w-full"

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
    <Panel :status="FlightSimModule.flightModel.name"
    v-if="sim_module_loaded"
    class="panel-flightmodel"
    data-layout="instructor pilot">
      <template #Flight-Model>
      <div class="w-full max-h-full grid gap-1">
        <template
          v-if="sim_module_loaded"
          v-for="sim_group in groupedSimProps"
        >
          <span class="font-bold text-secondary">{{ sim_group[0].group.toUpperCase() }}</span>
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
            v-if="sim_prop.type === 'number'"
              type="number"
              class="bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary w-2/5"
              :textInput="sim_prop.inputValue as number"
              :inputChange="sim_prop.setterFunc"
              :inputMin="sim_prop.min"
              :inputMax="sim_prop.max"
              :inputStep="sim_prop.step"
            />
            <wButton
              v-else-if="sim_prop.type === 'boolean'"
              class="border-l border-simElementBorder w-2/5 text-left pl-1"
              :class="sim_prop.inputValue ? 'bg-simActiveButton text-primary' : 'text-secondary'"
              :buttonLabel="sim_prop.inputValue ? 'On' : 'Off'"
              :buttonClick="() => sim_prop.setterFunc?.()"
              :buttonState="sim_prop.inputValue as boolean"
              />
   <wButton
              v-else-if="sim_prop.type === 'void'"
              class="border-l border-simElementBorder w-2/5 text-left pl-1"
              :class="sim_prop.inputValue ? 'bg-simActiveButton text-primary' : 'text-secondary'"
              buttonLabel="▶"
              :buttonClick="() => sim_prop.setterFunc?.()"
              />
             <!-- Enum Input -->
        <select
    v-else-if="sim_prop.type === 'enum' && sim_prop.enumValues"
    class="bg-simInputBackground border-l border-simElementBorder pl-1 h-full text-secondary w-2/5"
    :value="sim_prop.inputValue"
  @change="(e) => {
    const num = Number((e.target as HTMLSelectElement).value)
    const selected = sim_prop.enumValues?.find(v => v.enumValue === num)
    sim_prop.setterFunc?.(selected?.enumValue)
  }"
  >
    <option
      v-for="value in sim_prop.enumValues"
      :key="value.enumValue"
      :value="value.enumValue"
    >
      {{ value.enumName }}
    </option>
  </select>



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
          @onLogin="(url: string, authToken: string) => FlightSimModule.check_licence(url, authToken)"
          @onLogout="() => FlightSimModule.check_licence('', '')"
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
                manager.wrapObject("FlightSimModule", FlightSimModule, ["onKeydown", "onKeyup"]);
                manager.wrapObject("FlightSimModule.simulation", FlightSimModule.simulation, ["set", "reset"]);
                manager.wrapObject("FlightSimModule.flightModel", FlightSimModule.flightModel, ["set"]);

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
import { ComputedRef, computed, ref, onMounted, onUnmounted, onBeforeMount } from "vue";
import Panel from "./Panel.vue";
import ButtonSwitch from "./ButtonSwitch.vue";
import wButton from "./wButton.vue"
import wInput from "./wInput.vue"
import ClassRoom from "./ClassRoom.vue";
import Accounts from "./Accounts.vue";
import SimDataDisplay from './DataDisplay.vue'
import MarkDown from "./MarkDown.vue";
import { RemoteCallManager, RemoteCall, RemoteEvent } from '../RemoteCallManager';

import {
  initializeModule,
  fetchSimData,
  SimulationProperties,
  AutopilotProperties,
  getFlightModelParameters,
  getSimulationControlsParameters,
  getAutopilotProperties,
  ExtendedMainModule,
} from "../wasm/siminterface.ts";

import Editor, { ScriptStatus } from "./Editor.vue";
import { MainModule } from "../../src/wasm/generated/flightsimulator_exec";


const renderSignal = ref(0);



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
    window.dispatchEvent(new Event('resize'))
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
  } else if (FlightSimModule.simulation.simulation_pause) {
    status = "Paused";
  }
  // else if (FlightSimModule.api_ground_collision) {
  //   simFunctions.notifyUser("Collision Detected", "The aircraft has collided with the ground.", 5000);
  //   status = "Collision";
  // }
  else if (FlightSimModule.simulation.simulation_speed == 1) {
    status = isLicenceValid.value ? `Running` : "Trial";
  } else {
    status = `${FlightSimModule.simulation.simulation_speed}x`;
  }

   if (classroomComponentRef.value) {
    classroomComponentRef.value.sendStatus(status);
  }

  return status;
}

// These functions will be mirrored to the clients
// They need to be inside an object to have a path.
const simFunctions = {
notifyUser : function(title: string, message?: string, time: number = 500) {
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

let GLFWModule : MainModule;
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
const isDarkMode = ref(true);

// Initialize theme from localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  isDarkMode.value = savedTheme === 'dark';
  applyTheme(isDarkMode.value);
};

const applyTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light');
};

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  applyTheme(isDarkMode.value);
};


// Components refs
const classroomComponentRef = ref<InstanceType<typeof ClassRoom> | null>(null); // Use the ClassRoom component type
const editorComponentRef = ref<InstanceType<typeof Editor> | null>(null); // Use the Editor component type
const dataDisplayRef = ref<InstanceType<typeof SimDataDisplay> | null>(null); // Use the SimDataDisplay component type
const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null); // Use the MarkDown component type
// const accountsComponentRef = ref<InstanceType<typeof Accounts> | null>(null); // Use the Accounts component type

// Layout controls as computed
const layoutControls = computed(() => ({
  toggle_fullscreen: {
    id: 'fullscreen',
    type: 'void' as const,
    label: 'Fullscreen',
    setterFunc: () => toggleFullscreen(),
    group: 'simulation'
  },
  instructor_layout: {
    id: 'instructor_layout',
    type: 'void' as const,
    label: 'Instructor Layout',
    inputValue: layout.value === 'instructor',
    setterFunc: () => setLayout('instructor'),
    group: 'simulation',
  },
  pilot_layout: {
    id: 'pilot_layout',
    type: 'void' as const,
    label: 'Pilot Layout',
    inputValue: layout.value === 'pilot',
    setterFunc: () => setLayout('pilot'),
    group: 'simulation',
  },
  focus_layout: {
    id: 'focus_layout',
    type: 'void' as const,
    label: 'Focus Layout',
    inputValue: layout.value === 'focus',
    setterFunc: () => setLayout('focus'),
    group: 'simulation',
  },
  toggle_theme: {
    id: 'toggle_theme',
    type: 'void' as const,
    label: isDarkMode.value ? 'Light' : 'Dark',
    setterFunc: () => toggleTheme(),
    group: 'simulation',
  },
}));

let autopilotControls : ComputedRef<ReturnType<typeof getAutopilotProperties>>;
let flightModelProps : ComputedRef<ReturnType<typeof getFlightModelParameters>>;
let simulationControlsProps : ComputedRef<ReturnType<typeof getSimulationControlsParameters>>;
let groupedSimProps: ComputedRef<Record<string, SimulationProperties[]>>;
//
// groupedSimProps = computed(() => {
//   const all = { ...simulationControlsProps.value, ...flightModelProps.value };
//   return Object.values(all).filter(v => v.setterFunc !== undefined).reduce((acc: Record<string, SimulationProperties[]>, item: SimulationProperties) => {
//     // Group by group
//     const parentKey = item.group;
//     if (!acc[parentKey]) {
//       acc[parentKey] = [];
//     }
//     // Push the item to the corresponding group
//     acc[parentKey].push(item);
//     return acc;
//   }, {} as Record<string, SimulationProperties[]>);
// });

let simUpdateInterval: ReturnType<typeof setInterval>;
let manager: RemoteCallManager;

// Lifecycle hooks
onBeforeMount(() => {
  initializeTheme();
});

onMounted(async () => {
  initializeModule({
    locateFile: (path: string, prefix: string) => {
  if (path.endsWith('.wasm') || path.endsWith('.data')) {
    // In Vite, files in /public are accessed via the root '/'
    // use import.meta.env.BASE_URL to handle subdirectories automatically
    const base = import.meta.env.BASE_URL; // Usually '/'
    // Remove any leading slash from the path to avoid '//'
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return base + cleanPath;
  }
  return prefix + path;
},
    canvas: (() => {
      const canvas = document.getElementById("canvas");
      return canvas;
    })(),
    notifyUser: simFunctions.notifyUser, // to be called from c++
    resetComponents: simFunctions.resetComponents, // to be called from c++
    onLicenceState: (LicenceState: boolean) => isLicenceValid.value = LicenceState, // Update licence state
  })
    .then((modules) => {
      GLFWModule = modules[0]
      FlightSimModule = modules[1];
      GLFWModule.GLFW.requestFullscreen = toggleFullscreen; // Replace with custom implementation

      initFlightModelParams()

      // key presses are handled inside the canvas only
      window.removeEventListener(
        "keydown",
        GLFWModule.GLFW.onKeydown,
        true,
      );
      window.removeEventListener(
        "keypress",
        GLFWModule.GLFW.onKeyPress,
        true,
      );
      window.removeEventListener("keyup", GLFWModule.GLFW.onKeyup, true);
      window.removeEventListener("blur", GLFWModule.GLFW.onBlur, true);
      const canvas = document.getElementById("canvas");
      canvas?.focus();
      canvas?.addEventListener("keydown", (e) => {
        GLFWModule.GLFW.onKeydown(e)}
        , true);
      canvas?.addEventListener("keyup", (e) => GLFWModule.GLFW.onKeyup(e), true);

      function isTextInput() {
        const activeElement = document.activeElement;
        return (
          activeElement?.role === "textbox" ||
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.tagName === "SELECT" ||
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
      simFunctions.notifyUser("Flight Sim", `SIM: ${FlightSimModule.FLIGHTMODEL_VERSION}
      UI: ${import.meta.env.VITE_GIT_SHA}`,2000)
      simUpdateInterval = setInterval(() => {
        renderSignal.value++;
        fetchSimData(FlightSimModule, initFlightModelParams);
        dataDisplayRef.value?.tickPlot();
      }, update_interval_ms);
    })
    .catch(console.error);
});


onUnmounted(() => {
  clearInterval(simUpdateInterval);
  document.removeEventListener('fullscreenchange', onFullscreenChange)
});

function initFlightModelParams() {
  flightModelProps = computed(() => {renderSignal.value; return getFlightModelParameters(FlightSimModule.flightModel); });
  autopilotControls = computed(() => { renderSignal.value; return getAutopilotProperties(FlightSimModule.flightModel).sort((a: AutopilotProperties, b: AutopilotProperties) => (a.targetCommand === undefined ? 0 : 1) - (b.targetCommand === undefined ? 0 : 1));});
  simulationControlsProps = computed(() => { renderSignal.value; const base = getSimulationControlsParameters(FlightSimModule); return { ...base, ...layoutControls.value }; });

  groupedSimProps = computed(() => {
  const all = { ...simulationControlsProps.value, ...flightModelProps.value };
  return Object.values(all).filter((v: SimulationProperties) => v.setterFunc !== undefined).reduce((acc: Record<string, SimulationProperties[]>, item: SimulationProperties) => {
    // Group by group
    const parentKey = item.group;
    if (!acc[parentKey]) {
      acc[parentKey] = [];
    }
    // Push the item to the corresponding group
    acc[parentKey].push(item);
    return acc;
  }, {} as Record<string, SimulationProperties[]>);
});
}
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
  grid-template-rows: repeat(8, 1fr);
  grid-template-areas:
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "autopilot userprompt realtimedata"
    "learningmodules classroom flightmodel"
    "learningmodules classroom flightmodel"
    "learningmodules classroom flightmodel"
    "learningmodules classroom flightmodel"
    "learningmodules classroom flightmodel";
}

/* ===== Pilot LAYOUT ===== */
.container.layout-pilot {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: repeat(8, 1fr);
  grid-template-areas:
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt realtimedata"
    "cockpit userprompt flightmodel"
    "cockpit userprompt flightmodel"
    "cockpit userprompt flightmodel"
    "autopilot classroom flightmodel"
}

/* ===== Focus LAYOUT ===== */
.container.layout-focus {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: repeat(8, 1fr);
  grid-template-areas:
    "realtimedata cockpit userprompt"
    "realtimedata cockpit userprompt"
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
