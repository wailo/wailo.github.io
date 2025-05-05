<template>
  <div class="container max-w-full h-screen gap-2 p-5 bg-simBackground">
    <!-- Panel 1 -->
    <Panel
      :status="
        sim_data.api_ground_collision
          ? 'Collision'
          : `${sim_data.api_fps} FPS`
      "
      :flash="sim_data.api_ground_collision"
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

    <!-- Bottom half -->
    <div class="flex-2 overflow-y-auto p-2">
      <SimDataDisplay
    ref="displayRef"
    v-model:items="simulationDisplayData"
    :sim-data="sim_data"
    v-if="sim_module_loaded"
  />
    </div>
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
      class="panel-2"
    >
    <template #Real-Time-Data display="Real Time Data">
      <SimDataDisplay
    ref="displayRef"
    v-model:items="simulationDisplayData"
    :sim-data="sim_data"
    v-if="sim_module_loaded"
  />

      </template>
    </Panel>
    <!-- Panel 3 -->
    <Panel
      :status="sim_data.api_simulation_speed == 1 ? `RUNNING` :`${sim_data.api_simulation_speed}x`"
      :active="sim_data.api_simulation_speed != 1"
      :flash="sim_data.api_simulation_pause"
      class="panel-3"
    >
    <template #Simulation>
      <div class="w-full h-full grid grid-cols-3 gap-1">
        <ButtonSwitch
          v-if="sim_module_loaded"
          v-for="(input, i) in simulationProps.Simulation"
          :key="i"
          :buttonLabel="input.label"
          :buttonClick="
            () => {
              input.toggleFunc?.();
              if (input.toggleFuncStr) {
                broadcast(input.toggleFuncStr());
              }
            }
          "
          :textInput="input.inputValue"
          :inputChange="
            (newVal: number) => {
              input.setterFunc?.(newVal);
              if (input.setterFuncStr) {
                broadcast(input.setterFuncStr(String(newVal)));
              }
            }
          "
          :button-state="input.stateValue"
          :inputMin="input.min"
          :inputMax="input.max"
          :inputStep="input.step"
          class="border border-simElementBorder"
          :class="input.hasOwnProperty('inputValue') ? 'col-span-3' : ''"
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
        :data-object="sim_data"
        :display-data="simulationDisplayData"
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
      :status="sim_data.api_autopilot ? 'Engaged' : 'Disengaged'"
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
          if (input.toggleFuncStr) {
            broadcast(input.toggleFuncStr());
          }
        }
      "
      :inputChange="
        (newVal: number) => {
          input.setterFunc?.(newVal);
          if (input.setterFuncStr) {
            broadcast(input.setterFuncStr(String(newVal)));
          }
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
      :buttonLabel="input.label"
      :textInput="input.inputValue"
      :buttonClick="
        () => {
          input.toggleFunc?.();
          if (input.toggleFuncStr) {
            broadcast(input.toggleFuncStr());
          }
        }
      "
      :inputChange="
        (newVal: number) => {
          input.setterFunc?.(newVal);
          if (input.setterFuncStr) {
            broadcast(input.setterFuncStr(String(newVal)));
          }
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
          v-for="parentKey in Object.keys(simulationProps).filter(
            (key) => key != 'Simulation',
          )"
          :key="parentKey"
        >
          <!-- <h3>{{ parentKey }}</h3> -->
          <button-switch
            class="border border-simElementBorder"
            v-for="(input, i) in simulationProps[parentKey]"
            :key="i"
            :buttonLabel="input.label"
            :textInput="input.inputValue"
            :inputChange="
              (newVal: number) => {
                input.setterFunc?.(newVal);
                if (input.setterFuncStr) {
                  broadcast(input.setterFuncStr(String(newVal)));
                }
              }
            "
            :inputMin="input.min"
            :inputMax="input.max"
            :inputStep="input.step"
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
        @api-data-event="(receivedApiCall: PeerData) => executeCode(receivedApiCall?.api)"
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

//import PeerData from "./ClassRoom.vue";
// import NacaAirfoil from "./NacaAirfoil.vue";
import {
  initializeModule,
  fetchSimData,
  SimData,
  getAutopilotProperties,
  getSimulationParameters,
  simulationDataDisplay,
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
function notifyUser(title: string, message: string, _time: number) {
  // icon for the notification
  userPromptStatus.value = "☀︎"
  userPromptText.value = `## ${title}\n\n${message}`
  // set Prompt status to New for 3 seconds then revert to empty
  userPromptActive.value = true;
  setTimeout(() => {

    userPromptActive.value = false
  }, 200);

    }

const executeCode = (_code: string) => {
  return
  // if (typeof code === "string" && /^[a-zA-Z0-9_.$]+$/.test(code)) {
  //   const func = code.split('.').reduce((obj, key) => obj?.[key], FlightSimModule);
  //   if (typeof func === "function") {
  //     func();
  //   } else {
  //     console.error("Invalid function or property in code:", code);
  //   }
  // } else {
  //   console.error("Invalid or unsafe code:", code);
  // }
};

// Logic to reset components, triggered with simulation module is reset
const resetComponents = () => {
  // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
  console.log("Resetting components");
  if (editorComponentRef.value)
  {
    editorComponentRef.value.reset();
  }
};

let FlightSimModule: ExtendedMainModule;
let sim_data = reactive(new SimData());
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

let autopilotControlsButtons: ReturnType<
  typeof computed<ReturnType<typeof getAutopilotProperties>>
>;

let autopilotControlsButtonsInputs: ReturnType<
  typeof computed<ReturnType<typeof getAutopilotProperties>>
>;


let simulationProps: ReturnType<
  typeof computed<ReturnType<typeof getSimulationParameters>>
>;

const simulationDisplayData = ref(simulationDataDisplay)

let simUpdateInterval: number | undefined;

// Lifecycle hooks
onMounted(async () => {
  initializeModule({
    canvas: (() => {
      const canvas = document.getElementById("canvas");
      return canvas;
    })(),
    notifyUser: notifyUser
  })
    .then((module) => {
      FlightSimModule = module;
      FlightSimModule.GLFW.requestFullscreen = toggleFullscreen; // Replace with custom implementation

      autopilotControlsButtons = computed(() =>
        getAutopilotProperties(FlightSimModule, sim_data).filter(item => item.inputValue === undefined),
      );
      autopilotControlsButtonsInputs = computed(() =>
        getAutopilotProperties(FlightSimModule, sim_data).filter(item => item.inputValue !== undefined),
      );

      simulationProps = computed(() =>
        getSimulationParameters(FlightSimModule, sim_data, resetComponents),
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
      canvas?.addEventListener("keydown", FlightSimModule.GLFW.onKeydown, true);
      canvas?.addEventListener(
        "keypress",
        FlightSimModule.GLFW.onKeyPress,
        true,
      );
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
        fetchSimData(FlightSimModule, sim_data);
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
    "panel1 panel8 panel3"
    "panel5 panel8 panel6"
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
