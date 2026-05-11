<script setup lang="ts">
import NginxDashboard from './components/NginxDashboard.vue'
</script>

<template>
  <NginxDashboard />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100%;
}
</style>
