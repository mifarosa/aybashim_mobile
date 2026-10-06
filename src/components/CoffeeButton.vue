<template>
  <div class="coffee">
    <p v-if="note">aybashim ücretsiz ve reklamsız.</p>
    <a class="coffee-pill" :href="COFFEE_URL" target="_blank" rel="noopener">
      <span aria-hidden="true">☕</span> Bana bir kahve ısmarla
    </a>
  </div>
</template>

<script setup>
// Same support link and look as the other mifarosa apps (e.g. E-Künye).
const COFFEE_URL = 'https://buymeacoffee.com/mifarosa';

defineProps({
  note: { type: Boolean, default: true }
});
</script>
