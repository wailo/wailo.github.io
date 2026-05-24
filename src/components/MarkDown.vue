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
    /* Base terminal configuration */
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.7rem; 
    line-height: 1.3; 
    padding: 0.15rem; 
    border-radius: 0.25rem;

    /* Base theme mapping using your global Tailwind design tokens */
    background-color: rgb(var(--color-panelContentBackground));
    color: rgb(var(--color-secondary));
  }
  
  /* Headings styled like the "NEW CHOICE" panel in your image */
  .markdown h1, 
  .markdown h2, 
  .markdown h3, 
  .markdown h4, 
  .markdown h5, 
  .markdown h6 {
    display: inline-block; 
    background-color: rgb(var(--color-panelHeaderBackground)); 
    color: rgb(var(--color-secondary)) !important; 
    padding: 0.15em 0.4em; 
    border: 1px solid rgb(var(--color-panelBorder)); 
    border-radius: 4px; 
    font-weight: bold;
    text-transform: uppercase; 
    clear: both;
    margin-left: 0; 
  }

  /* Structural scaling for stacked headings - Uniformly minimized spacing */
  .markdown h1 { font-size: 1.35em; margin: 0.3em 0 0.15em; }
  .markdown h2 { font-size: 1.1em; margin: 0.3em 0 0.15em; }
  .markdown h3 { font-size: 1.05em; margin: 0.3em 0 0.15em; }
  .markdown h4, .markdown h5, .markdown h6 { font-size: 1em; margin: 0.3em 0 0.15em; }
  

  /* Ensure adjacent content wraps and breaks without empty vertical gaps
  .markdown h1 + *, .markdown h2 + *, .markdown h3 + *, .markdown h4 + *, .markdown h5 + *, .markdown h6 + * {
    margin-top: 0.25em !important; 
  } */
  
  /* Paragraphs and links */
  .markdown p  { font-size: 1em; margin: 0.15em 0; padding: 0.1em 0; }
  .markdown a  { color: rgb(var(--color-simActiveButton)); text-decoration: underline; }
  
  /* Container spacing for lists */
  .markdown ol, .markdown ul {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
    padding-left: 0; 
  }

  /* List items: Standardized layout engine using flex to preserve straight vertical line margins */
  .markdown ol li,
  .markdown ul li {
    display: flex; 
    align-items: flex-start;
    margin-bottom: 0.2em;
    line-height: 1.3;
  }

  /* Ordered list numbering */
  .markdown ol { list-style-type: none; }
  .markdown ol li::before {
    content: var(--list-counter, "• ");
    display: inline-block;
    width: 1.2em; 
    flex-shrink: 0;
    color: rgb(var(--color-secondary));
  }

  /* Unordered lists - Enforces uniform indentation for wrapped lines */
  .markdown ul { list-style-type: none; }
  .markdown ul li::before {
    content: "• "; /* Matches the bullet symbol from your screenshot */
    display: inline-block;
    width: 1.1em; /* Bounding column width keeps wrapped lines aligned perfectly */
    flex-shrink: 0;
    color: rgb(var(--color-simActiveButton)); /* Gives bullet your accent green color */
    font-weight: bold;
  }
  
  /* Code blocks and inline code */
  .markdown pre {
    background: rgb(var(--color-simInputBackground));
    padding: 0.4em 0.5em; 
    overflow: auto;
    border: 1px solid rgb(var(--color-simElementBorder));
    border-radius: 3px;
    margin: 0.25em 0;
  }
  .markdown code {
    font-family: inherit;
    color: rgb(var(--color-secondary));
  }
  
  /* Tables styled like text-based database logs */
  .markdown table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.3em 0;
  }
  .markdown th,
  .markdown td {
    border: 1px dashed rgb(var(--color-panelBorder));
    padding: 0.2em 0.3em; 
    text-align: left;
  }
  .markdown th {
    color: rgb(var(--color-simActiveButton));
    border-bottom: 1px solid rgb(var(--color-simActiveButton)); 
  }

  /* Terminal Theme Scrollbar Customization - Removes the harsh white native look */
  .markdown ::-webkit-scrollbar {
    height: 4px;
    width: 4px;
  }
  .markdown ::-webkit-scrollbar-track {
    background: rgb(var(--color-simBackground)); /* Seamless track background blend */
  }
  .markdown ::-webkit-scrollbar-thumb {
    background: rgb(var(--color-panelBorder)); /* Blends with borders */
    border-radius: 2px;
  }
  .markdown ::-webkit-scrollbar-thumb:hover {
    background: rgb(var(--color-simElementBorder)); /* Highlights on interaction */
  }
</style>
