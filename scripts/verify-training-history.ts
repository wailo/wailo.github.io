// Explicitly opt-in: creates labelled, retained verification records in the target database.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { prepareTrainingArtifact, loadUserScript } from '../src/EditorScriptRuntime'
import { createLessonRunStore } from '../src/useLessonRun'
import { createTrainingRecorder } from '../src/TrainingRecorder'

async function verify() {
  if (!process.argv.includes('--create-verification-records')) {
    throw new Error(
      'Pass --create-verification-records to authorize creating a test account and training records.',
    )
  }
  const base = process.env.PB_VERIFY_URL || 'http://127.0.0.1:8090'
  const label = `[Verification] Training history ${new Date().toISOString()}`
  async function request(path: string, body?: unknown, token?: string) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) throw new Error(`PocketBase ${response.status} at ${path.split('?')[0]}`)
    return response.json()
  }
  const generated = await request('/api/account-number', {})
  const account = await request('/api/accounts/sign-in', { code: generated.code, name: label })
  // Credentials remain in memory and are never printed; admins can identify the test account by ID/name.
  console.log(`Verification account: ${account.record.id} (${label})`)
  const store = createLessonRunStore()
  const errors: unknown[] = []
  const recorder = createTrainingRecorder(
    store,
    () => (path, body) => request(path, body, account.token),
    (error) => errors.push(error),
  )
  const runtime = {
    appCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    modelVersion: 'verification-fixture-not-a-simulator-release',
  }
  const source = `export async function main(context) {
    context.checkPoint('Verification only — no training credit', {fixture: true});
    context.metrics.push({fixture: true});
  }`
  const artifact = prepareTrainingArtifact(source)
  async function start(suffix: string, selectedArtifact = artifact) {
    const run = store.begin(
      'verification/training-history',
      `${label} / ${suffix}`,
      'verification-assignment',
    )
    await recorder.start(store.snapshot()!, selectedArtifact, runtime, { verificationOnly: true })
    return run
  }
  async function finalRecord(runId: string, status: string) {
    const filter = encodeURIComponent(`run_id = "${runId}"`)
    for (let i = 0; i < 50; i++) {
      if (errors.length) throw new Error('Training recorder reported a save failure')
      const result = await request(
        `/api/collections/studentRecords/records?filter=${filter}`,
        undefined,
        account.token,
      )
      const record = result.items[0]
      if (record?.status === status) {
        assert.equal(record.student, account.record.id)
        assert.equal(record.app_commit, runtime.appCommit)
        assert.equal(record.model_version, runtime.modelVersion)
        assert.equal(record.outcome, 'not-assessed')
        assert.ok(record.start_time && record.end_time)
        console.log(`Verified ${status}: ${record.id}`)
        return record
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`Timed out waiting for ${status}`)
  }
  try {
    const first = await start('complete')
    await loadUserScript(artifact.javascript)({
      checkPoint: (message: string, data: any) =>
        store.recordCheckpoint(first.runId, message, data),
      metrics: first.metrics,
    } as any)
    store.finish(first.runId, 'COMPLETED', 'Verification completed')
    const completed = await finalRecord(first.runId, 'completed')
    const revision = await request(
      `/api/collections/lessonRevisions/records/${completed.revision}`,
      undefined,
      account.token,
    )
    assert.deepEqual(JSON.parse(revision.bundle), artifact)
    const evidence = await request(
      `/api/collections/attemptEvents/records?filter=${encodeURIComponent(`attempt = "${completed.id}"`)}&sort=sequence`,
      undefined,
      account.token,
    )
    assert.deepEqual(
      evidence.items.map((item: any) => item.kind),
      ['checkpoint', 'finished'],
    )

    const stopped = await start('stop')
    store.finish(stopped.runId, 'STOPPED', 'Verification stop')
    await finalRecord(stopped.runId, 'stopped')

    const errorArtifact = prepareTrainingArtifact(
      'export async function main() { throw new Error("Verification error") }',
    )
    const failed = await start('script error', errorArtifact)
    try {
      await loadUserScript(errorArtifact.javascript)({} as any)
    } catch {
      store.finish(failed.runId, 'ERROR', 'Verification error')
    }
    await finalRecord(failed.runId, 'error')

    const replaced = await start('replaced')
    const replacement = await start('replacement')
    await finalRecord(replaced.runId, 'stopped')
    store.finish(replacement.runId, 'COMPLETED', 'Verification replacement completed')
    await finalRecord(replacement.runId, 'completed')

    const repeated = await start('repeat')
    store.finish(repeated.runId, 'COMPLETED', 'Verification repeated')
    const repeatedRecord = await finalRecord(repeated.runId, 'completed')
    assert.equal(repeatedRecord.revision, completed.revision)
    assert.notEqual(repeatedRecord.id, completed.id)

    let guestWrites = 0
    const guestStore = createLessonRunStore()
    const guest = createTrainingRecorder(
      guestStore,
      () => null,
      () => {
        guestWrites++
      },
    )
    const guestRun = guestStore.begin('verification/guest', 'Guest practice')
    await guest.start(guestStore.snapshot()!, artifact, runtime, {})
    guestStore.finish(guestRun.runId, 'COMPLETED', 'Done')
    guest.dispose()
    assert.equal(guestWrites, 0)
    const all = await request('/api/collections/studentRecords/records', undefined, account.token)
    assert.equal(all.totalItems, 6)
    console.log(
      'Passed: archive retrieval, evidence, versions, completion, stop, error, replacement, revision reuse, and guest practice. Six clearly labelled records retained.',
    )
  } finally {
    recorder.dispose()
  }
}

verify().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Verification failed')
  process.exitCode = 1
})
