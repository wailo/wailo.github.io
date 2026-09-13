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
      <div class="flex h-6 min-w-0 items-center gap-2 px-2">
        <span :class="isOnline ? 'text-simActiveButton' : 'opacity-60'">●</span>
        <button
          class="shrink-0"
          @click="isOnline ? disconnect() : connectToPeerJsServer(requestedRoomId)"
        >
          {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
        </button>
        <span class="min-w-0 truncate font-medium">ROOM {{ classroomRoomId || '—' }}</span>
        <span v-if="displayname" class="min-w-0 truncate opacity-60">· {{ displayname }}</span>
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
        Assign exercise
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
          Unassign
        </button>
        <button class="menu-command" @click="openMessageComposer()">Message</button>
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
      <div class="flex h-7 shrink-0 items-center gap-2 px-2">
        <span class="w-20 shrink-0 font-medium">
          {{ selectedPeerIds.length ? `${selectedPeerIds.length} SELECTED` : 'PEERS' }}
        </span>
        <input
          ref="rosterSearchRef"
          v-model="rosterSearch"
          class="h-5 min-w-20 flex-1 border border-simElementBorder bg-simInputBackground px-2 text-secondary outline-none focus:border-panelActive"
          placeholder="Search / filter..."
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
          <option value="all">ALL {{ participantRecords.length }}</option>
          <option value="active">ACTIVE {{ activeExerciseCount }}</option>
          <option value="hand">HAND {{ raisedHandCount }}</option>
          <option value="overdue">OVERDUE {{ overdueCount }}</option>
        </select>
      </div>
      <div class="roster-body flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="roster-list min-h-0 flex-1 overflow-auto">
          <section v-for="group in participantExerciseGroups" :key="group.key">
            <button
              class="roster-group-heading"
              :aria-expanded="!collapsedExerciseGroups.has(group.key)"
              @click="toggleExerciseGroup(group.key)"
            >
              <span aria-hidden="true">{{
                collapsedExerciseGroups.has(group.key) ? '▸' : '▾'
              }}</span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ group.label }}</span>
              <span class="shrink-0 opacity-60">{{ group.participants.length }} peers</span>
              <span class="roster-group-summary">{{ group.summary }}</span>
            </button>
            <template
              v-for="participant in collapsedExerciseGroups.has(group.key)
                ? []
                : group.participants"
              :key="participant.peerId"
            >
              <div
                :ref="(element) => setRosterRowRef(element, participant.peerId)"
                class="classroom-roster-row grid h-7 cursor-default grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] items-center gap-x-1 px-1 outline-none"
                :class="rowClass(participant.peerId)"
                :aria-selected="isPeerSelected(participant.peerId)"
                :title="participantSummary(participant.peer)"
                tabindex="-1"
                @click="focusPeerRow($event, participant.peerId)"
              >
                <div class="text-center">
                  <input
                    type="checkbox"
                    tabindex="-1"
                    class="size-3 cursor-pointer accent-simActiveButton"
                    :checked="isPeerSelected(participant.peerId)"
                    :aria-label="`Select ${participant.peer.metadata.callsign || participant.peerId}`"
                    @click.stop="togglePeerCheckbox(participant.peerId)"
                  />
                </div>
                <div class="flex min-w-0 items-center gap-2 whitespace-nowrap">
                  <div class="flex min-w-0 flex-1 items-center gap-1">
                    <span
                      v-if="participant.peer.handState === 'raised'"
                      class="inline-flex shrink-0 animate-pulse items-center bg-panelActive px-1 font-bold text-primary"
                      >HAND</span
                    >
                    <span class="min-w-0 truncate font-medium">
                      {{
                        participant.peer.metadata.callsign ||
                        participant.peer.metadata.displayName ||
                        '—'
                      }}
                    </span>
                    <span class="roster-secondary-id shrink-0">
                      · {{ compactStatus(participant.peer.metadata.status) }}
                    </span>
                    <span
                      v-if="participant.peer.exercise"
                      class="roster-exercise-status shrink-0"
                      :title="participant.peer.exercise.status"
                    >
                      {{ exerciseStatusSymbol(participant.peer.exercise.status) }}
                      <span :class="exerciseStatusClass(participant.peer.exercise.status)">{{
                        compactExerciseStatus(participant.peer.exercise.status)
                      }}</span>
                    </span>
                  </div>
                  <div class="roster-checkpoint min-w-0 flex-1 truncate text-secondary">
                    {{
                      participant.peer.metadata.checkPoint ||
                      exerciseDetail(participant.peer) ||
                      '—'
                    }}
                  </div>
                </div>
                <div
                  class="roster-net flex items-center gap-1 whitespace-nowrap px-1 text-right text-secondary"
                >
                  {{
                    connectionAge(participant.peer) > 15
                      ? 'STALE'
                      : `${participant.peer.latency ?? '—'}ms`
                  }}
                  <div
                    v-if="participant.peer.handState === 'raised'"
                    class="font-bold text-panelActive"
                  >
                    {{ handWaitTime(participant.peer) }}
                  </div>
                </div>
                <button
                  class="peer-details-toggle h-5 whitespace-nowrap px-1 text-center"
                  :aria-expanded="detailsPeerId === participant.peerId"
                  :title="
                    detailsPeerId === participant.peerId
                      ? 'Close peer details'
                      : 'View peer details'
                  "
                  @click.stop="togglePeerDetails(participant.peerId)"
                  @keydown.left.prevent.stop="closePeerDetails"
                  @keydown.right.prevent.stop="openPeerDetails(participant.peerId)"
                >
                  Details {{ detailsPeerId === participant.peerId ? '‹' : '›' }}
                </button>
              </div>

              <section
                v-if="detailsPeerId === participant.peerId"
                :ref="setRosterDetailRef"
                class="roster-detail flex max-h-72 flex-col overflow-hidden border-y border-panelBorder bg-panelHeaderBackground text-secondary"
              >
                <div class="flex min-h-7 items-center gap-1 px-2">
                  <span class="min-w-0 flex-1 truncate font-medium text-secondary">
                    Peer details
                  </span>
                  <button
                    class="shrink-0 px-1 opacity-60 hover:text-panelActive hover:opacity-100"
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
                  <button class="command-button" @click="openExercisePalette(participant.peerId)">
                    {{ participant.peer.exercise ? 'Replace' : 'Assign' }}
                  </button>
                  <button
                    class="command-button"
                    :disabled="
                      !participant.peer.exercise || participant.peer.exercise.status === 'running'
                    "
                    @click="sendExerciseControl('start', [participant.peerId])"
                  >
                    Start
                  </button>
                  <button
                    class="command-button"
                    :disabled="participant.peer.exercise?.status !== 'running'"
                    @click="sendExerciseControl('stop', [participant.peerId])"
                  >
                    Stop
                  </button>
                  <button
                    class="command-button"
                    :disabled="!participant.peer.exercise"
                    @click="unassignPeer(participant.peerId)"
                  >
                    Unassign
                  </button>
                  <button class="command-button" @click="openMessageComposer(participant.peerId)">
                    Message
                  </button>
                  <button
                    class="command-button ml-auto"
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
                        feedbackRequest.pending ||
                        !participant.peer.conn.open ||
                        !participant.peer.exercise.checkpoints.length
                      "
                      :title="`Request feedback from ${feedbackProviderConfig.provider}; shares lesson context and recent checkpoints`"
                      @click="suggestPeerFeedback(participant.peerId)"
                    >
                      {{
                        feedbackRequest.pending && feedbackRequest.peerId === participant.peerId
                          ? 'Requesting…'
                          : 'Suggest feedback'
                      }}
                    </button>
                    <span>{{
                      feedbackProviderConfig.provider === 'ollama' ? 'Ollama' : 'OpenAI'
                    }}</span>
                    <button
                      v-if="
                        feedbackRequest.pending && feedbackRequest.peerId === participant.peerId
                      "
                      class="command-button"
                      @click="cancelFeedbackRequest"
                    >
                      Cancel
                    </button>
                  </div>
                  <p
                    v-if="feedbackRequest.peerId === participant.peerId && feedbackRequest.notice"
                    role="status"
                    class="py-1 break-words text-secondary"
                  >
                    {{ feedbackRequest.notice }}
                  </p>
                  <section
                    v-if="visibleFeedback.length"
                    aria-label="Suggested feedback"
                    class="py-1 text-secondary"
                  >
                    <div class="font-medium">Suggested feedback</div>
                    <article
                      v-for="suggestion in visibleFeedback"
                      :key="suggestion.id"
                      class="py-1"
                    >
                      <p class="whitespace-pre-wrap break-words leading-tight">
                        {{ suggestion.message }}
                      </p>
                      <details class="mt-1">
                        <summary class="cursor-pointer">
                          Evidence · {{ suggestion.evidence.length }} checkpoints
                        </summary>
                        <div
                          v-for="(checkpoint, index) in suggestion.evidence"
                          :key="index"
                          class="py-0.5"
                        >
                          <div>
                            {{ formatCheckpointTime(checkpoint.timestamp) }} ·
                            {{ checkpoint.message }}
                          </div>
                          <pre
                            v-if="checkpoint.data"
                            class="max-h-28 overflow-auto whitespace-pre-wrap break-words text-inherit"
                            >{{ JSON.stringify(checkpoint.data, null, 2) }}</pre
                          >
                        </div>
                      </details>
                      <div class="mt-1 flex items-center gap-1">
                        <template v-if="suggestion.status === 'pending'">
                          <button class="command-button" @click="approveFeedback(suggestion.id)">
                            Send
                          </button>
                          <button class="command-button" @click="dismissFeedback(suggestion.id)">
                            Dismiss
                          </button>
                        </template>
                        <span v-else role="status">{{
                          suggestion.status === 'sent' ? 'Sent' : 'Expired · assignment changed'
                        }}</span>
                      </div>
                      <p
                        v-if="suggestion.status === 'pending' && suggestion.error"
                        role="alert"
                        class="mt-1 break-words"
                      >
                        Not sent: {{ suggestion.error }}
                      </p>
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
              </section>
            </template>
          </section>
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

