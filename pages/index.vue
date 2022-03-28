<template>
  <b-card
    class="container"
    no-body
    text-variant="white"
    style="max-height: 100vh"
  >
    <b-card-body style="max-height: 100%">
      <BioComponent style="max-height: inherit" />
    </b-card-body>

    <b-card-footer footer-border-variant="dark">
      <h1>Wa.il</h1>
      <div style="padding-top: 15px">
        <b-button
          v-for="link in links"
          :key="link.name"
          :href="link.link"
          target="_blank"
          class="border border-light"
          variant="outline-light"
          style="margin: 0px 0px 0px 15px"
        >
          {{ link.name }}
        </b-button>
      </div>
    </b-card-footer>
  </b-card>
</template>

<script>
import BioComponent from '~/components/Bio.vue'
export default {
  name: 'IndexComponent',
  components: {
    BioComponent,
  },
  data() {
    return {
      links: [
        { name: 'GitHub', link: 'https://github.com/wailo' },
        { name: 'LinkedIn', link: 'https://www.linkedin.com/in/wailyahia' },
        { name: 'YouTube', link: 'https://youtube.com/wailo' },
      ],
    }
  },
}
</script>

<style>
@import '@/assets/styles/hacker_dark.css';

.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  /* justify-content: center; */
  /* align-items: center; */
  text-align: center;
  background-color: rgba(0, 0, 0, 0);
}
</style>
