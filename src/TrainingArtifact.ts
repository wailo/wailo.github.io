/** Archive format: preserve exact strings; do not normalize source or line endings. */
export interface TrainingArtifact {
  schemaVersion: 1
  originalSource: string
  preparedSource: string
  javascript: string
  compiler: { name: 'typescript'; version: string; target: 'ES2020'; module: 'None' }
}

export interface TrainingRuntime {
  appCommit: string
  modelVersion: string
}
