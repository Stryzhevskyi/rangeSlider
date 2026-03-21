import { defineConfig } from 'vite'
import { resolve } from 'path'
import pkg from './package.json'

export default defineConfig({
  define: {
    VERSION: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/range-slider.js'),
      name: 'rangeSlider',
      formats: ['umd', 'es'],
      fileName: (format) => format === 'es' ? 'range-slider.esm.js' : 'range-slider.js',
      cssFileName: 'range-slider',
    },
    sourcemap: true,
    cssCodeSplit: false,
  },
  server: {
    port: 8000,
    open: '/example/index.html',
  },
})
