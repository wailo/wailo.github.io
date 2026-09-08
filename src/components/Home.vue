<script setup lang="ts">
import { ref, watch } from 'vue'

const savedTheme = localStorage.getItem('theme')
const featureGroups = [
  {
    title: 'Simulation',
    items: [
      'C++ engine / WebAssembly',
      'C172 and Boeing 747 flight models',
      'Aircraft and environment parameters',
      'Autopilot controls',
      'Pause and simulation speed',
    ],
  },
  {
    title: 'Cockpit & instruments',
    items: [
      'Primary flight display',
      'Six-pack instruments',
      'Map view',
      'Keyboard flight controls',
      'On-screen joystick',
    ],
  },
  {
    title: 'Analysis',
    items: [
      'Live flight data',
      'Time-series plots',
      'Aerodynamic visualizations',
      'Aircraft-specific control panels',
    ],
  },
  {
    title: 'Lessons & scripts',
    items: [
      'Structured learning modules',
      'TypeScript script editor',
      'Scenario configuration',
      'Practice and assessment questions',
      'Scripted checkpoints and progress',
    ],
  },
  {
    title: 'Classroom',
    items: [
      'Instructor and student sessions',
      'Lesson assignment and controls',
      'Peer roster and student details',
      'Progress history and test results',
      'Messages and raised hands',
      'Shared whiteboard',
    ],
  },
]
const isDark = ref(
  savedTheme === 'dark' ||
    (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches),
)
watch(
  isDark,
  (dark) => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    window.dispatchEvent(new Event('theme-change'))
  },
  { immediate: true },
)
</script>

