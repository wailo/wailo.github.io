/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const revisions = new Collection({
      name: 'lessonRevisions',
      type: 'base',
      fields: [
        { name: 'hash', type: 'text', required: true, max: 64 },
        { name: 'bundle', type: 'text', required: true, max: 1500000 },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_lesson_revision_hash ON lessonRevisions (hash)'],
      listRule: null,
      viewRule: '@request.auth.id != "" && studentRecords_via_revision.student ?= @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })
    // Back-relation rules can only be validated once studentRecords has its relations.
    revisions.viewRule = null
    app.save(revisions)
    const records = app.findCollectionByNameOrId('studentRecords')
    records.fields.getByName('end_time').required = false
    for (const field of [
      { name: 'run_id', type: 'text', max: 64 },
      { name: 'lesson_id', type: 'text', max: 500 },
      { name: 'assignment_id', type: 'text', max: 200 },
      {
        name: 'revision',
        type: 'relation',
        collectionId: revisions.id,
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: 'app_commit', type: 'text', max: 64 },
      {
        name: 'status',
        type: 'select',
        values: ['running', 'completed', 'stopped', 'error', 'interrupted'],
        maxSelect: 1,
      },
      {
        name: 'outcome',
        type: 'select',
        values: ['not-assessed', 'passed', 'failed', 'awaiting-review'],
        maxSelect: 1,
      },
      { name: 'client_started_at', type: 'date' },
      { name: 'context', type: 'json', maxSize: 64000 },
      { name: 'last_sequence', type: 'number', onlyInt: true },
      { name: 'model_version', type: 'text', max: 200 },
      { name: 'ui_version', type: 'text', max: 200 },
    ]) {
      if (!records.fields.getByName(field.name)) records.fields.add(new Field(field))
    }
    records.indexes.push(
      'CREATE UNIQUE INDEX idx_training_run ON studentRecords (student, run_id) WHERE run_id != ""',
    )
    records.indexes.push(
      'CREATE INDEX idx_training_student_date ON studentRecords (student, start_time)',
    )
    records.listRule = '@request.auth.id != "" && student = @request.auth.id'
    records.viewRule = records.listRule
    records.createRule = null
    records.updateRule = null
    records.deleteRule = null
    app.save(records)
    revisions.viewRule =
      '@request.auth.id != "" && studentRecords_via_revision.student ?= @request.auth.id'
    app.save(revisions)
    app.save(
      new Collection({
        name: 'attemptEvents',
        type: 'base',
        fields: [
          {
            name: 'attempt',
            type: 'relation',
            collectionId: records.id,
            maxSelect: 1,
            required: true,
            cascadeDelete: false,
          },
          { name: 'sequence', type: 'number', required: true, onlyInt: true, min: 1 },
          {
            name: 'kind',
            type: 'select',
            required: true,
            values: ['answer', 'checkpoint', 'finished'],
            maxSelect: 1,
          },
          { name: 'payload', type: 'json', maxSize: 1500000 },
          { name: 'hash', type: 'text', required: true, max: 64 },
          { name: 'received_at', type: 'autodate', onCreate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_attempt_sequence ON attemptEvents (attempt, sequence)'],
        listRule: '@request.auth.id != "" && attempt.student = @request.auth.id',
        viewRule: '@request.auth.id != "" && attempt.student = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    )
  },
  () => {
    throw new Error(
      'Training history is retained. Restore a tested backup to roll back this migration.',
    )
  },
)
