import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker'
import transpileCorePlugin from './vite-plugin-transpile-core';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), checker({
    // e.g. use TypeScript check
    vueTsc: true,
  }),
transpileCorePlugin()],
  server: {
    // Work around for peerJs connection in dev setup
    host: "127.0.0.1",
  },
})
