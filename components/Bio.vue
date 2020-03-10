<template>
  <div class="text-left">
    <div>
      <b-tabs content-class="mt-3">
        <b-tab title="About" active>
          <p>
            I am an independent contractor with 9 years of C++ software
            development, specialized in simulation and finance domains.
          </p>
          <p>
            I like to work with low-latency systems, communication protocols and
            software/hardware integratrion.
          </p>
          <div>
            <h5>Everyday</h5>
            <b-button disabled variant="dark">C++</b-button>
            <b-button disabled variant="dark">Python</b-button>
            <b-button disabled variant="dark">sql</b-button>
            <b-button disabled variant="dark">mongodb</b-button>

            <h5>
              <p>Learning</p>
              <b-button disabled variant="dark">Javascript</b-button>
              <b-button disabled variant="dark">Node.js</b-button>
              <b-button disabled variant="dark">WebAssembly</b-button>
            </h5>
            <h5>Toolset</h5>
            <b-button disabled variant="dark">Emacs</b-button>
            <b-button disabled variant="dark">Linux</b-button>
            <b-button disabled variant="dark">cmake</b-button>
            <b-button disabled variant="dark">git</b-button>
            <b-button disabled variant="dark">docker</b-button>
          </div>
        </b-tab>
        <b-tab title="GitHub Portfolio">
          <b-list-group>
            <template v-for="r in repos">
              <b-list-group-item
                v-bind:key="r.id"
                :href="r.html_url"
                class="flex-column align-items-start"
              >
                <div class="d-flex w-100 justify-content-between">
                  <h5 class="mb-1">{{ r.name }}</h5>
                  <small>{{ r.language }}</small>
                </div>
                <p class="mb-1">{{ r.description }}</p>
              </b-list-group-item>
            </template>
          </b-list-group>
        </b-tab>
        <b-tab title="Travel Map" lazy>
          <TravelMap />
        </b-tab>
        <b-tab title="Flight Simulator" lazy> <FlightSim /> </b-tab>
      </b-tabs>
    </div>
  </div>
</template>

<script>
import TravelMap from '~/components/Map.vue'
import FlightSim from '~/components/FlightSim.vue'
export default {
  components: {
    TravelMap,
    FlightSim
  },
  data() {
    return {
      repos: null,
      timelineItems: [
        {
          title: '2019',
          description: 'Started software consultancy Wa.IL'
        },
        {
          title: '2017',
          description:
            'Moved to the finance industry, working on low-latency infrastructure'
        },
        {
          title: '2013',
          description:
            'Started working as software engineer in flight simulation'
        },
        {
          title: '2011',
          description:
            'Started working as Reseach and Development Software Engineer in air traffic managment simulation'
        },
        {
          title: '2010',
          description:
            'Completed master degree in numerical simuation in aerospace'
        },
        {
          title: '2006',
          description: 'Completed bachelor degree in aerospace design'
        }
      ]
    }
  },
  mounted() {
    this.$nextTick(function() {
      const vm = this
      this.getJSON(
        'https://api.github.com/users/wailo/repos',
        (err, response) => {
          if (err) {
            // alert('Something went wrong: ' + err)
            return
          }
          vm.repos = response.filter((repo) => {
            return repo.fork === false && repo.archived === false
          })
        }
      )
    })
  },
  methods: {
    getJSON(url, callback) {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'json'
      xhr.onload = function() {
        const status = xhr.status
        if (status === 200) {
          callback(null, xhr.response)
        } else {
          callback(status, xhr.response)
        }
      }
      xhr.send()
    }
  }
}
</script>

<style scoped>
#title {
  display: inline-block;
  margin-right: 0px;
  width: 100px;
}
#description {
  display: inline-block;
  width: 300px;
}
.list-group-item {
  background-color: rgba(0, 0, 0, 0);
}
</style>
