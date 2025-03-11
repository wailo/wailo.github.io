<template>
    <div class="flex justify-center items-center h-screen bg-gray-100">
      <div class="grid grid-cols-6 grid-rows-6 gap-1">
        <button
          v-for="(_btn, index) in 36"
          :key="index"
          class="w-5 h-5 border-2 border-gray-500 rounded-sm transition-colors duration-500"
          :class="{ 'bg-gray-300': activeButtons.includes(index) }"
        ></button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  
  const activeButtons = ref<number[]>([]);
  
const startAnimation = () => {
    let count = 0;
    const interval = setInterval(() => {
        if (count >= 10) {
            clearInterval(interval);
            return;
        }
        activeButtons.value = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () =>
            Math.floor(Math.random() * 16)
        );
        count++;
    }, 150);
};
  
  onMounted(() => {
    startAnimation();
  });
  </script>
  
  <style scoped>
  button {
    transition: background-color 0.5s ease-in-out;
  }
  </style>
  