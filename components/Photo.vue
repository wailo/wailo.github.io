<template>
  <div>
    <pre @mouseover="shufflePhoto" class="ascii">{{ updatedPhoto }}</pre>
  </div>
</template>

<script>
import { photo, photoFilled } from '~/components/ascii.js'
export default {
  data: () => {
    return {
      updatedPhoto: '',
      originalPhoto: photo,
      originalPhotoFilled: photoFilled
    }
  },
  mounted() {
    this.updatedPhoto = this.originalPhoto
    this.$nextTick(function() {})
  },
  methods: {
    shufflePhoto() {
      const el = this

      if (el.updatedPhoto === el.originalPhotoFilled) {
        el.updatedPhoto = el.originalPhoto
        return
      }
      el.updatedPhoto = el.originalPhotoFilled

      setTimeout(() => {
        el.shufflePhoto()
      }, 500)
    }
  }
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
  letter-spacing: -0.1em;
  line-height: 1em;
  /* text-shadow: 0 0 5px rgba(100, 100, 100, 0.5); */
  background-color: transparent;
  /* color: white; */
  /* color: rgba(182, 182, 182, 1.068); */
}
</style>