import type { CheckpointData } from '../ScriptContext'
import { nextClassroomFocus, isNativeControlKey } from '../ClassroomFocus'
import { createFeedbackReview, type FeedbackSuggestionInput } from '../FeedbackReview'
import { requestFeedback } from '../FeedbackProvider'
import { feedbackProviderConfig } from '../feedbackProviderConfig'
import {
  createInstructorActions,
  acceptsExerciseControl,
  acceptsAssignmentMessage,
  type InstructorActionResult,
} from '../InstructorActions'

const props = defineProps<{ accountName?: string }>()
defineOptions({ inheritAttrs: false })

const isDevelopment = import.meta.env.DEV
const baseUrl = window.location.origin
let selfPeer: PeerJS.Peer
let instructorConnection: PeerJS.DataConnection
let instructorConnectionOpen = false
const defaultSessionId = `SIM-${Math.floor(100000 + Math.random() * 90000)}`
const selfPeerId = ref<string>(defaultSessionId)
const requestedRoomId = ref(selfPeerId.value)
const isInstructor = ref(true)
let displayname = ref<string>()
let isOnline = ref(false)
const classroomRoomId = computed(() =>
  isInstructor.value ? selfPeerId.value : requestedRoomId.value,
)
type ConnectionMeta = {
  displayName?: string
  callsign?: string
  name?: string
  status?: string
  checkPoint?: string
  checkPointData?: CheckpointData
  [key: string]: any
}

