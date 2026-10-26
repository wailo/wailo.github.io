routerAdd(
  'POST',
  '/api/lesson-library/save',
  (e) => {
    return require(`${__hooks}/lessons.js`).save(e)
  },
  $apis.requireAuth('users'),
  $apis.bodyLimit(2100000),
)
