<template>
  <section class="prompt-transcript">
    <div ref="transcriptRef" class="prompt-transcript__scroll" @scroll="handleScroll">
      <div v-if="cards.length === 0" class="prompt-transcript__empty">
        <span>NO ACTIVE GUIDANCE</span>
        <small>Lesson and instructor messages will appear here.</small>
      </div>

      <article v-for="card in cards" :key="card.id" class="prompt-entry">
        <header class="prompt-card__header">
          <span class="prompt-card__title">{{ card.title }}</span>
        </header>
        <div class="markdown prompt-card__message" v-html="card.html"></div>

        <div v-if="card.interaction?.type === 'continue'" class="prompt-interaction">
          <wButton
            class="h-6"
            :button-label="card.interaction.buttonLabel"
            :button-click="() => completeContinue(card)"
          />
        </div>

        <div v-else-if="card.interaction?.type === 'multiple-choice'" class="prompt-interaction">
          <div v-if="card.interaction.completed" class="prompt-interaction__answer">
            <span class="font-semibold">Answer:</span>
            {{ choiceLabel(card.interaction) }}
          </div>
          <div v-else class="grid gap-1">
            <wButton
              v-for="choice in card.interaction.choices"
              :key="choice.id"
              class="min-h-6 !justify-start !whitespace-normal text-left"
              :button-label="choice.label"
              :button-state="card.interaction.selectedAnswer === choice.id"
              :button-click="() => answerMultipleChoice(card, choice.id)"
            />
          </div>
          <p v-if="card.interaction.feedback" class="prompt-interaction__feedback">
            {{ card.interaction.feedback }}
          </p>
        </div>

        <form
          v-else-if="card.interaction?.type === 'essay'"
          class="prompt-interaction"
          @submit.prevent="submitEssay(card)"
        >
          <div
            v-if="card.interaction.completed"
            class="prompt-interaction__answer whitespace-pre-wrap"
          >
            <span class="font-semibold">Answer:</span>
            {{ card.interaction.answer }}
          </div>
          <template v-else>
            <textarea
              v-model="card.interaction.answer"
              class="prompt-interaction__essay"
              :placeholder="card.interaction.placeholder"
              rows="5"
            ></textarea>
            <div class="flex items-center justify-between gap-2">
              <span class="opacity-60">
                {{ card.interaction.answer.trim().length }} characters
              </span>
              <wButton
                class="h-6"
                :button-label="card.interaction.submitLabel"
                :button-click="() => submitEssay(card)"
              />
            </div>
          </template>
          <p v-if="card.interaction.feedback" class="prompt-interaction__feedback">
            {{ card.interaction.feedback }}
          </p>
        </form>
      </article>
    </div>

    <button
      v-if="pendingMessages"
      type="button"
      class="prompt-transcript__latest"
      @click="showLatest"
    >
      ↓ {{ pendingMessages }} NEW
    </button>
  </section>
</template>

<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import { marked } from 'marked'
import wButton from './wButton.vue'
import type {
  AskQuestionOptions,
  EssayQuestionOptions,
  MultipleChoiceQuestionOptions,
  QuestionChoice,
  QuestionResult,
  WaitForUserOptions,
} from '../ScriptContext'

const emit = defineEmits<{
  (event: 'action-pending', pending: boolean): void
}>()

type ContinueInteraction = {
  type: 'continue'
  buttonLabel: string
  resolve: () => void
}

type MultipleChoiceInteraction = {
  type: 'multiple-choice'
  options: MultipleChoiceQuestionOptions
  choices: QuestionChoice[]
  selectedAnswer: string
  feedback: string
  completed: boolean
  attempts: number
  startedAt: number
  resolve: (result: QuestionResult) => void
}

type EssayInteraction = {
  type: 'essay'
  options: EssayQuestionOptions
  answer: string
  feedback: string
  completed: boolean
  placeholder: string
  submitLabel: string
  startedAt: number
  resolve: (result: QuestionResult) => void
}

type PromptInteraction = ContinueInteraction | MultipleChoiceInteraction | EssayInteraction

type PromptCard = {
  id: number
  title: string
  markdown: string
  html: string
  interaction?: PromptInteraction
}

const cards = ref<PromptCard[]>([])
const transcriptRef = ref<HTMLElement | null>(null)
const pendingMessages = ref(0)
let followLatest = true
let nextCardId = 0
let actionPending = false

marked.setOptions({
  async: false,
  pedantic: false,
  gfm: true,
  breaks: true,
})

const renderMarkdown = (content: string) => String(marked.parse(content))

const updateActionPending = () => {
  const pending = cards.value.some(({ interaction }) => {
    if (!interaction) return false
    if (interaction.type === 'continue') return true
    return !interaction.completed
  })
  if (pending === actionPending) return
  actionPending = pending
  emit('action-pending', pending)
}

const addCard = async (card: PromptCard, replace = false) => {
  if (replace) {
    cancelPromptInteractions()
    cards.value = [card]
    pendingMessages.value = 0
    followLatest = true
  } else {
    cards.value.push(card)
  }

  if (followLatest) await scrollToLatest()
  else pendingMessages.value++
}

