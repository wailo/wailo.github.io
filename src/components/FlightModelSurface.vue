<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue'
import Panel from './Panel.vue'
import Joystick, { type JoystickInput } from './Joystick.vue'
import wButton from './wButton.vue'
import wInput from './wInput.vue'
import type { SimulationProperties } from '../wasm/siminterface'

type JoystickProps = InstanceType<typeof Joystick>['$props']

const props = withDefaults(
  defineProps<{
    groups: Record<string, SimulationProperties[]>
    joystickProps: JoystickProps
    status?: string
    variant?: 'panel' | 'drawer'
    panelId?: string
    translucent?: boolean
  }>(),
  {
    status: 'UNKNOWN',
    variant: 'panel',
    panelId: 'flight-model',
    translucent: false,
  },
)

const emit = defineEmits<{
  (event: 'maximize', panelId: string): void
  (event: 'close'): void
  (event: 'joystick-input', changes: Partial<JoystickInput>): void
}>()

const flightModelFilter = ref('')
const filteredGroupedSimProps = computed(() => {
  const query = flightModelFilter.value.trim().toLocaleLowerCase()
  return Object.entries(props.groups)
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
  collapsedFlightModelGroups.value = new Set(Object.keys(props.groups))
  saveCollapsedFlightModelGroups()
}

const expandAllFlightModelGroups = () => {
  collapsedFlightModelGroups.value = new Set()
  saveCollapsedFlightModelGroups()
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

onBeforeMount(() => {
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
</script>

<template>
  <Panel
    :panel-id="props.variant === 'panel' ? props.panelId : ''"
    :status="props.status"
    :translucent="props.translucent"
    @header-dblclick="props.variant === 'panel' && emit('maximize', props.panelId)"
  >
    <template #header-actions>
      <button
        v-if="props.variant === 'drawer'"
        type="button"
        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
        title="Close controls"
        aria-label="Close controls"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </template>

    <template #Controls>
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

        <template v-for="[groupName, simGroup] in filteredGroupedSimProps" :key="groupName">
          <button
            type="button"
            class="sticky top-6 z-10 grid h-5 w-full grid-cols-[1rem_minmax(0,1fr)_3rem] items-center border-b border-simElementBorder bg-panelHeaderBackground px-1 text-left font-bold text-secondary"
            :aria-expanded="flightModelFilter !== '' || !collapsedFlightModelGroups.has(groupName)"
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
                :buttonLabel="sim_prop.inputValue ? 'ON' : 'OFF'"
                :buttonClick="() => sim_prop.setterFunc?.()"
                :buttonState="sim_prop.inputValue as boolean"
                :boolean-status="true"
              />
            </div>
            <div v-else-if="sim_prop.type === 'void'" class="min-h-0 min-w-0">
              <wButton
                class="h-full w-full min-w-0 overflow-hidden text-ellipsis"
                buttonLabel=""
                :buttonClick="() => sim_prop.setterFunc?.()"
                :momentary="true"
              />
            </div>
            <!-- Enum Input -->
            <label
              v-else-if="sim_prop.type === 'enum' && sim_prop.enumValues"
              class="flightmodel-value enum-control relative flex min-w-0 cursor-pointer items-stretch border border-simElementBorder bg-simInputBackground"
              @click="openEnumPicker"
            >
              <select
                class="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent px-1 text-secondary outline-none"
                :value="sim_prop.inputValue"
                @change="
                  (e) => {
                    const value = (e.target as HTMLSelectElement).value
                    const selected = sim_prop.enumValues?.find((v) => String(v.enumValue) === value)
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
              <span class="enum-chevron" aria-hidden="true">⌄</span>
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
        v-bind="props.joystickProps"
        :translucent="props.translucent"
        @input="(changes: Partial<JoystickInput>) => emit('joystick-input', changes)"
        class="w-full h-full p-1"
      />
    </template>
  </Panel>
</template>
