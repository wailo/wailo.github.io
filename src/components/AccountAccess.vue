<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  formatAccountCode,
  generateAccountNumber,
  loginWithAccountCode,
  normalizeAccountCode,
} from '../Pocketbase/accountCode'
import { pb } from '../Pocketbase/pocketbase'

type AccountFlowState = 'choice' | 'create' | 'generated' | 'signin' | 'authenticated'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    showHeadings?: boolean
    initialView?: 'choice' | 'create' | 'signin'
  }>(),
  {
    compact: false,
    showHeadings: true,
    initialView: 'choice',
  },
)

const emit = defineEmits<{
  (event: 'login', url: string, authToken: string, name: string): void
  (event: 'logout'): void
  (event: 'flow-state', state: AccountFlowState): void
}>()

const flow = ref<AccountFlowState>(pb.authStore.isValid ? 'authenticated' : props.initialView)
const userInfo = ref<RecordModel | null>(pb.authStore.record)
const accountName = ref('')
const accountNumber = ref('')
const generatedNumber = ref('')
const animatedDigits = ref<string[]>([])
const pending = ref(false)
const errorMessage = ref('')
const copied = ref(false)
let digitAnimation: ReturnType<typeof setInterval> | undefined

const normalizedAccountNumber = computed(() => normalizeAccountCode(accountNumber.value))
const accountNumberInput = computed({
  get: () => accountNumber.value,
  set: (value: string) => {
    accountNumber.value = formatAccountCode(value)
    errorMessage.value = ''
  },
})

const unsubscribeAuth = pb.authStore.onChange(() => {
  userInfo.value = pb.authStore.record
  if (pb.authStore.isValid) flow.value = 'authenticated'
})

watch(flow, (state) => emit('flow-state', state))

const readableError = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return 'The account request failed. Please try again.'
}

const randomDisplayDigit = () => {
  const value = new Uint8Array(1)
  crypto.getRandomValues(value)
  return String(value[0] % 10)
}

const animateAccountNumber = (number: string) => {
  if (digitAnimation) clearInterval(digitAnimation)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedDigits.value = Array.from(number)
    return
  }

  let revealed = 0
  animatedDigits.value = Array.from({ length: 16 }, randomDisplayDigit)
  digitAnimation = setInterval(() => {
    revealed += 1
    animatedDigits.value = Array.from(number, (digit, index) =>
      index < revealed ? digit : randomDisplayDigit(),
    )
    if (revealed >= number.length && digitAnimation) {
      clearInterval(digitAnimation)
      digitAnimation = undefined
    }
  }, 55)
}

const openFlow = (state: 'choice' | 'create' | 'signin') => {
  flow.value = state
  errorMessage.value = ''
  if (state !== 'signin') accountNumber.value = ''
}

const generateNumber = async () => {
  pending.value = true
  errorMessage.value = ''
  copied.value = false
  try {
    const result = await generateAccountNumber()
    generatedNumber.value = result.code
    accountNumber.value = formatAccountCode(result.code)
    animateAccountNumber(result.code)
    flow.value = 'generated'
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    pending.value = false
  }
}

const finishAccount = async () => {
  pending.value = true
  errorMessage.value = ''
  try {
    const result = await loginWithAccountCode(generatedNumber.value, accountName.value)
    emit('login', pb.baseURL, result.token, String(result.record.name || ''))
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    pending.value = false
  }
}

const signIn = async () => {
  pending.value = true
  errorMessage.value = ''
  try {
    const result = await loginWithAccountCode(accountNumber.value)
    accountNumber.value = ''
    emit('login', pb.baseURL, result.token, String(result.record.name || ''))
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    pending.value = false
  }
}

const copyNumber = async () => {
  try {
    await navigator.clipboard.writeText(formatAccountCode(generatedNumber.value))
    copied.value = true
  } catch {
    errorMessage.value = 'Could not copy the account number. Please copy it manually.'
  }
}

const startOver = () => {
  generatedNumber.value = ''
  animatedDigits.value = []
  accountNumber.value = ''
  accountName.value = ''
  copied.value = false
  openFlow('create')
}

const logout = () => {
  pb.authStore.clear()
  userInfo.value = null
  generatedNumber.value = ''
  animatedDigits.value = []
  accountNumber.value = ''
  accountName.value = ''
  copied.value = false
  flow.value = props.initialView
  emit('logout')
}

