/** Combined input-axis boundaries used by b747_engines::process_throttle_input. */
export const reverseIdleEntry = 0.25
export const forwardIdleExit = 0.3
export const idleDetentCenter = (reverseIdleEntry + forwardIdleExit) / 2

/**
 * Ground-idle position of b747 engine_throttle_position, in engine units.
 *
 * Verified against the WASM model: a fresh B747 reports 0.26, the throttle
 * setter clamps anything below it to 0.26, and the reverser setter positions
 * the throttle channel at 0.26 * (1 - reverser). The binding's editor clamp
 * (min 0.25, shown in the meta) is not the engine's floor.
 */
export const engineIdleThrottlePosition = 0.26

export function describeB747Throttle(axis: number) {
  const value = Math.max(0, Math.min(1, axis))
  if (value < reverseIdleEntry) {
    return `REV ${Math.round((1 - value / reverseIdleEntry) * 100)}%`
  }
  if (value <= forwardIdleExit) return 'IDLE'
  return `FWD ${Math.round(((value - forwardIdleExit) / (1 - forwardIdleExit)) * 100)}%`
}
