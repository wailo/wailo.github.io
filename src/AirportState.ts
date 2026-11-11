import type { graphics } from './wasm/generated/flightsimulator_exec'

/** One approach as the Airport panel renders it. */
export interface AirportApproachView {
  key: string
  runwayIndex: number
  endIndex: number
  runwayName: string
  endName: string
  courseTrueDeg: number
  glideslopeDeg: number
  tchM: number
  lengthM: number
  widthM: number
  displacedM: number
}

/** The airport-world data that is only available while a world is loaded. */
export interface AirportWorldView {
  datum: { lat: number; lon: number }
  approaches: AirportApproachView[]
  selectedKey: string | null
}

/** A render-ready snapshot of the airport and approach state. */
export interface AirportView {
  airportVisible: boolean
  airportName: string
  airportId: string
  world: AirportWorldView | null
}

export const approachKey = (runwayIndex: number, endIndex: number) => `${runwayIndex}:${endIndex}`

/**
 * Header status for the Airport surface. Identity belongs to the loaded world:
 * without one the name/id bindings have nothing meaningful to read, so they
 * are reported as absent rather than echoed.
 */
export function airportStatus(view: AirportView | null): string {
  if (!view) return 'LOADING'
  if (!view.world) return 'NO AIRPORT'
  return view.airportId || view.airportName || 'NO AIRPORT'
}

/**
 * Embind getters are not reactive, so the caller resamples this on the UI tick.
 * The approach list is read through size()/get(); the embind iterator is not
 * used because the generated wrapper does not guarantee it is initialized.
 */
export function snapshotAirport(simulation: graphics): AirportView {
  const world = simulation.world
  let worldView: AirportWorldView | null = null

  if (world) {
    const approaches: AirportApproachView[] = []
    const count = world.approaches.size()
    for (let index = 0; index < count; index += 1) {
      const approach = world.approaches.get(index)
      if (!approach) continue
      approaches.push({
        key: approachKey(approach.runway_index, approach.end_index),
        runwayIndex: approach.runway_index,
        endIndex: approach.end_index,
        runwayName: approach.runway_name,
        endName: approach.end_name,
        courseTrueDeg: approach.course_true_deg,
        glideslopeDeg: approach.glideslope_deg,
        tchM: approach.tch_m,
        lengthM: approach.length_m,
        widthM: approach.width_m,
        displacedM: approach.displaced_m,
      })
    }

    const selected = world.selected_approach
    worldView = {
      datum: { lat: world.datum.lat, lon: world.datum.lon },
      approaches,
      selectedKey: selected ? approachKey(selected.runway_index, selected.end_index) : null,
    }
  }

  return {
    airportVisible: simulation.airport_visible,
    airportName: simulation.airport_name,
    airportId: simulation.airport_id,
    world: worldView,
  }
}
