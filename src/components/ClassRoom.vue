<template>
  <div
    v-bind="$attrs"
    ref="classroomShellRef"
    class="classroom-shell relative flex h-full min-h-0 w-full flex-col overflow-hidden outline-none"
    tabindex="0"
    aria-label="Classroom controls"
    @focus.self="focusClassroomPanel"
    @keydown="handleClassroomKeydown"
  >
    <div class="order-1 w-full">
      <div class="flex h-8 min-w-0 items-center gap-2 px-2">
        <span :class="isOnline ? 'text-simActiveButton' : 'opacity-60'">●</span>
        <button
          class="shrink-0 text-xs"
          @click="isOnline ? disconnect() : connectToPeerJsServer(requestedRoomId)"
        >
          {{ isOnline ? 'Online' : 'Offline' }}
        </button>
        <span v-if="isInstructor && isOnline" class="min-w-0 truncate">· {{ participantRecords.length }} peers</span>
        <wButton
          v-if="isInstructor"
          class="ml-auto h-5 shrink-0"
          button-label="SYNC"
          :button-state="followMode"
          :button-click="() => (followMode = !followMode)"
          :active-indicator="true"
          title="Synchronize instructor actions with connected peers"
        />
        <button
          class="px-1 hover:text-panelActive focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
          title="Classroom settings"
          aria-label="Classroom settings"
          :aria-expanded="connectionSettingsOpen"
          @click="connectionSettingsOpen = !connectionSettingsOpen"
        >
          {{ connectionSettingsOpen ? '×' : '⋯' }}
        </button>
      </div>

      <div id="classroom-shortcuts" popover="auto" class="shortcut-help" aria-labelledby="classroom-shortcuts-title" @keydown.stop>
        <div class="mb-2 flex items-center justify-between gap-2">
          <strong id="classroom-shortcuts-title">Keyboard shortcuts</strong>
          <button type="button" popovertarget="classroom-shortcuts" popovertargetaction="hide" class="command-button h-6 w-6" aria-label="Close keyboard shortcuts">×</button>
        </div>
        <p class="mb-2">Instructor shortcuts work while connected and focused in Classroom, outside text fields.</p>
        <dl class="shortcut-list">
          <template v-for="shortcut in classroomShortcuts" :key="shortcut.keys">
            <dt><kbd>{{ shortcut.keys }}</kbd></dt><dd>{{ shortcut.action }}</dd>
          </template>
        </dl>
        <p class="mt-3">Assign, Unassign and Message affect selected peers, or the focused peer if none are selected.</p>
        <p class="mt-2">In the lesson picker: ↑ / ↓ choose a lesson, Enter assigns it, Esc cancels.</p>
      </div>

      <form
        v-if="!isOnline"
        class="flex min-w-0 items-center gap-1 border-t border-simElementBorder p-2"
        @submit.prevent="connectToPeerJsServer(requestedRoomId.trim())"
      >
        <label for="classroom-session-id" class="shrink-0 opacity-60">SESSION ID</label>
        <input
          id="classroom-session-id"
          v-model="requestedRoomId"
          type="text"
          autocomplete="off"
          placeholder="Enter or create a session"
          class="h-6 min-w-0 flex-1 border border-simElementBorder bg-simInputBackground px-2 text-secondary outline-none focus:border-panelActive"
        />
        <button
          type="submit"
          class="command-button h-6 shrink-0"
          :disabled="!requestedRoomId.trim()"
        >
          Connect
        </button>
      </form>

      <div
        v-if="isInstructor && isOnline"
        class="flex min-h-6 flex-wrap items-center gap-2 px-2 text-secondary"
      >
        <label
          class="flex items-center gap-1"
          title="Feedback debriefs use lesson evidence. Policy changes apply to new requests."
        >
          Feedback
          <select v-model="aiPolicy" class="h-5 bg-simInputBackground px-1 text-secondary">
            <option value="off">OFF</option>
            <option value="review">REVIEW</option>
            <option value="automatic">AUTO</option>
          </select>
        </label>
        <span class="text-xs">{{ aiJobIndex.pendingCount }} pending</span>
      </div>

      <div v-if="connectionSettingsOpen" class="grid gap-1 bg-panelHeaderBackground p-2">
        <label v-if="!isInstructor && isOnline" class="flex h-5 min-w-0 items-center gap-1">
          <span class="w-14 shrink-0 opacity-60">ID</span>
          <span class="min-w-0 flex-1 truncate opacity-60">{{ selfPeerId }}</span>
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
          v-if="isOnline"
          id="connect"
          button-label="Disconnect"
          :button-state="true"
          class="h-5 w-full border border-simElementBorder"
          :buttonClick="disconnect"
        />
        <button
          v-if="isInstructor && isOnline"
          class="h-5 text-left opacity-70 hover:text-panelActive hover:opacity-100"
          @click="exportSession"
        >
          Export session
        </button>
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
      class="relative order-4 flex min-h-7 shrink-0 flex-wrap items-center gap-1 border-t border-panelBorder bg-panelHeaderBackground px-2 py-1 text-secondary"
    >
      <button
        class="command-button roster-primary-action"
        :disabled="!actionTargetIds.length"
        @click="openExercisePalette()"
      >
        Assign exercise <kbd class="ml-1 opacity-70">A</kbd>
      </button>
      <button
        class="command-button"
        :disabled="!actionTargetIds.length || !targetHaveAssignments"
        @click="sendExerciseControl('start', actionTargetIds)"
      >
        Start
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
        :disabled="!actionTargetIds.length"
        @click="batchMenuOpen = !batchMenuOpen"
      >
        More ▾
      </button>

      <div
        v-if="batchMenuOpen"
        class="fixed bottom-8 right-2 z-[60] min-w-36 bg-panelContentBackground p-1 shadow-lg ring-1 ring-panelBorder"
      >
        <button class="menu-command" :disabled="!targetHaveAssignments" @click="unassignExercise">
          Unassign <kbd class="float-right opacity-70">U</kbd>
        </button>
        <button class="menu-command" @click="openMessageComposer()">Message <kbd class="float-right opacity-70">M</kbd></button>
        <button class="menu-command" @click="exportSession">Export session</button>
      </div>

      <div
        v-if="messageComposerOpen"
        class="fixed inset-0 z-50 flex items-start justify-center bg-panelContentBackground/80 pt-[12vh]"
        @click.self="closeMessageComposer"
        @keydown.esc.stop.prevent="closeMessageComposer"
      >
        <div
          class="flex w-80 max-w-[calc(100%-1rem)] items-center gap-1 bg-panelContentBackground p-2 shadow-lg ring-1 ring-panelBorder"
        >
          <input
            ref="announcementInputRef"
            v-model.trim="announcement"
            class="h-6 min-w-0 flex-1 border border-simElementBorder bg-simInputBackground px-2 text-secondary outline-none focus:border-panelActive"
            placeholder="Message selected peers..."
            @keyup.enter="sendAnnouncement"
          />
          <button class="command-button" :disabled="!announcement" @click="sendAnnouncement">
            Send
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="isInstructor && isOnline"
      class="classroom-roster order-2 flex min-h-24 flex-1 flex-col overflow-hidden font-panelFont"
    >
      <div class="flex items-center justify-between gap-2 px-2 pt-3 pb-1 font-medium">
        <span>
          {{ selectedPeerIds.length ? `${selectedPeerIds.length} SELECTED` : 'PEERS' }}
        </span>
        <button class="command-button" :aria-pressed="rosterFilter === 'unassigned'" @click="rosterFilter = rosterFilter === 'unassigned' ? 'all' : 'unassigned'">
          {{ unassignedPeerCount }} unassigned
        </button>
      </div>
      <div class="flex h-7 shrink-0 items-center gap-2 px-2">
        <input
          ref="rosterSearchRef"
          v-model="rosterSearch"
          class="h-5 min-w-20 flex-1 border border-simElementBorder bg-simInputBackground px-2 text-secondary outline-none focus:border-panelActive"
          placeholder="Search peers..."
          aria-label="Search peers"
          @keydown.esc.stop.prevent="clearRosterSearch"
          @keydown.down.prevent="moveRosterFocus(1)"
          @keydown.up.prevent="moveRosterFocus(-1)"
          @keydown.ctrl.n.prevent="moveRosterFocus(1)"
          @keydown.ctrl.p.prevent="moveRosterFocus(-1)"
          @keydown.ctrl.a.prevent="selectAllPeers"
          @keydown.meta.a.prevent="selectAllPeers"
        />
        <select
          v-model="rosterFilter"
          class="h-5 max-w-24 shrink-0 bg-primary px-1 text-secondary outline-none"
          title="Filter peers"
        >
          <option value="all">All</option>
          <option value="unassigned">Unassigned</option>
          <option value="active">ACTIVE {{ activeExerciseCount }}</option>
          <option value="hand">HAND {{ raisedHandCount }}</option>
          <option value="overdue">OVERDUE {{ overdueCount }}</option>
        </select>
      </div>
      <div class="roster-body flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="roster-list min-h-0 flex-1 overflow-auto">
          <table class="peer-table" aria-label="Classroom peers">
            <colgroup>
              <col class="peer-column" /><col class="lesson-column" /><col />
              <col class="status-column" /><col class="latency-column" /><col class="details-column" />
            </colgroup>
          <thead class="roster-columns"><tr>
            <th scope="col">Peer</th>
            <th scope="col" class="roster-lesson-heading">Lesson</th>
            <th scope="col">Progress</th>
            <th scope="col">Status</th>
            <th scope="col" class="roster-latency-heading text-right">Latency</th>
            <th scope="col"><span class="sr-only">Details</span></th>
          </tr></thead>
          <tbody>
            <template v-for="participant in visibleParticipantRows" :key="participant.peerId">
              <ClassroomPeerRow
                :ref="(element) => setRosterRowRef(element, participant.peerId)"
                :peer-id="participant.peerId"
                :peer="participant.peer"
                :selected="isPeerSelected(participant.peerId)"
                :focused="focusedPeerId === participant.peerId"
                :details-open="detailsPeerId === participant.peerId"
                :ai-state="aiJobIndex.pendingByPeer.get(participant.peerId)"
                :clock="clock"
                @focus-row="focusPeerRow"
                @select-peer="togglePeerCheckbox"
                @open-details="openPeerDetails"
                @close-details="closePeerDetails"
                @toggle-details="togglePeerDetails"
                @assign-lesson="openExercisePalette"
              />

              <tr
                v-if="detailsPeerId === participant.peerId"
                :ref="setRosterDetailRef"
                class="roster-detail text-secondary"
              >
                <td colspan="6" class="p-0"><div class="roster-detail-content flex max-h-72 min-h-0 flex-col overflow-hidden">
                <div class="flex min-h-7 items-center gap-1 px-2">
                  <span class="min-w-0 flex-1 truncate font-medium text-secondary">
                    {{ participant.peer.metadata.callsign || participant.peer.metadata.displayName }} · Peer details
                  </span>
                  <button
                    class="command-button"
                    aria-label="Close peer details"
                    title="Close peer details"
                    @click="closePeerDetails"
                  >
                    ×
                  </button>
                </div>
                <dl
                  class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 border-t border-simElementBorder px-2 py-1 leading-tight"
                >
                  <dt class="opacity-50">Name</dt>
                  <dd class="truncate">
                    {{
                      participant.peer.metadata.name || participant.peer.metadata.displayName || '—'
                    }}
                  </dd>
                  <dt class="opacity-50">Callsign</dt>
                  <dd class="truncate">{{ participant.peer.metadata.callsign || '—' }}</dd>
                  <dt class="opacity-50">Peer ID</dt>
                  <dd class="truncate" :title="participant.peerId">{{ participant.peerId }}</dd>
                  <dt class="opacity-50">Connection</dt>
                  <dd class="truncate">
                    {{ compactStatus(participant.peer.metadata.status) }} ·
                    {{ connectionAge(participant.peer) > 15 ? 'stale' : 'connected' }} ·
                    {{ participant.peer.latency ?? '—' }}ms
                  </dd>
                </dl>
                <div class="border-t border-simElementBorder px-2 py-1 leading-tight">
                  <div class="mb-0.5 opacity-50">Assignment</div>
                  <div v-if="participant.peer.exercise" class="flex min-w-0 flex-wrap gap-x-1">
                    <span class="min-w-0 truncate font-medium">{{
                      participant.peer.exercise.name
                    }}</span>
                    <span>· {{ compactExerciseStatus(participant.peer.exercise.status) }}</span>
                    <span v-if="participant.peer.exercise.deadline" class="opacity-60">
                      · due {{ formatAssignmentDeadline(participant.peer.exercise.deadline) }}
                    </span>
                  </div>
                  <div v-else class="opacity-60">Unassigned</div>
                </div>
                <div class="flex flex-wrap gap-1 border-t border-simElementBorder px-2 py-1">
                  <button
                    class="command-button"
                    :class="{ 'roster-primary-action': !participant.peer.exercise }"
                    @click="openExercisePalette(participant.peerId)"
                  >
                    {{ participant.peer.exercise ? 'Replace' : 'Assign' }}
                  </button>
                  <button
                    class="command-button"
                    :disabled="
                      !participant.peer.exercise || participant.peer.exercise.status === 'running'
                    "
                    @click="sendExerciseControl('start', [participant.peerId])"
                    :class="{
                      'roster-primary-action':
                        participant.peer.exercise && participant.peer.exercise.status !== 'running',
                    }"
                  >
                    Start
                  </button>
                  <button
                    class="command-button command-destructive"
                    :disabled="participant.peer.exercise?.status !== 'running'"
                    @click="sendExerciseControl('stop', [participant.peerId])"
                  >
                    Stop
                  </button>
                  <button
                    class="command-button command-destructive"
                    :disabled="!participant.peer.exercise"
                    @click="unassignPeer(participant.peerId)"
                  >
                    Unassign
                  </button>
                  <button class="command-button" @click="openMessageComposer(participant.peerId)">
                    Message
                  </button>
                  <button
                    class="command-button command-destructive ml-auto"
                    @click="disconnectPeer(participant.peerId)"
                  >
                    Disconnect
                  </button>
                </div>
                <div
                  class="roster-detail-history min-h-0 flex-1 overflow-auto border-t border-simElementBorder px-2 pb-1"
                >
                  <div
                    v-if="participant.peer.exercise"
                    class="flex flex-wrap items-center gap-1 py-1"
                  >
                    <button
                      class="command-button"
                      :disabled="
                        pendingAI(participant.peerId) ||
                        !participant.peer.conn.open ||
                        !participant.peer.exercise.checkpoints.length
                      "
                      title="Shares lesson evidence for feedback"
                      @click="suggestPeerFeedback(participant.peerId)"
                    >
                      Suggest feedback
                    </button>
                  </div>
                  <section
                    v-if="visibleAIJobs.length"
                    aria-label="Feedback debriefs"
                    class="py-1 text-secondary"
                  >
                    <article v-for="job in visibleAIJobs" :key="job.id" class="py-1">
                      <div role="status">
                        Feedback ·
                        {{
                          job.state === 'finished'
                            ? job.result?.status
                            : job.state === 'review'
                              ? 'Needs review'
                              : job.state
                        }}
                      </div>
                      <p class="whitespace-pre-wrap break-words leading-tight">
                        {{ job.suggestion?.message }}
                      </p>
                      <p v-if="job.result && job.result.status !== 'completed'" class="break-words">
                        {{ job.result.reason }}
                      </p>
                      <details v-if="job.suggestion" class="mt-1">
                        <summary class="detail-disclosure">
                          Evidence · {{ job.suggestion.evidence.length }} checkpoints
                        </summary>
                        <div v-for="(checkpoint, index) in job.suggestion.evidence" :key="index">
                          {{ formatCheckpointTime(checkpoint.timestamp) }} ·
                          {{ checkpoint.message }}
                          <pre class="max-h-28 overflow-auto whitespace-pre-wrap break-words">{{
                            JSON.stringify(
                              job.evidence?.find(
                                (item) =>
                                  item.timestamp === checkpoint.timestamp &&
                                  item.message === checkpoint.message,
                              )?.data,
                              null,
                              2,
                            )
                          }}</pre>
                        </div>
                        <pre class="max-h-28 overflow-auto whitespace-pre-wrap break-words">{{
                          JSON.stringify(job.request.evidence, null, 2)
                        }}</pre>
                      </details>
                      <div class="mt-1 flex items-center gap-1">
                        <template v-if="job.state === 'review'">
                          <button
                            class="command-button roster-primary-action"
                            @click="approveFeedback(job.id)"
                          >
                            Send
                          </button>
                          <button class="command-button" @click="dismissFeedback(job.id)">
                            Dismiss
                          </button>
                        </template>
                        <button
                          v-else-if="job.state !== 'finished'"
                          class="command-button"
                          @click="cancelAIJob(job.id)"
                        >
                          Cancel
                        </button>
                      </div>
                    </article>
                  </section>
                  <div class="pt-1 font-medium">Progress history</div>
                  <div
                    v-if="!participant.peer.exercise?.checkpoints.length"
                    class="py-1 opacity-50"
                  >
                    No progress recorded.
                  </div>
                  <div
                    v-for="(checkpoint, index) in participant.peer.exercise?.checkpoints || []"
                    :key="`${checkpoint.timestamp}-${index}`"
                    class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-0.5 leading-tight"
                  >
                    <span class="opacity-50">{{ formatCheckpointTime(checkpoint.timestamp) }}</span>
                    <span class="min-w-0 break-words">
                      {{ checkpoint.message }}
                    </span>
                  </div>
                </div>
                </div>
                </td>
              </tr>
            </template>
          </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="exercisePaletteOpen"
    class="fixed inset-0 z-50 flex items-start justify-center bg-panelContentBackground/80 pt-[12vh]"
    @click.self="cancelExercisePalette"
    @keydown.esc.stop.prevent="cancelExercisePalette"
  >
    <div class="w-1/2 min-w-80 border border-panelActive bg-panelContentBackground shadow-lg">
      <div
        class="border-b border-panelBorder bg-panelHeaderBackground px-2 py-1 font-bold text-secondary"
      >
        ASSIGN · {{ exercisePaletteTargetIds.length }} TARGET{{
          exercisePaletteTargetIds.length === 1 ? '' : 'S'
        }}
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
  markRaw,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import Fuse from 'fuse.js'
