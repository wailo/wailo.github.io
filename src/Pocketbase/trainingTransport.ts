import { pb } from './pocketbase'
import { applicationTimers } from '../ApplicationTimers'

export function trainingTransport() {
  if (!pb.authStore.isValid || !pb.authStore.record) return null
  // Pending writes stay bound to the account that started the run, even after account switching.
  const token = pb.authStore.token
  return async (path: string, body: unknown) => {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController()
      const timeout = applicationTimers.setTimeout(() => controller.abort(), 3000)
      try {
        return await pb.send(path, {
          method: 'POST',
          body,
          requestKey: null,
          signal: controller.signal,
          headers: { Authorization: token },
        })
      } catch (error: any) {
        applicationTimers.clearTimeout(timeout)
        if (attempt >= 2 || (error.status > 0 && error.status < 500 && error.status !== 429))
          throw error
        await new Promise<void>((resolve) =>
          applicationTimers.setTimeout(() => resolve(), 500 * 2 ** attempt),
        )
      } finally {
        applicationTimers.clearTimeout(timeout)
      }
    }
  }
}
