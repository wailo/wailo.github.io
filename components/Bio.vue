<template>
  <div class="text-left">
    <div>
      <b-tabs content-class="mt-3">
        <b-tab title="About" active
          ><p>
            I'm an independent contractor with 9 years of C++ software
            development in aerospace and finance domains. Specialized in
            low-latency systems, communication protocols and software/hardware
            integratrion.
          </p></b-tab
        >
        <b-tab title="Timeline">
          <template v-for="item in timelineItems">
            <div v-bind:key="item.id" class="panel-body">
              <div id="title">{{ item.title }}</div>
              <div id="description">{{ item.description }}</div>
            </div>
          </template></b-tab
        >
        <b-tab title="Repos">
          <template v-for="r in repos">
            <h2 v-bind:key="r.id" class="panel-title">{{ r.name }}</h2>
            <p v-bind:key="r.id" class="panel-body">{{ r.description }}</p>
          </template></b-tab
        >
      </b-tabs>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      repos: null,
      timelineItems: [
        {
          title: '2019',
          description: 'Started software consultancy'
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
          if (err !== null) {
            alert('Something went wrong: ' + err)
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
</style>
