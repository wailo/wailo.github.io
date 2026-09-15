# Training history foundation

This records client-reported training evidence. It is not an EASA approval, identity verification,
instructor sign-off, or deterministic simulator replay system. `completed` does not mean `passed`.

## Execution

1. Capture the original editor source once, before asynchronous compiler loading.
2. Compile without evaluating any lesson code. Preserve original source, transformed source,
   generated JavaScript, and the exact TypeScript version/options.
3. For signed-in users, POST the lesson archive, full app Git SHA, model version, and attempt identity to
   `/api/training/attempts`. The server archives strings with server-calculated SHA-256 hashes
   and creates the attempt in one transaction. Execution waits for acknowledgement or bounded
   retry failure; on failure it warns and continues as unrecorded practice.
4. Execute that captured JavaScript. Guest practice skips persistence entirely.
5. Append answers/checkpoints as they occur. Append the final run snapshot on completion,
   stop, error, or replacement. Final snapshots include script metrics and client timestamps;
   server start/end/receipt timestamps are stored separately.

`lessonId` identifies the lesson, `assignmentId` the classroom assignment, and `runId` one attempt.
Retries reuse the same run ID and event sequence; conflicting duplicates are rejected.
No simulator-tick writes or per-peer polling are introduced.

## PocketBase

The new migration extends `studentRecords` without deleting historical rows:

Historical rows without an archive remain legacy records; their missing source/version/evidence
cannot be reconstructed or retroactively treated as verified by this migration.

- `lessonRevisions`: immutable exact archive strings and hashes; deduplicated by hash.
- `studentRecords`: student-owned attempt, lesson revision relation, `app_commit`, `model_version`, server dates, lifecycle,
  context, and `not-assessed` outcome.
- `attemptEvents`: append-only evidence, per-attempt sequence, content hash, server receipt date.

Writes use authenticated custom routes in `pb_hooks/training.pb.js`. The server selects ownership
from authentication; browser-supplied owner/outcome fields are ignored. Script-reported scores
and thresholds may produce an explicitly unverified passed/failed outcome as described below.
Normal collection writes are locked. Students can read only their own attempts/evidence and
referenced lesson revisions. Instructor access is deliberately not granted globally: scoped
organisation/student access and sign-offs remain future work. PocketBase superusers still have
administrative access; this is not administrator-proof/WORM storage.

The prior completion-only `submitSession` call is no longer used. Deploy the backend migration/hooks
with the frontend to enable recording. If the backend is unavailable or rejects the initial save,
signed-in lessons still run as unrecorded practice with a warning. Guest practice remains usable.

### Deployment

The existing Compose mounts already include `pb_hooks` and `pb_migrations`.
Back up the database **and files**, test restoration, and arrange downtime before migrating.
Run PocketBase's `migrate up` against the intended deployment, then restart it with the new hooks.
This work does not apply the migration to the local/live database automatically.
Rollback is intentionally blocked to avoid silently dropping training history; restore a verified
backup as a coordinated backend/frontend rollback instead.

### Software reconstruction contract

The full app Git SHA identifies committed source, dependencies and build configuration.
`FlightSimModule.FLIGHTMODEL_VERSION` identifies an immutable, retrievable set of WASM,
loader and data files. Retain all referenced Git commits and simulator releases and never reuse
a model version for different artifacts. Uncommitted application changes are outside this contract.
Vite embeds the full SHA; a CI-provided `VITE_GIT_SHA` must also be a full SHA. No runtime manifest,
random build ID, binary hashing step, or `runtimeReleases` collection is required.

The app SHA is stored in `app_commit` and mirrored to legacy `ui_version`; the model identifier
is stored in `model_version`. Exact lesson sources and compiler metadata remain in `lessonRevisions`
because scripts can be edited independently of Git. These identifiers support reconstruction,
not proof of an untrusted browser's execution or deterministic reproduction of a flight.

## Failure boundaries

- Requests have a 3-second timeout and retry transient failures twice, preserving order and identity.
  Initial save failure produces a visible warning and allows unrecorded practice (up to approximately
  10.5 seconds with all timeouts/backoffs). No later evidence is sent for that unrecorded run.
  A backend outage during execution does not stop the lesson; failed saving warns and never creates
  a verified completion. A lost start acknowledgement can leave a server-side unresolved attempt.
- No browser-persistent outbox yet. Closing/crashing a tab can lose unsent evidence; an already
  created attempt remains `running`/unresolved. Do not interpret that as completion. Reconciliation
  to `interrupted`, offline recovery, and server-side assessment are subsequent increments.
- A stop during compiler loading, or compilation/start-endpoint failure before an attempt exists,
  has no durable attempt record because no executable training started.
