import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { compileUserScript } from '../src/EditorScriptRuntime.ts'

const lesson = compileUserScript(
  readFileSync(
    new URL('../public/LearningModules/basic_flight_knowledge_test.ts', import.meta.url),
    'utf8',
  ),
)

test('debrief receives readable mistakes and authored explanations only after all answers', async () => {
  let answered = 0
  const metrics = []
  await lesson({
    resetPanels() {},
    setTab() {},
    metrics,
    notifyUser: async () => {},
    checkPoint() {},
    askQuestion: async (question) => {
      answered++
      assert.equal(question.mode, 'assessment')
      assert.equal(question.explanation, undefined)
      const wrong = question.id === 'basic-flight-roll-control'
      return {
        questionId: question.id,
        answer: wrong ? 'rudder' : question.correctAnswer,
        correct: !wrong,
      }
    },
    ai: {
      request: async ({ evidence }) => {
        assert.equal(answered, 6)
        assert.equal(metrics.at(-1).score, 83)
        assert.equal(evidence.incorrectResponses.length, 1)
        const mistake = evidence.incorrectResponses[0]
        assert.equal(mistake.questionNumber, 3)
        assert.equal(mistake.question, 'Which primary flight control commands roll?')
        assert.equal(mistake.selectedAnswer, 'Rudder')
        assert.equal(mistake.correctAnswer, 'Ailerons')
        assert.match(mistake.explanation, /rudder controls yaw/)
        assert.match(evidence.teachingContext.allowedHints[0], /Ailerons/)
        return { status: 'completed', message: 'Ailerons control roll; rudder controls yaw.' }
      },
    },
  })
})

test('cancelled questions do not trigger post-test explanations or a final score', async () => {
  const metrics = []
  await lesson({
    resetPanels() {},
    setTab() {},
    metrics,
    notifyUser: async () => {},
    checkPoint() {},
    askQuestion: async () => ({ cancelled: true }),
    ai: { request: async () => assert.fail('No debrief before all answers are final') },
  })
  assert.deepEqual(metrics, [])
})

for (const status of ['completed', 'unavailable', 'failed', 'timeout', 'dismissed']) {
  test(`basic flight test retains its score and completes with AI outcome ${status}`, async () => {
    const checkpoints = []
    const prompts = []
    const metrics = []
    let requests = 0
    await lesson({
      resetPanels() {},
      setTab() {},
      metrics,
      notifyUser: async (title, body) => {
        prompts.push({ title, body })
      },
      askQuestion: async (question) => ({
        questionId: question.id,
        type: 'multiple-choice',
        answer: question.correctAnswer,
        correct: true,
      }),
      checkPoint: (message) => checkpoints.push(message),
      ai: {
        request: async (request) => {
          requests++
          assert.equal(checkpoints.at(-1), 'Score: 6/6 · 100%')
          assert.equal(request.evidence.scorePercent, 100)
          assert.equal(request.evidence.teachingContext.mode, 'practice')
          assert.equal(request.evidence.teachingContext.phase, 'post-assessment')
          assert.equal(request.evidence.teachingContext.answersFinal, true)
          assert.deepEqual(request.evidence.incorrectResponses, [])
          return status === 'completed'
            ? { status, message: 'You scored 100%.' }
            : { status, reason: 'Not available' }
        },
      },
    })
    assert.equal(requests, 1)
    assert.equal(metrics.at(-1).score, 100)
    assert.equal(metrics.length, 7)
    assert.equal(
      prompts.some((p) => p.title === 'AI debrief'),
      status === 'completed',
    )
  })
}
