<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('🚀 App mounted - Survey application started')
})
</script>

<template>
  <div id="app">
    <!-- Vue Router will render components here -->
    <router-view />
  </div>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #00274C;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

/* Global button styles */
.btn {
  background: #00274C;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn:hover:not(:disabled) {
  background: #003366;
  transform: translateY(-2px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Global utility classes */
.loading {
  text-align: center;
  padding: 40px;
  color: #00274C;
}

.error {
  background: #fed7d7;
  color: #c53030;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.success {
  background: #c6f6d5;
  color: #276749;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}
</style>