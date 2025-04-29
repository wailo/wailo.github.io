<template>
  <div ref="wrapper" class="w-full space-y-2">
    <!-- Input + Buttons Row -->
    <div class="flex gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search..."
        class="w-1/3 border bg-transparent border-simElementBorder p-1"
        @focus="isFocused = true"
      />
      <button @click="showAll" class="w-1/3 border text-secondary">
        Show All
      </button>
      <button @click="hideAll" class="w-1/3 border text-secondary">
        Clear
      </button>
    </div>

    <!-- Dropdown -->
    <div
  v-if="isDropdownVisible"
  class="border rounded shadow max-h-48 overflow-auto"
>
  <div class="flex justify-end p-1 border-b">
    <button
      @click="isFocused = false"
    >
      ✖ Close
    </button>
  </div>
  <div
    v-for="item in Object.values(searchResults)"
    :key="item.api"
    class="cursor-pointer p-1 transition"
    :class="{
      'bg-green-100 font-semibold': recentlyAddedKey === item.api,
      'hover:bg-gray-100': recentlyAddedKey !== item.api,
    }"
    @click="showItem(item.api)"
  >
    {{ item.label }}
  </div>
</div>


    <!-- Visible Items Table -->
    <table class="flex w-full h-full">
      <tbody class="w-full">
        <tr
          class="flex w-full border-b border-simElementBorder items-center"
          v-for="item in visibleItems"
          :key="item.api"
        >
          <td class="font-medium w-3/5">{{ item.label }}</td>
          <td class="w-1/5">{{ props.simData[item.api] }}</td>
          <td class="w-1/5 text-right">
            <button
              @click="hideItem(item.api)"
              class=" hover:text-red-700 transition"
              title="Remove"
            >
              ⅹ
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { SimulationDataDisplay, SimDataKeys } from '../siminterfac'
import Fuse from 'fuse.js'

// v-model:items binding
const items = defineModel<SimulationDataDisplay>('items', { required: true })

const props = defineProps<{
  simData: Record<string, any>
}>()

const searchQuery = ref('')
const isFocused = ref(false)
const recentlyAddedKey = ref<string | null>(null)

// Search setup
const fuse = computed(() => new Fuse(Object.values(items.value), {
  keys: ['label'],
  threshold: 0.4,
}))

const searchResults = computed(() => {
  const query = searchQuery.value.trim()
  if (query) return fuse.value.search(query).map((r) => r.item)
  if (isFocused.value) return Object.values(items.value)
  return []
})

const isDropdownVisible = computed(() => isFocused.value && searchResults.value.length > 0)
const visibleItems = computed(() => Object.values(items.value).filter((item => item.visible)))

// Show single item by key
function showItem(key: SimDataKeys) {
  const item = items.value[key];
  if (item && !item.visible) {
    item.visible = true
    recentlyAddedKey.value = key
    setTimeout(() => (recentlyAddedKey.value = null), 1000)
  }
  searchQuery.value = ''
  isFocused.value = false
}

// Hide single item by key
function hideItem(key: SimDataKeys) {
  const item = items.value[key];
  if (item) item.visible = false
}

// Show all
function showAll() {
  Object.values(items.value).forEach(i => (i.visible = true))
}

// Hide all
function hideAll() {
  Object.values(items.value).forEach(i => (i.visible = false))
}

// Close dropdown when clicking outside
const wrapper = ref<HTMLElement | null>(null)
function handleClickOutside(e: MouseEvent) {
  if (wrapper.value && !wrapper.value.contains(e.target as Node)) {
    isFocused.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// Expose methods for parent access
defineExpose({ showItem, hideItem, showAll, hideAll })
</script>

<style scoped>
.bg-green-100 {
  transition: background-color 0.3s ease;
}

</style>
