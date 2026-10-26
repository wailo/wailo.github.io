// Handlers have isolated scopes in PocketBase; load shared helpers inside each handler.
routerAdd(
  'GET',
  '/api/training/progress',
  (e) => {
    return require(`${__hooks}/training.js`).progress(e)
  },
  $apis.requireAuth('users'),
)

routerAdd(
  'POST',
  '/api/training/attempts',
  (e) => {
    return require(`${__hooks}/training.js`).start(e)
  },
  $apis.requireAuth('users'),
  $apis.bodyLimit(2000000),
)

routerAdd(
  'POST',
  '/api/training/attempts/{runId}/events',
  (e) => {
    return require(`${__hooks}/training.js`).append(e)
  },
  $apis.requireAuth('users'),
  $apis.bodyLimit(2000000),
)
