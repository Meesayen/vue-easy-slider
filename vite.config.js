const path = require('path')
const vue = require('@vitejs/plugin-vue')

module.exports = {
  plugins: [vue()],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'vue-easy-slider',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
}
