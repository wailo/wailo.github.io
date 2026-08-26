<template>
  <div class="flex h-full min-h-0 w-full flex-col overflow-auto">
    <div class="order-1 w-full">
      <div class="flex h-6 min-w-0 items-center gap-2 bg-panelHeaderBackground px-1">
        <span :class="isOnline ? 'text-simActiveButton' : 'opacity-60'">●</span>
        <button
          class="shrink-0"
          @click="isOnline ? disconnect() : connectToPeerJsServer(selfPeerId)"
        >
          {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
        </button>
        <span class="min-w-0 truncate opacity-60">ROOM {{ selfPeerId || '—' }}</span>
        <span v-if="isInstructor" class="shrink-0"
          >{{ Object.keys(incomingConns).length }} PEERS</span
        >
        <wButton
          v-if="isInstructor"
          class="ml-auto h-5 shrink-0"
          :button-label="`MIRROR ${followMode ? 'ON' : 'OFF'}`"
          :button-state="followMode"
          :button-click="() => (followMode = !followMode)"
          title="Mirror instructor commands to connected peers"
        />
        <button
          class="px-1 hover:text-panelActive focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
          title="Connection settings"
          @click="connectionSettingsOpen = !connectionSettingsOpen"
        >
          {{ connectionSettingsOpen ? '×' : '⋯' }}
        </button>
      </div>

      <div v-if="connectionSettingsOpen" class="grid gap-1 border-b border-simElementBorder p-1">
        <label class="flex h-5 min-w-0 items-center gap-1">
          <span class="w-14 shrink-0 opacity-60">CLASS</span>
          <input
            v-model="selfPeerId"
            :readonly="isOnline"
            placeholder="room name"
            class="min-w-0 flex-1 bg-primary pl-1 text-secondary border border-simElementBorder outline-none focus:border-panelActive"
          />
        </label>
        <label class="flex h-5 min-w-0 items-center gap-1">
          <span class="w-14 shrink-0 opacity-60">CALLSIGN</span>
          <input
            v-model="displayname"
            placeholder="callsign"
            class="min-w-0 flex-1 bg-primary pl-1 text-secondary border border-simElementBorder outline-none focus:border-panelActive"
          />
        </label>
        <wButton
          id="connect"
          :button-label="isOnline ? 'Disconnect' : 'Start'"
          :button-state="isOnline"
          class="h-5 w-full border border-simElementBorder"
          :buttonClick="() => (isOnline ? disconnect() : connectToPeerJsServer(selfPeerId))"
        />
        <button
          v-if="isInstructor && isOnline"
          class="h-5 text-left opacity-70 hover:text-panelActive hover:opacity-100"
          @click="exportSession"
        >
          Export session
        </button>
      </div>

      <div v-if="isInstructor && isOnline" class="flex h-5 items-center gap-2 px-1 text-secondary">
        <span>SEL {{ selectedPeerIds.length }}</span>
        <span>ACTIVE {{ activeExerciseCount }}</span>
        <span :class="raisedHandCount ? 'font-bold text-panelActive' : 'opacity-60'">
          HAND {{ raisedHandCount }}
        </span>
        <span :class="overdueCount ? 'font-bold text-panelActive' : 'opacity-60'">
          OVERDUE {{ overdueCount }}
        </span>
        <button class="ml-auto" @click="toggleSelectAll">{{ allSelected ? 'NONE' : 'ALL' }}</button>
      </div>
      <button
        v-if="!isInstructor && isOnline"
        class="border border-simElementBorder"
        :class="
          studentHandState === 'raised'
            ? 'animate-pulse bg-simActiveButton text-primary'
            : 'text-secondary'
        "
        @click="toggleHand"
      >
        {{ studentHandLabel }}
      </button>
    </div>

    <section
      v-if="!isInstructor && currentAssignment"
      class="grid gap-1 border border-simElementBorder p-2"
    >
      <div class="font-bold">Assigned: {{ currentAssignment.name }}</div>
      <div>Status: {{ currentAssignment.status }}</div>
      <div>Time remaining: {{ assignmentTimeRemaining }}</div>
      <div class="grid grid-cols-3 gap-1">
        <button
          class="border border-simElementBorder"
          :disabled="currentAssignment.status === 'running'"
          @click="startAssignedExercise"
        >
          Start exercise
        </button>
        <button
          class="border border-simElementBorder"
          :disabled="currentAssignment.status !== 'running'"
          @click="stopAssignedExercise"
        >
          Stop
        </button>
      </div>
    </section>

    <section
      v-if="isInstructor && isOnline"
      class="relative order-2 flex h-6 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap bg-panelHeaderBackground px-1 text-secondary"
    >
      <span class="w-20 shrink-0 truncate font-medium text-panelActive">{{
        actionTargetLabel
      }}</span>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length"
        @click="openExercisePalette"
      >
        Assign [a]
      </button>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length || !targetHaveAssignments"
        @click="sendExerciseControl('start', actionTargetIds)"
      >
        Start [S]
      </button>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length"
        @click="sendExerciseControl('stop', actionTargetIds)"
      >
        Stop
      </button>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length || !targetHaveAssignments"
        @click="unassignExercise"
      >
        Unassign [u]
      </button>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length"
        @click="toggleMessageComposer"
      >
        Message
      </button>

      <div
        v-if="messageComposerOpen"
        class="fixed inset-0 z-50 flex items-start justify-center bg-panelContentBackground/80 pt-[12vh]"
        @click.self="messageComposerOpen = false"
      >
        <div
          class="flex w-80 max-w-[calc(100%-1rem)] items-center gap-1 border border-panelBorder bg-panelContentBackground p-1 shadow-lg"
        >
          <input
            ref="announcementInputRef"
            v-model.trim="announcement"
            class="h-5 min-w-0 flex-1 border-b border-simElementBorder bg-transparent px-1 text-secondary outline-none focus:border-panelActive"
            placeholder="Message target…"
            @keyup.enter="sendAnnouncement"
            @keydown.esc.prevent="messageComposerOpen = false"
          />
          <button class="command-button" :disabled="!announcement" @click="sendAnnouncement">
            Send
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="isInstructor && isOnline"
      class="classroom-roster order-3 min-h-24 flex-1 overflow-auto font-panelFont"
    >
      <div class="sticky top-0 z-20 flex h-6 items-center bg-panelHeaderBackground px-1">
        <span class="pr-1">/</span>
        <input
          ref="rosterSearchRef"
          v-model="rosterSearch"
          class="min-w-0 flex-1 bg-transparent text-secondary outline-none"
          placeholder="filter user / exercise / status"
          @keydown.esc.prevent="clearRosterSearch"
          @keydown.down.prevent="moveRosterFocus(1)"
          @keydown.up.prevent="moveRosterFocus(-1)"
          @keydown.ctrl.n.prevent="moveRosterFocus(1)"
          @keydown.ctrl.p.prevent="moveRosterFocus(-1)"
          @keydown.ctrl.a.prevent="selectAllPeers"
          @keydown.meta.a.prevent="selectAllPeers"
        />
        <span>{{ filteredParticipants.length }}/{{ Object.keys(incomingConns).length }}</span>
      </div>
      <table class="h-fit w-full table-fixed text-left whitespace-nowrap">
        <thead class="sticky top-6 z-10 bg-panelHeaderBackground text-secondary">
          <tr>
            <th class="w-10 min-w-10 max-w-10 px-1 text-center">
              <label class="inline-flex cursor-pointer items-center" title="Select all peers">
                <input
                  class="sr-only"
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                />
                <span
                  class="flex size-3 items-center justify-center border border-simElementBorder text-[0.65rem] leading-none"
                  :class="selectedPeerIds.length ? 'border-panelActive text-panelActive' : ''"
                >
                  {{ allSelected ? '✓' : selectedPeerIds.length ? '−' : '' }}
                </span>
              </label>
            </th>
            <th class="px-1">STUDENT</th>
            <th class="w-14 px-1">SIM</th>
            <th class="w-16 px-1">TASK</th>
            <th class="roster-net w-16 px-1">NET</th>
            <th class="w-6">×</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in participantExerciseGroups" :key="group.key">
            <tr class="h-5 bg-panelHeaderBackground text-secondary">
              <td colspan="6" class="px-1 pt-1 font-medium">
                <span class="text-simActiveButton">+</span>
                {{ group.label }}
                <span class="ml-1 opacity-60">[{{ group.participants.length }}]</span>
              </td>
            </tr>
            <tr
              v-for="participant in group.participants"
              :key="participant.peerId"
              :ref="(element) => setRosterRowRef(element, participant.rosterIndex)"
              class="h-5 nowrap cursor-pointer transition-colors"
              :class="rowClass(participant.peerId)"
              :aria-current="focusedPeerId === participant.peerId ? 'true' : undefined"
              :title="participantSummary(participant.peer)"
              @click="focusPeer(participant.peerId)"
            >
              <td class="w-10 min-w-10 max-w-10 px-1 text-center">
                <span class="flex w-8 items-center justify-center gap-1">
                  <label class="inline-flex cursor-pointer items-center" @click.stop>
                    <input
                      class="sr-only"
                      type="checkbox"
                      :checked="isPeerSelected(participant.peerId)"
                      :aria-label="`Select ${participant.peer.metadata.name || participant.peerId}`"
                      @change="togglePeerSelection(participant.peerId)"
                    />
                    <span
                      class="flex size-3 items-center justify-center border border-simElementBorder text-[0.65rem] leading-none"
                      :class="
                        isPeerSelected(participant.peerId)
                          ? 'border-panelActive text-panelActive'
                          : ''
                      "
                    >
                      {{ isPeerSelected(participant.peerId) ? '✓' : '' }}
                    </span>
                  </label>
                  <span
                    class="block w-3 text-center"
                    :class="
                      participant.peer.handState === 'raised' ? 'animate-pulse font-bold' : ''
                    "
                    >{{ participant.peer.handState === 'raised' ? '!' : '\u00a0' }}</span
                  >
                </span>
              </td>
              <td class="overflow-hidden text-ellipsis px-1">
                <span class="font-medium">
                  {{
                    participant.peer.metadata.callsign ||
                    participant.peer.metadata.displayName ||
                    '—'
                  }}
                </span>
                <span class="ml-1 opacity-60">
                  {{ participant.peer.metadata.name || '' }}
                </span>
              </td>
              <!-- Status -->
              <td class="overflow-hidden text-ellipsis px-1">
                <button class="">
                  {{ compactStatus(participant.peer.metadata.status) }}
                  <!-- <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    fill-rule="evenodd"
                    d="M3.757 4.5c.18.217.376.42.586.608.153-.61.354-1.175.596-1.678A5.53 5.53 0 0 0 3.757 4.5ZM8 1a6.994 6.994 0 0 0-7 7 7 7 0 1 0 7-7Zm0 1.5c-.476 0-1.091.386-1.633 1.427-.293.564-.531 1.267-.683 2.063A5.48 5.48 0 0 0 8 6.5a5.48 5.48 0 0 0 2.316-.51c-.152-.796-.39-1.499-.683-2.063C9.09 2.886 8.476 2.5 8 2.5Zm3.657 2.608a8.823 8.823 0 0 0-.596-1.678c.444.298.842.659 1.182 1.07-.18.217-.376.42-.586.608Zm-1.166 2.436A6.983 6.983 0 0 1 8 8a6.983 6.983 0 0 1-2.49-.456 10.703 10.703 0 0 0 .202 2.6c.72.231 1.49.356 2.288.356.798 0 1.568-.125 2.29-.356a10.705 10.705 0 0 0 .2-2.6Zm1.433 1.85a12.652 12.652 0 0 0 .018-2.609c.405-.276.78-.594 1.117-.947a5.48 5.48 0 0 1 .44 2.262 7.536 7.536 0 0 1-1.575 1.293Zm-2.172 2.435a9.046 9.046 0 0 1-3.504 0c.039.084.078.166.12.244C6.907 13.114 7.523 13.5 8 13.5s1.091-.386 1.633-1.427c.04-.078.08-.16.12-.244Zm1.31.74a8.5 8.5 0 0 0 .492-1.298c.457-.197.893-.43 1.307-.696a5.526 5.526 0 0 1-1.8 1.995Zm-6.123 0a8.507 8.507 0 0 1-.493-1.298 8.985 8.985 0 0 1-1.307-.696 5.526 5.526 0 0 0 1.8 1.995ZM2.5 8.1c.463.5.993.935 1.575 1.293a12.652 12.652 0 0 1-.018-2.608 7.037 7.037 0 0 1-1.117-.947 5.48 5.48 0 0 0-.44 2.262Z"
                    clip-rule="evenodd"
                  />
                </svg> -->
                </button>
              </td>
              <td
                class="overflow-hidden text-ellipsis px-1"
                :title="exerciseDetail(participant.peer)"
              >
                <span v-if="participant.peer.exercise">
                  {{ exerciseStatusSymbol(participant.peer.exercise.status) }}
                  <span :class="exerciseStatusClass(participant.peer.exercise.status)">{{
                    compactExerciseStatus(participant.peer.exercise.status)
                  }}</span>
                </span>
                <span v-else>—</span>
              </td>
              <td class="roster-net overflow-hidden text-ellipsis px-1 opacity-70">
                {{
                  connectionAge(participant.peer) > 15
                    ? 'STALE'
                    : `${participant.peer.latency ?? '—'}ms`
                }}
                <span v-if="participant.peer.handState === 'raised'" class="font-bold">
                  ! {{ handWaitTime(participant.peer) }}</span
                >
              </td>
              <!-- Disconnect -->
              <td class="pl-1">
                <button @click.stop="confirmDisconnect(participant.peerId, participant.peer)">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="size-4"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>

  <div
    v-if="exercisePaletteOpen"
    class="fixed inset-0 z-50 flex items-start justify-center bg-panelContentBackground/80 pt-[12vh]"
    @click.self="closeExercisePalette"
  >
    <div class="w-1/2 min-w-80 border border-panelActive bg-panelContentBackground shadow-lg">
      <div
        class="border-b border-panelBorder bg-panelHeaderBackground px-2 py-1 font-bold text-secondary"
      >
        ASSIGN · {{ actionTargetIds.length }} TARGET{{ actionTargetIds.length === 1 ? '' : 'S' }}
      </div>
      <div class="flex border-b border-simElementBorder px-2 py-1">
        <span class="pr-2">&gt;</span>
        <input
          ref="exerciseSearchRef"
          v-model="exerciseQuery"
          class="min-w-0 flex-1 bg-transparent text-secondary outline-none"
          placeholder="fuzzy search exercise"
          @input="exerciseResultIndex = 0"
          @keydown="handleExercisePaletteKeydown"
        />
        <input
          v-model.number="exerciseMinutes"
          type="number"
          min="1"
          class="h-5 w-10 border-b border-simElementBorder bg-transparent px-1 text-right text-secondary outline-none focus:border-panelActive"
          title="Assignment deadline in minutes"
        />
        <span class="pl-1 opacity-60">min</span>
      </div>
      <div class="max-h-[50vh] overflow-auto py-1 font-panelFont">
        <button
          v-for="(exercise, index) in exerciseResults"
          :key="exercise.path"
          class="flex w-full gap-2 px-2 py-1 text-left"
          :class="
            index === exerciseResultIndex
              ? 'bg-simActiveButton text-primary'
              : 'text-secondary hover:bg-simInputBackground'
          "
          @mouseenter="exerciseResultIndex = index"
          @click="chooseExercise(exercise)"
        >
          <span>{{ index === exerciseResultIndex ? '›' : ' ' }}</span>
          <span class="min-w-0 flex-1 truncate">{{ exercise.name }}</span>
          <span class="opacity-60">{{ exercise.category }}</span>
        </button>
        <div v-if="!exerciseResults.length" class="px-2 py-3 text-center text-secondary">
          NO MATCHES
        </div>
      </div>
      <div class="border-t border-panelBorder px-2 py-1 text-secondary">
        ↑↓/C-n/C-p · enter assign · esc cancel
      </div>
    </div>
  </div>

  <div
    v-if="isQrPopupOpen == true"
    class="fixed inset-0 flex items-center justify-center bg-panelContentBackground"
    @click.self="() => (isQrPopupOpen = false)"
  >
    <div class="bg-panelContentBackground p-6 rounded-lg shadow-lg w-min text-center">
      <!-- <vue-qr
        :text="myPeerId ? `${baseUrl}/#sim?roomId=${myPeerId}` : ''"
        :size="150"
        :margin="0"
        backgroundColor="rgba(0,0,0,0)"
      ></vue-qr> -->

      <div class="border">
        <b :v-if="selfPeerId && selfPeerId.length"
          >{{ selfPeerId ? `${baseUrl}/#sim?roomId=${selfPeerId}` : '' }}
        </b>
      </div>

      <button
        @click="copyToClipboard"
        class="mt-4 px-4 py-2 bg-primary text-secondary border border-simElementBorder"
      >
        Copy
      </button>

      <button
        @click="() => (isQrPopupOpen = false)"
        class="mt-4 px-4 py-2 bg-primary text-secondary border border-simElementBorder"
      >
        Close
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import Fuse from 'fuse.js'
import wButton from './wButton.vue'
import * as PeerJS from 'peerjs'
import { DataConnection } from 'peerjs'
import { moduleTree, type ModuleEntry } from './data/EASAModules'
// import vueQr from "vue-qr/src/packages/vue-qr.vue";

// Define the event emitter
const emit = defineEmits<{
  (event: 'classroomConnection', newValue: boolean): void
  (event: 'apiDataEvent', receivedData: PeerApiData): void
  (event: 'apiScriptEvent', receivedData: PeerScriptData): void
  (event: 'wbEvent', receivedData: PeerWhiteBoardata): void
  (event: 'instructorCommand', command: ClassroomCommand): void
  (event: 'announcement', message: string): void
  (event: 'exerciseStart', exercise: ClassroomExerciseAssignment): void
  (event: 'exerciseStop'): void
  (event: 'error', errorMessage: string): void
}>()

const props = defineProps<{ accountName?: string }>()

const isDevelopment = import.meta.env.DEV
const baseUrl = window.location.origin
let selfPeer: PeerJS.Peer
let instructorConnection: PeerJS.DataConnection
let instructorConnectionOpen = false
const selfPeerId = ref<string>(isDevelopment ? 'EK583838' : '')
const isInstructor = ref(true)
let displayname = ref<string>()
let isOnline = ref(false)
type ConnectionMeta = {
  displayName?: string
  callsign?: string
  name?: string
  status?: string
  checkPoint?: string
  [key: string]: any
}

type ConnectionsList = {
  [peerId: string]: {
    metadata: ConnectionMeta
    conn: PeerJS.DataConnection
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
    }
  }
}
const incomingConns = ref<ConnectionsList>({})
const routeHash = window.location.href
const isQrPopupOpen = ref(false)
const followMode = ref(false)
const connectionSettingsOpen = ref(false)
const selectedPeerIds = ref<string[]>([])
const focusedPeerId = ref('')
const rosterSearch = ref('')
const rosterSearchRef = ref<HTMLInputElement | null>(null)
const exercisePaletteOpen = ref(false)
const exerciseQuery = ref('')
const exerciseSearchRef = ref<HTMLInputElement | null>(null)
const exerciseResultIndex = ref(0)
const rosterRowRefs = ref<HTMLElement[]>([])
const announcement = ref('')
const announcementInputRef = ref<HTMLInputElement | null>(null)
const messageComposerOpen = ref(false)
const exercisePath = ref('')
const exerciseMinutes = ref(30)
const studentHandState = ref<ClassroomHandState>('idle')
const currentAssignment = ref<
  (ClassroomExerciseAssignment & { status: ClassroomExerciseStatus }) | null
