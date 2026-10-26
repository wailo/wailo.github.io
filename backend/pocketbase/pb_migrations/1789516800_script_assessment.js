/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const records = app.findCollectionByNameOrId('studentRecords')
    records.fields.add(new JSONField({ name: 'assessment', maxSize: 2000 }))
    app.save(records)
  },
  () => {
    throw new Error('Assessment evidence is retained. Restore a tested backup to roll back.')
  },
)