- The terminal snapshot captures displayed question/answer evidence, checkpoints and metrics,
  not every simulator frame. Initial context captures selected flight state, not a full simulator
  restore point. External assets, timing, user controls, randomness, and AI nondeterminism mean
  bit-for-bit replay is not promised.
- The archive payload is bounded (2 MB request). Large scripts or evidence fail explicitly;
  high-rate telemetry needs a separate, bounded storage design.

## Account lesson progress

Catalogue entries have immutable `id` values, separate from display names and paths. Keep these IDs
when moving or renaming lessons. Explicit `legacyId` aliases recognize earlier path-based records;
do not infer identity from titles. Unknown/custom lesson IDs remain in history but do not award
completion to a catalogue lesson.

`GET /api/training/progress` requires a signed-in `users` account and aggregates only that account's
saved attempts. It returns completion counts, last completion time, and latest attempt status/outcome
per lesson. No separate completion table or migration is needed beyond the training-history schema.
Deploy the updated hooks along with the frontend.

The lesson list shows saved completion ticks and a catalogue completion count. A later stopped or
failed attempt does not erase an earlier completion. Completion does not imply a pass, currency,
or regulatory sign-off. Local running state is shown separately as “In progress.” Guest or unsaved
practice never awards a saved tick. Loading failures show “Progress unavailable,” not zero completed.

Progress refreshes on authentication changes, reopening the lesson list, and acknowledgment of a
terminal event save, with a five-second fetch timeout. There is no polling or per-frame work.
Account changes clear the old summary and stale responses cannot repopulate it.

Each lesson's History control expands an account-only list of saved attempts, ten per page,
matching its stable ID and explicit legacy alias. The list reads the existing `studentRecords`
collection; no new collection or migration is needed. Each attempt discloses its recording ID,
script revision ID/hash, app commit and model version. Field projection excludes archived source,
raw metrics and event payloads. There is no script execution from the history view.

Duration is the difference between saved server start/end times. Records still marked `running`
are displayed as “Unfinished”: this is historical evidence, not live presence. Missing finish times
are not inferred. History refreshes on opening, authentication changes and terminal-save
acknowledgment, never by polling. Loading, empty, guest and unavailable states remain distinct.

## Script-reported assessments

Lessons can submit one result per run; scores and thresholds use the same units:

```ts
context.assessment.submit({
  score: correctAnswers,
  maxScore: questions.length,
  passingScore: 5,
})
```

This emits an ordinary checkpoint containing `data.assessment`, so the existing ordered recorder
and instructor progress channel are reused. No new event type, timer, or request endpoint is added.
The exact archived script preserves the threshold logic; the checkpoint preserves the submitted
values. The basic flight knowledge test uses a five-out-of-six pass mark.

Both client and server validate finite numeric values: maximum must be positive, score and pass
mark must lie between zero and maximum. The backend stores the first valid submission in the
`studentRecords.assessment` JSON field with `source: "script-reported"`; retrying the same event is
idempotent, but a second submission cannot replace it. On `COMPLETED`, the backend derives outcome
by comparing the raw score with the raw passing score, and stores rounded percentage in the existing
`score` field. It ignores client-supplied outcome/percentage fields. `STOPPED` and `ERROR` retain the
submission as evidence but remain `not-assessed`. With no submission, completion is also not-assessed.

History shows the submitted score, threshold and script-reported provenance separately from execution
status. Guest/offline results remain local; a local result does not claim a successful database save.
This is not independent assessment verification: an altered script/browser can supply different
scores or thresholds. Backend-approved criteria, instructor approval and regulatory sign-off are
outside this increment. Old attempts are not rescored.

Deploy `1789516800_script_assessment.js` after the training-history migration, following the backup
and migration procedure above, and deploy the updated hooks/frontend together. The new migration
only adds the assessment field; it does not rewrite previous results. It has been tested on the
disposable integration database, not automatically applied to a live database.

## Verification

- `npm test` and `npm run check`: frontend lifecycle, archival gating, identity, and evidence tests.
- `npm run test:training-backend`: explicitly opt-in Docker test using a disposable database and
  temporary signing keys. It never mounts existing student data or production keys. Defaults to
  the existing `flight_simulator_app-pocketbase` image; override with `PB_TEST_IMAGE` if needed.
- `npm run build`: validates the full app SHA and builds the application. Browser smoke testing remains necessary.
- `node --import tsx scripts/verify-training-history.ts --create-verification-records`: opt-in live
  API smoke check. Creates one labelled verification account and retains six synthetic attempts;
  never uses an existing student account. Defaults to localhost:8090 (`PB_VERIFY_URL` overrides it).
  Uses an explicit fixture model version, not a real flight simulation. Does not replace browser UI testing.
