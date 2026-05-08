import { createApp } from 'vue'
import App from '@/App.vue'
// Vuetify
import 'vuetify/styles/core'      // Reset and structure (Required first)
import 'vuetify/styles/colors'    // Optional: standard color classes
import 'vuetify/styles/utilities' // Optional: helper classes
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi', // This is already the default value - only for display purposes
  },
})

createApp(App).use(vuetify).mount('#app')
