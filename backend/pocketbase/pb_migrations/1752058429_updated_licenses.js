/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1065113382")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_xeL0kQA2vX` ON `licence` (\n  `license_key`,\n  `device_id`\n)"
    ],
    "name": "licence"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1065113382")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_xeL0kQA2vX` ON `licenses` (\n  `license_key`,\n  `device_id`\n)"
    ],
    "name": "licenses"
  }, collection)

  return app.save(collection)
})
