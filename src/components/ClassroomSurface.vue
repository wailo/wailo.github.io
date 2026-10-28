<script setup lang="ts">
import { ref } from 'vue'
import Panel from './Panel.vue'
import Accounts from './Accounts.vue'
import AccountSurface from './AccountSurface.vue'
import ClassRoom from './ClassRoom.vue'
import type { CheckpointData, LessonAIRequest, LessonAIResponse } from '../ScriptContext'
import type { LicenceState } from '../Pocketbase/licence'

const props = withDefaults(
  defineProps<{
    variant?: 'panel' | 'drawer'
    simModuleLoaded?: boolean
    accountAuthenticated?: boolean
    accountName?: string
    licenceState?: LicenceState
    licenceDetail?: string
    online?: boolean
    roomId?: string
    handAttention?: boolean
    dataDisplayReady?: boolean
  }>(),
  {
    variant: 'panel',
    simModuleLoaded: false,
    accountAuthenticated: false,
    accountName: '',
    licenceState: 'unknown',
    licenceDetail: '',
    online: false,
    roomId: '',
    handAttention: false,
    dataDisplayReady: false,
  },
)

const emit = defineEmits<{
  (event: 'login', url: string, authToken: string, name: string): void
  (event: 'logout'): void
  (event: 'maximize'): void
  (event: 'close'): void
  (event: 'api-data', data: PeerApiData): void
  (event: 'api-script', data: PeerScriptData): void
  (event: 'whiteboard', data: PeerWhiteBoardata): void
  (event: 'instructor-command', command: ClassroomCommand): void
  (event: 'announcement', message: string): void
  (event: 'exercise-start', exercise: ClassroomExerciseAssignment): void
  (event: 'exercise-stop'): void
  (event: 'connection', online: boolean): void
  (event: 'room', roomId: string): void
  (event: 'hand-attention', pending: boolean): void
}>()

const classroomRef = ref<InstanceType<typeof ClassRoom> | null>(null)
const panelRef = ref<InstanceType<typeof Panel> | null>(null)

const openAccountTab = () => panelRef.value?.setActiveTab('Account')

const requestLessonAI = (
  request: LessonAIRequest,
  runId: string,
  signal: AbortSignal,
): Promise<LessonAIResponse> =>
  classroomRef.value?.requestLessonAI(request, runId, signal) ??
  Promise.resolve({ status: 'unavailable', reason: 'Classroom unavailable.' })

defineExpose({
  requestLessonAI,
  sendApiCall: (apiCall: string) => classroomRef.value?.sendApiCall(apiCall),
  sendStatus: (status: string) => classroomRef.value?.sendStatus(status),
  sendScript: (title: string, content: string) => classroomRef.value?.sendScript(title, content),
  sendCheckPoint: (checkpoint: string, data?: CheckpointData) =>
    classroomRef.value?.sendCheckPoint(checkpoint, data),
  sendWhiteboardState: (state: string) => classroomRef.value?.sendWhiteboardState(state),
  reset: () => classroomRef.value?.reset(),
})
</script>

<template>
  <Panel
    ref="panelRef"
    :panel-id="props.variant === 'panel' ? 'classroom' : ''"
    :status="props.online ? props.roomId || 'Online' : 'Offline'"
    :active="props.online || props.handAttention"
    :flash="props.handAttention"
    :hidden-tabs="props.variant === 'drawer' ? ['Account'] : []"
    @header-dblclick="props.variant === 'panel' && emit('maximize')"
  >
    <template #header-actions>
      <button
        v-if="props.variant === 'drawer'"
        type="button"
        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
        title="Close classroom"
        aria-label="Close classroom"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </template>

    <template #Classroom>
      <div class="flex h-full w-full flex-col">
        <Accounts
          v-if="props.variant === 'drawer' && props.simModuleLoaded"
          :class="{ 'order-last': props.accountAuthenticated }"
          @onLogin="
            (url: string, authToken: string, name: string) => emit('login', url, authToken, name)
          "
          @onLogout="emit('logout')"
        />
        <ClassRoom
          v-if="props.dataDisplayReady && props.accountAuthenticated"
          class="min-h-0 flex-1"
          :account-name="props.accountName"
          @apiDataEvent="(data: PeerApiData) => emit('api-data', data)"
          @apiScriptEvent="(data: PeerScriptData) => emit('api-script', data)"
          @wb-event="(data: PeerWhiteBoardata) => emit('whiteboard', data)"
          @instructor-command="(command: ClassroomCommand) => emit('instructor-command', command)"
          @announcement="(message: string) => emit('announcement', message)"
          @exercise-start="
            (exercise: ClassroomExerciseAssignment) => emit('exercise-start', exercise)
          "
          @exercise-stop="emit('exercise-stop')"
          ref="classroomRef"
          @classroomConnection="(online: boolean) => emit('connection', online)"
          @classroomRoom="(roomId: string) => emit('room', roomId)"
          @hand-attention="(pending: boolean) => emit('hand-attention', pending)"
        />
        <div
          v-else-if="props.variant === 'panel'"
          class="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-3 py-4 text-center text-xs"
        >
          <p class="opacity-70">
            Sign in to join a classroom, see who is online and save your progress.
          </p>
          <button type="button" class="account-cta" @click="openAccountTab">Open account</button>
        </div>
      </div>
    </template>

    <template #Account>
      <AccountSurface
        v-if="props.simModuleLoaded"
        :account-authenticated="props.accountAuthenticated"
        :licence-state="props.licenceState"
        :licence-detail="props.licenceDetail"
        :classroom-online="props.online"
        @login="
          (url: string, authToken: string, name: string) => emit('login', url, authToken, name)
        "
        @logout="emit('logout')"
      />
    </template>
  </Panel>
</template>

<style scoped>
.account-cta {
  border: 1px solid rgb(var(--color-panelBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.125rem 0.5rem;
  color: rgb(var(--color-secondary));
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-simElementBorder)),
    inset -1px -1px 0 rgb(var(--color-panelBorder));
}

.account-cta:hover {
  color: rgb(var(--color-panelActive));
}

.account-cta:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: 1px;
}
</style>