onMounted(() => {
  emit('flow-state', flow.value)
  if (pb.authStore.isValid && pb.authStore.record) {
    emit('login', pb.baseURL, pb.authStore.token, String(pb.authStore.record.name || ''))
  }
})

onUnmounted(() => {
  unsubscribeAuth()
  if (digitAnimation) clearInterval(digitAnimation)
})
</script>

<template>
  <div
    class="account-access grid min-w-0 text-left"
    :class="compact ? 'account-access--compact gap-1 text-xs' : 'gap-3 text-sm'"
  >
    <div v-if="flow === 'authenticated'" class="grid gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span :class="compact ? 'text-simActiveButton' : 'text-green-400'" aria-hidden="true"
          >●</span
        >
        <span class="opacity-70">Signed in as</span>
        <strong class="min-w-0 truncate" :class="compact ? 'text-secondary' : 'text-white'">
          {{ userInfo?.name || 'Account user' }}
        </strong>
      </div>
      <button type="button" class="account-button account-button-secondary" @click="logout">
        Sign out
      </button>
    </div>

    <div v-else-if="flow === 'choice'" class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="account-button account-button-primary"
        @click="openFlow('create')"
      >
        Create account
      </button>
      <button
        type="button"
        class="account-button account-button-secondary"
        @click="openFlow('signin')"
      >
        Sign in
      </button>
    </div>

    <form v-else-if="flow === 'create'" class="grid gap-3" @submit.prevent="generateNumber">
      <div v-if="!compact && showHeadings">
        <h2 class="text-lg font-semibold text-white">Create an account</h2>
      </div>
      <label class="grid gap-1">
        <span class="text-xs font-medium uppercase tracking-wider opacity-70">Your name</span>
        <input
          v-model="accountName"
          type="text"
          autocomplete="name"
          maxlength="255"
          placeholder="Enter your name"
          class="account-input"
          @input="errorMessage = ''"
        />
      </label>
      <button
        type="submit"
        class="account-button account-button-primary"
        :disabled="pending || !accountName.trim()"
      >
        {{ pending ? 'Generating securely…' : 'Generate account number' }}
      </button>
      <button type="button" class="account-link" @click="openFlow('signin')">
        Already have an account number? Sign in
      </button>
    </form>

    <div v-else-if="flow === 'generated'" class="grid gap-3 text-center">
      <div>
        <div class="text-xs font-medium uppercase tracking-[0.16em] opacity-70">
          Your account number
        </div>
        <div
          class="mt-2 flex justify-center font-mono font-semibold tracking-wider"
          :class="[compact ? 'text-secondary' : 'text-white', compact ? 'text-base' : 'text-xl']"
          aria-live="polite"
          aria-label="Generated 16-digit account number"
        >
          <span
            v-for="(digit, index) in animatedDigits"
            :key="index"
            class="account-digit"
            :class="index > 0 && index % 4 === 0 ? (compact ? 'ml-1' : 'ml-3') : ''"
          >
            {{ digit }}
          </span>
        </div>
      </div>
      <p class="text-xs opacity-70">
        Save this number, then finish setup. Your account has not been created yet.
      </p>
      <button type="button" class="account-button account-button-secondary" @click="copyNumber">
        {{ copied ? 'Number copied' : 'Copy account number' }}
      </button>
      <button
        type="button"
        class="account-button account-button-primary"
        :disabled="pending"
        @click="finishAccount"
      >
        {{ pending ? 'Creating account…' : 'Finish account setup' }}
      </button>
      <button type="button" class="account-link" @click="startOver">Start over</button>
    </div>

    <form v-else-if="flow === 'signin'" class="grid gap-3" @submit.prevent="signIn">
      <div v-if="!compact && showHeadings">
        <h2 class="text-lg font-semibold text-white">Sign in</h2>
      </div>
      <label class="grid gap-1">
        <span class="text-xs font-medium uppercase tracking-wider opacity-70">Account number</span>
        <input
          v-model="accountNumberInput"
          type="text"
          inputmode="numeric"
          autocomplete="username"
          placeholder="0000 0000 0000 0000"
          aria-label="16-digit account number"
          class="account-input font-mono tracking-wider"
        />
      </label>
      <button
        type="submit"
        class="account-button account-button-primary"
        :disabled="pending || normalizedAccountNumber.length !== 16"
      >
        {{ pending ? 'Signing in…' : 'Sign in' }}
      </button>
      <button type="button" class="account-link" @click="openFlow(compact ? 'choice' : 'create')">
        {{ compact ? 'Back' : 'Need an account? Create one' }}
      </button>
    </form>

    <p v-if="errorMessage" class="text-xs text-red-400" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.account-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(107 114 128);
  border-radius: 0.5rem;
  background: rgb(17 24 39 / 0.7);
  padding: 0.625rem 0.75rem;
  color: inherit;
  outline: none;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.35);
  transition:
    border-color 150ms,
    background-color 150ms,
    box-shadow 150ms;
}

