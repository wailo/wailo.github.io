<script setup lang="ts">
import { ref } from 'vue'
import AccountAccess from './AccountAccess.vue'
import { pb } from '../Pocketbase/pocketbase'

const emit = defineEmits<{
  (event: 'onLogin', url: string, authToken: string, name: string): void
  (event: 'onLogout'): void
}>()

const isLoggedIn = ref(pb.authStore.isValid)
const accountName = ref(String(pb.authStore.record?.name || ''))
const settingsOpen = ref(!pb.authStore.isValid)

const handleLogin = (url: string, authToken: string, name: string) => {
  isLoggedIn.value = true
  accountName.value = name
  emit('onLogin', url, authToken, name)
}

const handleLogout = () => {
  isLoggedIn.value = false
  accountName.value = ''
  settingsOpen.value = true
  emit('onLogout')
}
</script>

<template>
  <div class="w-full min-w-0 text-secondary">
    <div class="flex h-6 min-w-0 items-center gap-2 bg-panelHeaderBackground px-1">
      <span :class="isLoggedIn ? 'text-simActiveButton' : 'opacity-60'" aria-hidden="true">●</span>
      <span class="opacity-60">AUTH</span>
      <span class="min-w-0 flex-1 truncate">
        {{ isLoggedIn ? accountName || 'ACCOUNT' : 'GUEST MODE' }}
      </span>
      <button
        class="px-1 hover:text-panelActive focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
        :title="settingsOpen ? 'Close account controls' : 'Open account controls'"
        :aria-expanded="settingsOpen"
        @click="settingsOpen = !settingsOpen"
      >
        {{ settingsOpen ? '×' : '⋯' }}
      </button>
    </div>

    <!-- Keep auth initialization mounted even when account controls are collapsed. -->
    <div v-show="settingsOpen" class="border-b border-simElementBorder p-2">
      <p v-if="!isLoggedIn" class="mb-2 text-xs opacity-70">
        Sign in or create an account to join a classroom and save progress.
      </p>
      <AccountAccess compact initial-view="choice" @login="handleLogin" @logout="handleLogout" />
    </div>
  </div>
</template>
