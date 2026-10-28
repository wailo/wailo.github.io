<script setup lang="ts">
import { computed } from 'vue'
import AccountAccess from './AccountAccess.vue'
import { licenceLabel, licenceNeedsAttention, type LicenceState } from '../Pocketbase/licence'

const props = withDefaults(
  defineProps<{
    accountAuthenticated?: boolean
    licenceState?: LicenceState
    licenceDetail?: string
    classroomOnline?: boolean
  }>(),
  {
    accountAuthenticated: false,
    licenceState: 'unknown',
    licenceDetail: '',
    classroomOnline: false,
  },
)

const emit = defineEmits<{
  (event: 'login', url: string, authToken: string, name: string): void
  (event: 'logout'): void
}>()

const licenceClass = computed(() => {
  if (props.licenceState === 'valid') return 'text-simActiveButton'
  if (licenceNeedsAttention(props.licenceState)) return 'text-panelActive'
  return 'opacity-70'
})
</script>

<template>
  <div class="flex h-full w-full min-w-0 flex-col gap-2 overflow-auto p-2 text-xs text-secondary">
    <!-- The licence state stays visible while signed out: "Trial" alone cannot tell a
         missing licence apart from a session the server no longer accepts. -->
    <dl class="grid gap-1">
      <div class="flex min-w-0 items-center justify-between gap-2">
        <dt class="opacity-70">Licence</dt>
        <dd class="min-w-0 truncate" :class="licenceClass">
          {{ licenceLabel(props.licenceState) }}
        </dd>
      </div>
      <div class="flex min-w-0 items-center justify-between gap-2">
        <dt class="opacity-70">Classroom</dt>
        <dd class="opacity-70">{{ props.classroomOnline ? 'Online' : 'Offline' }}</dd>
      </div>
    </dl>

    <p v-if="props.licenceState === 'session-expired'" class="opacity-70">
      Your session expired, so the licence cannot be checked. Sign in again to restore it.
    </p>
    <p v-else-if="props.licenceState === 'unreachable'" class="opacity-70">
      {{ props.licenceDetail || 'The licence check did not complete. Reload the simulator.' }}
    </p>

    <p v-if="!props.accountAuthenticated" class="opacity-70">
      Sign in or create an account to join a classroom and save progress.
    </p>

    <AccountAccess
      compact
      initial-view="choice"
      @login="(url: string, authToken: string, name: string) => emit('login', url, authToken, name)"
      @logout="emit('logout')"
    />
  </div>
</template>
