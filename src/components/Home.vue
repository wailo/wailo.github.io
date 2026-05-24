<template>
  <div
    class="relative h-screen flex items-center justify-center bg-custom-dark text-custom-gray overflow-hidden"
  >
    <!-- Content -->
    <div class="relative text-center px-6 w-full max-w-4xl mx-auto">
      <h1
        class="text-5xl md:text-7xl font-extrabold uppercase tracking-wide relative title-container"
      >
        <span>{{ title }}</span>
      </h1>

      <!-- Animated Sentence -->
      <p class="mt-2 text-lg md:text-2xl font-light relative z-10 min-h-[2rem]">
        <span
          v-for="(word, index) in words"
          :key="index"
          class="inline-block opacity-0 animate-fade-in"
          :style="{ animationDelay: `${index * 0.5}s` }"
        >
          {{ word }}
        </span>
      </p>

      <!-- Launch Section -->
      <div class="flex flex-col justify-center items-center border-gray-500 py-2 mt-4">
        <div class="flex flex-col md:flex-row items-center gap-3 w-full justify-center">
          <input
            class="appearance-none bg-transparent border-2 border-custom-gray rounded w-full md:w-[300px] text-center py-1 px-2 leading-tight focus:outline-none transition-colors focus:border-red-500"
            type="text"
            placeholder="Session ID"
            :value="isFocused ? roomId : `Session ID: ${roomId}`"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @input="roomId = ($event.target as HTMLInputElement).value"
          />

          <router-link :to="`/sim?roomId=${roomId}`" class="w-full md:w-auto">
            <button
              class="w-full md:w-auto bg-red-500 hover:bg-red-700 border-red-500 hover:border-red-700 text-sm border-2 text-white py-1 px-6 rounded transition-colors"
              type="button"
            >
              Launch
            </button>
          </router-link>
        </div>

        <!-- Improved Disclaimer Layout -->
        <div
          class="mt-8 mx-auto max-w-2xl text-xs md:text-sm text-gray-400 leading-relaxed opacity-80 border-t border-gray-700 pt-4"
        >
          <p>
            <strong class="text-gray-300">Disclaimer:</strong> This application is provided for
            educational purposes only. It does not represent real-world flight conditions and must
            not be used for actual aviation training, navigation, or operational decision-making.
          </p>

          <p class="mt-2">
            By using this application, you acknowledge that the developers and contributors accept
            no liability for any damages, losses, injuries, or consequences resulting from the use
            or misuse of this software.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const title = ref('Flight Simulator')
const sentence = ref('Minimal Versatile Intelligent') // Fixed typo in "Intelligent"
const roomId = ref('SIM-' + Math.floor(100000 + Math.random() * 90000).toString()) // Fixed random range
const isFocused = ref(false)
const words = computed(() => sentence.value.split(' '))
</script>

<style scoped>
/* Custom Colors */
.bg-custom-dark {
  background-color: #212529;
}

.text-custom-gray {
  color: #c4c4c4;
}

/* Fade-in animation for text */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.8s ease-in-out forwards;
  display: inline-block;
  margin-right: 8px;
}
</style>