import { useLessonRun } from '../useLessonRun'
import { watchLessonLifecycle, type LessonState } from '../ClassroomLessonLifecycle'
import wButton from './wButton.vue'
import ClassroomPeerRow from './ClassroomPeerRow.vue'
import { compactStatus, compactExerciseStatus, type ClassroomPeer } from '../ClassroomPeer'
import * as PeerJS from 'peerjs'
import { DataConnection } from 'peerjs'
import { moduleTree, type ModuleEntry } from './data/EASAModules'
// import vueQr from "vue-qr/src/packages/vue-qr.vue";

// Define the event emitter
const emit = defineEmits<{
  (event: 'classroomConnection', newValue: boolean): void
  (event: 'classroomRoom', roomId: string): void
  (event: 'handAttention', pending: boolean): void
  (event: 'apiDataEvent', receivedData: PeerApiData): void
  (event: 'apiScriptEvent', receivedData: PeerScriptData): void
  (event: 'wbEvent', receivedData: PeerWhiteBoardata): void
  (event: 'instructorCommand', command: ClassroomCommand): void
  (event: 'announcement', message: string): void
  (event: 'exerciseStart', exercise: ClassroomExerciseAssignment): void
  (event: 'exerciseStop'): void
  (event: 'error', errorMessage: string): void
}>()

