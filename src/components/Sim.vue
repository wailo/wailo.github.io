<template>
  <div class="container max-w-full h-screen gap-2 p-5 bg-simBackground">
    <!-- Panel 1 -->
    <Panel
      title="Cockpit"
      :status="
        sim_data.api_ground_collision
          ? 'Collision'
          : sim_data.api_simulation_pause
            ? 'Pause'
            : 'Running'
      "
      :flash="sim_data.api_ground_collision"
      class="panel-1"
    >
    
    <div id="canvas-container">
<canvas class=emscripten id=canvas oncontextmenu=event.preventDefault() tabindex=-1></canvas>
</div>
    </Panel>
    <!-- Panel 2 -->
    <Panel
      title="Real Time Data"
      :status="`${1000 / update_interval_ms} HZ`"
      class="panel-2"
    >
      <table class="flex w-full h-full p-2">
        <tbody class="w-full">
          <tr
            class="flex w-full border-b border-simElementBorder"
            v-for="sim_display_item in sim_data_display"
            :key="sim_display_item.key"
          >
            <td class="font-medium w-4/5">{{ sim_display_item.label }}</td>
            <td class="w-1/5">{{ sim_data[sim_display_item.key] }}</td>
          </tr>
        </tbody>
      </table>
    </Panel>
    <!-- Panel 3 -->
    <Panel
      title="Simulation"
      :status="`${sim_data.api_fps} HZ`"
      :active="false"
      :flash="sim_data.api_simulation_pause"
      class="panel-3"
    >
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
    </Panel>
    <!-- Panel 4 -->
    <Panel
      title="Scripting"
      :status="scriptComponentStatus"
      class="panel-4"
      :active="scriptComponentStatus != 'IDLE'"
    >
      <Editor
        v-if="sim_module_loaded"
        :context-object="FlightSimModule"
        :data-object="sim_data"
        @start="(_code) => {
          // broadcast(code)
          scriptComponentStatus = 'RUNNING'

        }"
        @reset="scriptComponentStatus = 'IDLE'"
        @error="(error) => {
          notifyUser('Editor Error', error, 5000)
          scriptComponentStatus = 'ERROR'}"
        class="w-full h-full"
        ref="editorComponentRef"
      >
      </Editor>
    </Panel>
    <!-- Panel 5 -->
    <Panel
      title=" Autopilot"
      :status="sim_data.api_autopilot ? 'Engaged' : 'Disengaged'"
      class="panel-5"
    >
      <div class="w-full h-full grid grid-cols-3 gap-1">
        <button-switch
          v-if="sim_module_loaded"
          class="border border-simElementBorder"
          v-for="(input, i) in autopilotProps"
          :key="i"
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
          :class="input.inputValue == undefined ? 'col-span-3' : ''"
        ></button-switch>
      </div>
    </Panel>
    <!-- Panel 6 -->
    <Panel title="Flight Model" status="Default" class="panel-6">
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
    </Panel>
    <!-- Panel 7 -->
    <Panel
      title="Classroom"
      :status="classRoomComponentState ? 'Online' : 'Offline'"
      class="panel-7"
      :active="classRoomComponentState"
      ><ClassRoom
        @api-data-event="(receivedApiCall: PeerData) => executeCode(receivedApiCall?.api)"
        ref="classroomComponentRef"
        @status-changed="(newStatus) => (classRoomComponentState = newStatus)"
    /></Panel>
    <Panel title="map" class="" style="grid-area: panel8">
      <!-- <\!-- <NacaAirfoil/> -\-> -->
      <iframe
        width="425"
        height="350"
        src="https://www.openstreetmap.org/export/embed.html?bbox=103.9678716659546%2C1.3397807641972048%2C104.0070104598999%2C1.370799877695522&amp;layer=mapnik"
        style="border: 1px solid black"
      ></iframe
    ></Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import Panel from "./Panel.vue";
import ButtonSwitch from "./ButtonSwitch.vue";
import ClassRoom from "./ClassRoom.vue";
//import PeerData from "./ClassRoom.vue";
// import NacaAirfoil from "./NacaAirfoil.vue";
import { MainModule } from "../../public/flightsimulator_exec.js";
import {
  initializeModule,
  fetchSimData,
  SimData,
  getAutopilotProperties,
  getSimulationParameters,
} from "../siminterfac.js";
import Editor, { ScriptStatus } from "./Editor.vue";

// Define a decorator function
function broadcast(code: string) {
  if (classroomComponentRef.value) {
    classroomComponentRef.value.sendApiCall(code);
  }
}

function notifyUser(title: string, message: string, _time: number) {
      alert(`${title}: ${message}`);
    }

const executeCode = (code: string) => {
  eval(`FlightSimModule.${code}`);
};

