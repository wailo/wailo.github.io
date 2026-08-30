import type { SimulationProperties } from './wasm/siminterface'

export function isPlottableSimulationProperty(property?: SimulationProperties): boolean {
  if (!property) return false
  if (property.type === 'number' || property.type === 'boolean') return true

  return Boolean(
    property.type === 'enum' &&
    property.enumValues?.length &&
    property.enumValues.every(
      ({ enumValue }) => typeof enumValue === 'number' && Number.isFinite(enumValue),
    ),
  )
}
