<script setup lang="ts">
type Phase = 'brief' | 'fly' | 'debrief'
type Attention = 'console' | 'plots' | 'instruments' | null

withDefaults(
  defineProps<{
    phase?: Phase
    title?: string
    messageTitle?: string
    messageText?: string
    pending?: boolean
    consoleOpen?: boolean
    plotsOpen?: boolean
    autopilotOpen?: boolean
    controlsOpen?: boolean
    classroomOpen?: boolean
    lessonsOpen?: boolean
    airflowOpen?: boolean
    whiteboardOpen?: boolean
    classroomStatus?: string
    attention?: Attention
  }>(),
  {
    phase: 'brief',
    title: 'Free flight',
    messageTitle: '',
    messageText: '',
    pending: false,
    consoleOpen: true,
    plotsOpen: true,
    autopilotOpen: true,
    controlsOpen: false,
    classroomOpen: false,
    lessonsOpen: false,
    airflowOpen: false,
    whiteboardOpen: false,
    classroomStatus: 'Offline',
    attention: null,
  },
)

const emit = defineEmits<{
  (event: 'toggle-console'): void
  (event: 'toggle-plots'): void
  (event: 'toggle-autopilot'): void
  (event: 'toggle-controls'): void
  (event: 'toggle-classroom'): void
  (event: 'toggle-lessons'): void
  (event: 'toggle-airflow'): void
  (event: 'toggle-whiteboard'): void
}>()

const phaseLabel: Record<Phase, string> = {
  brief: 'BRIEF',
  fly: 'FLY',
  debrief: 'DEBRIEF',
}

const attentionLabel: Record<Exclude<Attention, null>, string> = {
  console: 'CONSOLE',
  plots: 'PLOTS',
  instruments: 'INSTRUMENTS',
}
</script>

<template>
  <div
    class="mission-hud"
    :data-phase="phase"
    :data-pending="pending ? 'true' : 'false'"
    :data-attention="attention ?? 'none'"
  >
    <div class="mission-hud__mission">
      <span class="mission-hud__eyebrow">MISSION · {{ phaseLabel[phase] }}</span>
      <strong class="mission-hud__title" :title="title">{{ title }}</strong>
    </div>

    <div class="mission-hud__console">
      <span class="mission-hud__tag">CONSOLE</span>
      <span class="mission-hud__console-copy">
        <span v-if="messageTitle" class="mission-hud__console-title">{{ messageTitle }}</span>
        <span class="mission-hud__console-text">{{ messageText || 'No console messages' }}</span>
      </span>
      <span v-if="attention" class="mission-hud__look">
        LOOK: {{ attentionLabel[attention] }}
      </span>
    </div>

    <div class="mission-hud__actions">
      <button
        type="button"
        class="mission-hud__button"
        :data-active="consoleOpen ? 'true' : 'false'"
        :data-pending="pending ? 'true' : 'false'"
        :aria-pressed="consoleOpen"
        :aria-label="pending ? 'Answer the active prompt' : 'Toggle console'"
        @click.stop="emit('toggle-console')"
      >
        {{ pending ? 'ANSWER' : 'CONSOLE' }}
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="plotsOpen ? 'true' : 'false'"
        :aria-pressed="plotsOpen"
        aria-label="Toggle plots"
        @click.stop="emit('toggle-plots')"
      >
        PLOTS
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="airflowOpen ? 'true' : 'false'"
        :aria-pressed="airflowOpen"
        :aria-label="airflowOpen ? 'Hide airflow' : 'Show airflow'"
        @click.stop="emit('toggle-airflow')"
      >
        AIRFLOW
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="whiteboardOpen ? 'true' : 'false'"
        :aria-pressed="whiteboardOpen"
        :aria-label="whiteboardOpen ? 'Hide whiteboard' : 'Show whiteboard'"
        @click.stop="emit('toggle-whiteboard')"
      >
        BOARD
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="autopilotOpen ? 'true' : 'false'"
        :aria-pressed="autopilotOpen"
        aria-label="Toggle autopilot"
        @click.stop="emit('toggle-autopilot')"
      >
        A/P
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="controlsOpen ? 'true' : 'false'"
        :aria-pressed="controlsOpen"
        :aria-label="controlsOpen ? 'Close flight controls' : 'Open flight controls'"
        @click.stop="emit('toggle-controls')"
      >
        CONTROLS
      </button>
      <button
        type="button"
        class="mission-hud__button"
        :data-active="lessonsOpen ? 'true' : 'false'"
        :aria-pressed="lessonsOpen"
        :aria-label="lessonsOpen ? 'Close lessons' : 'Open lessons'"
        @click.stop="emit('toggle-lessons')"
      >
        LESSONS
      </button>
      <button
        type="button"
        class="mission-hud__button mission-hud__button--classroom"
        :data-active="classroomOpen ? 'true' : 'false'"
        :data-online="classroomStatus === 'Online' ? 'true' : 'false'"
        :aria-pressed="classroomOpen"
        aria-label="Toggle classroom and account"
        @click.stop="emit('toggle-classroom')"
      >
        <span class="mission-hud__status-dot" aria-hidden="true"></span>
        CLASS
      </button>
    </div>
  </div>