const isNearBottom = (element: HTMLElement) =>
  element.scrollHeight - element.scrollTop - element.clientHeight <= 24

const scrollToLatest = async () => {
  await nextTick()
  const element = transcriptRef.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

const handleScroll = () => {
  const element = transcriptRef.value
  if (!element) return
  followLatest = isNearBottom(element)
  if (followLatest) pendingMessages.value = 0
}

const showLatest = () => {
  followLatest = true
  pendingMessages.value = 0
  void scrollToLatest()
}

async function write(
  title: string,
  message?: string,
  time: number = 0,
  options: { append?: boolean; replace?: boolean } = {},
): Promise<void> {
  const text = message || ''
  const card = {
    id: ++nextCardId,
    title: title || 'Message',
    markdown: text,
    html: renderMarkdown(text),
  }

  await addCard(card, options.replace)

  if (time <= 0) return
  await new Promise<void>((resolve) => setTimeout(resolve, time))
}

const waitForUser = async (options: WaitForUserOptions): Promise<void> => {
  await new Promise<void>((resolve) => {
    const card: PromptCard = {
      id: ++nextCardId,
      title: options.title,
      markdown: options.message || '',
      html: renderMarkdown(options.message || ''),
      interaction: {
        type: 'continue',
        buttonLabel: options.buttonLabel || 'Continue',
        resolve,
      },
    }
    void addCard(card, options.replace)
    updateActionPending()
  })
}

const askQuestion = async (options: AskQuestionOptions): Promise<QuestionResult> => {
  if (options.type === 'multiple-choice' && !options.choices?.length) {
    throw new Error('A multiple-choice question requires at least one choice.')
  }
  if (
    options.type === 'multiple-choice' &&
    options.correctAnswer &&
    !options.choices.some(({ id }) => id === options.correctAnswer)
  ) {
    throw new Error('The correct answer must match one of the multiple-choice option IDs.')
  }

  return new Promise<QuestionResult>((resolve) => {
    const interaction: PromptInteraction =
      options.type === 'multiple-choice'
        ? {
            type: 'multiple-choice',
            options,
            feedback: '',
            completed: false,
            startedAt: Date.now(),
            resolve,
            choices: options.choices,
            selectedAnswer: '',
            attempts: 0,
          }
        : {
            type: 'essay',
            options,
            feedback: '',
            completed: false,
            startedAt: Date.now(),
            resolve,
            answer: '',
            placeholder: options.placeholder || 'Enter your answer…',
            submitLabel: options.submitLabel || 'Submit',
          }
    const card: PromptCard = {
      id: ++nextCardId,
      title: options.title,
      markdown: options.question,
      html: renderMarkdown(options.question),
      interaction,
    }
    void addCard(card, options.replace)
    updateActionPending()
  })
}

const completeContinue = (card: PromptCard) => {
  if (card.interaction?.type !== 'continue') return
  const { resolve } = card.interaction
  card.interaction = undefined
  updateActionPending()
  resolve()
}

const answerMultipleChoice = (card: PromptCard, answer: string) => {
  const interaction = card.interaction
  if (interaction?.type !== 'multiple-choice' || interaction.completed) return
  interaction.attempts++
  interaction.selectedAnswer = answer
  const correct = interaction.options.correctAnswer
    ? answer === interaction.options.correctAnswer
    : undefined

  if (correct === false) {
    interaction.feedback = interaction.options.incorrectFeedback || 'Not quite. Try again.'
    return
  }

  interaction.feedback =
    interaction.options.correctFeedback || (correct ? 'Correct.' : 'Submitted.')
  const result: QuestionResult = {
    questionId: interaction.options.id,
    type: interaction.type,
    answer,
    correct,
    attempts: interaction.attempts,
    elapsedMs: Date.now() - interaction.startedAt,
  }
  const { resolve } = interaction
  interaction.completed = true
  updateActionPending()
  resolve(result)
}

const choiceLabel = (interaction: MultipleChoiceInteraction) =>
  interaction.choices.find(({ id }) => id === interaction.selectedAnswer)?.label ||
  interaction.selectedAnswer

const submitEssay = (card: PromptCard) => {
  const interaction = card.interaction
  if (interaction?.type !== 'essay' || interaction.completed) return
  const answer = interaction.answer.trim()

  const result: QuestionResult = {
    questionId: interaction.options.id,
    type: interaction.type,
    answer,
    attempts: 1,
    elapsedMs: Date.now() - interaction.startedAt,
  }
  const { resolve } = interaction
  interaction.completed = true
  interaction.feedback = 'Submitted.'
  updateActionPending()
  resolve(result)
}

const cancelPromptInteractions = () => {
  for (const card of cards.value) {
    const interaction = card.interaction
    if (!interaction || ('completed' in interaction && interaction.completed)) continue
    if (interaction.type === 'continue') interaction.resolve()
    else {
      interaction.resolve({
        questionId: interaction.options.id,
        type: interaction.type,
        answer: '',
        attempts: interaction.type === 'multiple-choice' ? interaction.attempts : 0,
        elapsedMs: Date.now() - interaction.startedAt,
        cancelled: true,
      })
    }
    card.interaction = undefined
  }
  updateActionPending()
}

const reset = () => {
  cancelPromptInteractions()
  cards.value = []
  pendingMessages.value = 0
  followLatest = true
  nextCardId = 0
  updateActionPending()
  void nextTick(() => {
    if (transcriptRef.value) transcriptRef.value.scrollTop = 0
  })
}

defineExpose({ askQuestion, cancelPromptInteractions, reset, waitForUser, write })
</script>

<style>
.prompt-transcript {
  position: relative;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgb(var(--color-panelBorder));
  background: rgb(var(--color-panelContentBackground));
  color: rgb(var(--color-secondary));
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.7rem;
  line-height: 1.35;
}

.prompt-transcript__scroll {
  height: 100%;
  overflow-y: auto;
  padding: 0.35rem;
}

.prompt-transcript__empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.25rem;
  opacity: 0.55;
}

