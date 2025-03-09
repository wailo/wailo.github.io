<template>
    <div class="relative h-screen flex items-center justify-center bg-custom-dark text-custom-gray overflow-hidden">
        
      <!-- Content -->
      <div class="relative text-center px-6">
        <h1 class="text-5xl md:text-7xl font-extrabold uppercase tracking-wide relative title-container">
          <span >{{ title }}</span>
        
        </h1>
        <!-- Animated Sentence -->
        <p class="mt-4 text-lg md:text-2xl font-light relative z-10">
          <span v-for="(word, index) in words" 
                :key="index" 
                class="inline-block opacity-0 animate-fade-in"
                :style="{ animationDelay: `${index * 0.5}s` }">
            {{ word }}
          </span>
        </p>

        <!-- Launch -->
        <router-link to="/sim">
        <button class="mt-8 px-6 py-3 bg-red-700 text-white font-semibold rounded-lg shadow-md hover:bg-transparent transition duration-300">
          Launch
        </button>
      </router-link>

      </div>
    </div>
  <HomeAnimation class="bg-custom-dark"/> 
  
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue';
  import HomeAnimation from './HomeAnimation.vue';

  const title = ref("Flight Simulator");
  const sentence = ref("Minimal Versatile Intellegent");
  
  const words = computed(() => sentence.value.split(" "));
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
  