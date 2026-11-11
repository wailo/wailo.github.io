<script setup lang="ts">
import { computed } from 'vue'
import AirportBody from './AirportBody.vue'
import Panel from './Panel.vue'
import { airportStatus, type AirportView } from '../AirportState'
import type { SimulationProperties } from '../wasm/siminterface'

const props = withDefaults(
  defineProps<{
    airport: AirportView | null
    layers?: SimulationProperties[]
  }>(),
  {
    layers: () => [],
  },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'select-approach', runwayIndex: number, endIndex: number): void
  (event: 'toggle-layer', layer: SimulationProperties): void
  (event: 'set-airport-visible', visible: boolean): void
}>()

const airportVisible = computed(() => props.airport?.airportVisible ?? false)
const status = computed(() => airportStatus(props.airport))
</script>

<template>
  <Panel :status="status" :active="airportVisible">
    <template #header-actions>
      <button
        type="button"
        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
        title="Close airport"
        aria-label="Close airport"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </template>

    <template #Airport>
      <AirportBody
        :airport="props.airport"
        :layers="props.layers"
        @select-approach="
          (runwayIndex: number, endIndex: number) => emit('select-approach', runwayIndex, endIndex)
        "
        @toggle-layer="(layer: SimulationProperties) => emit('toggle-layer', layer)"
        @set-airport-visible="(visible: boolean) => emit('set-airport-visible', visible)"
      />
    </template>
  </Panel>
</template>
