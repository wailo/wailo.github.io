/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let usersCollection = app.findCollectionByNameOrId("users")
  // add up queries...
   const studentRecords = new Collection({
    name: "studentRecords",
    type: "base",
    fields: [
      { name: "scenario", type: "text", required: true },
      { name: "start_time", type: "date", required: true },
      { name: "end_time", type: "date", required: true },
      { name: "raw_metrics", type: "json", required: false },
      { name: "score", type: "number", required: false },
      {
        name: "student",
        type: "relation",
       collectionId: usersCollection.id, maxSelect: 1,
      }
    ],
    listRule: '(@request.auth.role = "student") || (@request.auth.role = "instructor")',
    createRule: '(@request.auth.role = "student") || (@request.auth.role = "instructor")',
    updateRule: '@request.auth.role = "instructor"',
    deleteRule: '@request.auth.role = "instructor"',
  })

  app.save(studentRecords)
  // app.createCollection(studentRecords)
}, (app) => {
  // add down queries...
    let collection = app.findCollectionByNameOrId("studentRecords")
  if (!collection) {
    console.error("Collection 'studentRecords' not found.");
    return;
  }
    app.delete(collection)
})
