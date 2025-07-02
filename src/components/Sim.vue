<template>
  <div  class="container max-w-full h-screen gap-2 p-5 bg-simBackground">
    <!-- Panel 1 -->
    <Panel
      :status="simulationStatus()"
      :flash="FlightSimModule?.simData?.api_simulation_pause || FlightSimModule?.simData?.api_ground_collision"
      :active="FlightSimModule?.simData?.api_simulation_pause || FlightSimModule?.simData?.api_ground_collision"
      class="panel-1"
    >
    <template #Cockpit>
      <div id="fullscreen-container" class="flex w-full h-full bg-simBackground">
  <!-- MarkDown -->
  <div
    v-if="isFullscreen"
    id="overlay"
    class="flex flex-col w-2/6 min-w-0 overflow-hidden h-full border-r border-Sim border-SimElementBorder p-1"
  >
    <!-- Top half -->
    <div class="flex-1 overflow-y p-2 border-b border-SimElementBorder">
      <MarkDown :content="userPromptText" />
    </div>

    <!-- Todo: Add -->
    <!-- Bottom half -->
    <!-- <div class="flex-2 overflow-y-auto p-2">
      <SimDataDisplay
    :sim-props="getSimulationParameters(FlightSimModule)"
    :plotPause="FlightSimModule.simData.api_simulation_pause"
    :plotUpdateIntervals="update_interval_ms"
    v-if="sim_module_loaded"
  />
    </div> -->
  </div>

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
      class="panel-2 gap-1"
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
      class="panel-3"
    >
    <template #Simulation>
      <div  v-if="sim_module_loaded" class="w-full h-full grid grid-cols-3 gap-1">
        <wButton
          class="border border-simElementBorder col-span-1"
          buttonLabel="Focus Mode"
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
      </div>
      </template>
    </Panel>
          <!-- Panel 4 -->
  <Panel class="panel-4" :status=scriptComponentStatus  :active="scriptComponentStatus != 'IDLE'">

<template #Learning-Modules>
      <Editor
        v-if="sim_module_loaded"
        :context-object="FlightSimModule"
        :simProps="simulationProps"
        :utility-funcs="{
          plotView:dataDisplayRef?.setPlotView || (() => {}),
          dataView: dataDisplayRef?.setDataView || (() => {}),
          dataDisplayReset: dataDisplayRef?.reset || (() => {}),
          notifyUser: notifyUser,
          checkPoint: (content:string) => classroomComponentRef?.sendStatus(content)}"
        @start="(_code: string) => {
          scriptComponentStatus = 'IN-PROGRESS';
        }"
        @reset="scriptComponentStatus = 'IDLE'"
        @error="(error: any) => {
          notifyUser('Editor Error', error, 5000);
          scriptComponentStatus = 'ERROR';
        }"
        class="w-full h-full"
        ref="editorComponentRef"
      />
</template>
  </Panel>
    <!-- Panel 5 -->
    <Panel
    v-if="sim_module_loaded"
      :status="FlightSimModule.simData.api_autopilot ? 'Engaged' : 'Disengaged'"
      class="panel-5"
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
    <Panel status="Running" class="panel-6">
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
      class="panel-7"
      :active="classRoomComponentState"
      >
      <template #ClassRoom>
        <div class="flex flex-col h-full w-full">
          <Accounts
          ref="accountsComponentRef" />
          <ClassRoom
            @apiDataEvent="(receivedApiCall: PeerApiData) => executeIncomingApiCode(receivedApiCall?.api || '')"
            ref="classroomComponentRef"
            @status-changed="(newStatus) => (classRoomComponentState = newStatus)"
          />
        </div>
    </template>
  </Panel>
      <!-- Panel 8 -->
  <Panel
      :status="userPromptStatus"
      :active="userPromptActive"
      class="panel-8"
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
function broadcast(code: string) {
  if (classroomComponentRef.value) {
    classroomComponentRef.value.sendApiCall(code);
  }
}

