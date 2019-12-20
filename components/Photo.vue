<template>
  <img
    src="~/assets/portrait.jpeg"
    class="img-circle NuxtLogo"
    alt="Responsive image"
  />
</template>
<style>
.NuxtLogo {
  animation: 1s appear;
}

@keyframes appear {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
