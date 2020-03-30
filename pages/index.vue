<template>
  <div class="container">
    <b-container fluid class="bv-example-row">
      <b-row>
        <b-col><Bio /></b-col>
        <b-col>
          <div>
            <Photo />
            <h1>Wa.il</h1>
            <h2 class="badge badge-pill badge-success">Software Developer</h2>

            <div class="links">
              <template v-for="link in links">
                <b-button
                  v-bind:key="link.name"
                  :href="link.link"
                  target="_blank"
                  class="border border-light"
                  variant="outline-light"
                >
                  {{ link.name }}
                </b-button>
                <div v-bind:key="link.name" class="divider" />
              </template>
            </div></div
        ></b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script>
import Photo from '~/components/Photo.vue'
import Bio from '~/components/Bio.vue'
export default {
  components: {
    Photo,
    Bio
  },
  data() {
    return {
      links: [
        { name: 'GitHub', link: 'https://github.com/wailo' },
        { name: 'LinkedIn', link: 'https://www.linkedin.com/in/wailyahia' },
        { name: 'YouTube', link: 'https://youtube.com/wailo' }
      ]
    }
  }
}
</script>

<style>
@import '@/assets/styles/hacker_dark.css';
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: 'Quicksand', 'Source Sans Pro', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  /* color: #35495e; */
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  /* color: #526488; */
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}

.btn-light {
  @apply --btn-light;
  color: black;
  background-color: white;
  border-color: black;
}
pre {
  border-color: transparent;
}

.divider {
  width: 1px;
  height: auto;
  display: inline-block;
}
</style>
