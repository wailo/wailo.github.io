import type {
  MultipleChoiceQuestionOptions,
  QuestionResult,
  ScriptContext,
} from '../../src/ScriptContext'

export async function main(context: ScriptContext) {
  const questions: Array<
    Omit<MultipleChoiceQuestionOptions, 'type' | 'mode'> & { explanation: string }
  > = [
    {
      id: 'basic-flight-four-forces',
      title: 'The four forces',
      question: 'Which list contains the four principal forces acting on an aircraft in flight?',
      choices: [
        { id: 'lift-weight-thrust-drag', label: 'Lift, weight, thrust and drag' },
        { id: 'pitch-roll-yaw-lift', label: 'Pitch, roll, yaw and lift' },
        { id: 'speed-altitude-power-trim', label: 'Speed, altitude, power and trim' },
        { id: 'aileron-rudder-elevator-flap', label: 'Aileron, rudder, elevator and flap' },
      ],
      correctAnswer: 'lift-weight-thrust-drag',
      explanation:
        'Lift, weight, thrust and drag are forces. Pitch, roll and yaw describe aircraft rotations, not forces.',
    },
    {
      id: 'basic-flight-opposes-weight',
      title: 'Opposing weight',
      question: 'In simplified straight-and-level flight, which force acts opposite to weight?',
      choices: [
        { id: 'lift', label: 'Lift' },
        { id: 'drag', label: 'Drag' },
        { id: 'thrust', label: 'Thrust' },
        { id: 'torque', label: 'Torque' },
      ],
      correctAnswer: 'lift',
      explanation:
        'In simplified straight-and-level flight, lift acts upward against weight. Thrust acts forward against drag.',
    },
    {
      id: 'basic-flight-roll-control',
      title: 'Roll control',
      question: 'Which primary flight control commands roll?',
      choices: [
        { id: 'ailerons', label: 'Ailerons' },
        { id: 'elevator', label: 'Elevator' },
        { id: 'rudder', label: 'Rudder' },
        { id: 'throttle', label: 'Throttle' },
      ],
      correctAnswer: 'ailerons',
      explanation:
        'Ailerons primarily control roll, the elevator controls pitch, and the rudder controls yaw. The throttle controls engine power.',
    },
    {
      id: 'basic-flight-heading-change',
      title: 'Heading change',
      question: 'What is the shortest turn from heading 090° to heading 180°?',
      choices: [
        { id: 'right-90', label: '90° to the right' },
        { id: 'left-90', label: '90° to the left' },
        { id: 'right-180', label: '180° to the right' },
        { id: 'left-270', label: '270° to the left' },
      ],
      correctAnswer: 'right-90',
      explanation:
        'Headings increase clockwise: from 090° to 180° is 90° to the right. The alternative left turn is 270°, so it is longer.',
    },
    {
      id: 'basic-flight-full-turn',
      title: 'Full turn',
      question: 'How many degrees does an aircraft turn to complete one full circle?',
      choices: [
        { id: '90', label: '90°' },
        { id: '180', label: '180°' },
        { id: '270', label: '270°' },
        { id: '360', label: '360°' },
      ],
      correctAnswer: '360',
      explanation:
        'A full circle is 360°. A 90° turn is a quarter circle, 180° is a half circle, and 270° is three quarters.',
    },
    {
      id: 'basic-flight-level-turn-lift',
      title: 'Lift in a level turn',
      question: 'Why must total lift increase to maintain altitude in a banked level turn?',
      choices: [
        {
          id: 'vertical-component',
          label: 'Only the vertical component of lift supports the aircraft weight',
        },
        { id: 'weight-disappears', label: 'Aircraft weight disappears during the turn' },
        { id: 'drag-becomes-lift', label: 'Drag becomes the vertical supporting force' },
        { id: 'thrust-stops', label: 'Thrust stops acting when the wings are banked' },
      ],
      correctAnswer: 'vertical-component',
      explanation:
        'Banking tilts the lift vector. Only its vertical component supports weight, so total lift must increase to maintain altitude; its horizontal component turns the aircraft.',
    },
  ]

  context.resetPanels()
  context.setTab('prompt', 'Prompt')

  await context.notifyUser(
    'Basic flight knowledge test',
    `This test contains **${questions.length} questions**. Each answer is final and the test advances immediately. Your score will be reported after the last question.`,
  )

  let correctAnswers = 0
  const responses: QuestionResult[] = []

  for (const question of questions) {
    // Keep the teaching explanation out of the question UI until submission is final.
    const { explanation, ...assessmentQuestion } = question
    const result = await context.askQuestion({
      ...assessmentQuestion,
      type: 'multiple-choice',
      mode: 'assessment',
    })
    if (result.cancelled) return
    responses.push(result)
    if (result.correct) correctAnswers += 1
    context.metrics.push({
      kind: 'multiple-choice',
      questionId: result.questionId,
      answer: result.answer,
      correct: result.correct === true,
    })
    const selectedAnswerNumber =
      question.choices.findIndex((choice) => choice.id === result.answer) + 1
    context.checkPoint(
      `Test progress. Answer ${selectedAnswerNumber} selected ${responses.length}/${questions.length}`,
    )
  }

  const score = Math.round((correctAnswers / questions.length) * 100)
  context.metrics.push({
    kind: 'assessment-summary',
    correct: correctAnswers,
    total: questions.length,
    score,
  })

  context.checkPoint(`Score: ${correctAnswers}/${questions.length} · ${score}%`)
  await context.notifyUser(
    'Test complete',
    `You answered **${correctAnswers} of ${questions.length}** questions correctly.

Final score: **${score}%**`,
  )

  const incorrectResponses = questions.flatMap((question, index) => {
    const response = responses[index]
    if (response.correct) return []
    return [
      {
        questionNumber: index + 1,
        question: question.question,
        selectedAnswer:
          question.choices.find((choice) => choice.id === response.answer)?.label ??
          'No recognised answer',
        correctAnswer: question.choices.find((choice) => choice.id === question.correctAnswer)!
          .label,
        explanation: question.explanation,
      },
    ]
  })

  const debrief = await context.ai.request({
    purpose: 'debrief',
    evidence: {
      teachingContext: {
        // Questions remain assessment-mode; only the completed-test review is learning mode.
        mode: 'practice',
        phase: 'post-assessment',
        answersFinal: true,
        objectives: incorrectResponses.length
          ? [
              'Explain the incorrect responses using the supplied correct answers and explanations; identify the question number and contrast the selected answer with the correct concept.',
            ]
          : ['Acknowledge the correct responses without inventing weaknesses.'],
        assessmentLimitations: ['Six multiple-choice questions; does not assess piloting skill'],
        allowedHints: incorrectResponses.map(
          (item) => `Question ${item.questionNumber}: ${item.correctAnswer}. ${item.explanation}`,
        ),
      },
      correctAnswers,
      totalQuestions: questions.length,
      scorePercent: score,
      incorrectResponses,
    },
  })
  if (debrief.status === 'completed') {
    await context.notifyUser('AI debrief', debrief.message)
  }
}
