<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useWhiteboard, type SerializableRecord } from 'vue-whiteboard-composable'
import {
  parseWhiteboardState,
  replaceWhiteboardState,
  serializeWhiteboardState,
} from '../WhiteboardState'

const svgRef = ref<SVGSVGElement | null>(null)

const color = ref('#ff5a66')
const size = ref('2px')

const colors = ['#ffffff', '#222222', '#ff5a66', '#f6c33b', '#3b82f6', '#4caf50', '#9c27b0']

// Define emitted events
const emit = defineEmits<{
  (e: 'history-updated', payload: { serialized: string }): void
}>()

const board = useWhiteboard(svgRef, {
  color,
  size,
  backgroundColor: 'transparent',
})
const { undo, redo, canUndo, canRedo, currentIndex } = board
let initialized = false
let applyingState = false
let disposed = false
let pendingState: SerializableRecord[] | undefined
let lastSnapshot = '[]'

function saveSnapshot(serialized: string) {
  try {
    localStorage.setItem('drawing', serialized)
  } catch (error) {
    // A full or unavailable store must not prevent drawing or classroom delivery.
    console.warn('Could not save whiteboard drawing', error)
  }
}

function restoreSavedState(): SerializableRecord[] {
  try {
    const records = parseWhiteboardState(localStorage.getItem('drawing') || '[]')
    if (records) return records
  } catch (error) {
    console.warn('Could not read whiteboard drawing', error)
  }
  return []
}

function applyState(records: SerializableRecord[], persist = true) {
  if (disposed || !svgRef.value) return
  applyingState = true
  try {
    replaceWhiteboardState(board, svgRef.value, records)
  } finally {
    applyingState = false
  }
  lastSnapshot = serializeWhiteboardState(board)
  if (persist) saveSnapshot(lastSnapshot)
}

function updateState(serialized: string) {
  if (disposed) return false
  const records = parseWhiteboardState(serialized)
  if (!records) {
    console.warn('Ignored invalid whiteboard snapshot')
    return false
  }
  // The library appends a path at drag start, but commits it to history at drag end.
  // Keep that path alive until the gesture ends; retain only the latest incoming snapshot.
  if (!initialized || (svgRef.value?.children.length ?? 0) > currentIndex.value + 1) {
    pendingState = records
  } else {
    pendingState = undefined
    applyState(records)
  }
  return true
}

function clear() {
  if (disposed) return
  if (!initialized) pendingState = []
  else {
    pendingState = undefined
    board.clear()
  }
}

// The library's SVG-ref watcher initializes drawing first; restoration follows it.
const stopRestore = watch(
  svgRef,
  (svg) => {
    if (!svg || initialized || disposed) return
    initialized = true
    applyState(pendingState ?? restoreSavedState(), pendingState !== undefined)
    pendingState = undefined
  },
  { flush: 'post' },
)

const stopPublish = watch(
  currentIndex,
  () => {
    if (disposed || !initialized || applyingState) return
    if (pendingState) {
      // Finish the library's history mutation before replacing it. The local stroke is
      // superseded by the received snapshot, so it must not publish a stale drawing.
      void nextTick(() => {
        if (disposed || !pendingState) return
        const records = pendingState
        pendingState = undefined
        applyState(records)
      })
      return
    }
    const serialized = serializeWhiteboardState(board)
    if (serialized === lastSnapshot) return
    lastSnapshot = serialized
    saveSnapshot(serialized)
    emit('history-updated', { serialized })
  },
  // Run inside the mutation so remote replacement cannot queue an echo after the guard clears.
  { flush: 'sync' },
)

onBeforeUnmount(() => {
  disposed = true
  stopPublish()
  stopRestore()
  pendingState = undefined
  board.clear()
})

defineExpose({ clear, UpdateState: updateState })
</script>

<template>
  <div class="w-full h-full min-h-0 overflow-hidden bg-panelContentBackground flex flex-col">
    <!-- Scrollable canvas -->
    <div class="min-h-0 flex-1 overflow-auto">
      <svg
        ref="svgRef"
        class="w-full h-[3000px] cursor-crosshair bg-panelContentBackground bg-[radial-gradient(circle,theme('colors.panelBorder')_1px,transparent_1px)] bg-[length:20px_20px] [&_*]:[stroke-linecap:round] [&_*]:[stroke-linejoin:round]"
      />
    </div>

    <!-- Toolbar -->
    <div
      class="shrink-0 h-2/10 bg-panelContentBackground border-t border-simElementBorder flex items-center justify-between px-2 flex-nowrap gap-2 select-none"
    >
      <!-- Left actions -->
      <div class="flex items-center w-full h-full gap-2">
        <button
          :disabled="!canUndo"
          @click="undo"
          class="h-full rounded flex items-center justify-center text-sm hover:bg-panelHover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↶
        </button>

        <button
          :disabled="!canRedo"
          @click="redo"
          class="h-full rounded flex items-center justify-center text-sm hover:bg-panelHover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↷
        </button>
        <button
          @click="clear"
          class="h-full gap-1 rounded flex items-center justify-center text-sm hover:bg-panelHover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✖
        </button>
      </div>

      <!-- Brush sizes -->
      <div class="flex items-center w-full h-full gap-1">
        <button
          v-for="s in ['2px', '5px', '10px', '15px']"
          :key="s"
          @click="size = s"
          :class="[
            'h-full gap-1 rounded-full flex items-center justify-center border transition',
            size === s ? 'border-secondary' : 'border-transparent hover:border-simElementBorder',
          ]"
        >
          <span
            class="rounded-full bg-current"
            :style="{
              width: s,
              height: s,
            }"
          />
        </button>
      </div>

      <!-- Colors -->
      <div class="flex items-center w-full h-full gap-1">
        <button
          v-for="c in colors"
          :key="c"
          @click="color = c"
          :style="{ backgroundColor: c }"
          :class="[
            'w-full h-full transition cursor-pointer hover:scale-110 border',
            color === c ? 'border-secondary' : 'border-transparent',
          ]"
        />
      </div>
    </div>
  </div>
</template>
