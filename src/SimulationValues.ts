import type { Ref } from 'vue'
import type { SimulationProperties } from './wasm/siminterface'

/** Link freshly created metadata getters to the UI tick without caching their readings.
 * Metadata stays stable; scripts and plots still read the simulator's current value.
 * Only use on newly built definitions, not on an already shared catalog.
 */
export function trackSimulationValues<T extends Record<string, SimulationProperties>>(
  properties: T,
  refresh: Readonly<Ref<number>>,
): T {
  for (const property of Object.values(properties)) {
    const descriptor = Object.getOwnPropertyDescriptor(property, 'inputValue')
    const read = descriptor?.get
    if (!read) continue
    Object.defineProperty(property, 'inputValue', {
      ...descriptor,
      get() {
        refresh.value
        return read.call(property)
      },
    })
  }
  return properties
}
