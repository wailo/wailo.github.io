<template>
  <div class="container">
    <b-container fluid class="bv-example-row">
      <b-row>
        <b-col><Bio /></b-col>
        <b-col>
          <div>
            <Photo />
            <h1 class="display-1">Wa.il</h1>
            <h2 class="badge badge-pill badge-success">C++</h2>
            <h2 class="badge badge-pill badge-success">Software</h2>
            <h2 class="badge badge-pill badge-success">Finance</h2>
            <h2 class="badge badge-pill badge-success">Aerospace</h2>
            <div class="links">
              <a
                href="https://github.com/wailo"
                target="_blank"
                class="ht-tm-element btn btn-shadow btn-outline-light"
              >
                GitHub</a
              >
              <a
                href="http://www.linkedin.com/in/wailyahia"
                target="_blank"
                class="ht-tm-element btn btn-shadow btn-outline-info"
                >LinkedIn</a
              >

              <a
                href="https://youtube.com/wailo"
                target="_blank"
                class="ht-tm-element btn btn-shadow btn-outline-danger"
                >YouTube</a
              >
            </div>
          </div></b-col
        >
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
  }
}
</script>

<style>
@import '@/assets/styles/bootstrap4-neon-glow.min.css';
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
</style>
