<template>
    <!-- Render the parsed Markdown as HTML -->
    <div class="markdown" v-html="parsedHtml"></div>
  </template>
  
  <script lang="ts" setup>
  import { watch, PropType, ref } from 'vue'
  import { marked } from 'marked'
  
  // Configure marked options synchronously
  marked.setOptions({
    async: true,
    pedantic: false,
    gfm: true,
    breaks: true,
  })
  
  const reset = () => {
    parsedHtml.value = ''
}

  // Define props with runtime validation and TS typing
  const props = defineProps({
    content: {
      type: String as PropType<string>,
      required: true,
    },
  })

defineExpose({ reset });

const parsedHtml = ref<string>('')

// Watch the content prop and update parsedHtml when it changes
watch(
    () => props.content,
    async (newContent) => {
        if (newContent) {
            parsedHtml.value = await marked.parse(newContent)
        }
    },
    { immediate: true }
)

  </script>
  
  <style>


  .markdown {
    /* Base styles */
    line-height: 1.6;
    /* background-color: whitesmoke; */
    /* color: black; */
  }
  
  /* Headings */

  .markdown h1 { font-size: 2em; margin: 1em 0 0.5em;  }
  .markdown h2 { font-size: 1.75em !important; margin: 1em 0 0.5em; margin: 0;}
  .markdown h3 { font-size: 1.5em; margin: 1em 0 0.5em; }
  .markdown h4 { font-size: 1.25em; margin: 1em 0 0.5em; }
  .markdown h5 { font-size: 1em; margin: 1em 0 0.5em; }
  .markdown h6 { font-size: 0.875em; margin: 1em 0 0.5em; }
  .markdown p  { font-size: 1.25em; margin: 0.1em 0 0.1em;  }
  .markdown ol {
    list-style-type: decimal;
    margin-left: 1.5em;
  }
  .markdown ul {
    list-style-type: disc;
    margin-left: 1.5em;
  }
  
  /* Code blocks */
  .markdown pre {
    background: #f6f8fa;
    padding: 1em;
    overflow: auto;
    border-radius: 4px;
  }
  
  /* Tables */
  .markdown table {
    border-collapse: collapse;
    width: 100%;
  }
  .markdown th,
  .markdown td {
    border: 1px solid #dfe2e5;
    padding: 0.5em 1em;
  }
  </style>
