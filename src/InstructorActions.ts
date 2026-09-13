export interface InstructorTarget {
  peerId: string
  assignmentId: string | null
}
export interface InstructorActionResult {
  peerId: string
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
}
export interface InstructorAssignment {
  id: string
  name: string
  source: string
  deadline: number
}
interface PeerState {
  connection: object
  open: boolean
  assignment?: { id: string; status: string }
}
interface Dependencies {
  canAct: () => boolean
  session: () => unknown
  peer: (id: string) => PeerState | undefined
  lesson: (id: string) => { name: string; path: string } | undefined
  loadSource: (path: string) => Promise<string>
  send: (
    id: string,
    type: 'announcement' | 'exercise' | 'exercise-control',
    payload: unknown,
  ) => boolean
  assigned: (id: string, assignment: InstructorAssignment) => void
}

/** Execution permissions belong here, not to the caller (button or future AI adapter). */
export function createInstructorActions(deps: Dependencies) {
  const skipped = (peerId: string, reason: string): InstructorActionResult => ({
    peerId,
    status: 'skipped',
    reason,
  })
  const check = (peerId: string, assignmentId?: string | null) => {
    if (!deps.canAct()) return 'Instructor must be online'
    const peer = deps.peer(peerId)
    if (!peer?.open) return 'Disconnected'
    if (assignmentId !== undefined && (peer.assignment?.id ?? null) !== assignmentId)
      return 'Assignment changed'
    return undefined
  }
  const send = (
    peerId: string,
    type: Parameters<Dependencies['send']>[1],
    payload: unknown,
  ): InstructorActionResult => {
    try {
      return deps.send(peerId, type, payload)
        ? { peerId, status: 'sent' }
        : skipped(peerId, 'Disconnected')
    } catch (error) {
      return { peerId, status: 'failed', reason: String(error) }
    }
  }
  const uniqueTargets = (targets: InstructorTarget[]) => [
    ...new Map(targets.map((target) => [target.peerId, { ...target }])).values(),
  ]

  return {
    message(peerIds: string[], text: string): InstructorActionResult[] {
      return [...new Set(peerIds)].map((id) => {
        const reason = check(id) ?? (!text.trim() ? 'Message is empty' : undefined)
        return reason ? skipped(id, reason) : send(id, 'announcement', { message: text.trim() })
      })
    },
    control(action: 'start' | 'stop', targets: InstructorTarget[]): InstructorActionResult[] {
      return uniqueTargets(targets).map(({ peerId, assignmentId }) => {
        let reason =
          check(peerId, assignmentId) ??
          (action !== 'start' && action !== 'stop' ? 'Unknown control' : undefined)
        const assignment = deps.peer(peerId)?.assignment
        if (!reason && !assignment) reason = 'No assignment'
        if (!reason && action === 'start' && assignment?.status === 'running')
          reason = 'Already running'
        if (!reason && action === 'stop' && assignment?.status !== 'running') reason = 'Not running'
        return reason
          ? skipped(peerId, reason)
          : send(peerId, 'exercise-control', { action, assignmentId })
      })
    },
    async assign(
      targets: InstructorTarget[],
      lessonId: string,
      durationMs: number,
    ): Promise<InstructorActionResult[]> {
      const pending = uniqueTargets(targets)
      const lesson = deps.lesson(lessonId)
      const initial = new Map(
        pending.map(({ peerId, assignmentId }) => [
          peerId,
          check(peerId, assignmentId) ??
            (!lesson ? 'Unknown lesson' : undefined) ??
            (!Number.isFinite(durationMs) || durationMs <= 0 ? 'Invalid duration' : undefined),
        ]),
      )
      if (!lesson || pending.every(({ peerId }) => initial.get(peerId))) {
        return pending.map(({ peerId }) => skipped(peerId, initial.get(peerId)!))
      }
      const session = deps.session()
      const connections = new Map(
        pending.map(({ peerId }) => [peerId, deps.peer(peerId)?.connection]),
      )
      let source: string
      try {
        source = await deps.loadSource(lesson.path)
      } catch (error) {
        return pending.map(({ peerId }) =>
          initial.get(peerId)
            ? skipped(peerId, initial.get(peerId)!)
            : { peerId, status: 'failed', reason: `Unable to load lesson: ${String(error)}` },
        )
      }
      const assignment = {
        id: crypto.randomUUID(),
        name: lesson.name,
        source,
        deadline: Date.now() + durationMs,
      }
      return pending.map(({ peerId, assignmentId }) => {
        const reason =
          initial.get(peerId) ??
          check(peerId, assignmentId) ??
          (deps.session() !== session ? 'Session changed' : undefined) ??
          (deps.peer(peerId)?.connection !== connections.get(peerId)
            ? 'Connection changed'
            : undefined)
        if (reason) return skipped(peerId, reason)
        const result = send(peerId, 'exercise', assignment)
        if (result.status === 'sent') deps.assigned(peerId, assignment)
        return result
      })
    },
  }
}

/** A delayed control must never start or stop a replacement assignment. */
export function acceptsExerciseControl(
  current: { id: string; status: string } | null | undefined,
  payload: { action?: unknown; assignmentId?: unknown },
): boolean {
  if (!current || payload.assignmentId !== current.id) return false
  return payload.action === 'start'
    ? current.status !== 'running'
    : payload.action === 'stop' && current.status === 'running'
}
