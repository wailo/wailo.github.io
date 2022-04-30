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
    <b-button @click="() => codeInterpret(context)">Run Script</b-button>
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
    completeCallback: {
      type: Function,
      default: null,
    },
    errorCallback: {
      type: Function,
      default: null,
    },
  },
  data() {
    return {
      content: `this.api_setSimulationReset()
await api_waitFor(400)
await api_waitForCondition(() => this.api_autopilot)
this.api_setAltitudeHold(true)
this.api_setSimulationSpeed(100)
this.api_setBankHold(true)
this.api_setBankHoldValue(30)
this.api_setVerticalSpeedHold(true)
this.api_setVerticalSpeedValue(500)
this.api_setSpeedHold(true)
const dampSimulationSpeed = () =>{
    this.api_setSimulationSpeed(this.api_theta_deg)
        setTimeout(() => {
            dampSimulationSpeed()
        }, 1000);
}
dampSimulationSpeed()
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
    codeInterpret(context) {
      if (!this.content) {
        return
      }

      try {
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
return async function(){${this.content}};`
        )
        userScript()
          .call(context)
          .then((response) => {
            if (this.completeCallback) {
              this.completeCallback()
            }
          })
          .catch((e) => {
            if (this.errorCallback) {
              this.errorCallback(e)
            }
          })
      } catch (error) {
        this.notifyUser('Script Error', error.message, 3000)
      }
    },
  },
}
</script>

<style></style>
