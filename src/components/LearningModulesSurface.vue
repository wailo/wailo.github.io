<script setup lang="ts">
import { ref } from 'vue'
import Panel from './Panel.vue'
import Editor, { type ScriptStatus } from './Editor.vue'

type EditorInstance = InstanceType<typeof Editor>
type EditorProps = EditorInstance['$props']
type ContextObject = NonNullable<EditorProps['contextObject']>
type SimProps = NonNullable<EditorProps['simProps']>
type UtilityFuncs = NonNullable<EditorProps['utilityFuncs']>

const props = withDefaults(
  defineProps<{
    contextObject: ContextObject
    simProps: SimProps
    utilityFuncs: UtilityFuncs
    isDarkMode?: boolean
    aircraftType?: string
    status?: ScriptStatus
    active?: boolean
    variant?: 'panel' | 'drawer'
    panelId?: string
  }>(),
  {
    isDarkMode: false,
    aircraftType: 'UNKNOWN',
    status: 'IDLE',
    active: false,
    variant: 'panel',
    panelId: 'learning-modules',
  },
)

const emit = defineEmits<{
  (event: 'start', code: string, title: string): void
  (event: 'reset'): void
  (event: 'completed', title: string): void
  (event: 'error', error: any, title?: string): void
  (event: 'maximize', panelId: string): void
  (event: 'close'): void
}>()

const editorRef = ref<EditorInstance | null>(null)

const reset = () => editorRef.value?.reset()
const executeExternalCode = (...args: Parameters<EditorInstance['executeExternalCode']>) =>
  editorRef.value?.executeExternalCode(...args)

defineExpose({ reset, executeExternalCode })
</script>

<template>
  <Panel
    :panel-id="props.variant === 'panel' ? props.panelId : ''"
    :status="props.status"
    :active="props.active"
    @header-dblclick="props.variant === 'panel' && emit('maximize', props.panelId)"
  >
    <template #header-actions>
      <button
        v-if="props.variant === 'drawer'"
        type="button"
        class="flex h-full flex-none items-center px-1.5 text-sm leading-none text-secondary hover:text-primary"
        title="Close lessons"
        aria-label="Close lessons"
        @click.stop="emit('close')"
      >
        ×
      </button>
    </template>

    <template #Learning-Modules>
      <Editor
        ref="editorRef"
        :context-object="props.contextObject"
        :simProps="props.simProps"
        :is-dark-mode="props.isDarkMode"
        :aircraft-type="props.aircraftType"
        :utility-funcs="props.utilityFuncs"
        class="w-full h-full"
        @start="(code: string, title: string) => emit('start', code, title)"
        @reset="emit('reset')"
        @completed="(title: string) => emit('completed', title)"
        @error="(error: any, title?: string) => emit('error', error, title)"
      />
    </template>
  </Panel>
</template>