// // Logic to reset components, triggered with simulation module is reset
// const resetComponents = () => {
//   // Called when user invoke reset from a button, still can't tell if keyboard is pressed.
//   if (editorComponentRef.value) 
//   { 
//     editorComponentRef.value.reset();
//   }
// };

let FlightSimModule: MainModule;
const sim_data = reactive(new SimData());
let sim_module_loaded = ref(false);
let classRoomComponentState = ref(false);
let scriptComponentStatus = ref<ScriptStatus>("IDLE");
const update_interval_ms = 200;

// Components refs
const classroomComponentRef = ref<InstanceType<typeof ClassRoom> | null>(null); // Use the ClassRoom component type
const editorComponentRef = ref<InstanceType<typeof Editor> | null>(null); // Use the Editor component type



let autopilotProps: ReturnType<
  typeof computed<ReturnType<typeof getAutopilotProperties>>
>;
let simulationProps: ReturnType<
  typeof computed<ReturnType<typeof getSimulationParameters>>
>;
let simUpdateInterval: number | undefined;

type SimDataKeys = keyof typeof sim_data;

const sim_data_display: { key: SimDataKeys; label: string }[] = [
  { key: "api_fps", label: "Frames Per Second" },
  { key: "api_ups", label: "Update Per Second" },
  { key: "api_simulation_speed", label: "Simulation Speed" },
  { key: "api_ground_collision", label: "Ground Collision" },
  { key: "api_weight", label: "Weight" },
  { key: "api_altitude", label: "Altitude" },
  { key: "api_vertical_speed", label: "Vertical Speed" },
  { key: "api_alpha_tail", label: "Elevator" },
  { key: "api_alpha_aileron", label: "Aileron" },
  { key: "api_throttle", label: "Throttle" },
  { key: "api_ias_speed_knots", label: "IAS Speed" },
  { key: "api_heading_deg", label: "Heading" },
  { key: "api_pitch_deg", label: "Pitch" },
  { key: "api_bank_deg", label: "Bank" },
  { key: "api_simulation_pause", label: "Simulation Pause" },
  { key: "api_autopilot", label: "Autopilot Master Switch" },
  {
    key: "api_atmosphere_sea_level_temperature",
    label: "Sea Level Temperature",
  },
  { key: "api_atmosphere_sea_level_density", label: "Sea Level Density" },
  { key: "api_thrust_to_weight", label: "Thrust To Weight" },
  { key: "api_wing_area", label: "Wing Area" },
  { key: "api_true_speed_knots", label: "True Airspeed" },
  { key: "api_mach", label: "Mach" },
  { key: "api_vstall_speed_knots", label: "Vstall Speed" },
  { key: "api_atmosphere_temperature", label: "Atmosphere Temperature" },
  { key: "api_atmosphere_density", label: "Atmosphere Density" },
  { key: "api_total_drag", label: "Total Drag" },
  { key: "api_cl", label: "Lift Coefficient" },
  { key: "api_cdi", label: "Drag Coefficient" },

  // {key: 'api_heading_hold', label: 'Heading_hold'},
  // {key: 'api_bank_hold', label: 'Bank_hold'},
  // {key: 'api_level_hold', label: 'Level_hold'},
  // {key: 'api_speed_hold', label: 'Speed_hold'},
  // {key: 'api_mach_speed_hold', label: 'Mach_speed_hold'},
  // {key: 'api_altitude_hold', label: 'Altitude_hold'},
  // {key: 'api_vertical_speed_hold', label: 'Vertical_speed_hold'},
  // {key: 'api_target_heading_deg', label: 'Target_heading_deg'},
  // {key: 'api_target_bank_deg', label: 'Target_bank_deg'},
  // {key: 'api_target_altitude', label: 'Target_altitude'},
  // {key: 'api_target_vertical_speed', label: 'Target_vertical_speed'},
  // {key: 'api_target_speed', label: 'Target_speed'},
  // {key: 'api_target_mach_speed', label: 'Target_mach_speed'},
  // {key: 'api_cl0', label: 'Cl0'},
  // {key: 'api_cdo', label: 'Cdo'},
];

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
      autopilotProps = computed(() =>
        getAutopilotProperties(FlightSimModule, sim_data),
      );
      simulationProps = computed(() =>
        getSimulationParameters(FlightSimModule, sim_data),
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

      simUpdateInterval = setInterval(() => {
        fetchSimData(FlightSimModule, sim_data);
      }, update_interval_ms);
    })
    .catch(console.error);
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
    "panel5 panel7 panel6"
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

/* #canvas {
  background-color: transparent;
  width: 100%;
  height: 100%;
  object-fit: contain;
} */

#canvas-container {
      /*position: absolute;*/
      top: 0;
      left: 0;
      padding: 0;
      border: 0 none;
      margin: 0;
      width: 100%;
      height: 100%;
      display: flex;
    }
</style>