.prompt-transcript__empty small {
  font-size: inherit;
}

.prompt-transcript__latest {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  border: 1px solid rgb(var(--color-panelActive));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.2rem 0.45rem;
  color: rgb(var(--color-panelActive));
}

.prompt-transcript__latest:hover,
.prompt-transcript__latest:focus-visible {
  background: rgb(var(--color-simInputBackground));
  outline: none;
}

.prompt-entry {
  margin-bottom: 0.65rem;
}

.prompt-entry:last-child {
  margin-bottom: 0;
}

.prompt-card__header {
  display: flex;
  min-height: 1rem;
  align-items: center;
  padding: 0 0.15rem;
}

.prompt-card__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.08em;
  font-weight: 700;
  white-space: nowrap;
}

.prompt-card__message {
  padding: 0.1rem 0.15rem 0;
}

.prompt-interaction {
  margin: 0.35rem 0.15rem 0;
  border-left: 2px solid rgb(var(--color-panelActive));
  padding-left: 0.4rem;
}

.prompt-interaction__essay {
  width: 100%;
  resize: vertical;
  border: 1px solid rgb(var(--color-simElementBorder));
  background: rgb(var(--color-simInputBackground));
  padding: 0.35rem;
  color: rgb(var(--color-secondary));
  outline: none;
}

.prompt-interaction__essay:focus {
  border-color: rgb(var(--color-panelActive));
}

.prompt-interaction__feedback {
  margin-top: 0.25rem;
  color: rgb(var(--color-simActiveButton));
}

.markdown {
  color: rgb(var(--color-secondary));
}

.markdown h1,
.markdown h2,
.markdown h3,
.markdown h4,
.markdown h5,
.markdown h6 {
  display: inline-block;
  clear: both;
  margin: 0.25em 0 0.1em;
  color: rgb(var(--color-secondary)) !important;
  font-size: 1.05em;
  font-weight: 700;
}

.markdown p {
  margin: 0.1em 0;
  font-size: 1.05em;
}

.markdown a {
  color: rgb(var(--color-simActiveButton));
  text-decoration: underline;
}

.markdown ol,
.markdown ul {
  margin: 0.15em 0;
  padding-left: 0;
}

.markdown ol li,
.markdown ul li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.1em;
}

.markdown ol {
  list-style-type: none;
  counter-reset: prompt-list;
}

.markdown ol li {
  counter-increment: prompt-list;
}

.markdown ol li::before {
  width: 1.5em;
  flex-shrink: 0;
  content: counter(prompt-list) '.';
  color: rgb(var(--color-simActiveButton));
}

.markdown ul {
  list-style-type: none;
}

.markdown ul li::before {
  width: 1.1em;
  flex-shrink: 0;
  content: '+ ';
  color: rgb(var(--color-simActiveButton));
  font-weight: bold;
}

.markdown blockquote {
  margin: 0.35em 0;
  border-left: 3px solid rgb(var(--color-panelActive));
  background: rgb(var(--color-panelHeaderBackground));
  padding: 0.25em 0.45em;
}

.markdown pre {
  margin: 0.25em 0;
  overflow: auto;
  border: 1px solid rgb(var(--color-simElementBorder));
  border-radius: 3px;
  background: rgb(var(--color-simInputBackground));
  padding: 0.4em 0.5em;
}

.markdown code {
  color: rgb(var(--color-secondary));
  font-family: inherit;
}

.markdown table {
  width: 100%;
  margin: 0.3em 0;
  border-collapse: collapse;
}

.markdown th,
.markdown td {
  border: 1px dashed rgb(var(--color-panelBorder));
  padding: 0.2em 0.3em;
  text-align: left;
}

.markdown th {
  border-bottom: 1px solid rgb(var(--color-simActiveButton));
  color: rgb(var(--color-simActiveButton));
}

.markdown hr {
  border-color: rgb(var(--color-panelBorder));
}

.prompt-transcript ::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.prompt-transcript ::-webkit-scrollbar-track {
  background: rgb(var(--color-simBackground));
}

.prompt-transcript ::-webkit-scrollbar-thumb {
  border-radius: 2px;
  background: rgb(var(--color-panelBorder));
}

.prompt-transcript ::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-simElementBorder));
}
</style>
