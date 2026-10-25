<script setup lang="ts">
import AccountAccess from './AccountAccess.vue'

const props = withDefaults(
  defineProps<{
    accountAuthenticated?: boolean
    licenceValid?: boolean
    classroomOnline?: boolean
  }>(),
  {
    accountAuthenticated: false,
    licenceValid: false,
    classroomOnline: false,
  },
)

const emit = defineEmits<{
  (event: 'login', url: string, authToken: string, name: string): void
  (event: 'logout'): void
}>()
</script>

<template>
  <div class="flex h-full w-full min-w-0 flex-col gap-2 overflow-auto p-2 text-xs text-secondary">
    <p v-if="!props.accountAuthenticated" class="opacity-70">
      Sign in or create an account to join a classroom and save progress.
    </p>

    <AccountAccess
      compact
      initial-view="choice"
      @login="(url: string, authToken: string, name: string) => emit('login', url, authToken, name)"
      @logout="emit('logout')"
    >
      <template #status>
        <dl class="grid gap-1">
          <div class="flex min-w-0 items-center justify-between gap-2">
            <dt class="opacity-70">Licence</dt>
            <dd
              class="min-w-0 truncate"
              :class="props.licenceValid ? 'text-simActiveButton' : 'opacity-70'"
            >
              {{ props.licenceValid ? 'Valid' : 'Trial mode' }}
            </dd>
          </div>
          <div class="flex min-w-0 items-center justify-between gap-2">
            <dt class="opacity-70">Classroom</dt>
            <dd class="opacity-70">{{ props.classroomOnline ? 'Online' : 'Offline' }}</dd>
          </div>
        </dl>
      </template>
    </AccountAccess>
  </div>
</template>
