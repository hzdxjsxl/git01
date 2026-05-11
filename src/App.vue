<template>
  <div class="app">
    <Spreadsheet />
  </div>
</template>

<script setup lang="ts">
import Spreadsheet from './components/Spreadsheet.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #fafafa;
  color: #333;
}

.app {
  min-height: 100vh;
  background: #fafafa;
}
</style>