</template>

<style scoped>
.mission-hud {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  left: 0.5rem;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.6rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid rgb(var(--color-panelBorder));
  border-radius: 0.35rem;
  background: rgb(var(--color-panelContentBackground) / 0.9);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.28);
  backdrop-filter: blur(6px);
  color: rgb(var(--color-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 0.65rem;
  line-height: 1.2;
  pointer-events: none;
}

.mission-hud[data-pending='true'] {
  border-color: rgb(var(--color-panelActive));
  box-shadow:
    0 0 0 1px rgb(var(--color-panelActive) / 0.35),
    0 8px 24px rgb(0 0 0 / 0.28);
}

.mission-hud[data-attention='plots'] .mission-hud__console,
.mission-hud[data-attention='console'] .mission-hud__console,
.mission-hud[data-attention='instruments'] .mission-hud__console {
  border-left-color: rgb(var(--color-panelActive) / 0.7);
}

.mission-hud__mission {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 6.5rem;
  max-width: 14rem;
}

.mission-hud__eyebrow {
  overflow: hidden;
  font-size: 0.5rem;
  letter-spacing: 0.16em;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.6;
}

.mission-hud[data-phase='fly'] .mission-hud__eyebrow {
  color: rgb(var(--color-simActiveButton));
  opacity: 1;
}

.mission-hud[data-phase='debrief'] .mission-hud__eyebrow {
  color: rgb(var(--color-panelActive));
  opacity: 1;
}

.mission-hud__title {
  overflow: hidden;
  font-size: 0.7rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-hud__console {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding-left: 0.6rem;
  border-left: 1px solid rgb(var(--color-panelBorder));
}

.mission-hud__tag {
  flex: none;
  font-size: 0.5rem;
  letter-spacing: 0.14em;
  opacity: 0.55;
}

.mission-hud__console-copy {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.mission-hud__console-title,
.mission-hud__console-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-hud__console-title {
  font-weight: 600;
}

.mission-hud__console-text {
  opacity: 0.65;
}

.mission-hud__look {
  flex: none;
  padding: 0.12rem 0.38rem;
  border: 1px solid rgb(var(--color-panelActive) / 0.8);
  border-radius: 0.2rem;
  background: rgb(var(--color-panelActive) / 0.12);
  color: rgb(var(--color-secondary));
  font-size: 0.54rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  white-space: nowrap;
  animation: mission-hud-look 900ms ease-in-out 2;
}

@keyframes mission-hud-look {
  50% {
    background: rgb(var(--color-panelActive) / 0.22);
  }
}

.mission-hud__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.2rem;
}

.mission-hud__button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.25rem;
  height: 1.5rem;
  padding: 0 0.32rem;
  border: 1px solid rgb(var(--color-panelBorder));
  border-radius: 0.25rem;
  background: rgb(var(--color-panelHeaderBackground));
  color: rgb(var(--color-secondary));
  font: inherit;
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  pointer-events: auto;
}

.mission-hud__button:hover {
  border-color: rgb(var(--color-panelActive));
  color: rgb(var(--color-secondary));
}

.mission-hud__button[data-active='true'] {
  border-color: rgb(var(--color-simActiveButton));
  background: rgb(var(--color-simActiveButton) / 0.1);
  color: rgb(var(--color-secondary));
}

.mission-hud__button[data-pending='true'] {
  border-color: rgb(var(--color-panelActive));
  background: rgb(var(--color-panelActive) / 0.16);
  color: rgb(var(--color-secondary));
}

.mission-hud__button--classroom {
  padding-left: 0.3rem;
}

.mission-hud__status-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: rgb(var(--color-panelBorder));
}

.mission-hud__button--classroom[data-online='true'] .mission-hud__status-dot {
  background: rgb(var(--color-simActiveButton));
  box-shadow: 0 0 4px rgb(var(--color-simActiveButton) / 0.7);
}

.mission-hud__button:focus-visible {
  outline: 1px solid rgb(var(--color-panelActive));
  outline-offset: 1px;
}

@media (max-width: 1120px) {
  .mission-hud__mission {
    display: none;
  }

  .mission-hud {
    gap: 0.3rem;
  }

  .mission-hud__actions {
    gap: 0.16rem;
  }

  .mission-hud__button {
    padding: 0 0.26rem;
    font-size: 0.46rem;
  }
}

@media (max-width: 860px) {
  .mission-hud__tag,
  .mission-hud__look,
  .mission-hud__console-copy {
    display: none;
  }

  .mission-hud__console {
    flex: 1;
    padding-left: 0.3rem;
  }

  .mission-hud__button--classroom {
    padding: 0 0.25rem;
  }
}
</style>