>(null)
const exerciseModules = Object.entries(moduleTree).flatMap(([category, entries]) =>
  entries.map((entry) => ({ ...entry, category })),
)
const sessionStartedAt = ref(Date.now())
const sessionEvents = ref<
  Array<{ timestamp: number; type: string; target: string; detail: string }>
>([])
const clock = ref(Date.now())
let healthTimer: ReturnType<typeof setInterval> | undefined
const allSelected = computed(
  () =>
    Object.keys(incomingConns.value).length > 0 &&
    selectedPeerIds.value.length === Object.keys(incomingConns.value).length,
)
const overdueCount = computed(
  () =>
    Object.values(incomingConns.value).filter((peer) => peer.exercise?.status === 'overdue').length,
)
const activeExerciseCount = computed(
  () =>
    Object.values(incomingConns.value).filter((peer) => peer.exercise?.status === 'running').length,
)
const raisedHandCount = computed(
  () => Object.values(incomingConns.value).filter((peer) => peer.handState === 'raised').length,
)
const participantRecords = computed(() => {
  const handPriority: Record<ClassroomHandState, number> = {
    raised: 0,
    acknowledged: 1,
    idle: 2,
    resolved: 3,
  }
  return Object.entries(incomingConns.value)
    .map(([peerId, peer]) => ({ peerId, peer }))
    .sort(
      (a, b) => handPriority[a.peer.handState || 'idle'] - handPriority[b.peer.handState || 'idle'],
    )
})
const filteredParticipants = computed(() => {
  if (!rosterSearch.value.trim()) return participantRecords.value
  return new Fuse(participantRecords.value, {
    threshold: 0.35,
    keys: [
      'peerId',
      'peer.metadata.displayName',
      'peer.metadata.callsign',
      'peer.metadata.name',
      'peer.metadata.status',
      'peer.metadata.checkPoint',
      'peer.exercise.name',
      'peer.exercise.status',
    ],
  })
    .search(rosterSearch.value)
    .map((result) => result.item)
})
const participantExerciseGroups = computed(() => {
  const groups = new Map<
    string,
    {
      key: string
      label: string
      participants: Array<(typeof filteredParticipants.value)[number] & { rosterIndex: number }>
    }
  >()

  for (const participant of filteredParticipants.value) {
    const exerciseName = participant.peer.exercise?.name?.trim()
    const key = exerciseName ? `exercise:${exerciseName}` : 'unassigned'
    const group = groups.get(key) || {
      key,
      label: exerciseName || 'Unassigned',
      participants: [],
    }
    group.participants.push({ ...participant, rosterIndex: 0 })
    groups.set(key, group)
  }

  const sortedGroups = [...groups.values()].sort((a, b) => {
    if (a.key === 'unassigned') return -1
    if (b.key === 'unassigned') return 1
    return a.label.localeCompare(b.label)
  })
  let rosterIndex = 0
  for (const group of sortedGroups) {
    for (const participant of group.participants) participant.rosterIndex = rosterIndex++
  }
  return sortedGroups
})
const visibleParticipantRows = computed(() =>
  participantExerciseGroups.value.flatMap((group) => group.participants),
)
const exerciseResults = computed(() => {
  if (!exerciseQuery.value.trim()) return exerciseModules
  return new Fuse(exerciseModules, { threshold: 0.35, keys: ['name', 'category'] })
    .search(exerciseQuery.value)
    .map((result) => result.item)
})
const actionTargetIds = computed(() =>
  selectedPeerIds.value.length
    ? selectedPeerIds.value
    : focusedPeerId.value && incomingConns.value[focusedPeerId.value]
      ? [focusedPeerId.value]
      : [],
)
const actionTargetLabel = computed(() =>
  selectedPeerIds.value.length
    ? `${selectedPeerIds.value.length} checked`
    : actionTargetIds.value.length
      ? 'Focus'
      : 'No target',
)
const targetHaveAssignments = computed(() =>
  actionTargetIds.value.some((id) => Boolean(incomingConns.value[id]?.exercise)),
)
const studentHandLabel = computed(() => {
  if (studentHandState.value === 'raised') return 'Hand raised · Cancel'
  return 'Raise hand'
})
const assignmentTimeRemaining = computed(() => {
  clock.value
  if (!currentAssignment.value) return '—'
  const remaining = Math.max(0, currentAssignment.value.deadline - Date.now())
  const minutes = Math.floor(remaining / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return remaining ? `${minutes}:${seconds.toString().padStart(2, '0')}` : 'Deadline passed'
})

// Watch the booleanVariable and emit an event when it changes
watch(isOnline, (newValue: boolean) => {
  emit('classroomConnection', newValue)
  followMode.value = true
})

watch(rosterSearch, () => {
  const visible = visibleParticipantRows.value
  if (!visible.some((row) => row.peerId === focusedPeerId.value)) {
    focusedPeerId.value = visible[0]?.peerId || ''
  }
})

watch(
  () => props.accountName,
  (name) => {
    if (instructorConnectionOpen && instructorConnection) {
      sendEnvelopeToConnection(instructorConnection, 'identity', {
        name: name || '',
        callsign: displayname.value || '',
      })
    }
  },
)

const copyToClipboard = () => {
  const textToCopy = `${baseUrl}/#sim?roomId=${selfPeerId}`
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      alert('Copied to clipboard!')
    })
    .catch((err) => {
      console.error('Failed to copy: ', err)
    })
}

