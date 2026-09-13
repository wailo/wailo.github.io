/** Keep batch workflows moving, but never drop focus when every peer was targeted. */
export function nextClassroomFocus(
  rows: Array<{ peerId: string; assigned: boolean }>,
  currentPeerId: string,
  consumedIds: string[] = [],
): string {
  const consumed = new Set(consumedIds)
  if (consumed.size) {
    const next =
      rows.find((row) => !consumed.has(row.peerId) && !row.assigned) ??
      rows.find((row) => !consumed.has(row.peerId))
    if (next) return next.peerId
  }
  return rows.find((row) => row.peerId === currentPeerId)?.peerId ?? rows[0]?.peerId ?? ''
}

/** Only activation keys belong exclusively to a focused button/disclosure. */
export function isNativeControlKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Tab'
}
