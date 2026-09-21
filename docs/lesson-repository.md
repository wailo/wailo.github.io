# Account lesson repository

The lesson library opens in **All**, combining both sources in one category-grouped list.
Use **ALL**, **CUSTOM**, or **DEMO** to filter it; search applies within the selected filter.
Subtle Custom/Demo labels distinguish sources in the combined view.

The lesson library has two sources:

- **Demo lessons** uses the existing bundled catalogue and `/LearningModules/*.ts` files. It does
  not need an account or a PocketBase connection.
- **Custom lessons** loads private lesson metadata from PocketBase for the current account. Source is
  fetched when opening or running a lesson. Titles are not identities; account lessons use
  `saved:<record ID>` for selection, queues, and training history.

All existing bundled lessons remain available. There is no automatic import or ownership assignment.
Sign in and use **Save a copy** to create an account-owned version of a bundled lesson.

## Editing and saving

The CODE pane provides title, learning objectives, category, **Save**, and **Save a copy**.
An unfinished or invalid script can be saved. Saves are explicit; closing the page or replacing
unsaved edits prompts before discarding them. Save failures preserve the draft in memory.
There is no offline autosave, sharing, publishing, or authoring version history in this version.

Editing during a save does not overwrite newer edits. A conflicting revision returns HTTP 409;
the owner can reload the saved record or save their local changes as a new copy. Signing out or
switching accounts clears account content and pending loads, and stops execution. Signing in from
guest mode preserves a local trial draft so it can be saved to the account.

## Backend contract

Migration: `pocketbase/pb_migrations/1790035200_owned_lessons.js`.
Hooks: `pocketbase/pb_hooks/lessons.pb.js` and `lessons.js`.

The `lessons` collection contains `owner`, `title`, `objectives`, `category`, `source`, `revision`,
and PocketBase `created`/`updated` timestamps. Normal list/view requests are owner-only. Ordinary
collection create/update/delete requests are locked. Administrative superuser access remains.

`POST /api/lesson-library/save` requires a `users` account:

```json
{
  "id": "existing-record-id",
  "expectedRevision": 2,
  "title": "Altitude practice",
  "objectives": "Maintain altitude",
  "category": "Flight exercises",
  "source": "export async function main(context: ScriptContext) {}"
}
```

Omit `id` and `expectedRevision` to create a lesson or save a copy. The backend derives the owner
from authentication, accepts only the content fields, and increments the revision. For updates,
ownership lookup, revision comparison, and save happen in one transaction. Source is stored exactly;
the backend never type-checks, transpiles, or executes it. The response is the saved record.

Limits: title 200 characters, category 100, objectives 5,000, source 500,000. An empty source is allowed.

## Frontend execution

Monaco continues showing live markers. Every execution path also awaits syntax and semantic checks
using a temporary, immutable source model in the same TypeScript worker. Editors and checks share
one reference-counted type-library registration, including the virtual lesson import modules.
Validation is lazy-loaded on the first edit or run; browsing the catalogue does not load Monaco.

Compiler errors and validation failures prevent execution. Stopping or replacing a run while
validation is pending prevents it from starting later. Editing during validation does not alter
the captured source being checked and executed. Type validation is not a security sandbox.

Training attempts still archive their exact source and generated JavaScript through the existing
training recorder. Saving over a lesson does not rewrite an earlier attempt or an active run.

## Applying the backend changes

Deploy the migration and both hook files with the frontend. The existing Compose service mounts
`pocketbase/pb_migrations` and `pocketbase/pb_hooks`. Following the existing database backup procedure,
apply `migrate up` to the intended PocketBase database and restart the service to load the hooks.
These changes and their tests do not migrate the application's existing database automatically.
Without this migration, demo lessons work but account saves fail with a retryable message.

The migration is additive; its down migration deliberately does not delete saved lessons.

## Verification

```sh
node --import tsx --test tests/LessonRepository.test.mjs tests/LessonEditing.test.mjs tests/LazyLessonEditor.test.mjs tests/EditorAutocomplete.test.mjs tests/LessonProgress.test.mjs
npm run build
node tests/integration/lesson-repository.mjs
```

The integration test requires Docker and the existing `flight_simulator_app-pocketbase` image
(override with `PB_TEST_IMAGE`). It creates a disposable container, database, accounts, and signing
key. It never mounts real application data or keys. It verifies the actual migration, owner-only
reads/writes, blocked direct writes, unfinished drafts, copying, and concurrent-save conflicts.
