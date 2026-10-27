import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/components/Sim.vue', import.meta.url), 'utf8')

// A lesson run lives in the editor component. Switching layout used to unmount the
// instructor panel's editor (or the pilot drawer's), and unmounting cancels the run:
// the demo froze at the take-off while the aircraft kept flying. The surface is now
// mounted once and teleported between layouts, which keeps the instance alive.
test('the lesson surface is mounted once and teleported between layouts', () => {
  const surfaces = source.match(/<LearningModulesSurface/g) ?? []
  assert.equal(
    surfaces.length,
    1,
    'one lesson surface: a second copy would be destroyed by the next layout change',
  )

  const teleport = source.indexOf('<Teleport :to="lessonHost"')
  assert.ok(teleport >= 0, 'the surface must be teleported to the active layout host')
  assert.ok(
    source.indexOf('<LearningModulesSurface') > teleport,
    'the surface must be inside the teleport, not rendered per layout',
  )
})

test('each layout provides a host for the surface instead of its own editor', () => {
  assert.match(
    source,
    /<template #learningmodules>[\s\S]*?ref="instructorLessonHost"[\s\S]*?<\/template>/,
    'the instructor panel must expose a host element for the teleported surface',
  )
  assert.match(
    source,
    /v-if="sim_module_loaded"[\s\S]{0,200}v-show="lessonsOpen && isPilotMode"/,
    'the pilot drawer must stay mounted and hide itself, so the surface survives',
  )
})
