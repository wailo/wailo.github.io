<template>
  <section
    class="min-w-0 border-l border-simElementBorder pl-2 py-1 text-secondary"
    :aria-label="`${lesson.name} history`"
  >
    <div role="status">
      <span v-if="status === 'guest'">Sign in to view saved attempts.</span>
      <span v-else-if="status === 'loading'">Loading history…</span>
      <template v-else-if="status === 'error'">
        History unavailable.
        <button type="button" class="history-action" @click="refresh(page)">Retry</button>
      </template>
      <span v-else-if="!attempts.length">No saved attempts.</span>
    </div>
    <template v-if="status === 'ready' && attempts.length">
      <p class="text-xs">Saved attempts · completion is not a pass.</p>
      <details
        v-for="attempt in attempts"
        :key="attempt.id"
        class="border-b border-simElementBorder py-1"
      >
        <summary
          class="cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-secondary"
        >
          <span class="inline-flex flex-wrap gap-x-2 tabular-nums">
            <span>{{ formatDate(attempt.start_time) }}</span>
            <span>{{ attemptDuration(attempt) }}</span>
            <span>{{ statusLabels[attempt.status] ?? 'Unknown status' }}</span>
            <span>Outcome: {{ outcomeLabels[attempt.outcome] ?? 'Not assessed' }}</span>
            <span v-if="attempt.assessment">
              {{ attempt.assessment.score }}/{{ attempt.assessment.maxScore }} · Script-reported
            </span>
          </span>
        </summary>
        <dl class="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs [&>dd]:break-all">
          <dt>Recording</dt>
          <dd>{{ attempt.id }}</dd>
          <template v-if="attempt.assessment">
            <dt>Pass mark</dt>
            <dd>{{ attempt.assessment.passingScore }}/{{ attempt.assessment.maxScore }}</dd>
            <dt>Assessment</dt>
            <dd>
              Script-reported; not independently verified.{{
                attempt.status !== 'completed' ? ' Not finalized.' : ''
              }}
            </dd>
          </template>
          <dt>Ended</dt>
          <dd>{{ attempt.end_time ? formatDate(attempt.end_time) : 'No finish recorded' }}</dd>
          <dt>Script revision</dt>
          <dd>{{ attempt.revision || 'Not archived' }}</dd>
          <dt>SHA-256</dt>
          <dd>{{ attempt.expand?.revision?.hash || 'Unavailable' }}</dd>
          <dt>App commit</dt>
          <dd>{{ attempt.app_commit || 'Unavailable' }}</dd>
          <dt>Model version</dt>
          <dd>{{ attempt.model_version || 'Unavailable' }}</dd>
        </dl>
      </details>
    </template>
    <div
      v-if="status === 'ready' && (totalPages > 1 || page > 1)"
      class="flex items-center gap-2 mt-1"
    >
      <button type="button" class="history-action" :disabled="page <= 1" @click="refresh(page - 1)">
        Previous
      </button>
      <span>Page {{ page }} of {{ Math.max(page, totalPages) }}</span>
      <button
        type="button"
        class="history-action"
        :disabled="page >= totalPages"
        @click="refresh(page + 1)"
      >
        Next
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { pb } from '../Pocketbase/pocketbase'
import { createLessonHistory, attemptDuration } from '../LessonHistory'
import type { ModuleEntry } from './data/EASAModules'

const props = defineProps<{ lesson: ModuleEntry; refreshKey: number }>()
const { status, attempts, page, totalPages, refresh, dispose } = createLessonHistory(
  pb,
  props.lesson,
)
watch(
  () => props.refreshKey,
  () => {
    void refresh()
  },
)
onUnmounted(dispose)
const formatDate = (value: string) =>
  Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Unknown date'
const statusLabels: Record<string, string> = {
  completed: 'Completed',
  stopped: 'Stopped',
  error: 'Error',
  interrupted: 'Interrupted',
  running: 'Unfinished',
}
const outcomeLabels: Record<string, string> = {
  'not-assessed': 'Not assessed',
  passed: 'Passed',
  failed: 'Failed',
  'awaiting-review': 'Awaiting review',
}
</script>

<style scoped>
.history-action {
  @apply bg-panelHeaderBackground px-1 text-secondary hover:bg-simInputBackground focus-visible:outline focus-visible:outline-1 focus-visible:outline-secondary disabled:opacity-40;
}
</style>