import type { CheckpointData, LessonAIRequest, LessonAIResponse } from '../ScriptContext'
import { nextClassroomFocus, isNativeControlKey } from '../ClassroomFocus'
import {
  createAICoordinator,
  createAIClient,
  validAIRequest,
  type AIPolicy,
  type AIJob,
} from '../LessonAI'
import { requestFeedback } from '../FeedbackProvider'
import { feedbackProviderConfig } from '../feedbackProviderConfig'
import { applicationTimers } from '../ApplicationTimers'
import {
  createInstructorActions,
  acceptsExerciseControl,
  acceptsAssignmentMessage,
  type InstructorActionResult,
} from '../InstructorActions'

const props = defineProps<{ accountName?: string }>()
defineOptions({ inheritAttrs: false })

const isDevelopment = import.meta.env.DEV
const classroomShortcuts = [
  { keys: '↑ / ↓', action: 'Previous / next peer' },
  { keys: '→ / ←', action: 'Open / close details' },
  { keys: 'Space', action: 'Toggle peer selection' },
  { keys: '/', action: 'Peer search' },
  { keys: 'Shift+A', action: 'Select all peers' },
  { keys: 'A', action: 'Assign lesson' },
  { keys: 'U', action: 'Unassign lesson' },
  { keys: 'M', action: 'Message peers' },
  { keys: 'S', action: 'Start lessons' },
  { keys: 'Esc', action: 'Close or clear current view' },
]
const baseUrl = window.location.origin
let selfPeer: PeerJS.Peer | undefined
let instructorConnection: PeerJS.DataConnection | undefined
let instructorConnectionOpen = false
let classroomDisposed = false
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
const clearReconnectTimer = () => {
  applicationTimers.clearTimeout(reconnectTimer)
  reconnectTimer = undefined
}
const defaultSessionId = `SIM-${Math.floor(100000 + Math.random() * 90000)}`
const selfPeerId = ref<string>(defaultSessionId)
const requestedRoomId = ref(selfPeerId.value)
const isInstructor = ref(true)
let displayname = ref<string>()
let isOnline = ref(false)
const classroomRoomId = computed(() =>
  isInstructor.value ? selfPeerId.value : requestedRoomId.value,
)
type ConnectionsList = Record<string, ClassroomPeer>
const incomingConns = ref<ConnectionsList>({})
const peerRosterOrder = ref<string[]>([])
const routeHash = window.location.href
const isQrPopupOpen = ref(false)
const followMode = ref(false)
const connectionSettingsOpen = ref(false)
const selectedPeerIds = ref<string[]>([])
const focusedPeerId = ref('')
const detailsPeerId = ref('')
const rosterSearch = ref('')
const rosterFilter = ref<'all' | 'unassigned' | 'active' | 'hand' | 'overdue'>('all')
const batchMenuOpen = ref(false)
const rosterSearchRef = ref<HTMLInputElement | null>(null)
const exercisePaletteOpen = ref(false)
const exercisePaletteTargetIds = ref<string[]>([])
const exercisePalettePeerId = ref('')
const exerciseQuery = ref('')
const exerciseSearchRef = ref<HTMLInputElement | null>(null)
const exerciseResultIndex = ref(0)
const classroomShellRef = ref<HTMLElement | null>(null)
const rosterRowRefs = new Map<string, HTMLElement>()
let focusInteractionVersion = 0
const recordFocusInteraction = () => {
  focusInteractionVersion++
}
const rosterDetailRef = ref<HTMLElement | null>(null)
const announcement = ref('')
const announcementInputRef = ref<HTMLInputElement | null>(null)
const messageComposerOpen = ref(false)
const messageTargetIds = ref<string[]>([])
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

