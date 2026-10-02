<template>
  <div v-if="needRefresh" class="update-banner" role="status">
    <span>Yeni sürüm hazır.</span>
    <button type="button" class="primary compact" @click="updateServiceWorker(true)">Güncelle</button>
    <button type="button" class="icon-button" aria-label="Kapat" @click="needRefresh = false">
      <AppIcon name="x" :size="18" />
    </button>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { notify } from '../store.js';
import AppIcon from './AppIcon.vue';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    // Installed PWAs can stay open for days; check for new versions periodically and
    // whenever the app comes back to the foreground.
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }
});

watch(offlineReady, (ready) => {
  if (ready) notify('Uygulama çevrimdışı kullanıma hazır.', 'success');
});
</script>