onMounted(() => {
  // There is no hook in Vuejs to detect when a tab is closed.
  // When the user closes the tab, disconnect
  window.addEventListener('beforeunload', disconnect)
  window.addEventListener('keydown', handleClassroomKeydown)
  healthTimer = setInterval(() => {
    clock.value = Date.now()
    updateOverdueAssignments()
    if (isInstructor.value && isOnline.value) {
      Object.values(incomingConns.value).forEach((peer) =>
        sendEnvelopeToConnection(peer.conn, 'ping', { sentAt: Date.now() }),
      )
    }
  }, 5000)

  const match = /roomId=(.*)/g.exec(routeHash)
  if (match && match[1]) {
    selfPeerId.value = match[1]
    if (selfPeerId.value) {
      connectToPeerJsServer(selfPeerId.value)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', disconnect)
  window.removeEventListener('keydown', handleClassroomKeydown)
  if (healthTimer) clearInterval(healthTimer)
})

const setupConnection = (incomingConnection: DataConnection) => {
  // Connection request from remote peer
  trace(`Received a connection data from ${incomingConnection.peer}`)

  // Data from remote peer
  incomingConnection.on('data', (data: unknown) => {
    onData(data as PeerData, incomingConnection)
  })
  // Connected to remote peer.
  incomingConnection.on('open', () => {
    trace(`OPEN Peer ${incomingConnection.peer}`)

    // Add to incoming connection list (create new entry)
    incomingConns.value[incomingConnection.peer] = {
      metadata: incomingConnection.metadata || {},
      conn: incomingConnection,
      lastSeen: Date.now(),
    }
  })

  // Lost connection with remote peer
  incomingConnection.on('close', () => onConnectionClose(incomingConnection.peer))

  // Error
  incomingConnection.on('error', (e: PeerJS.PeerError<string>) => {
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`)
    incomingConnection.close()

    if (e.type === 'unavailable-id') {
      // if id is taken, it means someone gave us the class-id and we want to join the class.
      // A peer will be created with a random ID.
      connectToPeerJsServer('')
    }
  })
}

const onDisconnected = (peer: PeerJS.Peer) => {
  trace(`Peer disconnected ${peer.id}`)
  delete incomingConns.value[peer.id]
}

const onPeerClose = (peerId: string) => {
  trace(`Peer closed ${peerId}`)
  isOnline.value = false
}

const onConnectionClose = (peerId: string) => {
  // Lost connection to the sever
  if (peerId === selfPeerId.value) {
    trace(`Connection to server closed ${peerId}`)
    isOnline.value = false
  }
  // Lost connection to the instructor.
  else if (instructorConnection && peerId == instructorConnection.peer) {
    trace(`Connection to the instructor closed ${peerId}. Reconnecting`)
    instructorConnectionOpen = false
    instructorConnection.close()
    // Reconnect reconnect
    setTimeout(() => connectToPeer(peerId), 3000)
  }
  // Lost connection with a peer
  else {
    // delete from the list
    delete incomingConns.value[peerId]
    selectedPeerIds.value = selectedPeerIds.value.filter((id) => id !== peerId)
  }
}

const onData = (data: PeerData, conn: PeerJS.DataConnection) => {
  trace(`Received data from ${conn.peer} ${JSON.stringify(data)}`)
  const participant = incomingConns.value[conn.peer]
  if (participant) participant.lastSeen = Date.now()

  if (isEnvelope(data)) {
    const privilegedTypes: ClassroomEnvelope['type'][] = [
      'api',
      'script',
      'whiteboard',
      'command',
      'announcement',
      'exercise',
      'exercise-unassign',
      'exercise-control',
      'hand-control',
    ]
    // Students only accept privileged messages from their instructor connection.
    if (data.senderRole === 'instructor' && conn !== instructorConnection && !isInstructor.value) {
      onError(`Rejected instructor message from ${conn.peer}`)
      return
    }
    if (
      isInstructor.value &&
      data.senderRole === 'student' &&
      privilegedTypes.includes(data.type)
    ) {
      onError(`Rejected privileged student message from ${conn.peer}`)
      return
    }
    handleEnvelope(data, conn)
    return
  }
  // trace(`Received ${JSON.stringify(data)} from ${conn.peer}`);
  if ('api' in data) {
    emit('apiDataEvent', data as PeerApiData)
  } else if ('status' in data) {
    // some logic to update the student status.
    if (participant) participant.metadata.status = data.status
  } else if ('checkpoint' in data) {
    // some logic to update the student status.
    if (participant) participant.metadata.checkPoint = data.checkpoint
  } else if ('script' in data) {
    emit('apiScriptEvent', data)
  } else if ('wb' in data) {
    emit('wbEvent', data)
  } else {
    emit('error', `Unknown data: ${data}`)
  }
}

const isEnvelope = (data: PeerData): data is ClassroomEnvelope =>
  typeof data === 'object' && data !== null && 'version' in data && 'type' in data

const handleEnvelope = (message: ClassroomEnvelope, conn: PeerJS.DataConnection) => {
  const payload = message.payload as any
  const participant = incomingConns.value[conn.peer]
  switch (message.type) {
    case 'api':
      emit('apiDataEvent', { api: String(payload.api || '') })
      break
    case 'status':
      if (participant) participant.metadata.status = String(payload.status || '')
      break
    case 'checkpoint':
      if (participant) participant.metadata.checkPoint = String(payload.checkpoint || '')
      break
    case 'script':
      emit('apiScriptEvent', {
        tite: String(payload.title || ''),
        script: String(payload.script || ''),
      })
      break
    case 'whiteboard':
      emit('wbEvent', { wb: String(payload.wb || '') })
      break
    case 'command':
      if (!isInstructor.value) {
        emit('instructorCommand', payload.command as ClassroomCommand)
        sendEnvelopeToConnection(conn, 'ack', { messageId: message.id, command: payload.command })
      }
      break
    case 'announcement':
      emit('announcement', String(payload.message || ''))
      break
    case 'exercise':
      if (!isInstructor.value) {
        if (currentAssignment.value?.status === 'running') emit('exerciseStop')
        currentAssignment.value = {
          id: String(payload.id || message.id),
          name: String(payload.name || ''),
          source: String(payload.source || ''),
          deadline: Number(payload.deadline || Date.now()),
          status: 'assigned',
        }
        sendExerciseStatus('assigned')
        emit('announcement', `New exercise assigned: ${currentAssignment.value.name}`)
      }
      break
    case 'exercise-unassign':
      if (!isInstructor.value) {
        const assignmentName = currentAssignment.value?.name
        if (currentAssignment.value?.status === 'running') emit('exerciseStop')
        currentAssignment.value = null
        sendEnvelopeToConnection(conn, 'ack', {
          messageId: message.id,
          action: 'exercise-unassign',
        })
        emit(
          'announcement',
          assignmentName ? `Exercise unassigned: ${assignmentName}` : 'Exercise unassigned',
        )
      }
      break
    case 'exercise-status':
      if (participant) {
        const existingExercise = participant.exercise
        participant.exercise = {
          id: String(payload.id || ''),
          name: String(payload.name || ''),
          status: payload.status as ClassroomExerciseStatus,
          updatedAt: message.timestamp,
          deadline:
            existingExercise?.id === String(payload.id || '')
              ? existingExercise.deadline
              : undefined,
          detail: payload.detail ? String(payload.detail) : undefined,
        }
        logSessionEvent(
          'exercise-status',
          conn.peer,
          `${participant.exercise.name}: ${participant.exercise.status}`,
        )
      }
      break
    case 'exercise-control':
      if (!isInstructor.value) {
        if (payload.action === 'start') startAssignedExercise()
        if (payload.action === 'stop') stopAssignedExercise()
      }
      break
    case 'hand':
      if (participant) {
        const state: ClassroomHandState = payload.state || (payload.raised ? 'raised' : 'idle')
        participant.handState = state
        participant.handRaised = state === 'raised'
        if (state === 'raised') participant.handRaisedAt = message.timestamp
        logSessionEvent('hand', conn.peer, state)
      }
      break
    case 'hand-control':
      if (!isInstructor.value) {
        studentHandState.value = 'idle'
      }
      break
    case 'ping':
      sendEnvelopeToConnection(conn, 'pong', { sentAt: payload.sentAt })
      break
    case 'pong':
      if (participant) participant.latency = Math.max(0, Date.now() - Number(payload.sentAt))
      break
    case 'ack':
      logSessionEvent('ack', conn.peer, String(payload.command || payload.messageId || 'message'))
      break
    case 'identity':
      if (participant) {
        participant.metadata.name = String(payload.name || '')
        participant.metadata.callsign = String(payload.callsign || '')
      }
      break
  }
}

const onError = (err: string) => {
  trace(`Error: ${err}`)
  emit('error', err)
}

const connectToPeerJsServer = (targetPeerId: string) => {
  trace(`Creating a new peer ${targetPeerId}`)
  if (selfPeer?.id === targetPeerId) {
    return
  }

  // Auto genrate display name
  displayname.value = displayname.value || Math.random().toString(36).substring(2, 7).toUpperCase()

  const hostConfig: PeerJS.PeerOptions = {}
  if (isDevelopment) {
    hostConfig.host = '127.0.0.1'
    hostConfig.port = 9000
  } else {
    hostConfig.host = 'raspberrypi.tail89a8a0.ts.net'
    hostConfig.port = 443
    hostConfig.secure = true
    hostConfig.path = '/peerjs'
  }

  // Create a new peer
  const peerJsServer = new PeerJS.Peer(targetPeerId, hostConfig)

  // Peer receive a connection request from the server
  peerJsServer.on('connection', (incomingConnection: PeerJS.DataConnection) => {
    // outConnection = newConn;
    setupConnection(incomingConnection)
  })

  // Peer is disconnected from the server, but can recover
  peerJsServer.on('disconnected', () => onDisconnected(peerJsServer))
  // Peer (me) is destroyed and can't connect to the server
  peerJsServer.on('close', () => onPeerClose(peerJsServer.id))
  // Wrapped in promise to allow async call waiting until connection is esablish
  // return new Promise((resolve, reject) => {
  // Connected to the peerServer
  peerJsServer.on('open', (id: string) => {
    trace('OPEN: My peer ID is: ' + id)
    selfPeer = peerJsServer
    isOnline.value = true
    isInstructor.value = selfPeerId.value == id
    // If the user entered a peer id, that is not same as this id, connecto that was unavilalbe, connect to it
    if (selfPeerId.value.length && id != selfPeerId.value) {
      connectToPeer(selfPeerId.value)
    }
    selfPeerId.value = id
  })
  // Error
  peerJsServer.on('error', (e: PeerJS.PeerError<string>) => {
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`)
    if (e.type === 'unavailable-id') {
      // if id is taken, it means someone gave us the class-id and we want to join the class.
      // A peer will be created with a random ID.
      connectToPeerJsServer('')
    }
  })
}

const disconnect = () => {
  trace('Disconnect')
  if (instructorConnection) {
    instructorConnection.close()
  }
  if (incomingConns) {
    Object.keys(incomingConns.value).forEach((id) => {
      const conn = incomingConns.value[id].conn
      conn.close()
    })
  }

  if (selfPeer) {
    selfPeer.disconnect()
  }

  isOnline.value = false
}

const connectToPeer = async (remotePeerId: string) => {
  trace(`Connecting to a peer ${remotePeerId}`)
  instructorConnection = selfPeer.connect(remotePeerId, {
    metadata: {
      displayName: displayname.value,
      callsign: displayname.value,
      name: props.accountName || '',
    },
  })

  // conn.on('disconnected', this.onDisconnected)
  instructorConnection.on('error', (e) =>
    onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`),
  )
  instructorConnection.on('close', () => {
    instructorConnectionOpen = false
    onConnectionClose(instructorConnection.peer)
  })

  instructorConnection.on('open', () => {
    instructorConnectionOpen = true
    trace(`OPEN Connected to a peer ${remotePeerId}`)
    sendEnvelopeToConnection(instructorConnection, 'identity', {
      name: props.accountName || '',
      callsign: displayname.value || '',
    })
    // Data received from remote peer
    instructorConnection.on('data', (data: unknown) => {
      onData(data as PeerData, instructorConnection)
    })
  })
}

const createEnvelope = (type: ClassroomEnvelope['type'], payload: unknown): ClassroomEnvelope => ({
  version: 1,
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  senderRole: isInstructor.value ? 'instructor' : 'student',
  timestamp: Date.now(),
  payload,
})

const sendEnvelopeToConnection = (
  conn: PeerJS.DataConnection,
  type: ClassroomEnvelope['type'],
  payload: unknown,
) => {
  if (conn.open) conn.send(createEnvelope(type, payload))
}

const targetConnections = () => {
  const selected = new Set(selectedPeerIds.value)
  const peers = Object.entries(incomingConns.value)
  return selected.size ? peers.filter(([id]) => selected.has(id)) : peers
}

const sendEnvelope = (type: ClassroomEnvelope['type'], payload: unknown) => {
  targetConnections().forEach(([, peer]) => sendEnvelopeToConnection(peer.conn, type, payload))
}

const sendEnvelopeToIds = (
  peerIds: string[],
  type: ClassroomEnvelope['type'],
  payload: unknown,
) => {
  peerIds.forEach((id) => {
    const peer = incomingConns.value[id]
    if (peer) sendEnvelopeToConnection(peer.conn, type, payload)
  })
}

const logSessionEvent = (type: string, target: string, detail: string) => {
  sessionEvents.value.push({ timestamp: Date.now(), type, target, detail })
}

const idsLabel = (ids: string[]) => ids.join(', ')

const toggleSelectAll = () => {
  selectedPeerIds.value = allSelected.value ? [] : Object.keys(incomingConns.value)
}
const selectAllPeers = () => {
  selectedPeerIds.value = Object.keys(incomingConns.value)
}

const isPeerSelected = (peerId: string) => selectedPeerIds.value.includes(peerId)

const togglePeerSelection = (peerId: string) => {
  acknowledgeHandRequest(peerId)
  selectedPeerIds.value = isPeerSelected(peerId)
    ? selectedPeerIds.value.filter((id) => id !== peerId)
    : [...selectedPeerIds.value, peerId]
}

const focusPeer = (peerId: string) => {
  focusedPeerId.value = peerId
  acknowledgeHandRequest(peerId)
}

const moveRosterFocus = (amount: number) => {
  const rows = visibleParticipantRows.value
  if (!rows.length) return
  const current = rows.findIndex((row) => row.peerId === focusedPeerId.value)
  const next =
    current < 0
      ? amount > 0
        ? 0
        : rows.length - 1
      : Math.max(0, Math.min(rows.length - 1, current + amount))
  focusedPeerId.value = rows[next].peerId
  nextTick(() => rosterRowRefs.value[next]?.scrollIntoView({ block: 'nearest' }))
}

const setRosterRowRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  if (element instanceof HTMLElement) rosterRowRefs.value[index] = element
}

const consumeActionSelection = (targetIds: string[]) => {
  const consumed = new Set(targetIds)
  selectedPeerIds.value = []
  nextTick(() => {
    const rows = visibleParticipantRows.value
    const nextIndex = rows.findIndex(({ peerId, peer }) => !consumed.has(peerId) && !peer.exercise)
    const fallbackIndex = rows.findIndex(({ peerId }) => !consumed.has(peerId))
    const focusIndex = nextIndex >= 0 ? nextIndex : fallbackIndex
    focusedPeerId.value = focusIndex >= 0 ? rows[focusIndex].peerId : ''
    if (focusIndex >= 0) rosterRowRefs.value[focusIndex]?.scrollIntoView({ block: 'nearest' })
  })
}

const clearRosterSearch = () => {
  rosterSearch.value = ''
  rosterSearchRef.value?.blur()
}

const openExercisePalette = () => {
  if (!actionTargetIds.value.length) return
  exercisePaletteOpen.value = true
  exerciseQuery.value = ''
  exerciseResultIndex.value = 0
  nextTick(() => exerciseSearchRef.value?.focus())
}

const closeExercisePalette = () => {
  exercisePaletteOpen.value = false
  exerciseQuery.value = ''
}

const chooseExercise = (exercise: ModuleEntry) => {
  exercisePath.value = exercise.path
  closeExercisePalette()
  assignExercise()
}

const moveExerciseResult = (amount: number) => {
  const count = exerciseResults.value.length
  if (!count) return
  exerciseResultIndex.value = (exerciseResultIndex.value + amount + count) % count
}

const handleExercisePaletteKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' || (event.ctrlKey && event.key.toLowerCase() === 'n')) {
    event.preventDefault()
    moveExerciseResult(1)
  } else if (event.key === 'ArrowUp' || (event.ctrlKey && event.key.toLowerCase() === 'p')) {
    event.preventDefault()
    moveExerciseResult(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const exercise = exerciseResults.value[exerciseResultIndex.value]
    if (exercise) chooseExercise(exercise)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeExercisePalette()
  }
}

const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"], .monaco-editor',
    ),
  )
}

const handleClassroomKeydown = (event: KeyboardEvent) => {
  if (!isInstructor.value || !isOnline.value || exercisePaletteOpen.value) return
  if (isEditableKeyboardTarget(event.target) || isEditableKeyboardTarget(document.activeElement)) {
    return
  }
  if (event.key === 'ArrowDown' || (event.ctrlKey && event.key.toLowerCase() === 'n')) {
    event.preventDefault()
    moveRosterFocus(1)
  } else if (event.key === 'ArrowUp' || (event.ctrlKey && event.key.toLowerCase() === 'p')) {
    event.preventDefault()
    moveRosterFocus(-1)
  } else if (event.key === ' ' && focusedPeerId.value) {
    event.preventDefault()
    togglePeerSelection(focusedPeerId.value)
  } else if (event.key === '/') {
    event.preventDefault()
    rosterSearchRef.value?.focus()
  } else if (event.key === 'A' || ((event.ctrlKey || event.metaKey) && event.key === 'a')) {
    event.preventDefault()
    selectAllPeers()
  } else if (event.key === 'a') {
    event.preventDefault()
    openExercisePalette()
  } else if (event.key === 'u' && targetHaveAssignments.value) {
    event.preventDefault()
    unassignExercise()
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    sendExerciseControl('start', actionTargetIds.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (rosterSearch.value) clearRosterSearch()
    else selectedPeerIds.value = []
  }
}

const rowClass = (peerId: string) => {
  const focused = focusedPeerId.value === peerId
  return ['text-secondary hover:bg-simInputBackground/40', focused ? 'bg-simInputBackground' : '']
}

const compactStatus = (status?: string) => {
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
const exerciseDetail = (peer: ConnectionsList[string]) => {
  if (!peer.exercise) return ''
  const checkpoint = peer.metadata.checkPoint ? ` · ${peer.metadata.checkPoint}` : ''
  return `${peer.exercise.name} · ${peer.exercise.status}${checkpoint}`
}
const compactExerciseStatus = (status: ClassroomExerciseStatus) =>
  ({
    assigned: 'ASN',
    running: 'RUN',
    completed: 'DONE',
    stopped: 'STOP',
    error: 'ERR',
    overdue: 'LATE',
  })[status]
const exerciseStatusSymbol = (status: ClassroomExerciseStatus) =>
  ({ assigned: '○', running: '▶', completed: '✓', stopped: '■', error: '!', overdue: '!' })[status]

const updateOverdueAssignments = () => {
  const now = Date.now()
  Object.entries(incomingConns.value).forEach(([peerId, peer]) => {
    const exercise = peer.exercise
    if (
      exercise?.deadline &&
      exercise.deadline < now &&
      ['assigned', 'running', 'stopped'].includes(exercise.status)
    ) {
      exercise.status = 'overdue'
      exercise.updatedAt = now
      exercise.detail = `Deadline passed at ${new Date(exercise.deadline).toLocaleTimeString()}`
      logSessionEvent('exercise-status', peerId, `${exercise.name}: overdue`)
    }
  })
}

const sendAnnouncement = () => {
  const targets = [...actionTargetIds.value]
  if (!announcement.value || !targets.length) return
  sendEnvelopeToIds(targets, 'announcement', { message: announcement.value })
  logSessionEvent('announcement', idsLabel(targets), announcement.value)
  announcement.value = ''
  messageComposerOpen.value = false
}

const toggleMessageComposer = () => {
  if (!actionTargetIds.value.length) return
  messageComposerOpen.value = !messageComposerOpen.value
  if (messageComposerOpen.value) nextTick(() => announcementInputRef.value?.focus())
}

const selectedExercise = (): ModuleEntry | undefined =>
  exerciseModules.find((entry) => entry.path === exercisePath.value)

const assignExercise = async () => {
  const exercise = selectedExercise()
  const targets = [...actionTargetIds.value]
  if (!exercise || !targets.length) return
  let source: string
  try {
    const response = await fetch(exercise.path)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    source = await response.text()
  } catch (error) {
    onError(`Unable to load ${exercise.name}: ${String(error)}`)
    return
  }
  const deadline = Date.now() + Math.max(1, exerciseMinutes.value || 1) * 60_000
  const assignment: ClassroomExerciseAssignment = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: exercise.name,
    source,
    deadline,
  }
  sendEnvelopeToIds(targets, 'exercise', assignment)
  targets.forEach((id) => {
    const peer = incomingConns.value[id]
    if (peer) {
      peer.exercise = {
        id: assignment.id,
        name: assignment.name,
        status: 'assigned',
        updatedAt: Date.now(),
        deadline,
      }
      peer.metadata.checkPoint = ''
    }
  })
  logSessionEvent('exercise', idsLabel(targets), `${exercise.name} (${exerciseMinutes.value} min)`)
  consumeActionSelection(targets)
}

const unassignExercise = () => {
  const targets = actionTargetIds.value.filter((id) => Boolean(incomingConns.value[id]?.exercise))
  if (!targets.length) return

  sendEnvelopeToIds(targets, 'exercise-unassign', {})
  targets.forEach((id) => {
    const peer = incomingConns.value[id]
    if (!peer) return
    peer.exercise = undefined
    peer.metadata.checkPoint = ''
  })
  logSessionEvent('exercise-unassign', idsLabel(targets), 'Assignment removed')
  consumeActionSelection(targets)
}

const sendExerciseStatus = (status: ClassroomExerciseStatus, detail?: string) => {
  if (!currentAssignment.value || !instructorConnectionOpen || !instructorConnection) return
  currentAssignment.value.status = status
  sendEnvelopeToConnection(instructorConnection, 'exercise-status', {
    id: currentAssignment.value.id,
    name: currentAssignment.value.name,
    status,
    detail,
  })
}

const startAssignedExercise = () => {
  if (!currentAssignment.value || currentAssignment.value.status === 'running') return
  sendExerciseStatus('running')
  emit('exerciseStart', currentAssignment.value)
}

const stopAssignedExercise = () => {
  if (!currentAssignment.value || currentAssignment.value.status !== 'running') return
  emit('exerciseStop')
  sendExerciseStatus('stopped')
}

const sendExerciseControl = (action: 'start' | 'stop', targets = actionTargetIds.value) => {
  if (!targets.length) return
  sendEnvelopeToIds(targets, 'exercise-control', { action })
  logSessionEvent('exercise-control', idsLabel(targets), action)
}

const reportExerciseResult = (
  status: 'completed' | 'error',
  detail?: string,
  exerciseName?: string,
) => {
  if (currentAssignment.value?.status !== 'running') return
  if (exerciseName && exerciseName !== currentAssignment.value.name) return
  sendExerciseStatus(status, detail)
}

const exerciseStatusClass = (status: ClassroomExerciseStatus) => ({
  'font-bold text-secondary': ['completed', 'running', 'error', 'overdue'].includes(status),
  'opacity-60': ['assigned', 'stopped'].includes(status),
})

const connectionAge = (peer: ConnectionsList[string]) => {
  clock.value
  return Math.floor((Date.now() - peer.lastSeen) / 1000)
}

const participantSummary = (peer: ConnectionsList[string]) => {
  const identity = [peer.metadata.callsign || peer.metadata.displayName, peer.metadata.name].filter(
    Boolean,
  )
  const exercise = peer.exercise ? `${peer.exercise.name}: ${peer.exercise.status}` : 'Unassigned'
  const network = connectionAge(peer) > 15 ? 'Network stale' : `${peer.latency ?? '—'}ms`
  return `${identity.join(' · ')} · ${compactStatus(peer.metadata.status)} · ${exercise} · ${network}`
}

const confirmDisconnect = (peerId: string, peer: ConnectionsList[string]) => {
  const name = peer.metadata.displayName || peerId
  if (window.confirm(`Disconnect ${name}?`)) peer.conn.close()
}

const toggleHand = () => {
  if (!instructorConnectionOpen || !instructorConnection) return
  studentHandState.value = studentHandState.value === 'raised' ? 'idle' : 'raised'
  sendEnvelopeToConnection(instructorConnection, 'hand', { state: studentHandState.value })
}

const acknowledgeHandRequest = (peerId: string) => {
  const peer = incomingConns.value[peerId]
  if (peer?.handState !== 'raised') return
  peer.handState = 'idle'
  peer.handRaised = false
  sendEnvelopeToConnection(peer.conn, 'hand-control', { state: 'acknowledged' })
  logSessionEvent('hand', peerId, 'acknowledged')
}

const handWaitTime = (peer: ConnectionsList[string]) => {
  clock.value
  if (!peer.handRaisedAt) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - peer.handRaisedAt) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
}

const exportSession = () => {
  const participants = Object.entries(incomingConns.value).map(([id, peer]) => ({
    id,
    displayName: peer.metadata.displayName,
    status: peer.metadata.status,
    checkpoint: peer.metadata.checkPoint,
    latency: peer.latency,
    exercise: peer.exercise,
    handState: peer.handState,
    handRaisedAt: peer.handRaisedAt,
  }))
  const report = JSON.stringify(
    {
      classroom: selfPeerId.value,
      startedAt: new Date(sessionStartedAt.value).toISOString(),
      exportedAt: new Date().toISOString(),
      participants,
      events: sessionEvents.value,
    },
    null,
    2,
  )
  const url = URL.createObjectURL(new Blob([report], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `classroom-${selfPeerId.value}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const sendWhiteboardState = (whiteboardState: string) => {
  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value) {
    return
  }
  sendEnvelope('whiteboard', { wb: whiteboardState })
}

const sendApiCall = (apiCall: string) => {
  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value) {
    return
  }

  sendEnvelope('api', { api: apiCall })
}

const sendStatus = (status: string) => {
  if (!instructorConnection) {
    return
  }

  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value || !instructorConnectionOpen) {
    return
  }

  sendEnvelopeToConnection(instructorConnection, 'status', { status })
}

