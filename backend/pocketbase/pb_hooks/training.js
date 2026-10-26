// Browser reports are evidence, never instructor approval or an independently verified pass.
function assessmentSubmission(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestError('Invalid assessment submission')
  const { score, maxScore, passingScore } = value
  if (
    ![score, maxScore, passingScore].every(Number.isFinite) ||
    maxScore <= 0 ||
    score < 0 ||
    score > maxScore ||
    passingScore < 0 ||
    passingScore > maxScore
  )
    throw new BadRequestError('Invalid assessment score or threshold')
  return { score, maxScore, passingScore, source: 'script-reported' }
}
function text(value, max, optional) {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.length)) {
    throw new BadRequestError('Invalid training text field')
  }
  return value
}
function first(app, collection, filter, params) {
  return app.findRecordsByFilter(collection, filter, '', 1, 0, params)[0]
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonical(value[key]))
        .join(',') +
      '}'
    )
  }
  return JSON.stringify(value)
}
function archive(app, collection, field, content) {
  const hash = $security.sha256(content)
  let record = first(app, collection, 'hash = {:hash}', { hash })
  if (!record) {
    record = new Record(app.findCollectionByNameOrId(collection))
    record.set('hash', hash)
    record.set(field, content)
    app.save(record)
  }
  return record
}
function start(e) {
  const body = e.requestInfo().body
  const runId = text(body.runId, 64)
  const lessonId = text(body.lessonId, 500)
  const title = text(body.title, 500)
  const assignmentId = text(body.assignmentId || '', 200, true)
  const bundle = text(body.artifact, 1500000)
  const appCommit = text(body.appCommit, 64)
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(appCommit))
    throw new BadRequestError('A full app Git commit is required')
  const modelVersion = text(body.modelVersion, 200)
  let artifact
  try {
    artifact = JSON.parse(bundle)
  } catch {
    throw new BadRequestError('Invalid archive JSON')
  }
  if (
    artifact.schemaVersion !== 1 ||
    artifact.compiler?.name !== 'typescript' ||
    artifact.compiler?.target !== 'ES2020' ||
    artifact.compiler?.module !== 'None'
  )
    throw new BadRequestError('Unsupported archive format')
  text(artifact.originalSource, 500000, true)
  text(artifact.preparedSource, 500000, true)
  text(artifact.javascript, 1000000, true)
  text(artifact.compiler.version, 100)
  const context = body.context || {}
  if (JSON.stringify(context).length > 64000) throw new BadRequestError('Context too large')
  if (!Number.isFinite(Date.parse(body.clientStartedAt)))
    throw new BadRequestError('Invalid start time')
  let id
  e.app.runInTransaction((app) => {
    const existing = first(app, 'studentRecords', 'student = {:student} && run_id = {:run}', {
      student: e.auth.id,
      run: runId,
    })
    const revision = archive(app, 'lessonRevisions', 'bundle', bundle)
    if (existing) {
      if (
        existing.getString('revision') !== revision.id ||
        existing.getString('app_commit') !== appCommit ||
        existing.getString('model_version') !== modelVersion ||
        existing.getString('lesson_id') !== lessonId ||
        existing.getString('assignment_id') !== assignmentId ||
        existing.getString('scenario') !== title
      )
        throw new BadRequestError('Run ID already used for different content')
      id = existing.id
      return
    }
    const record = new Record(app.findCollectionByNameOrId('studentRecords'))
    record.set('student', e.auth.id)
    record.set('run_id', runId)
    record.set('lesson_id', lessonId)
    record.set('assignment_id', assignmentId)
    record.set('scenario', title)
    record.set('revision', revision.id)
    record.set('start_time', new Date().toISOString())
    record.set('client_started_at', body.clientStartedAt)
    record.set('context', context)
    record.set('app_commit', appCommit)
    record.set('ui_version', appCommit) // Preserve the existing version field for older consumers.
    record.set('model_version', modelVersion)
    record.set('status', 'running')
    record.set('outcome', 'not-assessed')
    app.save(record)
    id = record.id
  })
  return e.json(200, { id })
}
function append(e) {
  const body = e.requestInfo().body
  const sequence = body.sequence
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !['answer', 'checkpoint', 'finished'].includes(body.kind)
  ) {
    throw new BadRequestError('Invalid training event')
  }
  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload))
    throw new BadRequestError('Invalid evidence')
  const payload = JSON.stringify(body.payload)
  if (payload.length > 1500000) throw new BadRequestError('Evidence too large')
  // Go map iteration order is not stable across requests. Retried JSON must hash identically.
  const hash = $security.sha256(canonical([body.kind, body.payload]))
  e.app.runInTransaction((app) => {
    const attempt = first(app, 'studentRecords', 'student = {:student} && run_id = {:run}', {
      student: e.auth.id,
      run: e.request.pathValue('runId'),
    })
    if (!attempt) throw new NotFoundError('Training attempt not found')
    const existing = first(app, 'attemptEvents', 'attempt = {:id} && sequence = {:sequence}', {
      id: attempt.id,
      sequence,
    })
    if (existing) {
      if (existing.getString('hash') !== hash)
        throw new BadRequestError('Conflicting training event')
      return
    }
    if (
      attempt.getString('status') !== 'running' ||
      sequence !== attempt.getInt('last_sequence') + 1
    ) {
      throw new BadRequestError('Invalid training event order or finalized attempt')
    }
    if (body.kind === 'finished') {
      const status = { COMPLETED: 'completed', STOPPED: 'stopped', ERROR: 'error' }[
        body.payload.status
      ]
      if (!status) throw new BadRequestError('Invalid terminal status')
      attempt.set('status', status)
      attempt.set('end_time', new Date().toISOString())
      // Metrics remain script-owned evidence. Completion is NOT a verified pass.
      attempt.set('raw_metrics', body.payload.metrics || [])
      const submitted = JSON.parse(attempt.getString('assessment') || 'null')
      if (status === 'completed' && submitted) {
        const assessment = assessmentSubmission(submitted)
        attempt.set('score', Math.round((assessment.score / assessment.maxScore) * 100))
        attempt.set('outcome', assessment.score >= assessment.passingScore ? 'passed' : 'failed')
      }
    }
    if (
      body.kind === 'checkpoint' &&
      body.payload.data &&
      Object.prototype.hasOwnProperty.call(body.payload.data, 'assessment')
    ) {
      const assessment = assessmentSubmission(body.payload.data.assessment)
      if (JSON.parse(attempt.getString('assessment') || 'null'))
        throw new BadRequestError('Assessment already submitted for this run')
      attempt.set('assessment', assessment)
    }
    const event = new Record(app.findCollectionByNameOrId('attemptEvents'))
    event.set('attempt', attempt.id)
    event.set('sequence', sequence)
    event.set('kind', body.kind)
    event.set('payload', body.payload)
    event.set('hash', hash)
    app.save(event)
    attempt.set('last_sequence', sequence)
    app.save(attempt)
  })
  return e.json(200, { sequence })
}
function progress(e) {
  const rows = arrayOf(
    new DynamicModel({
      lessonId: '',
      completedAttempts: 0,
      lastCompletedAt: '',
      latestAttemptAt: '',
      latestStatus: '',
      latestOutcome: '',
    }),
  )
  e.app
    .db()
    .newQuery(
      `
    WITH attempts AS (
      SELECT lesson_id, status, outcome, start_time, end_time,
        ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY start_time DESC, id DESC) AS position
      FROM studentRecords WHERE student = {:student} AND lesson_id != ''
    )
    SELECT lesson_id AS lessonId,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedAttempts,
      MAX(CASE WHEN status = 'completed' THEN end_time ELSE '' END) AS lastCompletedAt,
      MAX(start_time) AS latestAttemptAt,
      MAX(CASE WHEN position = 1 THEN status ELSE '' END) AS latestStatus,
      MAX(CASE WHEN position = 1 THEN outcome ELSE '' END) AS latestOutcome
    FROM attempts GROUP BY lesson_id ORDER BY lesson_id
  `,
    )
    .bind({ student: e.auth.id })
    .all(rows)
  e.response.header().set('Cache-Control', 'no-store')
  return e.json(200, { lessons: rows })
}
module.exports = { start, append, progress }
