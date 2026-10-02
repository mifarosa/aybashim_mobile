<template>
  <img class="app-logo" :src="logoUrl" :width="size" :height="size" alt="" aria-hidden="true" />
</template>

<script setup>
import logoUrl from '../assets/logo.svg';

defineProps({
  size: { type: [Number, String], default: 24 }
});
</script>
