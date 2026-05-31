<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWhiteboard } from 'vue-whiteboard-composable'

const svgRef = ref<SVGSVGElement | null>(null)

const color = ref('#ff5a66')
const size = ref('2px')
const boardState = ref<any[]>([])

const colors = ['#ffffff', '#222222', '#ff5a66', '#f6c33b', '#3b82f6', '#4caf50', '#9c27b0']

// Define emitted events
const emit = defineEmits<{
  (e: 'history-updated', payload: { serialized: string }): void
}>()

defineExpose({
  UpdateState: (state: string) => {
    boardState.value = JSON.parse(state)
    if (state && state.length == 0) {
      clear()
      return
    }

    useWhiteboard(svgRef, {
      color,
      size,
      backgroundColor: 'transparent',
      initialState: boardState.value,
    })
  },
})

const { undo, redo, canUndo, canRedo, clear, serialize, currentIndex } = useWhiteboard(svgRef, {
  color,
  size,
  backgroundColor: 'transparent',
  initialState: JSON.parse(localStorage.getItem('drawing') || '[]'),
})

// Watch for currentIndex changes and emit serialized history
watch(
  currentIndex,
  () => {
    const serialized = JSON.stringify(serialize()) // Serialize current history state
    emit('history-updated', {
      serialized,
    })
    localStorage.setItem('drawing', JSON.stringify(serialize()))
  },
  { deep: false }, // shallow watch is sufficient for primitive number
)
</script>

<template>
  <div
    class="w-full h-full rounded-[10px] overflow-hidden border border-simElementBorder bg-panelContentBackground flex flex-col"
  >
    <!-- Scrollable canvas -->
    <div class="flex-1 overflow-auto">
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
