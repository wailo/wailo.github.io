<template>
  <div class="text-left">
    <b-nav tabs>
      <b-nav-item :active="$route.hash === '#' || $route.hash === ''" to="#">
        About
      </b-nav-item>
      <b-nav-item :active="$route.hash === '#github'" to="#github">
        GitHub Projects
      </b-nav-item>
      <!-- <b-nav-item :active="$route.hash === '#map'" to="#map">
          Travel Map
        </b-nav-item> -->
      <b-nav-item :active="$route.hash === '#sim'" to="#sim">
        Flight Simulator
      </b-nav-item>
    </b-nav>
    <div class="tab-content">
      <div
        :class="[
          'tab-pane',
          { active: $route.hash === '#' || $route.hash === '' },
        ]"
        class="p-2"
      >
        <b-row>
          <b-col>
            <p>
              I am an independent contractor with 9 years of C++ software
              development, specialized in simulation and finance domains.
            </p>
            <p>
              I like to work with low-latency systems, communication protocols
              and software/hardware integratrion.
            </p>
            <hr />
            <div v-for="(tools, title) in skills" :key="title">
              <h5>{{ title }}</h5>
              <b-button
                v-for="skill in tools"
                :key="skill"
                disabled
                variant="dark"
                >{{ skill }}</b-button
              >
            </div>
          </b-col>
          <b-col>
            <PhotoComponent />
          </b-col>
        </b-row>
      </div>
      <div
        :class="['tab-pane', { active: $route.hash === '#github' }]"
        class="p-2"
      >
        <b-list-group>
          <template v-for="r in repos">
            <b-list-group-item
              :key="r.id"
              :href="r.html_url"
              target="_blank"
              class="flex-column align-items-start"
              variant="dark"
            >
              <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">{{ r.name }}</h5>
                <small>{{ r.language }}</small>
              </div>
              <p class="mb-1">{{ r.description }}</p>
            </b-list-group-item>
          </template>
        </b-list-group>
      </div>
      <!-- <div
          :class="['tab-pane', { active: $route.hash === '#map' }]"
          class="p-2"
        >
          <TravelMap />
        </div> -->
      <div
        :class="['tab-pane', { active: $route.hash === '#sim' }]"
        class="p-2"
      >
        <FlightSim />
      </div>
    </div>
  </div>
</template>

<script>
import PhotoComponent from '~/components/Photo.vue'
// import TravelMap from '~/components/Map.vue'
import FlightSim from '~/components/FlightSim.vue'
export default {
  name: 'BioComponent',
  components: {
    PhotoComponent,
    // TravelMap,
    FlightSim,
  },
  data() {
    return {
      repos: null,
      skills: {
        'Everyday:': ['C++', 'Python', 'sql', 'mongodb', 'Javascript'],
        'Learning:': ['WebAssembly', 'Rust'],
        'Toolset:': ['Linux', 'Emacs', 'cmake', 'git', 'docker'],
      },
      timelineItems: [
        {
          title: '2019',
          description: 'Started software consultancy Wa.IL',
        },
        {
          title: '2017',
          description:
            'Moved to the finance industry, working on low-latency infrastructure',
        },
        {
          title: '2013',
          description:
            'Started working as software engineer in flight simulation',
        },
        {
          title: '2011',
          description:
            'Started working as Reseach and Development Software Engineer in air traffic managment simulation',
        },
        {
          title: '2010',
          description:
            'Completed master degree in numerical simuation in aerospace',
        },
        {
          title: '2006',
          description: 'Completed bachelor degree in aerospace design',
        },
      ],
    }
  },
  mounted() {
    this.$nextTick(function () {
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
      xhr.onload = function () {
        const status = xhr.status
        if (status === 200) {
          callback(null, xhr.response)
        } else {
          callback(status, xhr.response)
        }
      }
      xhr.send()
    },
  },
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
