<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ aircraftType: string }>()
// Source: Compact-Flight-Simulator v0.1.19, graphics::processNormalKeys and
// b747/c172::processNormalKeys. The WASM bindings do not export a keyboard command registry.
// Keep this reference aligned with those handlers when updating the WASM build.
const groups = computed(() => [
  {
    name: 'Flight controls',
    rows: [
      ['W / ↑', 'Elevator Up (Pitch Up)'],
      ['S / ↓', 'Elevator Down (Pitch Down)'],
      ['A / ←', 'Aileron Left (Roll Left)'],
      ['D / →', 'Aileron Right (Roll Right)'],
      ['Shift + W / ↑', 'Elevator Trim Up (Pitch Up)'],
      ['Shift + S / ↓', 'Elevator Trim Down (Pitch Down)'],
      ['Shift + A / ←', 'Rudder Left (Yaw Left)'],
      ['Shift + D / →', 'Rudder Right (Yaw Right)'],
      ['F', 'Center aileron and rudder'],
    ],
  },
  {
    name: 'Engine & configuration',
    rows: [
      ['F1', props.aircraftType === 'B747' ? 'Set throttle to idle' : 'Set throttle to 20%'],
      ['F2', 'Decrease throttle'],
      ['F3', 'Increase throttle'],
      ['F4', 'Full throttle'],
      ['F5', 'Retract flaps'],
      ['F6', 'Previous flap setting'],
      ['F7', 'Next flap setting'],
      ['F8', 'Fully extend flaps (30°)'],
      ...(props.aircraftType === 'B747'
        ? [
            ['G', 'Cycle landing gear selector'],
            ['Shift + .', 'Toggle parking brake'],
          ]
        : []),
    ],
  },
  {
    name: 'Simulation',
    rows: [
      ['P', 'Pause / resume simulation'],
      ['H', 'Reset simulation'],
      ['Esc', 'Request window close (native handler; no browser tab close)'],
    ],
  },
  {
    name: 'App controls',
    rows: [
      ['L', 'Cycle panel layouts'],
      ['Ctrl + Shift + F', 'Toggle fullscreen'],
      ['Esc', 'Return keyboard focus to the cockpit'],
    ],
  },
])
</script>

<template>
  <div
    class="h-full overflow-auto bg-panelContentBackground p-1.5 font-mono text-[11px] leading-tight text-secondary"
    @click.stop
  >
    <section v-for="group in groups" :key="group.name" class="mb-1.5">
      <h3
        class="border-b border-panelBorder py-0.5 text-[10px] uppercase tracking-wider opacity-70"
      >
        {{ group.name }}
      </h3>
      <dl>
        <div
          v-for="[keys, action] in group.rows"
          :key="keys"
          class="grid grid-cols-[minmax(105px,0.8fr)_minmax(0,1.6fr)] items-center gap-x-1.5 py-0.5"
        >
          <dt class="command-label" :aria-label="keys">
            <span class="flex min-w-0 flex-wrap items-center gap-0.5">
              <template v-for="(part, index) in keys.split(/ (\+|\/) /)" :key="index">
                <span
                  v-if="part === '+' || part === '/'"
                  class="px-0.5 opacity-60"
                  aria-hidden="true"
                  >{{ part }}</span
                >
                <kbd v-else class="command-key" aria-hidden="true">{{ part }}</kbd>
              </template>
            </span>
          </dt>
          <dd>{{ action }}</dd>
        </div>
      </dl>
    </section>
    <p class="text-[10px] opacity-60">
      Flight control keys adjust values incrementally. F centers aileron and rudder only; elevator
      and trim remain unchanged.
    </p>
  </div>
</template>

<style scoped>
.command-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.command-label::after {
  content: '';
  flex: 1;
  min-width: 12px;
  border-bottom: 1px dotted currentColor;
  opacity: 0.4;
}

.command-key {
  display: inline-block;
  min-width: 1.3em;
  padding: 0 4px;
  border: 1px solid rgb(var(--color-simElementBorder));
  border-bottom-width: 2px;
  border-radius: 3px;
  background: rgb(var(--color-simInputBackground));
  color: inherit;
  font: inherit;
  font-size: 10px;
  line-height: 15px;
  text-align: center;
  white-space: nowrap;
}
</style>
