<template>
  <div class="empty-state">
    <span class="empty-visual" aria-hidden="true">AY</span>
    <strong>{{ title }}</strong>
    <p v-if="text">{{ text }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' }
});
</script>
