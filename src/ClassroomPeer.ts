import type { DataConnection } from 'peerjs'
import type { CheckpointData } from './ScriptContext'

export interface ClassroomPeer {
  metadata: {
    displayName?: string
    callsign?: string
    name?: string
    status?: string
    checkPoint?: string
    checkPointData?: CheckpointData
    [key: string]: any
  }
  conn: DataConnection
  lastSeen: number
  latency?: number
  handRaised?: boolean
  handState?: ClassroomHandState
  handRaisedAt?: number
  exercise?: {
    id: string
    name: string
    status: ClassroomExerciseStatus
    updatedAt: number
    deadline?: number
    detail?: string
    checkpoints: Array<{ timestamp: number; message: string; data?: CheckpointData }>
  }
}

export const compactStatus = (status?: string) => {
  const normalized = status?.trim().toLowerCase()
  if (!normalized) return 'ON'
  return (
    {
      online: 'ON',
      running: 'RUN',
      paused: 'PAUSE',
      trial: 'TRIAL',
      'structural damage': 'DMG',
    }[normalized] || status?.slice(0, 5).toUpperCase()
  )
}

export const compactExerciseStatus = (status: ClassroomExerciseStatus) =>
  ({
    assigned: 'ASN',
    running: 'RUN',
    completed: 'DONE',
    stopped: 'STOP',
    error: 'ERR',
    overdue: 'LATE',
  })[status]
