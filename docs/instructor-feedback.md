# Instructor feedback providers

In `src/feedbackProviderConfig.ts`, select `feedbackProviderOptions.ollama` or
`feedbackProviderOptions.openai`. This affects classroom feedback only; the existing
lesson-code generator has separate configuration.

## Local Ollama

Defaults: `http://127.0.0.1:11434/api/chat`, model `flightsimModel:latest`.
Set `model` to a model actually installed on your server. The API uses non-streaming
chat with a JSON schema in `format`.

If browser requests are blocked by CORS, allow your simulator's specific origin when
starting Ollama, for example:

```sh
OLLAMA_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 ollama serve
```

Restart an already-running Ollama server with the setting applied. Browser local-network
permissions or HTTPS mixed-content rules may also require configuration or a same-origin
proxy. Do not disable browser security or expose an unrestricted Ollama port publicly.

## OpenAI

Set `provider` selection to `feedbackProviderOptions.openai`, configure its `model`,
and set `endpoint` to an existing authenticated proxy for the OpenAI Responses API.
There is deliberately no invented default route: no proxy is implemented by this change.

The proxy should authenticate and authorize the instructor, apply limits, supply the
OpenAI API key server-side, forward the Responses request, and return its JSON response.
The adapter uses `text.format` with a strict JSON schema and `store: false`.
Same-origin cookies are supported; the optional `headers` callback can supply your
application's session credential to a trusted proxy.

Never put an OpenAI key in this source file, a `VITE_*` variable, browser storage, or
the `headers` callback. Those are browser-visible, not secret configuration.

## Script-triggered debriefs

The instructor's browser owns the request queue and provider connection. Students need
no provider credentials. The instructor must remain connected; this is not a persistent
server-side service or an ATC conversation controller.

Use **Script AI** in Classroom:

- **Off** (default): script requests return `unavailable` without inference.
- **Review before sending**: requests run in the background and show **AI review** on
  the student's row. Open Details, inspect the text/evidence, then Send or Dismiss.
- **Auto-send**: validated debriefs return directly to the requesting lesson.

Policy changes apply to new requests, not already queued work. Cancel existing jobs
from Details. Automatic delivery is opt-in; schema and evidence-reference validation
do not establish factual accuracy. Keep objective scoring in the script.

```ts
const response = await context.ai.request({
  purpose: 'debrief',
  evidence: { scorePercent: 80, maxAltitudeDeviationFt: 120 },
  timeoutMs: 300_000,
})
if (response.status === 'completed') {
  await context.notifyUser('AI debrief', response.message)
}
```

The script chooses when to request and display feedback. No automatic simulator controls
or scoring are granted. `purpose` currently supports only `debrief`. Other outcomes are
`unavailable`, `timeout`, `cancelled`, `failed`, and `dismissed`, with a `reason`.
Handle these without preventing the student from completing the lesson.

Two provider calls run concurrently; each student may have one outstanding request.
Requests are correlated by actual peer connection, assignment, script run and request ID.
Duplicate requests do not regenerate. Queueing and review count toward the request timeout
(five minutes by default, capped at ten minutes). For twenty students on a slow local
model, some requests can time out; concurrency is configurable in `createAICoordinator`.
Requests are independent of Mirror mode and the currently open Details panel.
Stopping/replacing the script cancels its pending requests. Await requests before the
lesson finishes: fire-and-forget work is cancelled at completion. Unsupported older
instructor clients will time out. Guests without an assignment get `unavailable`.

The basic flight knowledge test now requests a debrief after reporting its unchanged
deterministic score. Responses are logged in the lesson run and instructor checkpoint
history; classroom exports also include AI job history. History is browser-local, not
a new database record or reconnect/replay service.

## Manual workflow and checks

1. Connect instructor and student with current clients; assign a lesson.
2. Wait for checkpoints (the coordinated-turn challenge includes structured evidence).
3. Open the student's Details and click **Suggest feedback**.
4. Review the proposed text and expandable evidence; **Send** is a separate action.
5. Check Cancel, unavailable server/model, and assignment replacement while requesting.

The manual button always requires review, even with Auto-send selected. It uses the same
queue as scripts. No generated code or simulator command is executed. Evidence references
must match the supplied snapshot; responses are delivered only to the current assignment.
Missing evidence produces no suggestion. The request uses the latest 12 checkpoints
plus available teaching context, with a 32,000-character input limit. Explicit peer IDs,
account credentials, and lesson source are omitted; checkpoint text/data itself may still
contain information authored by the lesson, so review that content before using a cloud provider.

Changing assignments, disconnecting, or pressing Cancel aborts a pending
request. Closing Details does not cancel it. Both current clients are needed to reject assignment-bound feedback that arrives
after an assignment change. Inference quality is not established by schema validation:
the instructor must review factual accuracy and suitability before sending.

Provider calls in automated tests are mocked; they do not require keys or incur API costs.

For a manual end-to-end check, assign the basic flight knowledge test to several students,
select Review, and complete their tests. Check that each row independently reaches
AI review, switching Details does not cancel generation, and Send resumes only the
corresponding lesson. Repeat with Auto-send, Off, an unavailable provider, and stopping
or replacing a lesson while its request is queued. Check both themes and a narrow panel.

References: [Ollama chat](https://docs.ollama.com/api/chat),
[Ollama CORS](https://docs.ollama.com/faq),
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[OpenAI authentication](https://developers.openai.com/api/reference/overview).
