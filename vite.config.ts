import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import transpileCorePlugin from './vite-plugin-transpile-core';
import { execSync } from 'child_process'

// Execute git command to get the short SHA
const gitHash = execSync('git rev-parse --short HEAD').toString().trim()

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), checker({
    // e.g. use TypeScript check
    vueTsc: true,
  }),
transpileCorePlugin()],
  define: {
    'import.meta.env.VITE_GIT_SHA': JSON.stringify(
      process.env.VITE_GIT_SHA ?? getGitSha()
    ),
  },
  server: {
    // Work around for peerJs connection in dev setup
    host: "127.0.0.1",
  },
})
