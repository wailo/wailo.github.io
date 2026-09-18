<template>
  <tr
    class="classroom-roster-row cursor-default text-secondary outline-none"
    :class="[
      { 'roster-selected': selected, 'roster-focused': focused, 'roster-expanded': detailsOpen },
    ]"
    :aria-selected="selected"
    :title="summary"
    tabindex="-1"
    @click="emit('focusRow', $event, peerId)"
  >
    <td>
      <div class="flex min-w-0 items-center gap-1">
      <input
        type="checkbox"
        tabindex="-1"
        class="peer-checkbox size-3 shrink-0 cursor-pointer"
        :checked="selected"
        :aria-label="`Select ${peer.metadata.callsign || peerId}`"
        @click.stop="emit('selectPeer', peerId)"
      />
        <span
          v-if="peer.handState === 'raised'"
          class="sr-only"
          >Hand raised</span
        >
        <span class="min-w-0 truncate font-medium">
          {{ peer.metadata.callsign || peer.metadata.displayName || '—' }}
        </span>
        <span class="roster-secondary-id shrink-0">
          · {{ compactStatus(peer.metadata.status) }}
        </span>
      </div>
    </td>
      <td class="roster-lesson" :title="peer.exercise?.name">
        <span v-if="peer.exercise" class="block truncate text-simActiveButton">{{ peer.exercise.name }}</span>
        <button v-else class="assign-lesson command-button" @click.stop="emit('assignLesson', peerId)">Assign</button>
      </td>
      <td class="roster-progress" :title="progressTitle">
        <span class="progress-message">{{ latestCheckpoint?.message || (peer.exercise ? 'No progress' : '—') }}</span>
        <time v-if="latestCheckpoint" class="ml-1 tabular-nums opacity-75" :datetime="checkpointDate.toISOString()">{{ checkpointTime }}</time>
      </td>
      <td>
        <button v-if="peer.handState === 'raised' || aiState" class="command-button attention-action" @click.stop="emit('openDetails', peerId)">
          {{ peer.handState === 'raised' ? `HAND ${handWaitTime}` : `Feedback ${aiState}` }}
        </button>
        <span v-else-if="peer.exercise" class="roster-exercise-status" :class="exerciseStatusClass" :title="statusLabel">{{ statusLabel }}</span>
        <span v-else class="sr-only">Unassigned</span>
      </td>
    <td class="roster-net whitespace-nowrap text-right">
      <span class="roster-ping">{{
        connectionAge > 15 ? 'STALE' : `${peer.latency ?? '—'}ms`
      }}</span>
    </td>
    <td>
    <button
      class="peer-details-toggle h-6 w-full whitespace-nowrap px-1 text-center leading-none"
      :aria-label="`${detailsOpen ? 'Close' : 'View'} details for ${peer.metadata.callsign || peer.metadata.displayName || peerId}`"
      :aria-expanded="detailsOpen"
      :title="detailsOpen ? 'Close peer details' : 'View peer details'"
      @click.stop="emit('toggleDetails', peerId)"
      @keydown.left.prevent.stop="emit('closeDetails')"
      @keydown.right.prevent.stop="emit('openDetails', peerId)"
    >
      {{ detailsOpen ? '⌄' : '›' }}
    </button>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { compactStatus, type ClassroomPeer } from '../ClassroomPeer'

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
  assignLesson: [peerId: string]
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
const latestCheckpoint = computed(() => props.peer.exercise?.checkpoints.at(-1))
const checkpointDate = computed(() => new Date(latestCheckpoint.value?.timestamp ?? 0))
const checkpointTime = computed(() =>
  checkpointDate.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
)
const progressTitle = computed(() => latestCheckpoint.value
  ? `${latestCheckpoint.value.message} · ${checkpointDate.value.toLocaleString()}`
  : 'No progress reported for this lesson')
const statusLabel = computed(() => props.peer.exercise
  ? ({ assigned: 'Ready', running: 'In progress', completed: 'Done', stopped: 'Stopped', error: 'Error', overdue: 'Overdue' })[props.peer.exercise.status]
  : 'UNASSIGNED')
const exerciseStatusClass = computed(() => {
  switch (props.peer.exercise?.status) {
    case 'running': return 'bg-simActiveButton/10 text-simActiveButton'
    case 'completed': return 'text-secondary'
    case 'error':
    case 'overdue': return 'bg-panelActive text-white'
    default: return 'text-secondary'
  }
})
</script>

<style scoped>
.classroom-roster-row {
  @apply hover:bg-simInputBackground;
}
.roster-selected { background: rgb(var(--color-secondary) / 0.08); }
.roster-focused { background: rgb(var(--color-simInputBackground) / 0.7); }
.roster-expanded { box-shadow: inset 2px 0 rgb(var(--color-secondary)); }
.classroom-roster-row > td { padding: 1px 4px; vertical-align: middle; height: 22px; }
.assign-lesson { border: 1px solid rgb(var(--color-panelBorder)); }
.assign-lesson:focus-visible { outline: 1px solid currentColor; }
.progress-message { overflow-wrap: anywhere; white-space: normal; }
.roster-progress { line-height: 1.2; }
.attention-action { max-width: 100%; overflow: hidden; text-overflow: ellipsis; background: rgb(var(--color-panelActive)); color: white; }

.classroom-roster-row:focus-visible {
  outline: 1px solid rgb(var(--color-secondary));
  outline-offset: -1px;
}

.command-button {
  @apply h-5 shrink-0 bg-primary px-1 text-secondary hover:bg-secondary hover:text-primary disabled:cursor-default disabled:opacity-40;
}

.peer-details-toggle {
  @apply text-secondary hover:bg-secondary hover:text-primary;
}

.peer-details-toggle[aria-expanded='true'] {
  @apply bg-secondary text-primary;
}

.roster-primary-action {
  @apply bg-panelActive px-2 text-white hover:bg-panelActive hover:text-white;
}

.roster-exercise-status {
  @apply inline-flex items-center justify-center rounded-sm px-1 font-medium;
  font-size: inherit;
}

.peer-checkbox {
  appearance: none;
  display: inline-grid;
  place-content: center;
  background: rgb(var(--color-panelContentBackground));
  border: 1px solid rgb(var(--color-secondary) / 0.65);
  border-radius: 2px;
}
.peer-checkbox::before {
  content: '';
  width: 7px;
  height: 4px;
  border-left: 2px solid rgb(var(--color-secondary));
  border-bottom: 2px solid rgb(var(--color-secondary));
  transform: translateY(-1px) rotate(-45deg);
  visibility: hidden;
}
.peer-checkbox:checked::before { visibility: visible; }
.peer-checkbox:focus-visible { outline: 1px solid rgb(var(--color-secondary)); outline-offset: 2px; }
@media (forced-colors: active) {
  .peer-checkbox { appearance: auto; }
  .peer-checkbox::before { display: none; }
}

.roster-ping {
  display: inline-block;
  max-width: 100%;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

@container (max-width: 48rem) {
  .roster-secondary-id { display: none; }
}
@container (max-width: 38rem) {
  .roster-lesson { display: none; }
}
@container (max-width: 28rem) {
  .roster-net { display: none; }
  .roster-exercise-status { padding-inline: 2px; }
}

.peer-details-toggle:focus-visible,
.command-button:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: -1px;
}

</style>
