// Imported by core before it wraps browser timers for lesson cancellation.
// Network/application deadlines must survive a lesson reset.
const browserSetTimeout = typeof window === 'undefined' ? undefined : window.setTimeout.bind(window)
const browserClearTimeout =
  typeof window === 'undefined' ? undefined : window.clearTimeout.bind(window)

export const applicationTimers = {
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    return (
      browserSetTimeout
        ? browserSetTimeout(callback, delay)
        : globalThis.setTimeout(callback, delay)
    ) as ReturnType<typeof setTimeout>
  },
  clearTimeout(id: ReturnType<typeof setTimeout> | undefined) {
    if (browserClearTimeout) browserClearTimeout(id as unknown as number)
    else globalThis.clearTimeout(id)
  },
}
