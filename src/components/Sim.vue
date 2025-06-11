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
      <div class="w-full h-full grid grid-cols-3 gap-1">
        <ButtonSwitch
        v-if="sim_module_loaded"
          class="border border-simElementBorder col-span-1"
          buttonLabel="Focus Mode"
          :buttonClick="toggleFullscreen"
          />
        <ButtonSwitch
          v-if="sim_module_loaded"
          v-for="(input, i) in Object.values(simulationProps).filter(v => v.group === 'simulation' && (v.setterFunc || v.toggleFunc)).sort((a) => a.toggleFunc != undefined ? -1 : 1)"
          :key="i"
          :buttonLabel="input.label"
          :buttonClick="
            () => {
              input.toggleFunc?.();
            }
          "
          :textInput="input.setterFunc? input.inputValue : undefined"
          :inputChange="
            (newVal: number) => {
              input.setterFunc?.(newVal);
            }
          "
          :button-state="input.stateValue"
          :inputMin="input.min"
          :inputMax="input.max"
          :inputStep="input.step"
          class="border border-simElementBorder"
          :class="input.hasOwnProperty('setterFunc') ? 'col-span-3' : ''"
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
        :plotViewFunc="dataDisplayRef?.setPlotView || (() => {})"
        :dataViewFunc="dataDisplayRef?.setDataView || (() => {})"
        :notifyUserFunc="notifyUser"
        @start="(_code) => {
          scriptComponentStatus = 'IN-PROGRESS';
        }"
        @reset="scriptComponentStatus = 'IDLE'"
        @error="(error) => {
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
      <button-switch
      v-if="sim_module_loaded"
      v-for="(input, i) in autopilotControlsButtons"
      :key="i"
      class="border border-simElementBorder w-full h-full"
      :buttonLabel="input.label"
      :textInput="input.inputValue"
      :buttonClick="
        () => {
          input.toggleFunc?.();
        }
      "
      :inputChange="
        (newVal: number) => {
          input.setterFunc?.(newVal);
        }
      "
      :buttonState="input.stateValue"
      :inputMin="input.min"
      :inputMax="input.max"
      :inputStep="input.step"
    ></button-switch>
    </div>
  <div class="col-span-3 grid grid-cols-3 gap-1 auto-rows-fr">
    <button-switch
      v-if="sim_module_loaded"
      v-for="(input, i) in autopilotControlsButtonsInputs"
      :key="i"
      class="border border-simElementBorder w-full h-full"
      :buttonLabel="input.label.replace('Hold', '').replace('Angle', '').trim()"
      :textInput="input.inputValue"
      :buttonClick="
        () => {
          input.toggleFunc?.();
        }
      "
      :inputChange="
        (newVal: number) => {
          input.setterFunc?.(newVal);
        }
      "
      :buttonState="input.stateValue"
      :inputMin="input.min"
      :inputMax="input.max"
      :inputStep="input.step"
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
          <h3>{{ sim_group[0].group.toUpperCase() }}</h3>
          <button-switch
            class="border border-simElementBorder ml-1"
            v-for="sim_prop in Object.values(sim_group)"
            key="sim_prop.id"
            :buttonLabel="sim_prop.label"
            :textInput="sim_prop.inputValue"
            :inputChange="
              (newVal: number) => {
                sim_prop.setterFunc?.(newVal);
              }
            "
            :inputMin="sim_prop.min"
            :inputMax="sim_prop.max"
            :inputStep="sim_prop.step"
          ></button-switch>
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

      <ClassRoom
        @api-data-event="(receivedApiCall: PeerData) => executeIncomingApiCode(receivedApiCall?.api)"
        ref="classroomComponentRef"
        @status-changed="(newStatus) => (classRoomComponentState = newStatus)"
    />
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
import ClassRoom from "./ClassRoom.vue";
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
} from "../siminterfac.js";

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

// todo: complete this implentation
// // Logic to reset components, triggered with simulation module is reset
// const resetComponents = () => {
//   // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
//   console.log("Resetting components");
//     editorComponentRef.value?.reset();
//     // classroomComponentRef.value?.reset();
//     // displayRef.value?.reset();
//     // markdownRef.value?.reset();
// };

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
// const markdownRef = ref<InstanceType<typeof MarkDown> | null>(null); // Use the MarkDown component type

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
        getAutopilotProperties(FlightSimModule).filter(item => item.inputValue === undefined),
      );
      autopilotControlsButtonsInputs = computed(() =>
        getAutopilotProperties(FlightSimModule).filter(item => item.inputValue !== undefined),
      );

      sim_module_loaded.value = true;
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
