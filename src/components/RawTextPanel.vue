<template>
  <div class="raw-text">
    <button type="button" class="link-button" @click="open = !open">
      {{ open ? 'Çıkarılan metni gizle' : 'Çıkarılan metni göster' }}
    </button>
    <template v-if="open">
      <p class="hint">Bu metin kişisel bilgiler içerir. Paylaşmadan önce ad, hesap ve kart numaralarını sil.</p>
      <textarea readonly rows="10" :value="text"></textarea>
      <button type="button" class="secondary compact" @click="copy">
        <AppIcon name="copy" :size="18" /> Kopyala
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { notify } from '../store.js';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  text: { type: String, required: true }
});

const open = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text);
    notify('Metin kopyalandı.', 'success');
  } catch {
    notify('Kopyalanamadı. Metni elle seçip kopyalayabilirsin.', 'error');
  }
}
</script>
