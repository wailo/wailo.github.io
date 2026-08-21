<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { pb } from '../Pocketbase/pocketbase'
import { type RecordModel } from 'pocketbase'

// Define the event emitter
const emit = defineEmits<{
  (event: 'onLogin', url: string, authToken: string, name: string): void
  (event: 'onLogout'): void
}>()

const email = ref('instructor@flightschool.ai')
const password = ref('1234567890')
const loginFailed = ref(false)
pb.authStore.clear() // Clear any previous authentication state
const isLoggedIn = ref(pb.authStore.isValid) // Check if the user is logged in

const userInfo = ref<RecordModel | null>(pb.authStore.record) // or `pb.authStore.record`
const authError = ref<unknown>(null)
const settingsOpen = ref(false)
let token = ''

const login = async (email: string, password: string) => {
  try {
    const authResult = await pb.collection('users').authWithPassword(email, password)
    userInfo.value = authResult.record
    token = authResult.token
    // const payload = getTokenPayload(token);
    emit('onLogin', pb.baseURL, token, String(authResult.record.name || ''))
    //     {
    //     "collectionId": "_pb_users_auth_",
    //     "exp": 1752856419,
    //     "id": "hemygubhpj0n31d",
    //     "refreshable": true,
    //     "type": "auth"
    // }
    isLoggedIn.value = true
    authError.value = null
  } catch (error) {
    userInfo.value = null
    authError.value = error
    isLoggedIn.value = false
    loginFailed.value = true
    console.error('Authentication failed:', error)
  }
}

const logout = () => {
  pb.authStore.clear()
  userInfo.value = null
  isLoggedIn.value = false
  loginFailed.value = false
  emit('onLogout') // Emit logout event to clear any previous state
}

async function toggleAuth() {
  if (!isLoggedIn.value) {
    await login(email.value, password.value)
  } else {
    logout()
  }
}

// login automatically on component mount if the user name and password are set
onMounted(() => {
  if (email.value && password.value) {
    login(email.value, password.value).catch((error) => {
      console.error('Auto-login failed:', error)
      loginFailed.value = true
    })
  }
})
</script>

<template>
  <div class="w-full min-w-0 text-secondary">
    <div class="flex h-6 min-w-0 items-center gap-2 bg-panelHeaderBackground px-1">
      <span :class="isLoggedIn ? 'text-simActiveButton' : 'opacity-60'">●</span>
      <span class="opacity-60">AUTH</span>
      <span class="min-w-0 flex-1 truncate">
        {{ isLoggedIn ? userInfo?.name || email : 'SIGNED OUT' }}
      </span>
      <button
        class="px-1 hover:text-panelActive focus-visible:outline focus-visible:outline-1 focus-visible:outline-panelActive"
        title="Account settings"
        @click="settingsOpen = !settingsOpen"
      >
        {{ settingsOpen ? '×' : '⋯' }}
      </button>
    </div>

    <div v-if="settingsOpen" class="grid min-w-0 gap-1 border-b border-simElementBorder p-1">
      <label class="flex h-5 min-w-0 items-center gap-1">
        <span class="w-16 shrink-0 opacity-60">EMAIL</span>
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          :disabled="isLoggedIn"
          v-on:focus="loginFailed = false"
          class="min-w-0 flex-1 bg-primary pl-1 text-secondary outline-none focus:border-panelActive border border-simElementBorder"
        />
      </label>
      <label class="flex h-5 min-w-0 items-center gap-1">
        <span class="w-16 shrink-0 opacity-60">PASSWORD</span>
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          :disabled="isLoggedIn"
          v-on:focus="loginFailed = false"
          class="min-w-0 flex-1 bg-primary pl-1 text-secondary outline-none focus:border-panelActive border border-simElementBorder"
        />
      </label>
      <button
        @click="toggleAuth"
        class="h-5 w-full border border-simElementBorder"
        :class="
          loginFailed
            ? 'bg-panelActive text-primary'
            : isLoggedIn
              ? 'bg-simActiveButton text-primary'
              : 'text-secondary'
        "
      >
        {{
          loginFailed
            ? `Login Failed: ${authError}`
            : isLoggedIn
              ? `Logout ${userInfo?.name}`
              : 'Login'
        }}
      </button>
    </div>
  </div>
</template>
