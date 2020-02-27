<template>
  <div>
    <pre class="ascii">{{ originalPhoto }}</pre>
  </div>
</template>

<script>
import { photo } from '~/components/ascii.js'

export default {
  data: () => {
    return {
      originalPhoto: photo
    }
  },
  mounted() {
    this.updatedPhoto = this.originalPhoto
    this.$nextTick(function() {})
  },
  methods: {}
}
</script>

<style scoped>
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

.photo {
  color: chartreuse;
  font-size: 4pt;
}
.ascii {
  display: inline-block;
  font-family: monospace;
  /* letter-spacing: -0.1em; */
  line-height: 1em;
  /* text-shadow: 0 0 5px rgba(100, 100, 100, 0.5); */
  background-color: transparent;
  /* color: white; */
  /* color: rgba(182, 182, 182, 1.068); */
  text-align: initial;
}
</style>
