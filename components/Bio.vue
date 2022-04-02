<template>
  <div style="padding: 15px">
    <b-row>
      <b-col
        cols="7"
        style="
          display: flex;
          flex-direction: column;
          height: 80vh;
          overflow: auto;
        "
      >
        <p>
          I am an independent contractor with 12 years of C++ software
          development, specialized in simulation and finance domains.
        </p>
        <p>
          I like to work with low-latency systems, communication protocols and
          software/hardware integratrion.
        </p>

        <hr />
        <div v-for="(tools, title) in skills" :key="title">
          <h5>{{ title }}</h5>
          <b-button
            v-for="skill in tools"
            :key="skill"
            disabled
            variant="outline-light"
            >{{ skill }}</b-button
          >
        </div>
        <hr />
        <h5>Github Projects:</h5>
        <b-list-group style="flex: 1; overflow: auto; height: 100%">
          <template v-for="r in repos">
            <b-list-group-item
              :key="r.id"
              :href="r.html_url"
              target="_blank"
              class="align-items-start"
              style="background-color: transparent; color: #c4c4c4"
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
      </b-col>
      <b-col>
        <PhotoComponent />
      </b-col>
    </b-row>

    <div style="text-align: center" footer-border-variant="dark">
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
    </div>
  </div>
</template>

<script>
import PhotoComponent from '~/components/Photo.vue'

export default {
  name: 'BioComponent',
  components: {
    PhotoComponent,
  },
  data() {
    return {
      links: [
        { name: 'GitHub', link: 'https://github.com/wailo' },
        { name: 'LinkedIn', link: 'https://www.linkedin.com/in/wailyahia' },
        { name: 'YouTube', link: 'https://youtube.com/wailo' },
      ],
      repos: null,
      skills: {
        'Toolset:': [
          'C++',
          'Python',
          'Sql',
          'Mongodb',
          'Javascript',
          'WebAssembly',
          'Rust',
          'Linux',
          'Emacs',
          'Cmake',
          'Git',
          'Docker',
        ],
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
        'https://api.github.com/users/wailo/repos?sort=pushed',
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
</style>
