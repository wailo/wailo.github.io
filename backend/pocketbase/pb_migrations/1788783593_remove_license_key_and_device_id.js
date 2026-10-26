/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1065113382')

    collection.indexes = collection.indexes.filter((index) => !index.includes('idx_xeL0kQA2vX'))
    collection.fields.removeByName('license_key')
    collection.fields.removeByName('device_id')

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1065113382')

    collection.fields.addAt(
      2,
      new Field({
        hidden: true,
        id: 'text808114',
        name: 'license_key',
        required: true,
        type: 'text',
      }),
    )
    collection.fields.addAt(
      4,
      new Field({
        hidden: false,
        id: 'text2493827028',
        name: 'device_id',
        required: false,
        type: 'text',
      }),
    )
    collection.indexes.push(
      'CREATE UNIQUE INDEX `idx_xeL0kQA2vX` ON `licence` (`license_key`, `device_id`)',
    )

    return app.save(collection)
  },
)
