// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'


const app = createApp(App)

// Use the router
app.use(router)

app.mount('#app')