<template>
  <div class="text-left">
    <div class="panel panel-primary">
      <h1 class="panel-heading panel-title">About</h1>
      <p class="panel-body">
        I'm an independent contractor with 9 years of software development in
        aerospace and finance domains. Specialized in C++ systems developement
        and software/hardware integratrion.
      </p>
    </div>
    <div class="panel panel-primary">
      <h1 class="panel-heading panel-title">Timline</h1>

      <template v-for="item in timelineItems">
        <h2 v-bind:key="item.id" class="panel-title">
          {{ item.title }}
        </h2>
        <p v-bind:key="item.id" class="panel-body">
          {{ item.description }}
        </p>
      </template>
    </div>
    <div class="panel panel-primary">
      <h1 class="panel-heading panel-title">Repos</h1>
      <template v-for="r in repos">
        <h2 v-bind:key="r.id" class="panel-title">{{ r.name }}</h2>
        <p v-bind:key="r.id" class="panel-body">{{ r.description }}</p>
      </template>
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
          title: '2006',
          description: 'Completed bachelor degree in aerospace design'
        },
        {
          title: '2010',
          description:
            'Completed master degree in numerical simuation in aerospace'
        },
        {
          title: '2011',
          description:
            'Started working as Reseach and Development Software Engineer in air traffic managment simulation'
        },
        {
          title: '2013',
          description:
            'Started working as software engineer in flight simulation'
        },
        {
          title: '2017',
          description:
            'Moved to the finance industry, working on low-latency infrastructure'
        },
        {
          title: '2019',
          description: 'Started software consultancy'
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
            return repo.fork === false
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
code {
  color: black;
}
.h2 {
}
/* kbd {
  font-size: 14pt;
} */
</style>
