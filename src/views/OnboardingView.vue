<template>
  <div class="onboarding">
    <div class="onboarding-hero" aria-hidden="true">
      <img :src="heroImage" alt="" width="960" height="540" />
    </div>

    <div class="onboarding-body">
      <p class="eyebrow brand">aybashim</p>
      <h1>Ay sonunu beklemeden akışı gör.</h1>
      <p class="lead">Ekstrelerini yükle, gelir ve giderini sakin bir panelde izle.</p>

      <ul class="feature-list">
        <li><AppIcon name="shield" /> <span><strong>Verilerin cihazında kalır.</strong> Hesap yok, sunucu yok; ekstreler telefonunda okunur.</span></li>
        <li><AppIcon name="upload" /> <span><strong>ING, A101 Hadi ve Garanti</strong> ekstrelerini PDF/XLS olarak yükle.</span></li>
        <li><AppIcon name="list" /> <span><strong>Otomatik kategoriler</strong> ile neyin nereye gittiğini tek bakışta gör.</span></li>
      </ul>

      <form class="stack" @submit.prevent="start">
        <label>
          <span>Ad Soyad <span class="optional">(önerilir)</span></span>
          <input v-model="fullName" autocomplete="name" placeholder="Örn. Ayşe Yılmaz" />
        </label>
        <p class="hint">Kendi hesapların arasındaki transferleri gelir-giderden ayırmak için kullanılır.</p>
        <button type="submit" class="primary block" :disabled="busy">Başla</button>
      </form>

      <label class="link-button file-button restore-link">
        Yedeğim var, geri yükle
        <input type="file" accept="application/json,.json" :disabled="busy" @change="restore" />
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import heroImage from '../assets/finance-hero.webp';
import AppIcon from '../components/AppIcon.vue';
import { completeOnboarding, notify, requestPersistentStorage, restoreFromFile } from '../store.js';

const fullName = ref('');
const busy = ref(false);

async function start() {
  busy.value = true;
  try {
    await completeOnboarding(fullName.value);
  } catch (error) {
    notify(error?.message || 'Kaydedilemedi.', 'error');
  } finally {
    busy.value = false;
  }
}

async function restore(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const { added } = await restoreFromFile(file, 'replace');
    await requestPersistentStorage();
    notify(`${added} işlem geri yüklendi.`, 'success');
  } catch (error) {
    notify(error?.message || 'Yedek yüklenemedi.', 'error');
    event.target.value = '';
  } finally {
    busy.value = false;
  }
}
</script>
