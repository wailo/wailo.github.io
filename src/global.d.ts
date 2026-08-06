interface Window {
  flag: boolean
  cache: number[]
  MonacoEnvironment: {
    getWorker: (moduleId: string, label: string) => Worker
  }
}

// Define a type for the data structure
type PeerApiData = { api: string }
type PeerStatusData = { status: string }
type PeerCheckPointData = { checkpoint: string }
type PeerScriptData = { tite: string; script: string }
type PeerWhiteBoardata = { wb: string }
type ClassroomCommand =
  | 'pause'
  | 'resume'
  | 'reset'
  | 'layout-instructor'
  | 'layout-pilot'
  | 'layout-focus'
  | 'clear-whiteboard'

type ClassroomExerciseStatus =
  | 'assigned'
  | 'running'
  | 'completed'
  | 'stopped'
  | 'error'
  | 'overdue'

type ClassroomHandState = 'idle' | 'raised' | 'acknowledged' | 'resolved'

type ClassroomExerciseAssignment = {
  id: string
  name: string
  source: string
  deadline: number
}

type ClassroomEnvelope = {
  version: 1
  id: string
  type:
    | 'api'
    | 'status'
    | 'checkpoint'
    | 'script'
    | 'whiteboard'
    | 'command'
    | 'announcement'
    | 'exercise'
    | 'exercise-status'
    | 'exercise-control'
    | 'hand'
    | 'hand-control'
    | 'ping'
    | 'pong'
    | 'ack'
    | 'identity'
  senderRole: 'instructor' | 'student'
  timestamp: number
  payload: unknown
}

type PeerData =
  | PeerApiData
  | PeerStatusData
  | PeerScriptData
  | PeerCheckPointData
  | PeerWhiteBoardata
  | ClassroomEnvelope
