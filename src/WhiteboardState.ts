import { markRaw } from 'vue'
import type { SerializableRecord, useWhiteboard } from 'vue-whiteboard-composable'

type Whiteboard = ReturnType<typeof useWhiteboard>

/** Validate saved/received data before changing the live drawing. Never import SVG markup. */
export function parseWhiteboardState(serialized: string): SerializableRecord[] | null {
  try {
    const records: unknown = JSON.parse(serialized)
    if (!Array.isArray(records)) return null
    const result: SerializableRecord[] = []
    for (const record of records) {
      if (
        !record ||
        typeof record.id !== 'string' ||
        record.type !== 'line' ||
        typeof record.pathData !== 'string' ||
        (record.timestamp !== undefined &&
          (typeof record.timestamp !== 'number' || !Number.isFinite(record.timestamp))) ||
        !record.brush ||
        typeof record.brush.color !== 'string' ||
        // The drawing controls use hex colours and pixel widths. In particular, reject url().
        !/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(record.brush.color) ||
        typeof record.brush.size !== 'string' ||
        !/^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(record.brush.size) ||
        !Number.isFinite(parseFloat(record.brush.size)) ||
        parseFloat(record.brush.size) <= 0
      )
        return null
      result.push({
        id: record.id,
        type: 'line',
        ...(record.timestamp !== undefined ? { timestamp: record.timestamp } : {}),
        pathData: record.pathData,
        brush: { color: record.brush.color, size: record.brush.size },
      })
    }
    return result
  } catch {
    return null
  }
}

/** Reuse the library's public history so its existing undo/redo controls stay connected. */
export function replaceWhiteboardState(
  board: Whiteboard,
  svg: SVGSVGElement,
  records: SerializableRecord[],
) {
  const history = records.map((record) => {
    const path = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('class', 'line')
    path.setAttribute('d', record.pathData)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', record.brush.color)
    path.setAttribute('stroke-width', record.brush.size)
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    return {
      id: record.id,
      type: record.type,
      timestamp: record.timestamp ?? Date.now(),
      data: markRaw(path),
      brush: { ...record.brush },
    }
  })
  board.clear()
  for (const record of history) svg.appendChild(record.data)
  board.history.value = history
  board.currentIndex.value = history.length - 1
}

/** Serialize only visible strokes, retaining undone strokes solely for local redo. */
export function serializeWhiteboardState(board: Whiteboard): string {
  const visible = board.history.value.slice(0, board.currentIndex.value + 1)
  return JSON.stringify(
    visible.map((record) => ({
      id: record.id,
      type: record.type,
      timestamp: record.timestamp,
      pathData: record.data.getAttribute('d') || '',
      brush: record.brush,
    })),
  )
}