const sendCheckPoint = (checkpoint: string) => {
  if (!instructorConnection) {
    return
  }

  // Must be online and mirror mode activated
  if (!isOnline.value || !followMode.value || !instructorConnectionOpen) {
    return
  }

  sendEnvelopeToConnection(instructorConnection, 'checkpoint', { checkpoint })
}
const sendScript = (title: string, content: string) => {
  sendEnvelope('script', { title, script: content })
}

const reset = () => {
  trace('Resetting classroom')
  disconnect()
  if (selfPeer) {
    selfPeer.destroy()
    selfPeer = undefined as any
  }
  incomingConns.value = {}
  instructorConnection = undefined as any
}

defineExpose({
  sendApiCall,
  sendStatus,
  sendScript,
  sendCheckPoint,
  sendWhiteboardState,
  reportExerciseResult,
  reset,
})

const trace = (text: string) => {
  if (isDevelopment === false) {
    return
  }

  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1)
  }
  if (window.performance) {
    const now = (window.performance.now() / 1000).toFixed(3)
    console.log(now + ': ' + text)
  } else {
    console.log(text)
  }
}

// peer.on('open')         // Connected to peerServer
// peer.on('connection')   // Recevied a connection request from peerServer
// peer.on('close')        // Peer (me) is destroyed and can't connect to the server
// peer.on('disconnected') // Peer (me) is disconnted but can reconnect to the server
// peer.on('call')

// dataConnection.on('data')  // Data received from remote peer
// dataConnection.on('open')  // Peer to peer connection is established
// dataConnection.on('close') // Peer (me) or remote peer closes the connection
// dataConnection.on('error')

// 'error'
//  'browser-incompatible'
//  'disconnected'
//  'invalid-id'
//  'invalid-key'
//  'network'
//  'peer-unavailable'
//  'ssl-unavailable'
//  'server-error'
//  'socket-error'
//  'socket-closed'
//  'unavailable-id'
//  'webrtc'
</script>

<style scoped>
.classroom-roster {
  container-type: inline-size;
}

.command-button {
  @apply shrink-0 px-1 hover:bg-simInputBackground hover:text-panelActive disabled:cursor-default disabled:opacity-40;
}

@container (max-width: 26rem) {
  .roster-net {
    display: none;
  }
}
</style>
