import {
  reverseIdleEntry,
  forwardIdleExit,
  engineIdleThrottlePosition,
} from './B747ThrottleDetents'

const clamp = (value: number) => Math.max(0, Math.min(1, value))

/** Forward-throttle span of the engine channel above ground idle (0.26 .. 1). */
const engineThrottleSpan = 1 - engineIdleThrottlePosition

/** The slider handle always lives on the single combined 0–1 axis. */
export function sliderFromThrottle(axis: number) {
  return clamp(axis)
}

/**
 * Rebuild the combined axis from the engine's readback channels.
 *
 * The WASM setters move one physical lever: set_engine_throttle_reverser_position
 * places throttle at engineIdleThrottlePosition * (1 - reverser), and any throttle
 * write stows the reverser to zero. The reverser channel therefore describes the
 * reverse region entirely, and the throttle channel covers idle and forward.
 */
export function sliderFromReadback(throttle: number, reverser: number) {
  const reversal = clamp(reverser)
  if (reversal > 0.001) return reverseIdleEntry * (1 - reversal)
  const forward = clamp((throttle - engineIdleThrottlePosition) / engineThrottleSpan)
  return forwardIdleExit + (1 - forwardIdleExit) * forward
}

/**
 * Translate the combined axis into the one engine channel that represents it.
 *
 * Reverse writes only the reverser channel; the engine couples the throttle to
 * 0.26 * (1 - reverser) itself. Idle and forward write only the throttle channel,
 * which also stows the reverser, so the two setters never fight: whichever one is
 * written last fully defines the lever, and only one is ever written per move.
 */
export function throttleFromSlider(position: number, reverseSupported: boolean) {
  const axis = clamp(position)
  if (!reverseSupported) return { throttle: axis }
  if (axis < reverseIdleEntry) {
    return { reverseCommand: clamp((reverseIdleEntry - axis) / reverseIdleEntry) }
  }
  return {
    throttle:
      engineIdleThrottlePosition +
      engineThrottleSpan * clamp((axis - forwardIdleExit) / (1 - forwardIdleExit)),
  }
}
