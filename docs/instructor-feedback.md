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

## Workflow and checks

1. Connect instructor and student with current clients; assign a lesson.
2. Wait for checkpoints (the coordinated-turn challenge includes structured evidence).
3. Open the student's Details and click **Suggest feedback**.
4. Review the proposed text and expandable evidence; **Send** is a separate action.
5. Check Cancel, unavailable server/model, and assignment replacement while requesting.

No model request occurs automatically. No generated code or simulator command is
executed. Evidence references must match the snapshot and current classroom history.
Missing evidence produces no suggestion. The request uses the latest 12 checkpoints
plus available teaching context, with a 32,000-character input limit. Explicit peer IDs,
account credentials, and lesson source are omitted; checkpoint text/data itself may still
contain information authored by the lesson, so review that content before using a cloud provider.

Changing assignments, disconnecting, closing Details, or pressing Cancel aborts a pending
request. Both current clients are needed to reject assignment-bound feedback that arrives
after an assignment change. Inference quality is not established by schema validation:
the instructor must review factual accuracy and suitability before sending.

Provider calls in automated tests are mocked; they do not require keys or incur API costs.

References: [Ollama chat](https://docs.ollama.com/api/chat),
[Ollama CORS](https://docs.ollama.com/faq),
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[OpenAI authentication](https://developers.openai.com/api/reference/overview).
