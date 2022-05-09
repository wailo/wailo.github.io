<template>
  <div class="text-left">
    <b-nav tabs class="h-100 d-flex flex" content-class="mt-3 flex-grow-1">
      <b-nav-item :active="$route.hash === '#' || $route.hash === ''" to="#">
        About
      </b-nav-item>
      <b-nav-item :active="$route.hash === '#sim'" to="#sim">
        Flight Simulator
      </b-nav-item>
    </b-nav>
    <div class="tab-content" style="display: flex">
      <div
        :class="[
          'tab-pane',
          { active: $route.hash === '#' || $route.hash === '' },
        ]"
        class="p-2"
      >
        <BioComponent />
      </div>
      <div
        :class="['tab-pane', { active: $route.hash.startsWith('#sim') }]"
        class="p-2"
      >
        <FlightSim />
      </div>
    </div>
    <footer style="text-align: center">
      <small>&copy; Copyright {{ new Date().getFullYear() }}, Wa.il </small>
    </footer>
  </div>

  <!-- <template>
  <div text-variant="white" style="max-height: 100vh">
    <BioComponent style="max-height: inherit" />
  </div>
</template> -->
</template>

<script>
import BioComponent from '~/components/Bio.vue'
import FlightSim from '~/components/FlightSim.vue'

export default {
  name: 'IndexComponent',
  components: {
    BioComponent,

    FlightSim,
  },
}
</script>

<style>
@import '@/assets/styles/hacker_dark.css';

.container {
  margin: 0 0;
  display: flex;
  text-align: center;
  background-color: rgba(0, 0, 0, 0);
}
</style>