.account-input:focus {
  border-color: rgb(239 68 68);
  background: rgb(17 24 39 / 0.95);
  box-shadow:
    inset 0 1px 2px rgb(0 0 0 / 0.35),
    0 0 0 3px rgb(239 68 68 / 0.14);
}

.account-button {
  width: 100%;
  border: 1px solid rgb(107 114 128);
  min-height: 2.75rem;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  transition:
    border-color 150ms,
    background-color 150ms,
    color 150ms;
}

.account-button:focus-visible,
.account-link:focus-visible {
  outline: 1px solid rgb(239 68 68);
  outline-offset: 2px;
}

.account-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.account-button-primary:not(:disabled) {
  border-color: rgb(239 68 68);
  background: rgb(239 68 68);
  color: white;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.22);
}

.account-button-primary:not(:disabled):hover {
  background: rgb(185 28 28);
  border-color: rgb(185 28 28);
}

.account-button-secondary:not(:disabled):hover {
  border-color: white;
  color: white;
}

.account-button-secondary:not(:disabled) {
  background: rgb(55 65 81 / 0.65);
}

.account-link {
  justify-self: center;
  color: rgb(156 163 175);
  text-align: center;
}

.account-link:hover {
  color: white;
}

.account-access--compact > div,
.account-access--compact > form {
  gap: 0.25rem;
}

.account-access--compact .account-input {
  height: 1.25rem;
  border-radius: 0;
  border-color: rgb(var(--color-simElementBorder));
  background: rgb(var(--color-simInputBackground));
  padding: 0 0.25rem;
  color: rgb(var(--color-secondary));
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-panelBorder)),
    inset -1px -1px 0 rgb(var(--color-simElementBorder));
}

.account-access--compact .account-input:focus {
  border-color: rgb(var(--color-panelActive));
  background: rgb(var(--color-simInputBackground));
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-panelBorder)),
    inset -1px -1px 0 rgb(var(--color-simElementBorder));
}

.account-access--compact .account-button {
  min-height: 1.25rem;
  border-radius: 0;
  border-color: rgb(var(--color-panelBorder));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0 0.25rem;
  color: rgb(var(--color-secondary));
  font-size: inherit;
  font-weight: 500;
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-simElementBorder)),
    inset -1px -1px 0 rgb(var(--color-panelBorder));
}

.account-access--compact .account-button-primary:not(:disabled),
.account-access--compact .account-button-secondary:not(:disabled) {
  border-color: rgb(var(--color-panelBorder));
  background: rgb(var(--color-panelHeaderBackground));
  color: rgb(var(--color-secondary));
  box-shadow:
    inset 1px 1px 0 rgb(var(--color-simElementBorder)),
    inset -1px -1px 0 rgb(var(--color-panelBorder));
}

.account-access--compact .account-button:not(:disabled):hover {
  background: rgb(var(--color-simInputBackground));
  color: rgb(var(--color-panelActive));
}

.account-access--compact .account-button:active:not(:disabled) {
  box-shadow:
    inset -1px -1px 0 rgb(var(--color-simElementBorder)),
    inset 1px 1px 0 rgb(var(--color-panelBorder));
}

.account-access--compact .account-button:focus-visible,
.account-access--compact .account-link:focus-visible {
  outline-color: rgb(var(--color-panelActive));
}

.account-access--compact .account-link {
  color: rgb(var(--color-secondary));
  line-height: 1.25rem;
  opacity: 0.7;
}

.account-access--compact .account-link:hover {
  color: rgb(var(--color-panelActive));
  opacity: 1;
}

.account-digit {
  display: inline-block;
  min-width: 0.75em;
  animation: digit-settle 0.35s ease-out both;
}

@keyframes digit-settle {
  from {
    opacity: 0.25;
    filter: blur(2px);
    transform: translateY(-0.35em);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .account-digit {
    animation: none;
  }
}
</style>
