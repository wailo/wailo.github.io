// Repository only. Unfinished code is valid saved content; compilation belongs to the browser.
function field(value, name, max, required) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new BadRequestError(`Invalid ${name}`)
  return value
}

function save(e) {
  if (!e.auth) throw new UnauthorizedError()
  const body = e.requestInfo().body
  const title = field(body.title, 'title', 200, true).trim()
  const objectives = field(body.objectives, 'objectives', 5000)
  const category = field(body.category, 'category', 100).trim()
  const source = field(body.source, 'source', 500000)
  const id = body.id || ''
  if (typeof id !== 'string' || (id && !/^[a-z0-9]{15}$/.test(id)))
    throw new BadRequestError('Invalid lesson ID')
  if (id && (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 1))
    throw new BadRequestError('Expected revision is required')
  let result
  e.app.runInTransaction((app) => {
    let lesson
    if (id) {
      lesson = app.findRecordsByFilter('lessons', 'id = {:id} && owner = {:owner}', '', 1, 0, {
        id,
        owner: e.auth.id,
      })[0]
      if (!lesson) throw new NotFoundError('Lesson not found')
      if (lesson.getInt('revision') !== body.expectedRevision)
        throw new ApiError(409, 'This lesson was saved elsewhere. Reload or save a copy.')
    } else {
      lesson = new Record(app.findCollectionByNameOrId('lessons'))
      lesson.set('owner', e.auth.id)
    }
    // Deliberately whitelist fields: never accept owner, permissions, or revision from the client.
    lesson.set('title', title)
    lesson.set('objectives', objectives)
    lesson.set('category', category)
    lesson.set('source', source)
    lesson.set('revision', lesson.getInt('revision') + 1)
    app.save(lesson)
    result = lesson
  })
  return e.json(200, result)
}

module.exports = { save }
