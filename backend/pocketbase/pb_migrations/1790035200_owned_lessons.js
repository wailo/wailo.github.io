/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    app.save(
      new Collection({
        name: 'lessons',
        type: 'base',
        fields: [
          {
            name: 'owner',
            type: 'relation',
            collectionId: users.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'title', type: 'text', required: true, max: 200 },
          { name: 'objectives', type: 'text', max: 5000 },
          { name: 'category', type: 'text', max: 100 },
          { name: 'source', type: 'text', max: 500000 },
          { name: 'revision', type: 'number', onlyInt: true, min: 1, required: true },
          { name: 'created', type: 'autodate', onCreate: true },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_lessons_owner_updated ON lessons (owner, updated)'],
        listRule: '@request.auth.id != "" && owner = @request.auth.id',
        viewRule: '@request.auth.id != "" && owner = @request.auth.id',
        // Writes go through the owner-bound, revision-checked route below.
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    )
  },
  () => {
    throw new Error('Saved lessons are retained. Restore a backup to roll back this migration.')
  },
)
