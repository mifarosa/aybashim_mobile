<template>
  <div class="empty-state">
    <AppLogo :size="56" class="empty-visual" />
    <strong>{{ title }}</strong>
    <p v-if="text">{{ text }}</p>
    <slot />
  </div>
</template>

<script setup>
import AppLogo from './AppLogo.vue';

defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' }
});
</script>
