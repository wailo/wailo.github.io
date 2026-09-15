import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import transpileCorePlugin from './vite-plugin-transpile-core'
import { execSync } from 'child_process'
import vueDevTools from 'vite-plugin-vue-devtools'
import cesium from 'vite-plugin-cesium'

function getGitSha() {
  const sha = process.env.VITE_GIT_SHA ?? execSync('git rev-parse HEAD').toString().trim()
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha))
    throw new Error('VITE_GIT_SHA must be a full Git commit SHA')
  return sha
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      vueDevTools(),
      vue(),
      cesium(),
      checker({
        // e.g. use TypeScript check
        vueTsc: true,
      }),
      transpileCorePlugin(),
    ],
    define: {
      'import.meta.env.VITE_GIT_SHA': JSON.stringify(getGitSha()),
    },
    server: {
      // Work around for peerJs connection in dev setup
      host: '127.0.0.1',
    },
  }
})