type ExerciseCheckpoint = {
  timestamp: number
  message: string
  data?: CheckpointData
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
      checkpoints: ExerciseCheckpoint[]
    }
  }
}
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
const rosterFilter = ref<'all' | 'active' | 'hand' | 'overdue'>('all')
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
const collapsedExerciseGroups = ref(new Set<string>())
const toggleExerciseGroup = (key: string) => {
  if (collapsedExerciseGroups.value.has(key)) collapsedExerciseGroups.value.delete(key)
  else {
    collapsedExerciseGroups.value.add(key)
    if (
      participantExerciseGroups.value
        .find((group) => group.key === key)
        ?.participants.some((participant) => participant.peerId === detailsPeerId.value)
    )
      closePeerDetails()
  }
}
const participantExerciseGroups = computed(() => {
  const groups = new Map<
    string,
    {
      key: string
      label: string
      summary: string
      participants: Array<(typeof filteredParticipants.value)[number] & { rosterIndex: number }>
    }
  >()

  for (const participant of filteredParticipants.value) {
    const exerciseName = participant.peer.exercise?.name?.trim()
    const key = exerciseName ? `exercise:${exerciseName}` : 'unassigned'
    const group = groups.get(key) || {
      key,
      label: exerciseName || 'Unassigned',
      summary: '',
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
    const counts = new Map<string, number>()
    for (const participant of group.participants) {
      const status = participant.peer.exercise?.status
      if (status) counts.set(status, (counts.get(status) || 0) + 1)
      participant.rosterIndex = collapsedExerciseGroups.value.has(group.key) ? -1 : rosterIndex++
    }
    group.summary = [...counts].map(([status, count]) => `${count} ${status}`).join(' · ')
  }
  return sortedGroups
})
const visibleParticipantRows = computed(() =>
  participantExerciseGroups.value.flatMap((group) =>
    collapsedExerciseGroups.value.has(group.key) ? [] : group.participants,
  ),
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
  followMode.value = true
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
  cancelFeedbackRequest()
  window.removeEventListener('beforeunload', disconnect)
  document.removeEventListener('pointerdown', dismissPeerDetailsOnOutsideClick)
  document.removeEventListener('pointerdown', recordFocusInteraction, true)
  document.removeEventListener('keydown', recordFocusInteraction, true)
  if (healthTimer) clearInterval(healthTimer)
  emit('handAttention', false)
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
    if (!peerRosterOrder.value.includes(incomingConnection.peer)) {
      peerRosterOrder.value.push(incomingConnection.peer)
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
  peerRosterOrder.value = peerRosterOrder.value.filter((peerId) => peerId !== peer.id)
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
  trace(`Creating a new peer ${targetPeerId}`)
  if (targetPeerId) requestedRoomId.value = targetPeerId
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
  nextTick(() => rosterDetailRef.value?.scrollIntoView({ block: 'nearest' }))
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
  if (element instanceof HTMLElement) rosterRowRefs.set(peerId, element)
  else rosterRowRefs.delete(peerId)
}
const setRosterDetailRef = (element: Element | ComponentPublicInstance | null) => {
  rosterDetailRef.value = element instanceof HTMLElement ? element : null
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

const openExercisePalette = (peerId?: string) => {
  const targets = peerId && incomingConns.value[peerId] ? [peerId] : [...actionTargetIds.value]
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

const rowClass = (peerId: string) => {
  return [
    focusedPeerId.value === peerId ? 'bg-simInputBackground' : '',
    isPeerSelected(peerId) ? 'text-simActiveButton' : 'text-secondary',
  ]
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

const feedbackReview = createFeedbackReview({
  assignment: (peerId) => incomingConns.value[peerId]?.exercise,
  send: (peerId, assignmentId, message) =>
    instructorActions.message([peerId], message, { assignmentId })[0],
})
const feedbackRequest = ref({ peerId: '', assignmentId: '', pending: false, notice: '' })
let feedbackAbort: AbortController | null = null
const cancelFeedbackRequest = () => feedbackAbort?.abort()
const suggestPeerFeedback = async (peerId: string) => {
  const peer = incomingConns.value[peerId]
  if (
    feedbackRequest.value.pending ||
    !isInstructor.value ||
    !isOnline.value ||
    !peer?.conn.open ||
    !peer.exercise
  )
    return
  const assignment = peer.exercise
  const connection = peer.conn
  const controller = new AbortController()
  feedbackAbort = controller
  feedbackRequest.value = { peerId, assignmentId: assignment.id, pending: true, notice: '' }
  try {
    const suggestion = await requestFeedback(
      feedbackProviderConfig,
      {
        peerId,
        assignmentId: assignment.id,
        lessonName: assignment.name,
        status: assignment.status,
        checkpoints: assignment.checkpoints,
      },
      controller.signal,
    )
    if (
      controller.signal.aborted ||
      !isInstructor.value ||
      !isOnline.value ||
      incomingConns.value[peerId]?.conn !== connection ||
      incomingConns.value[peerId]?.exercise?.id !== assignment.id
    ) {
      throw new Error('Feedback discarded: classroom or assignment changed.')
    }
    if (!suggestion) {
      feedbackRequest.value.notice = 'Insufficient evidence for feedback.'
      return
    }
    const result = queueFeedbackSuggestion(suggestion)
    if (!result.accepted) throw new Error(result.reason)
    feedbackRequest.value.notice = 'Feedback ready for review. Nothing sent to the student.'
  } catch (error) {
    feedbackRequest.value.notice = controller.signal.aborted
      ? 'Feedback request cancelled.'
      : String(error instanceof Error ? error.message : error)
  } finally {
    if (feedbackAbort === controller) {
      feedbackRequest.value.pending = false
      feedbackAbort = null
    }
  }
}
watch(
  () => [
    isInstructor.value,
    isOnline.value,
    detailsPeerId.value,
    incomingConns.value[feedbackRequest.value.peerId]?.exercise?.id,
    incomingConns.value[feedbackRequest.value.peerId]?.conn.open,
  ],
  () => {
    if (
      feedbackRequest.value.pending &&
      (!isInstructor.value ||
        !isOnline.value ||
        detailsPeerId.value !== feedbackRequest.value.peerId ||
        incomingConns.value[feedbackRequest.value.peerId]?.exercise?.id !==
          feedbackRequest.value.assignmentId ||
        !incomingConns.value[feedbackRequest.value.peerId]?.conn.open)
    )
      cancelFeedbackRequest()
  },
  { flush: 'sync' },
)
const visibleFeedback = computed(() =>
  feedbackReview.suggestions.value.filter(
    (suggestion) => suggestion.peerId === detailsPeerId.value && suggestion.status !== 'dismissed',
  ),
)
watch(
  () => Object.entries(incomingConns.value).map(([id, peer]) => [id, peer.exercise?.id]),
  () => feedbackReview.expireStale(),
  { flush: 'sync' },
)
const queueFeedbackSuggestion = (input: FeedbackSuggestionInput) => {
  if (!isInstructor.value || !isOnline.value)
    return { accepted: false, reason: 'Instructor must be online' }
  return feedbackReview.enqueue(input)
}
const approveFeedback = (id: string) => {
  const result = feedbackReview.approve(id)
  if (result) reportActionResults('feedback', 'Suggested feedback', [result])
  if (result?.status === 'sent') restoreRosterFocus()
}
const dismissFeedback = (id: string) => {
  const suggestion = feedbackReview.suggestions.value.find((item) => item.id === id)
  if (suggestion?.status !== 'pending') return
  feedbackReview.dismiss(id)
  logSessionEvent('feedback-dismissed', suggestion.peerId, id)
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
    openPeerDetails(detailsTargetPeerId)
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
  const checkpoint = peer.metadata.checkPoint ? ` · ${peer.metadata.checkPoint}` : ''
  const network = connectionAge(peer) > 15 ? 'Network stale' : `${peer.latency ?? '—'}ms`
  return `${identity.join(' · ')} · ${compactStatus(peer.metadata.status)} · ${exercise}${checkpoint} · ${network}`
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
      feedbackSuggestions: feedbackReview.suggestions.value,
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
  if (selfPeer) {
    selfPeer.destroy()
    selfPeer = undefined as any
  }
  incomingConns.value = {}
  peerRosterOrder.value = []
  instructorConnection = undefined as any
}

defineExpose({
  queueFeedbackSuggestion,
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
  @apply h-5 shrink-0 bg-primary px-1 text-secondary hover:bg-secondary hover:text-primary disabled:cursor-default disabled:opacity-40;
}

.peer-details-toggle {
  @apply bg-primary text-secondary hover:bg-secondary hover:text-primary;
}

.peer-details-toggle[aria-expanded='true'] {
  @apply bg-secondary text-primary;
}

.roster-primary-action {
  @apply bg-panelActive px-2 text-white hover:bg-panelActive hover:text-white;
}

.roster-group-heading {
  @apply flex min-h-7 w-full flex-wrap items-center gap-x-2 gap-y-0.5 border-y border-panelBorder bg-panelHeaderBackground px-2 py-1 text-left text-secondary;
}

.roster-group-summary {
  @apply text-secondary;
}

.classroom-roster-row {
  @apply border-b border-panelBorder/50;
}

.roster-exercise-status {
  @apply ml-auto inline-flex items-center gap-1 bg-primary px-1 text-secondary;
}

.roster-group-heading:focus-visible,
.roster-detail summary:focus-visible,
.peer-details-toggle:focus-visible,
.command-button:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: -1px;
}

.menu-command {
  @apply block h-6 w-full px-2 text-left text-secondary hover:bg-simInputBackground disabled:cursor-default disabled:opacity-40;
}

@container (max-width: 26rem) {
  .roster-net {
    display: none;
  }
  .roster-secondary-id {
    display: none;
  }
  .roster-checkpoint {
    display: none;
  }
  .roster-group-summary {
    flex-basis: 100%;
    padding-left: 1rem;
  }
}
</style>