<template>
  <div class="home-page" :class="{ 'home-dark': isDark }">
    <div class="page-frame">
      <header class="masthead">
        <span class="wordmark"><span aria-hidden="true">✳</span> FLIGHT SIMULATOR</span>
        <div class="header-tools">
          <span class="edition">AN INTERACTIVE FLIGHT LAB</span>
          <div class="theme-controls" role="group" aria-label="Color theme">
            <button type="button" :aria-pressed="!isDark" @click="isDark = false">Light</button>
            <button type="button" :aria-pressed="isDark" @click="isDark = true">Dark</button>
          </div>
        </div>
      </header>

      <main>
        <section class="hero" aria-labelledby="home-title">
          <div class="hero-copy">
            <p class="eyebrow">BROWSER-BASED FLIGHT SIMULATION</p>
            <h1 id="home-title">
              Flight simulation.<br /><span>An environment for <em>learning.</em></span>
            </h1>
            <p class="introduction">
              A C++ flight simulation engine running in your browser through WebAssembly. Explore
              aircraft behavior, follow structured lessons, write simulation scripts, and work with
              an instructor in a shared classroom.
            </p>
            <router-link to="/sim" class="launch-link" aria-describedby="educational-use-notice">
              Launch simulator <span aria-hidden="true">↗</span>
            </router-link>
            <p class="launch-note">No installation required. Explore without an account.</p>
            <p id="educational-use-notice" class="educational-use-notice">
              For educational simulation only. Not for aircraft operation, navigation, or
              operational decision-making. Not a substitute for approved flight training.
            </p>
          </div>

          <figure class="flight-plate">
            <div class="plate-header">
              <span>FLIGHT DYNAMICS / AIRCRAFT CONTROLS</span>
            </div>
            <svg
              viewBox="0 0 520 430"
              role="img"
              aria-labelledby="aircraft-title aircraft-description"
            >
              <title id="aircraft-title">Aircraft study</title>
              <desc id="aircraft-description">
                A technical plan view of a light aircraft, with its wings, elevator, and rudder
                labeled.
              </desc>
              <defs>
                <pattern id="home-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width=".5"
                    opacity=".15"
                  />
                </pattern>
                <pattern
                  id="home-hatching"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(35)"
                >
                  <path d="M 0 0 V 6" stroke="currentColor" stroke-width="1" opacity=".16" />
                </pattern>
              </defs>
              <rect x="20" y="20" width="480" height="384" fill="url(#home-grid)" />
              <g fill="none" stroke="currentColor">
                <circle
                  cx="260"
                  cy="216"
                  r="169"
                  stroke-width=".6"
                  stroke-dasharray="3 7"
                  opacity=".5"
                />
                <path
                  d="M260 28V399 M40 216H480"
                  stroke-width=".7"
                  stroke-dasharray="7 5"
                  opacity=".4"
                />
                <g stroke-width="1.7" stroke-linejoin="round">
                  <path
                    d="M244 164 65 183 58 230 245 218 M276 164 455 183 462 230 275 218"
                    fill="url(#home-hatching)"
                  />
                  <path
                    d="M249 316 181 335 179 354 253 345 M271 316 339 335 341 354 267 345"
                    fill="url(#home-hatching)"
                  />
                  <path
                    d="M260 65C241 72 240 131 241 183L250 300 256 358H264L270 300 279 183C280 131 279 72 260 65Z"
                    fill="var(--paper)"
                  />
                  <path
                    d="M249 132Q260 124 271 132L274 162H246Z M246 169H274L271 197H249Z"
                    fill="url(#home-hatching)"
                  />
                  <path
                    d="M260 292V358 M251 311H269 M63 212 242 202 M278 202 458 212 M190 342 251 334 M269 334 330 342"
                  />
                  <path d="M222 90H298 M260 77V98" stroke-width="2.5" />
                  <path d="M183 225V240 M337 225V240" stroke-width="5" />
                </g>
                <path
                  d="M393 198 427 128H477 M260 314 171 384H86 M263 347 349 384H434"
                  stroke-width=".8"
                />
                <path
                  d="M81 259V280H439V259 M81 273 89 280 81 287 M439 273 431 280 439 287"
                  stroke-width=".7"
                />
              </g>
              <g
                fill="currentColor"
                font-family="ui-monospace, monospace"
                font-size="10"
                letter-spacing="1"
              >
                <text x="431" y="120">WING</text>
                <text x="161" y="377" text-anchor="end">RUDDER</text>
                <text x="359" y="377">ELEVATOR</text>
                <text x="260" y="52" text-anchor="middle">NOSE</text>
              </g>
              <rect x="202" y="269" width="116" height="21" fill="var(--paper)" />
              <text
                x="260"
                y="283"
                text-anchor="middle"
                fill="currentColor"
                font-family="ui-monospace, monospace"
                font-size="9"
                letter-spacing="2"
              >
                WINGSPAN
              </text>
            </svg>
            <figcaption>
              <span>LIGHT AIRCRAFT / PLAN VIEW</span><span>SCHEMATIC · NOT TO SCALE</span>
            </figcaption>
          </figure>
        </section>

        <section class="feature-index" aria-labelledby="features-title">
          <div class="index-heading">
            <span class="eyebrow">CAPABILITIES</span>
            <h2 id="features-title">Inside the simulator</h2>
          </div>
          <div class="index-groups">
            <section v-for="(group, index) in featureGroups" :key="group.title" class="index-group">
              <h3>
                <span class="index-number">{{ String(index + 1).padStart(2, '0') }}</span>
                <span>{{ group.title }}</span>
                <span class="index-leader" aria-hidden="true"></span>
                <span class="index-count" :aria-label="group.items.length + ' features'">{{
                  group.items.length
                }}</span>
              </h3>
              <ul>
                <li v-for="item in group.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>
        </section>
      </main>

      <footer class="footer">
        <span class="footer-label">SIMULATION · EDUCATION · EXPERIMENTATION</span>
        <details>
          <summary>Educational use only <span aria-hidden="true">+</span></summary>
          <div class="disclaimer">
            <p>
              This application, including its lessons and classroom features, is intended for
              learning aviation concepts and conducting simulated experiments. Its models and
              outputs may differ from real aircraft behavior and flight conditions. Do not use them
              for aircraft operation, navigation, or operational decision-making.
            </p>
            <p>
              Lessons and assessments do not constitute approved flight training or establish
              qualification to operate an aircraft. The application is not a substitute for approved
              instruction or official aircraft documentation.
            </p>
            <p>
              Nothing in this notice excludes or limits liability that cannot lawfully be excluded
              or limited, or affects your statutory rights.
            </p>
          </div>
        </details>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  --paper: rgb(var(--color-simBackground));
  --ink: rgb(var(--color-secondary));
  --blue: rgb(var(--color-secondary));
  --rule: rgb(var(--color-simElementBorder));
  --muted: rgb(var(--color-secondary) / 0.7);
  --button-bg: rgb(var(--color-panelActive));
  --button-hover: rgb(var(--color-panelActive) / 0.85);
  color-scheme: light;
  height: 100dvh;
  overflow-y: auto;
  background: var(--paper);
  color: var(--ink);
  padding: 0 32px;
  font-family: Arial, Helvetica, sans-serif;
}
.home-dark {
  color-scheme: dark;
}
.feature-index {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 48px;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--rule);
  padding: 36px 0;
}
.index-heading h2 {
  margin-top: 12px;
}
.index-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}
.index-group {
  min-width: 0;
}
.index-group h3 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
}
.index-number,
.index-count {
  color: var(--blue);
  font:
    10px ui-monospace,
    monospace;
}
.index-leader {
  flex: 1;
  min-width: 8px;
  border-bottom: 1px dotted var(--rule);
}
.index-group ul {
  list-style: none;
  padding: 12px 0 0 24px;
}
.index-group li {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
  padding: 4px 0;
}
@media (max-width: 900px) {
  .feature-index {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
@media (max-width: 520px) {
  .index-groups {
    grid-template-columns: 1fr;
  }
}
.header-tools {
  display: flex;
  align-items: center;
  gap: 24px;
}
.theme-controls {
  display: flex;
  border: 1px solid var(--rule);
}
.theme-controls button {
  padding: 7px 10px;
  background: transparent;
  color: var(--muted);
  font:
    10px ui-monospace,
    monospace;
  cursor: pointer;
}
.theme-controls button[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
}
.theme-controls button:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}
.page-frame {
  max-width: 1160px;
  margin: auto;
}
.masthead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  min-height: 88px;
  border-bottom: 1px solid var(--rule);
}
.wordmark,
.edition,
.eyebrow,
.launch-note,
.plate-header,
figcaption,
.section-number,
.footer-label {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 1.2px;
}
.wordmark {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
}
.wordmark > span {
  color: var(--blue);
  font-size: 28px;
}
.edition {
  color: var(--muted);
}
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
  padding: 76px 0 68px;
}
.eyebrow {
  color: var(--blue);
  margin-bottom: 25px;
}
h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(42px, 4.8vw, 68px);
  font-weight: 400;
  letter-spacing: -3px;
  line-height: 1.07;
  margin: 0;
}
h1 em {
  color: var(--blue);
  font-weight: 400;
}
h1 > span {
  display: inline-block;
  margin-top: 12px;
  font-size: 0.68em;
  letter-spacing: -1.5px;
  line-height: 1.15;
}
.introduction {
  max-width: 370px;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.75;
  margin: 26px 0;
}
.launch-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 14px 20px;
  background: var(--button-bg);
  color: white;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid var(--button-bg);
  transition: background 0.15s;
}
.launch-link:hover {
  background: var(--button-hover);
  color: white;
}
.launch-link:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 5px;
}
.launch-link > span {
  font-size: 22px;
  line-height: 1;
}
.launch-note {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.7px;
  margin-top: 14px;
}
.educational-use-notice {
  max-width: 410px;
  margin-top: 18px;
  padding-left: 12px;
  border-left: 2px solid var(--rule);
  color: var(--ink);
  font-size: 12px;
  line-height: 1.65;
}
.flight-plate {
  color: var(--blue);
  min-width: 0;
}
.plate-header {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--blue);
  padding-top: 12px;
}
.flight-plate svg {
  width: 100%;
  height: auto;
  display: block;
}
figcaption {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--rule);
  padding-top: 12px;
  font-size: 8px;
  letter-spacing: 0.6px;
}
.contents {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--rule);
  padding: 30px 0 36px;
}
.contents article {
  padding: 0 28px;
  border-left: 1px solid var(--rule);
}
.contents article:first-child {
  padding-left: 0;
  border-left: 0;
}
.contents article:last-child {
  padding-right: 0;
}
.section-number {
  color: var(--blue);
}
h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.6px;
  margin: 16px 0 10px;
}
.contents p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
  max-width: 300px;
}
.footer {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 0 36px;
  color: var(--muted);
}
.footer-label {
  font-size: 9px;
}
.footer details {
  max-width: 560px;
  font-size: 11px;
}
summary {
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  gap: 18px;
}
.disclaimer {
  line-height: 1.7;
  padding-top: 16px;
}
.disclaimer p + p {
  margin-top: 10px;
}
@media (max-width: 760px) {
  .home-page {
    padding: 0 22px;
  }
  .masthead {
    min-height: 72px;
    flex-wrap: wrap;
    padding: 16px 0;
    gap: 12px;
  }
  .edition {
    display: none;
  }
  .hero {
    grid-template-columns: 1fr;
    gap: 44px;
    padding: 48px 0;
  }
  h1 {
    font-size: clamp(42px, 9vw, 64px);
    letter-spacing: -2px;
  }
  .flight-plate {
    width: 100%;
    max-width: 480px;
    justify-self: center;
  }
  .contents {
    grid-template-columns: 1fr;
    padding: 0;
  }
  .contents article,
  .contents article:first-child,
  .contents article:last-child {
    padding: 24px 0;
    border-left: 0;
  }
  .contents article + article {
    border-top: 1px solid var(--rule);
  }
  .contents p {
    max-width: none;
  }
  .footer {
    flex-direction: column;
    gap: 16px;
  }
  summary {
    justify-content: flex-start;
  }
}
</style>
