<template>
  <div>
    <editor
      v-model="content"
      lang="javascript"
      esversion="6"
      theme="dracula"
      @init="editorInit"
      @input="null"
    ></editor>
    <b-button-group>
      <b-button
        variant="outline-light"
        :disabled="isRunning"
        @click="
          () => {
            codeInterpret(context, content)
            $emit('run', content)
          }
        "
        >Run <b-icon variant="success" icon="play-btn"
      /></b-button>
      <b-button
        variant="outline-light"
        :disabled="!isRunning"
        @click="
          () => {
            reset()
            $emit('reset', content)
          }
        "
        >Stop <b-icon variant="danger" icon="stop-btn"
      /></b-button>
    </b-button-group>
  </div>
</template>

<script>
import editor from 'vue2-ace-editor'

export default {
  name: 'ScriptEditor',
  components: {
    editor,
  },
  props: {
    context: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['run', 'finish', 'reset', 'error'],
  data() {
    return {
      isRunning: false,
      content: `const pause = async (ms=4000) => await api_waitFor(ms)
const notify = async (title, content, time) => {this.notifyUser(title, content, time)
                                                await pause(time+500)}

this.api_setSimulationReset()
await notify('Lesson 01 - Demo Autopilot', 'In this class, basic autopilot commands will be demonstrated.', 10000)
await notify('Lesson 01 - Demo Autopilot', 'Ensure that the autopilot panel visible and follow the script', 5000) 
await notify('Engaging Autopilot', 'Autopilot master switch will be engaged', 5000)
this.api_setAutopilot(true)
await pause()

const targetHeading = 120
this.api_setHeadingHoldValue(targetHeading)
this.api_setHeadingHold(true)
await notify('Engaging Heading Hold', \`Heading Hold is engaged, watch the aircraft turning towards the target heading: \${targetHeading}\`, 10000)

const simulationSpeed = 20;
await notify('Simulation Speed', \`To move on quicker, simulation speed will be increased to \${simulationSpeed}x, this means, for each second in real life, it will be \${simulationSpeed} in the simulator!\`, 8000)
this.api_setSimulationSpeed(simulationSpeed)
await api_waitForCondition(() => this.api_psi_deg > 119)
this.api_setSimulationSpeed(1)
await notify('Simulation Speed', \`Back to normal simulation speed\`, 5000)

const rollAngle = 30
this.api_setBankHoldValue(30)
this.api_setBankHold(true)
await notify('Roll angle hold', \`Engaging roll angle hold to \${rollAngle} degrees\`, 5000)
await pause()

const targetAltitude = 25500;
await notify('Altitude hold', \`Altitude hold will be engaged to maintain \${targetAltitude}ft \`, 5000)
this.api_setAltitudeHoldValue(targetAltitude)
this.api_setAltitudeHold(true)
await pause()

await notify('Speed Hold', \`As the aircraft is climbing and losing speed, speed hold will be engaged to maintain constant speed \`, 5000)
this.api_setSpeedHold(true)
await pause()

notify('Waiting for a condition', \`Waiting for the aircraft altitude to cross 25000ft\`, 5000)
await api_waitForCondition(() => (this.api_altitude) > 25000)

notify('End of the lesson', \`This concludes our lesson today, thanks for participating\`, 5000)
`,
    }
  },
  methods: {
    editorInit(editor) {
      this.editor = editor
      require('brace/ext/language_tools') // language extension prerequsite...
      require('brace/mode/javascript') // language
      require('brace/theme/dracula') // theme
      require('brace/snippets/javascript') // snippet
      editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        showPrintMargin: false,
        maxLines: 20,
        minLines: 3,
      })

      if (editor.session.getMode().$id === 'brace/mode/javascript') {
        if (!editor.session.$worker) {
          editor.session.$worker.send('setOptions', [
            {
              esversion: 9,
              esnext: false,
            },
          ])
        }
      }

      //  Autocomplete context
      const wordList = Object.getOwnPropertyNames(this.context).filter((w) =>
        w.startsWith('api')
      )

      const mappedWordList = wordList.map(function (word) {
        return {
          caption: word,
          value: word,
          meta: 'FlighSim',
        }
      })

      const staticWordCompleter = {
        getCompletions(editor, session, pos, prefix, callback) {
          callback(null, mappedWordList)
        },
      }
      editor.completers.push(staticWordCompleter)
    },
    reset() {
      if (!window.cache) {
        return
      }
      window.cache.forEach((n) => window.clearTimeout(n))
      window.cache.length = []
      this.isRunning = false
    },
    codeInterpret(context, code) {
      if (!code) {
        return
      }

      try {
        this.isRunning = true
        if (!window.cache) {
          window.cache = []
        } // will store all timeouts IDs
        // eslint-disable-next-line no-new-func
        const userScript = new Function(
          `"use strict";

let cache = window.cache,
    _set = window.setTimeout,      // save original reference
    _clear = window.clearTimeout  // save original reference

// Wrap original setTimeout with a function
const setTimeout = function( CB, duration, arg ){
    // also, wrap the callback, so the cache reference will be removed
    // when the timeout has reached (fired the callback)
    const id = _set(function(){
        CB.apply(null, arguments)
        removeCacheItem(id)
    }, duration || 0, arg)

    window.cache.push( id ) // store reference in the cache array

    // id reference must be returned to be able to clear it
    return id
}

// Wrap original clearTimeout with a function
const clearTimeout = function( id ){
    _clear(id)
    removeCacheItem(id)
}

// Add a custom function named "clearTimeouts" to the "window" object
const clearTimeouts = function(){
    console.log("Clearing " + window.cache.length + " timeouts")
    window.cache.forEach(n => _clear(n))
    window.cache.length = []
}

// removes a specific id from the cache array
function removeCacheItem( id ){
    const idx = window.cache.indexOf(id)

    if( idx > -1 )
        window.cache = window.cache.filter(n => n != id )
}

function api_waitForCondition(conditionFunction) {
    const poll = (resolve) => {
        if (conditionFunction()) resolve()
        else setTimeout((_) => poll(resolve), 400)
    }
    return new Promise(poll)
}
function api_waitFor(ms) {
    const poll = (resolve) => {
        setTimeout((_) => resolve(), ms)
    }
    return new Promise(poll)
}

clearTimeouts()
return async function(){${code}};`
        )

        // Calling the function
        userScript()
          .call(context)
          .then(() => {
            this.$emit('finish')
          })
          .catch((e) => {
            this.$emit('error', e)
          })
          .finally(() => (this.isRunning = false))
      } catch (error) {
        this.$emit('error', error)
        this.isRunning = false
      }
    },
  },
}
</script>

<style></style>
