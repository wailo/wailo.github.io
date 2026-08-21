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

type PromptCard = {
  id: number
  title: string
  markdown: string
  html: string
}

const cards = ref<PromptCard[]>([])
const transcriptRef = ref<HTMLElement | null>(null)
const pendingMessages = ref(0)
let followLatest = true
let nextCardId = 0

marked.setOptions({
  async: false,
  pedantic: false,
  gfm: true,
  breaks: true,
})

const renderMarkdown = (content: string) => String(marked.parse(content))

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

  if (options.replace) {
    cards.value = [card]
    pendingMessages.value = 0
    followLatest = true
  } else {
    cards.value.push(card)
  }

  if (followLatest) {
    await scrollToLatest()
  } else {
    pendingMessages.value++
  }

  if (time <= 0) return
  await new Promise<void>((resolve) => setTimeout(resolve, time))
}

const reset = () => {
  cards.value = []
  pendingMessages.value = 0
  followLatest = true
  nextCardId = 0
  void nextTick(() => {
    if (transcriptRef.value) transcriptRef.value.scrollTop = 0
  })
}

defineExpose({ reset, write })
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
