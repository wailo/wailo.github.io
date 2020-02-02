<template>
  <div>
    <pre class="ascii">{{ updatedPhoto }}</pre>
  </div>
</template>

<script>
import { photo, photoFilled } from '~/components/ascii.js'

const replaceAt = function(str, index, replacement) {
  return (
    str.substr(0, index) + replacement + str.substr(index + replacement.length)
  )
}

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
    this.$nextTick(function() {
      this.animatedReplace(0)
    })
  },
  methods: {
    animatedReplace(index) {
      const el = this

      if (el.updatedPhoto === el.originalPhotoFilled) {
        return
      }

      while (
        index < el.originalPhoto.length - 1 &&
        el.originalPhotoFilled[index] === el.updatedPhoto[index]
      ) {
        index++
      }

      setTimeout(() => {
        el.animatedReplace(index++)
      }, 20)

      el.updatedPhoto = replaceAt(
        el.updatedPhoto,
        index,
        el.originalPhotoFilled[index]
      )
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