const toggleFullscreen = () => {
      const container = document.getElementById('fullscreen-container');
      if (!document.fullscreenElement) {
        // Request fullscreen on the container div
        container?.requestFullscreen().then(() => {
          // You can do something once fullscreen is activated (optional)
        }).catch(err => {
          console.error('Error attempting to enter fullscreen:', err);
        });
      } else {
        // Exit fullscreen
        document.exitFullscreen().then(() => {
          // Optionally handle exiting fullscreen
        }).catch(err => {
          console.error('Error attempting to exit fullscreen:', err);
        });
      }
    }

function simulationStatus() {
  if (!FlightSimModule) return "Loading";
  if (FlightSimModule.simData.api_simulation_pause) return "Paused";
  if (FlightSimModule.simData.api_ground_collision) {
      notifyUser("Collision Detected", "The aircraft has collided with the ground.", 5000);
      return "Collision Detected";
  }

  if (FlightSimModule.simData.api_simulation_speed == 1) {
    return `${FlightSimModule?.simData?.api_fps} FPS`;
  }
  else {
    return `${FlightSimModule.simData.api_simulation_speed}x`;
  }
}
function notifyUser(title: string, message: string, time: number = 500) {
  // icon for the notification
  userPromptStatus.value = "☀︎"
  userPromptText.value = `## ${title}\n\n${message}`
  // set Prompt status to New for 3 seconds then revert to empty
  userPromptActive.value = true;
  setTimeout(() => {
    userPromptActive.value = false
  }, time);

    }

const executeIncomingApiCode = (code: string) => {
  manager.handleIncomingMessage(code);
};

// Logic to reset components, triggered with simulation module is reset
const resetComponents = () => {
  // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
  console.log("Resetting components");
    editorComponentRef.value?.reset();
    classroomComponentRef.value?.reset();
    dataDisplayRef.value?.reset();
    markdownRef.value?.reset();
};

let FlightSimModule: ExtendedMainModule;
let sim_module_loaded = ref(false);
let classRoomComponentState = ref(false);
let scriptComponentStatus = ref<ScriptStatus>("IDLE");
const update_interval_ms = 200;
const userPromptText = ref<string>("");
const userPromptStatus = ref<string>("----");
const userPromptActive = ref<boolean>(false);
const isFullscreen = ref(false);

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
    notifyUser: notifyUser, // to be called from c++
    resetComponents: resetComponents, // to be called from c++
  })
    .then((module) => {
      module.simData = reactive(new SimData());
      manager = new RemoteCallManager((call: RemoteCall | RemoteEvent) => broadcast(JSON.stringify(call)), module);
      FlightSimModule = manager.createMirroredProxy([], module);
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
        manager.sendKeyMirror(e)
        FlightSimModule.GLFW.onKeydown(e)}
        , true);
      canvas?.addEventListener("keyup", FlightSimModule.GLFW.onKeyup, true);

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

      document.addEventListener('fullscreenchange', () => isFullscreen.value = document.fullscreenElement !== null);
      sim_module_loaded.value = true;
      notifyUser("Flight Sim", `Version: ${FlightSimModule.FLIGHTMODEL_VERSION}`,2000)
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
});
</script>

<style scoped>
.container {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: repeat(6, 1fr);
  /* Define grid areas */
  grid-template-areas:
    "panel1 panel8 panel2"
    "panel1 panel8 panel2"
    "panel1 panel8 panel2"
    "panel5 panel8 panel3"
    "panel4 panel7 panel6"
    "panel4 panel7 panel6";
}

.panel-1 {
  grid-area: panel1;
}

.panel-2 {
  grid-area: panel2;
}

.panel-3 {
  grid-area: panel3;
}

.panel-4 {
  grid-area: panel4;
}

.panel-5 {
  grid-area: panel5;
}

.panel-6 {
  grid-area: panel6;
}

.panel-7 {
  grid-area: panel7;
}

.panel-8 {
  grid-area: panel8;
}
 #canvas {
  object-fit: contain;
}

</style>
