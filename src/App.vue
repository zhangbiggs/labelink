<template>
  <v-app>
    <Graph />
  </v-app>
</template>

<script setup lang="ts">
import Graph from './components/Graph.vue';
// import { ref } from 'vue';
// const panels = ref(['dataSource', 'positionSize', 'printElement', 'barcodeSettings']);
</script>

<style>
.v-navigation-drawer .v-list-item {
  justify-content: center;
}
</style>
