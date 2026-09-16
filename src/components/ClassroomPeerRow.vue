<template>
  <div
    class="classroom-roster-row grid h-6 cursor-default grid-cols-[1.25rem_minmax(0,1fr)_auto_auto] items-center gap-x-1 px-1 outline-none"
    :class="[
      focused ? 'bg-simInputBackground' : '',
      selected || peer.exercise?.status === 'running' ? 'text-simActiveButton' : 'text-secondary',
    ]"
    :aria-selected="selected"
    :title="summary"
    tabindex="-1"
    @click="emit('focusRow', $event, peerId)"
  >
    <div class="text-center">
      <input
        type="checkbox"
        tabindex="-1"
        class="size-3 cursor-pointer accent-simActiveButton"
        :checked="selected"
        :aria-label="`Select ${peer.metadata.callsign || peerId}`"
        @click.stop="emit('selectPeer', peerId)"
      />
    </div>
    <div class="flex min-w-0 items-center gap-2 whitespace-nowrap">
      <div class="flex min-w-0 flex-1 items-center gap-1">
        <span
          v-if="peer.handState === 'raised'"
          class="inline-flex shrink-0 animate-pulse items-center bg-panelActive px-1 font-bold text-primary"
          >HAND</span
        >
        <span class="min-w-0 truncate font-medium">
          {{ peer.metadata.callsign || peer.metadata.displayName || '—' }}
        </span>
        <span class="roster-secondary-id shrink-0">
          · {{ compactStatus(peer.metadata.status) }}
        </span>
        <button
          v-if="aiState"
          class="command-button shrink-0"
          :class="{ 'roster-primary-action': aiState === 'review' }"
          @click.stop="emit('openDetails', peerId)"
        >
          AI {{ aiState }}
        </button>
      </div>
      <div class="flex min-w-0 flex-1 items-center gap-1">
        <span class="min-w-0 truncate">{{ peer.exercise?.name || 'No lesson assigned' }}</span>
        <span
          v-if="peer.exercise"
          class="roster-exercise-status shrink-0"
          :title="peer.exercise.status"
        >
          <span v-if="peer.exercise.status !== 'running'" aria-hidden="true">{{
            exerciseStatusSymbol(peer.exercise.status)
          }}</span>
          <span :class="exerciseStatusClass(peer.exercise.status)">{{
            peer.exercise.status === 'running'
              ? 'IN PROGRESS'
              : compactExerciseStatus(peer.exercise.status)
          }}</span>
        </span>
      </div>
    </div>
    <div class="roster-net flex items-center gap-1 whitespace-nowrap px-1 text-right">
      <span class="roster-ping">{{
        connectionAge > 15 ? 'STALE' : `${peer.latency ?? '—'}ms`
      }}</span>
      <div v-if="peer.handState === 'raised'" class="font-bold text-panelActive">
        {{ handWaitTime }}
      </div>
    </div>
    <button
      class="peer-details-toggle h-5 whitespace-nowrap px-1 text-center leading-none"
      :aria-expanded="detailsOpen"
      :title="detailsOpen ? 'Close peer details' : 'View peer details'"
      @click.stop="emit('toggleDetails', peerId)"
      @keydown.left.prevent.stop="emit('closeDetails')"
      @keydown.right.prevent.stop="emit('openDetails', peerId)"
    >
      Details {{ detailsOpen ? '‹' : '›' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { compactStatus, compactExerciseStatus, type ClassroomPeer } from '../ClassroomPeer'

const props = defineProps<{
  peerId: string
  peer: ClassroomPeer
  selected: boolean
  focused: boolean
  detailsOpen: boolean
  aiState?: 'pending' | 'review'
  clock: number
}>()

const emit = defineEmits<{
  focusRow: [event: MouseEvent, peerId: string]
  selectPeer: [peerId: string]
  openDetails: [peerId: string]
  closeDetails: []
  toggleDetails: [peerId: string]
}>()

// Read nested peer state here, not in the parent roster's render function.
const connectionAge = computed(() => {
  props.clock
  return Math.floor((Date.now() - props.peer.lastSeen) / 1000)
})
const summary = computed(() => {
  const peer = props.peer
  const identity = [peer.metadata.callsign || peer.metadata.displayName, peer.metadata.name].filter(
    Boolean,
  )
  const exercise = peer.exercise ? `${peer.exercise.name}: ${peer.exercise.status}` : 'Unassigned'
  const checkpoint = peer.metadata.checkPoint ? ` · ${peer.metadata.checkPoint}` : ''
  const network = connectionAge.value > 15 ? 'Network stale' : `${peer.latency ?? '—'}ms`
  return `${identity.join(' · ')} · ${compactStatus(peer.metadata.status)} · ${exercise}${checkpoint} · ${network}`
})
const handWaitTime = computed(() => {
  props.clock
  if (!props.peer.handRaisedAt) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - props.peer.handRaisedAt) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`
})
const exerciseStatusSymbol = (status: ClassroomExerciseStatus) =>
  ({ assigned: '○', running: '▶', completed: '✓', stopped: '■', error: '!', overdue: '!' })[status]
const exerciseStatusClass = (status: ClassroomExerciseStatus) => ({
  'font-bold': ['completed', 'running', 'error', 'overdue'].includes(status),
  'opacity-60': ['assigned', 'stopped'].includes(status),
})
</script>

<style scoped>
.classroom-roster-row {
  @apply border-b border-panelBorder/50;
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

.roster-exercise-status {
  @apply ml-auto inline-flex items-center gap-1;
}

.roster-ping {
  display: inline-block;
  width: 7ch;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.peer-details-toggle:focus-visible,
.command-button:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: -1px;
}

@container (max-width: 26rem) {
  .roster-net,
  .roster-secondary-id {
    display: none;
  }
}
</style>