const dismissPeerDetailsOnOutsideClick = (event: PointerEvent) => {
  if (!detailsPeerId.value || !(event.target instanceof Element)) return
  if (rosterDetailRef.value?.contains(event.target)) return
  if (event.target.closest('.peer-details-toggle')) return
  detailsPeerId.value = ''
}
const clearFocusedPeerOnOutsideClick = (event: PointerEvent) => {
  if (!(event.target instanceof Element)) return
  if (event.target.closest('.classroom-roster-row, .roster-detail')) return
  focusedPeerId.value = ''
  if (document.activeElement instanceof HTMLElement && document.activeElement.classList.contains('classroom-roster-row')) {
    document.activeElement.blur()
  }
}
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
  const connectedIds = Object.keys(incomingConns.value)
  const orderedIds = [
    ...peerRosterOrder.value.filter((peerId) => peerId in incomingConns.value),
    ...connectedIds.filter((peerId) => !peerRosterOrder.value.includes(peerId)),
  ]
  return orderedIds.map((peerId) => ({ peerId, peer: incomingConns.value[peerId] }))
})
const filteredParticipants = computed(() => {
  const statusFiltered = participantRecords.value.filter(({ peer }) => {
    if (rosterFilter.value === 'unassigned') return !peer.exercise
    if (rosterFilter.value === 'active') return peer.exercise?.status === 'running'
    if (rosterFilter.value === 'hand') return peer.handState === 'raised'
    if (rosterFilter.value === 'overdue') return peer.exercise?.status === 'overdue'
    return true
  })
  if (!rosterSearch.value.trim()) return statusFiltered
  return new Fuse(statusFiltered, {
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
const unassignedPeerCount = computed(() => participantRecords.value.filter(({ peer }) => !peer.exercise).length)
const visibleParticipantRows = computed(() =>
  filteredParticipants.value.map((participant, rosterIndex) => ({ ...participant, rosterIndex })),
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
  emit('classroomRoom', newValue ? classroomRoomId.value : '')
})

watch(classroomRoomId, (roomId) => {
  if (isOnline.value) emit('classroomRoom', roomId)
})

watch(
  raisedHandCount,
  (count) => {
    emit('handAttention', count > 0)
  },
  { immediate: true },
)

watch(rosterSearch, () => {
  const visible = visibleParticipantRows.value
  if (!visible.some((row) => row.peerId === focusedPeerId.value)) {
    focusedPeerId.value = visible[0]?.peerId || ''
  }
  if (!visible.some((row) => row.peerId === detailsPeerId.value)) detailsPeerId.value = ''
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
  document.addEventListener('pointerdown', dismissPeerDetailsOnOutsideClick)
  document.addEventListener('pointerdown', clearFocusedPeerOnOutsideClick)
  document.addEventListener('pointerdown', recordFocusInteraction, true)
  document.addEventListener('keydown', recordFocusInteraction, true)
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
    requestedRoomId.value = match[1]
    if (selfPeerId.value) {
      connectToPeerJsServer(selfPeerId.value)
    }
  }
})

onUnmounted(() => {
  classroomDisposed = true
  disconnect()
  window.removeEventListener('beforeunload', disconnect)
  document.removeEventListener('pointerdown', dismissPeerDetailsOnOutsideClick)
  document.removeEventListener('pointerdown', clearFocusedPeerOnOutsideClick)
  document.removeEventListener('pointerdown', recordFocusInteraction, true)
  document.removeEventListener('keydown', recordFocusInteraction, true)
  if (healthTimer) clearInterval(healthTimer)
  emit('handAttention', false)
})

const setupConnection = (incomingConnection: DataConnection) => {
  if (classroomDisposed) {
    incomingConnection.close()
    return
  }
  const peer = selfPeer
  const isCurrent = () => !classroomDisposed && isOnline.value && selfPeer === peer
  // Connection request from remote peer
  trace(`Received a connection data from ${incomingConnection.peer}`)

  // Data from remote peer
  incomingConnection.on('data', (data: unknown) => {
    if (!isCurrent()) return
    onData(data as PeerData, incomingConnection)
  })
  // Connected to remote peer.
  incomingConnection.on('open', () => {
    if (!isCurrent()) {
      incomingConnection.close()
      return
    }
    trace(`OPEN Peer ${incomingConnection.peer}`)

    // Add to incoming connection list (create new entry)
    incomingConns.value[incomingConnection.peer] = {
      metadata: incomingConnection.metadata || {},
      conn: markRaw(incomingConnection),
      lastSeen: Date.now(),
    }
    if (!peerRosterOrder.value.includes(incomingConnection.peer)) {
      peerRosterOrder.value.push(incomingConnection.peer)
    }
  })

  // Lost connection with remote peer
  incomingConnection.on('close', () => {
    if (isCurrent() && incomingConns.value[incomingConnection.peer]?.conn === incomingConnection) {
      onConnectionClose(incomingConnection.peer)
    }
  })

  // Error
  incomingConnection.on('error', (e: PeerJS.PeerError<string>) => {
    if (!isCurrent()) return
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
  peerRosterOrder.value = peerRosterOrder.value.filter((peerId) => peerId !== peer.id)
}

const onPeerClose = (peerId: string) => {
  trace(`Peer closed ${peerId}`)
  isOnline.value = false
}

const onConnectionClose = (peerId: string) => {
  if (classroomDisposed || !isOnline.value) return
  // Lost connection to the sever
  if (peerId === selfPeerId.value) {
    trace(`Connection to server closed ${peerId}`)
    isOnline.value = false
  }
  // Lost connection to the instructor.
  else if (instructorConnection && peerId == instructorConnection.peer) {
    trace(`Connection to the instructor closed ${peerId}. Reconnecting`)
    instructorConnectionOpen = false
    instructorConnection.removeAllListeners()
    instructorConnection = undefined
    clearReconnectTimer()
    reconnectTimer = applicationTimers.setTimeout(() => {
      reconnectTimer = undefined
      if (!classroomDisposed && isOnline.value) connectToPeer(peerId)
    }, 3000)
  }
  // Lost connection with a peer
  else {
    // delete from the list
    delete incomingConns.value[peerId]
    peerRosterOrder.value = peerRosterOrder.value.filter((id) => id !== peerId)
    selectedPeerIds.value = selectedPeerIds.value.filter((id) => id !== peerId)
  }
}

const recordCheckpoint = (
  participant: ConnectionsList[string],
  checkpoint: string,
  timestamp: number,
  data?: CheckpointData,
) => {
  participant.metadata.checkPoint = checkpoint
  participant.metadata.checkPointData = data
  if (!checkpoint || !participant.exercise) return

  const history = participant.exercise.checkpoints
  const previous = history[history.length - 1]
  if (previous?.message === checkpoint && !data && !previous.data) return
  history.push({ timestamp, message: checkpoint, ...(data ? { data } : {}) })
  if (history.length > 100) history.splice(0, history.length - 100)
}

const onData = (data: PeerData, conn: PeerJS.DataConnection) => {
  if (isDevelopment) trace(`Received data from ${conn.peer} ${JSON.stringify(data)}`)
  const participant = incomingConns.value[conn.peer]
  if (participant) participant.lastSeen = Date.now()

  if (isEnvelope(data)) {
    const privilegedTypes: ClassroomEnvelope['type'][] = [
      'api',
      'script',
      'whiteboard',
      'command',
      'announcement',
      'ai-response',
      'exercise',
      'exercise-unassign',
      'exercise-control',
      'hand-control',
    ]
    // Authorize the actual connection, not a senderRole supplied by the message.
    if (
      privilegedTypes.includes(data.type) &&
      (isInstructor.value || conn !== instructorConnection)
    ) {
      onError(`Rejected privileged message from ${conn.peer}`)
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
    if (participant) recordCheckpoint(participant, String(data.checkpoint || ''), Date.now())
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
    case 'ai-request':
      if (
        isInstructor.value &&
        participant &&
        validAIRequest(payload) &&
        participant.exercise?.id === payload.assignmentId
      ) {
        if (!aiCoordinator.submit(conn.peer, payload, aiPolicy.value)) {
          sendEnvelopeToConnection(conn, 'ai-response', {
            requestId: payload.requestId,
            assignmentId: payload.assignmentId,
            runId: payload.runId,
            result: { status: 'failed', reason: 'A debrief is already pending for this student.' },
          })
        }
      }
      break
    case 'ai-cancel':
      if (isInstructor.value && participant && validAIRequest(payload)) {
        const job = aiJobs.value.find(
          (j) =>
            j.peerId === conn.peer &&
            j.request.requestId === payload.requestId &&
            j.request.assignmentId === payload.assignmentId &&
            j.request.runId === payload.runId,
        )
        if (job) aiCoordinator.cancel(job.id)
      }
      break
    case 'ai-response':
      if (!isInstructor.value && conn === instructorConnection) aiClient.receive(payload)
      break
    case 'api':
      emit('apiDataEvent', { api: String(payload.api || '') })
      break
    case 'status':
      if (participant) participant.metadata.status = String(payload.status || '')
      break
    case 'checkpoint':
      if (participant) {
        const data =
          payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
            ? (payload.data as CheckpointData)
            : undefined
        recordCheckpoint(participant, String(payload.checkpoint || ''), message.timestamp, data)
      }
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
      if (acceptsAssignmentMessage(currentAssignment.value?.id, payload.assignmentId)) {
        emit('announcement', String(payload.message || ''))
      }
      break
    case 'exercise':
      if (!isInstructor.value) {
        if (currentAssignment.value?.status === 'running') emit('exerciseStop')
        currentAssignment.value = {
          id: String(payload.id || message.id),
          lessonId: String(payload.lessonId || payload.name || ''),
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
        if (!existingExercise || existingExercise.id !== payload.id) break
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
          checkpoints:
            existingExercise?.id === String(payload.id || '') ? existingExercise.checkpoints : [],
        }
        logSessionEvent(
          'exercise-status',
          conn.peer,
          `${participant.exercise.name}: ${participant.exercise.status}`,
        )
      }
      break
    case 'exercise-control':
      if (
        !isInstructor.value &&
        conn === instructorConnection &&
        acceptsExerciseControl(currentAssignment.value, payload)
      ) {
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
  if (classroomDisposed) return
  trace(`Creating a new peer ${targetPeerId}`)
  if (targetPeerId) requestedRoomId.value = targetPeerId
  if (selfPeer?.id === targetPeerId && !selfPeer.destroyed && !selfPeer.disconnected) {
    return
  }
  disconnect()

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
  selfPeer = peerJsServer
  const isCurrent = () => !classroomDisposed && selfPeer === peerJsServer

  // Peer receive a connection request from the server
  peerJsServer.on('connection', (incomingConnection: PeerJS.DataConnection) => {
    if (!isCurrent()) {
      incomingConnection.close()
      return
    }
    setupConnection(incomingConnection)
  })

  // Peer is disconnected from the server, but can recover
  peerJsServer.on('disconnected', () => {
    if (isCurrent()) onDisconnected(peerJsServer)
  })
  // Peer (me) is destroyed and can't connect to the server
  peerJsServer.on('close', () => {
    if (isCurrent()) onPeerClose(peerJsServer.id)
  })
  // Wrapped in promise to allow async call waiting until connection is esablish
  // return new Promise((resolve, reject) => {
  // Connected to the peerServer
  peerJsServer.on('open', (id: string) => {
    if (!isCurrent()) {
      peerJsServer.destroy()
      return
    }
    trace('OPEN: My peer ID is: ' + id)
    isOnline.value = true
    isInstructor.value = targetPeerId === id
    // If the user entered a peer id, that is not same as this id, connecto that was unavilalbe, connect to it
    if (!isInstructor.value && requestedRoomId.value && id !== requestedRoomId.value) {
      connectToPeer(requestedRoomId.value)
    }
    selfPeerId.value = id
  })
  // Error
  peerJsServer.on('error', (e: PeerJS.PeerError<string>) => {
    if (!isCurrent()) return
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
  // Invalidate callbacks before closing connections, which can emit synchronously.
  isOnline.value = false
  clearReconnectTimer()
  aiCoordinator.dispose()
  aiClient.dispose()
  manualAIRequests.clear()

  const peer = selfPeer
  selfPeer = undefined
  const upstream = instructorConnection
  instructorConnection = undefined
  instructorConnectionOpen = false
  upstream?.removeAllListeners()
  upstream?.close()

  for (const { conn } of Object.values(incomingConns.value)) {
    conn.removeAllListeners()
    conn.close()
  }
  incomingConns.value = {}
  peerRosterOrder.value = []
  selectedPeerIds.value = []
  focusedPeerId.value = ''
  detailsPeerId.value = ''

  // Also closes pending connections that have not emitted 'open' yet.
  peer?.removeAllListeners()
  peer?.destroy()
}

const connectToPeer = (remotePeerId: string) => {
  const peer = selfPeer
  if (classroomDisposed || !isOnline.value || !peer || peer.destroyed) return
  clearReconnectTimer()
  trace(`Connecting to a peer ${remotePeerId}`)
  const connection = peer.connect(remotePeerId, {
    metadata: {
      displayName: displayname.value,
      callsign: displayname.value,
      name: props.accountName || '',
    },
  })
  instructorConnection = connection
  const isCurrent = () =>
    !classroomDisposed && isOnline.value && selfPeer === peer && instructorConnection === connection

  connection.on('error', (e) => {
    if (isCurrent()) onError(`${e.type} - ${e.name} - ${e.message} - ${e.stack}`)
  })
  connection.on('close', () => {
    if (!isCurrent()) return
    onConnectionClose(connection.peer)
  })
  connection.on('open', () => {
    if (!isCurrent()) {
      connection.close()
      return
    }
    instructorConnectionOpen = true
    trace(`OPEN Connected to a peer ${remotePeerId}`)
    sendEnvelopeToConnection(connection, 'identity', {
      name: props.accountName || '',
      callsign: displayname.value || '',
    })
  })
  connection.on('data', (data: unknown) => {
    if (isCurrent()) onData(data as PeerData, connection)
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

const focusPeerRow = (event: MouseEvent, peerId: string) => {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.focus({ preventScroll: true })
  }
  focusPeer(peerId)
  batchMenuOpen.value = false
}

const togglePeerCheckbox = (peerId: string) => {
  focusPeer(peerId)
  togglePeerSelection(peerId)
  restoreRosterFocus(peerId)
}

const openPeerDetails = (peerId: string) => {
  focusPeer(peerId)
  detailsPeerId.value = peerId
  restoreRosterFocus(peerId)
}

const closePeerDetails = () => {
  detailsPeerId.value = ''
  restoreRosterFocus()
}

const togglePeerDetails = (peerId: string) => {
  if (detailsPeerId.value === peerId) {
    closePeerDetails()
    return
  }
  openPeerDetails(peerId)
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
  detailsPeerId.value = ''
  focusedPeerId.value = rows[next].peerId
  nextTick(() => {
    rosterRowRefs.get(rows[next].peerId)?.focus({ preventScroll: true })
    rosterRowRefs.get(rows[next].peerId)?.scrollIntoView({ block: 'nearest' })
  })
}

const focusClassroomPanel = () => {
  if (!isInstructor.value || !isOnline.value) return
  const rows = visibleParticipantRows.value
  if (!rows.length) return

  const focusedIndex = rows.findIndex((row) => row.peerId === focusedPeerId.value)
  const selectedIndex = rows.findIndex((row) => selectedPeerIds.value.includes(row.peerId))
  const nextIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex >= 0 ? selectedIndex : 0
  focusedPeerId.value = rows[nextIndex].peerId
  nextTick(() => rosterRowRefs.get(rows[nextIndex].peerId)?.focus({ preventScroll: true }))
}

const setRosterRowRef = (element: Element | ComponentPublicInstance | null, peerId: string) => {
  const row = element && '$el' in element ? element.$el : element
  if (row instanceof HTMLElement) rosterRowRefs.set(peerId, row)
  else
    nextTick(() => {
      // Moving between sections can mount the replacement before the old ref clears.
      if (!rosterRowRefs.get(peerId)?.isConnected) rosterRowRefs.delete(peerId)
    })
}
const setRosterDetailRef = (element: Element | ComponentPublicInstance | null) => {
  if (element instanceof HTMLElement) rosterDetailRef.value = element
  else
    nextTick(() => {
      if (!rosterDetailRef.value?.isConnected) rosterDetailRef.value = null
    })
}

const restoreRosterFocus = async (
  preferredPeerId = focusedPeerId.value,
  consumedIds: string[] = [],
) => {
  const version = focusInteractionVersion
  const previousElement = document.activeElement
  await nextTick()
  if (version !== focusInteractionVersion) return
  // Do not steal focus if another control or panel gained it during the update.
  if (document.activeElement !== previousElement && document.activeElement !== document.body) return
  const peerId = nextClassroomFocus(
    visibleParticipantRows.value.map(({ peerId, peer }) => ({
      peerId,
      assigned: Boolean(peer.exercise),
    })),
    preferredPeerId,
    consumedIds,
  )
  focusedPeerId.value = peerId
  const row = rosterRowRefs.get(peerId)
  if (row?.isConnected) {
    row.focus({ preventScroll: true })
    row.scrollIntoView({ block: 'nearest' })
  } else classroomShellRef.value?.focus({ preventScroll: true })
}

const consumeActionSelection = (targetIds: string[]) => {
  selectedPeerIds.value = []
  restoreRosterFocus(focusedPeerId.value, targetIds)
}

const clearRosterSearch = () => {
  rosterSearch.value = ''
  restoreRosterFocus()
}

const openExercisePalette = (peerId?: string, targetIds?: string[]) => {
  const targets =
    targetIds ?? (peerId && incomingConns.value[peerId] ? [peerId] : [...actionTargetIds.value])
  if (!targets.length) return
  exercisePaletteTargetIds.value = targets
  exercisePalettePeerId.value = peerId || ''
  exercisePaletteOpen.value = true
  exerciseQuery.value = ''
  exerciseResultIndex.value = 0
  nextTick(() => exerciseSearchRef.value?.focus())
}

const closeExercisePalette = () => {
  exercisePaletteOpen.value = false
  exerciseQuery.value = ''
}

const cancelExercisePalette = () => {
  closeExercisePalette()
  exercisePaletteTargetIds.value = []
  exercisePalettePeerId.value = ''
  restoreRosterFocus()
}

const chooseExercise = async (exercise: ModuleEntry) => {
  const targets = [...exercisePaletteTargetIds.value]
  const peerId = exercisePalettePeerId.value
  exercisePath.value = exercise.path
  closeExercisePalette()
  exercisePaletteTargetIds.value = []
  exercisePalettePeerId.value = ''
  await restoreRosterFocus(peerId || focusedPeerId.value)
  assignExercise(targets, peerId)
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
  if (event.key === 'Escape') {
    if (detailsPeerId.value) {
      event.preventDefault()
      event.stopPropagation()
      closePeerDetails()
    } else if (batchMenuOpen.value || connectionSettingsOpen.value) {
      event.preventDefault()
      event.stopPropagation()
      batchMenuOpen.value = false
      connectionSettingsOpen.value = false
      restoreRosterFocus()
    } else if (rosterSearch.value) {
      event.preventDefault()
      event.stopPropagation()
      clearRosterSearch()
    } else if (selectedPeerIds.value.length) {
      event.preventDefault()
      event.stopPropagation()
      selectedPeerIds.value = []
    }
    return
  }

  // All Classroom shortcuts except the final Escape stay inside this panel.
  event.stopPropagation()
  if (
    event.target instanceof Element &&
    event.target.closest('button, a, summary') &&
    isNativeControlKey(event.key)
  )
    return
  if (isEditableKeyboardTarget(event.target) || isEditableKeyboardTarget(document.activeElement)) {
    return
  }
  if (event.key === '?') {
    event.preventDefault()
    const popover = document.getElementById('classroom-shortcuts') as
      | (HTMLElement & { showPopover?: () => void })
      | null
    popover?.showPopover?.()
    return
  }
  if (event.key === 'ArrowDown' || (event.ctrlKey && event.key.toLowerCase() === 'n')) {
    event.preventDefault()
    moveRosterFocus(1)
  } else if (event.key === 'ArrowUp' || (event.ctrlKey && event.key.toLowerCase() === 'p')) {
    event.preventDefault()
    moveRosterFocus(-1)
  } else if (event.key === 'ArrowRight' && focusedPeerId.value) {
    event.preventDefault()
    openPeerDetails(focusedPeerId.value)
  } else if (event.key === 'ArrowLeft' && detailsPeerId.value) {
    event.preventDefault()
    closePeerDetails()
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
  } else if (event.key.toLowerCase() === 'm' && actionTargetIds.value.length) {
    event.preventDefault()
    openMessageComposer()
  } else if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    startExercisesFromKeyboard()
  }
}

const formatCheckpointTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
const formatAssignmentDeadline = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

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
  const targets = [...messageTargetIds.value]
  if (!announcement.value || !targets.length) return
  const results = instructorActions.message(targets, announcement.value)
  const sent = reportActionResults('announcement', announcement.value, results)
  if (sent.length !== targets.length) {
    messageTargetIds.value = results
      .filter((result) => result.status !== 'sent')
      .map((result) => result.peerId)
    return
  }
  announcement.value = ''
  messageComposerOpen.value = false
  messageTargetIds.value = []
  restoreRosterFocus()
}

const closeMessageComposer = () => {
  messageComposerOpen.value = false
  messageTargetIds.value = []
  restoreRosterFocus()
}

const openMessageComposer = (peerId?: string) => {
  const targets = peerId && incomingConns.value[peerId] ? [peerId] : [...actionTargetIds.value]
  if (!targets.length) return
  messageTargetIds.value = targets
  batchMenuOpen.value = false
  messageComposerOpen.value = true
  nextTick(() => announcementInputRef.value?.focus())
}

const selectedExercise = (): ModuleEntry | undefined =>
  exerciseModules.find((entry) => entry.path === exercisePath.value)

const instructorActions = createInstructorActions({
  canAct: () => isInstructor.value && isOnline.value,
  session: () => selfPeer,
  peer: (id) => {
    const peer = incomingConns.value[id]
    return peer
      ? { connection: peer.conn, open: peer.conn.open, assignment: peer.exercise }
      : undefined
  },
  lesson: (id) => exerciseModules.find((lesson) => lesson.path === id),
  loadSource: async (path) => {
    const response = await fetch(path)
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return response.text()
  },
  send: (id, type, payload) => {
    const conn = incomingConns.value[id]?.conn
    if (!conn?.open) return false
    conn.send(createEnvelope(type, payload))
    return true
  },
  assigned: (id, assignment) => {
    const peer = incomingConns.value[id]
    if (!peer) return
    peer.exercise = {
      id: assignment.id,
      name: assignment.name,
      deadline: assignment.deadline,
      status: 'assigned',
      updatedAt: Date.now(),
      checkpoints: [],
    }
    peer.metadata.checkPoint = ''
    peer.metadata.checkPointData = undefined
  },
})

const instructorTargets = (ids: string[]) =>
  ids.map((peerId) => ({
    peerId,
    assignmentId: incomingConns.value[peerId]?.exercise?.id ?? null,
  }))

const aiPolicy = ref<AIPolicy>('off')
const manualAIRequests = new Set<string>()
const aiClient = createAIClient((type, payload) => {
  if (!isOnline.value || !instructorConnectionOpen || !instructorConnection)
    throw new Error('Offline')
  sendEnvelopeToConnection(instructorConnection, type, payload)
})
const aiCoordinator = createAICoordinator({
  current: (peerId, assignmentId) =>
    Boolean(
      isInstructor.value &&
      isOnline.value &&
      incomingConns.value[peerId]?.conn.open &&
      incomingConns.value[peerId]?.exercise?.id === assignmentId,
    ),
  generate: (job, signal) => {
    const assignment = incomingConns.value[job.peerId]!.exercise!
    const checkpoints = [...assignment.checkpoints]
    if (!manualAIRequests.has(job.request.requestId)) {
      checkpoints.push({
        timestamp: Date.now(),
        message: 'AI debrief evidence',
        data: job.request.evidence,
      })
    }
    job.evidence = JSON.parse(JSON.stringify(checkpoints))
    return requestFeedback(
      feedbackProviderConfig,
      {
        peerId: job.peerId,
        assignmentId: assignment.id,
        lessonName: assignment.name,
        status: assignment.status,
        checkpoints: job.evidence!,
      },
      signal,
    )
  },
  deliver: (job, result) => {
    const peer = incomingConns.value[job.peerId]
    if (!peer) return
    if (manualAIRequests.delete(job.request.requestId)) {
      if (result.status === 'completed') {
        const sent = instructorActions.message([job.peerId], result.message, {
          assignmentId: job.request.assignmentId,
        })[0]
        if (sent.status !== 'sent') throw new Error(sent.reason)
      }
    } else {
      sendEnvelopeToConnection(peer.conn, 'ai-response', {
        requestId: job.request.requestId,
        assignmentId: job.request.assignmentId,
        runId: job.request.runId,
        result,
      })
    }
    recordCheckpoint(peer, `AI debrief: ${result.status}`, Date.now(), { aiResponse: result })
    logSessionEvent('ai-response', job.peerId, result.status)
  },
})
const aiJobs = aiCoordinator.jobs
// Build once per queue change. Rows receive only a stable, primitive badge state.
const aiJobIndex = computed(() => {
  const byPeer = new Map<string, AIJob[]>()
  const pendingByPeer = new Map<string, 'pending' | 'review'>()
  let pendingCount = 0
  for (const job of aiJobs.value) {
    const jobs = byPeer.get(job.peerId)
    if (jobs) jobs.push(job)
    else byPeer.set(job.peerId, [job])
    if (job.state !== 'finished') {
      pendingCount++
      if (job.state === 'review' || !pendingByPeer.has(job.peerId)) {
        pendingByPeer.set(job.peerId, job.state === 'review' ? 'review' : 'pending')
      }
    }
  }
  return { byPeer, pendingByPeer, pendingCount }
})
const visibleAIJobs = computed(() => aiJobIndex.value.byPeer.get(detailsPeerId.value) || [])
const pendingAI = (peerId: string) => aiJobIndex.value.pendingByPeer.has(peerId)
const suggestPeerFeedback = (peerId: string) => {
  const assignment = incomingConns.value[peerId]?.exercise
  if (!assignment?.checkpoints.length) return
  const requestId = crypto.randomUUID()
  manualAIRequests.add(requestId)
  if (
    !aiCoordinator.submit(
      peerId,
      {
        requestId,
        assignmentId: assignment.id,
        runId: 'manual',
        purpose: 'debrief',
        evidence: {},
      },
      'review',
    )
  )
    manualAIRequests.delete(requestId)
}
const requestLessonAI = (
  request: LessonAIRequest,
  runId: string,
  signal?: AbortSignal,
): Promise<LessonAIResponse> => {
  if (
    isInstructor.value ||
    !currentAssignment.value ||
    !isOnline.value ||
    !instructorConnectionOpen
  ) {
    return Promise.resolve({
      status: 'unavailable',
      reason: 'An active classroom assignment is required.',
    })
  }
  return aiClient.request(
    {
      ...request,
      requestId: crypto.randomUUID(),
      assignmentId: currentAssignment.value.id,
      runId,
    },
    signal,
  )
}
watch(
  () => [
    isInstructor.value,
    isOnline.value,
    ...Object.entries(incomingConns.value).map(
      ([id, peer]) => `${id}:${peer.exercise?.id}:${peer.conn.open}`,
    ),
  ],
  () => {
    aiCoordinator.expire()
    for (const job of aiJobs.value) {
      if (job.state === 'finished') manualAIRequests.delete(job.request.requestId)
    }
  },
)
watch(
  () => [currentAssignment.value?.id, isOnline.value],
  () => aiClient.dispose(),
)
const approveFeedback = (id: string) => {
  aiCoordinator.approve(id)
  restoreRosterFocus()
}
const dismissFeedback = (id: string) => {
  aiCoordinator.cancel(id, true)
  restoreRosterFocus()
}
const cancelAIJob = (id: string) => {
  aiCoordinator.cancel(id)
  restoreRosterFocus()
}

const reportActionResults = (type: string, detail: string, results: InstructorActionResult[]) => {
  const sent = results.filter((result) => result.status === 'sent').map((result) => result.peerId)
  if (sent.length) logSessionEvent(type, idsLabel(sent), `Sent: ${detail}`)
  const unsuccessful = results.filter((result) => result.status !== 'sent')
  if (unsuccessful.length) {
    const reasons = unsuccessful.map((result) => `${result.peerId}: ${result.reason}`).join('; ')
    const message = `Sent to ${sent.length} peers. ${unsuccessful.length} not sent: ${reasons}`
    logSessionEvent(
      `${type}-not-sent`,
      idsLabel(unsuccessful.map((result) => result.peerId)),
      reasons,
    )
    emit('announcement', message)
  }
  return sent
}

const assignExercise = async (targets: string[], detailsTargetPeerId = '') => {
  const exercise = selectedExercise()
  if (!exercise || !targets.length) return
  const minutes = Math.max(1, exerciseMinutes.value || 1)
  const focusVersion = focusInteractionVersion
  const previousElement = document.activeElement
  const results = await instructorActions.assign(
    instructorTargets(targets),
    exercise.path,
    minutes * 60_000,
  )
  const sent = reportActionResults('exercise', `${exercise.name} (${minutes} min)`, results)
  if (
    focusVersion !== focusInteractionVersion ||
    (document.activeElement !== previousElement && document.activeElement !== document.body)
  )
    return
  if (detailsTargetPeerId && sent.includes(detailsTargetPeerId)) {
    restoreRosterFocus(detailsTargetPeerId)
  } else if (sent.length === results.length) {
    consumeActionSelection(sent)
  } else {
    selectedPeerIds.value = results
      .filter((result) => result.status !== 'sent')
      .map((result) => result.peerId)
    restoreRosterFocus()
  }
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
    peer.metadata.checkPointData = undefined
  })
  logSessionEvent('exercise-unassign', idsLabel(targets), 'Assignment removed')
  consumeActionSelection(targets)
  batchMenuOpen.value = false
}

const unassignPeer = (peerId: string) => {
  const peer = incomingConns.value[peerId]
  if (!peer?.exercise) return
  sendEnvelopeToIds([peerId], 'exercise-unassign', {})
  peer.exercise = undefined
  peer.metadata.checkPoint = ''
  peer.metadata.checkPointData = undefined
  logSessionEvent('exercise-unassign', peerId, 'Assignment removed')
  restoreRosterFocus(peerId)
}

const disconnectPeer = (peerId: string) => {
  const peer = incomingConns.value[peerId]
  if (!peer) return
  confirmDisconnect(peerId, peer)
}

const sendExerciseStatus = (status: ClassroomExerciseStatus, detail?: string) => {
  if (!currentAssignment.value) return
  currentAssignment.value.status = status
  if (!instructorConnectionOpen || !instructorConnection) return
  sendEnvelopeToConnection(instructorConnection, 'exercise-status', {
    id: currentAssignment.value.id,
    name: currentAssignment.value.name,
    status,
    detail,
  })
}

const startAssignedExercise = () => {
  if (!currentAssignment.value || currentAssignment.value.status === 'running') return
  emit('exerciseStart', currentAssignment.value)
}

const stopAssignedExercise = () => {
  if (!currentAssignment.value || currentAssignment.value.status !== 'running') return
  emit('exerciseStop')
}

const sendExerciseControl = (action: 'start' | 'stop', targets = actionTargetIds.value) => {
  if (!targets.length) return
  const results = instructorActions.control(action, instructorTargets(targets))
  reportActionResults('exercise-control', action, results)
  restoreRosterFocus()
}

const startExercisesFromKeyboard = () => {
  const selectedTargets = selectedPeerIds.value.filter((id) => incomingConns.value[id]?.exercise)
  if (selectedPeerIds.value.length) {
    sendExerciseControl('start', selectedTargets)
    return
  }

  const assignedTargets = Object.entries(incomingConns.value)
    .filter(([, peer]) => Boolean(peer.exercise))
    .map(([peerId]) => peerId)
  if (!assignedTargets.length) return

  const peerLabel = assignedTargets.length === 1 ? 'peer' : 'peers'
  if (
    window.confirm(
      `No peers are selected. Start the assigned lessons for all ${assignedTargets.length} ${peerLabel}?`,
    )
  ) {
    sendExerciseControl('start', assignedTargets)
  }
}

const reportLessonState = (state: LessonState) => {
  if (!currentAssignment.value || state.assignmentId !== currentAssignment.value.id) return
  const status = {
    IDLE: undefined,
    RUNNING: 'running',
    STOPPED: 'stopped',
    COMPLETED: 'completed',
    ERROR: 'error',
  }[state.status] as ClassroomExerciseStatus | undefined
  if (status) sendExerciseStatus(status, state.detail)
}

watchLessonLifecycle(useLessonRun(), reportLessonState)

const connectionAge = (peer: ConnectionsList[string]) => {
  clock.value
  return Math.floor((Date.now() - peer.lastSeen) / 1000)
}

const confirmDisconnect = (peerId: string, peer: ConnectionsList[string]) => {
  const name = peer.metadata.displayName || peerId
  if (window.confirm(`Disconnect ${name}?`)) peer.conn.close()
  restoreRosterFocus(peerId)
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

const exportSession = () => {
  const participants = Object.entries(incomingConns.value).map(([id, peer]) => ({
    id,
    displayName: peer.metadata.displayName,
    status: peer.metadata.status,
    checkpoint: peer.metadata.checkPoint,
    checkpointData: peer.metadata.checkPointData,
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
      aiDebriefs: aiJobs.value,
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

const sendCheckPoint = (checkpoint: string, data?: CheckpointData) => {
  if (!instructorConnection) {
    return
  }

  if (!isOnline.value || !instructorConnectionOpen) {
    return
  }

  sendEnvelopeToConnection(instructorConnection, 'checkpoint', {
    checkpoint,
    ...(data !== undefined ? { data } : {}),
  })
}
const sendScript = (title: string, content: string) => {
  sendEnvelope('script', { title, script: content })
}

const reset = () => {
  trace('Resetting classroom')
  disconnect()
}

defineExpose({
  requestLessonAI,
  sendApiCall,
  sendStatus,
  sendScript,
  sendCheckPoint,
  sendWhiteboardState,
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
.shortcut-help {
  margin: auto;
  width: min(28rem, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  overflow: auto;
  padding: 0.75rem;
  background: rgb(var(--color-panelContentBackground));
  color: rgb(var(--color-secondary));
  border: 1px solid rgb(var(--color-panelBorder));
  font: inherit;
}
.shortcut-list { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0.5rem 0.75rem; }
.shortcut-list dt { white-space: nowrap; }
.shortcut-help kbd { font: inherit; font-weight: 600; }
.classroom-roster {
  container-type: inline-size;
  margin-top: 0.5rem;
  border-top: 1px solid rgb(var(--color-panelBorder));
}
.roster-list {
  scrollbar-gutter: stable;
}

.peer-table { width: 100%; table-layout: fixed; border-collapse: collapse; font: inherit; }
.roster-detail-content {
  margin: 0.25rem 0.25rem 0.75rem 1.25rem;
  padding-left: 0.5rem;
  border-left: 1px solid rgb(var(--color-simElementBorder));
}
.peer-column { width: 10ch; }
.lesson-column { width: 23%; }
.status-column { width: 6rem; }
.latency-column { width: 3.5rem; }
.details-column { width: 2rem; }
.roster-columns th { padding: 4px; text-align: left; font-weight: normal; }
.roster-columns th.text-right { text-align: right; }
.roster-columns {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--color-panelContentBackground));
  font-size: inherit;
  color: rgb(var(--color-secondary) / 0.75);
  border-bottom: 1px solid rgb(var(--color-panelBorder));
}

@container (max-width: 38rem) {
  .lesson-column { display: none; }
  .peer-column { width: 10ch; }
  .roster-lesson-heading { display: none; }
}
@container (max-width: 28rem) {
  .latency-column { display: none; }
  .status-column { width: 5rem; }
  .roster-latency-heading { display: none; }
}

.command-button {
  @apply h-5 shrink-0 bg-primary px-1 text-secondary hover:bg-secondary hover:text-primary disabled:cursor-default disabled:opacity-40;
}

.roster-primary-action {
  @apply bg-panelActive px-2 text-white hover:bg-panelActive hover:text-white;
}

/* Filled controls distinguish actions from the adjacent read-only metadata. */
.roster-detail .command-button {
  @apply px-2;
  background: rgb(var(--color-secondary) / 0.16);
}

.roster-detail .command-button:enabled:hover {
  @apply bg-secondary text-primary;
}

.roster-detail .roster-primary-action {
  @apply bg-panelActive text-white;
}

.roster-detail .command-destructive {
  box-shadow: inset 0 -2px rgb(var(--color-panelActive));
}

.roster-detail .command-destructive:enabled:hover,
.roster-detail .roster-primary-action:enabled:hover {
  @apply bg-panelActive text-white;
  filter: brightness(1.1);
}

.detail-disclosure {
  @apply cursor-pointer text-secondary underline underline-offset-2;
}

.detail-disclosure:hover {
  text-decoration-thickness: 2px;
}

.roster-detail summary:focus-visible,
.command-button:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: -1px;
}

.menu-command {
  @apply block h-6 w-full px-2 text-left text-secondary hover:bg-simInputBackground disabled:cursor-default disabled:opacity-40;
}
</style>
