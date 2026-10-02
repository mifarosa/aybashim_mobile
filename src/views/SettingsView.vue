<template>
  <div class="view">
    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Profil</p>
          <h2>Ad soyad</h2>
        </div>
      </header>
      <form class="stack" @submit.prevent="saveName">
        <label>
          Ad Soyad
          <input v-model="fullName" autocomplete="name" placeholder="Örn. Ayşe Yılmaz" />
        </label>
        <p class="hint">
          Kendi hesapların arasındaki EFT/havale/FAST işlemlerini ayırmak için kullanılır. Bu işlemler gelir-giderden
          çıkarılır ve "Kendime" sekmesinde görünür.
        </p>
        <button type="submit" class="primary" :disabled="fullName.trim() === state.settings.fullName">Kaydet</button>
      </form>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Görünüm</p>
          <h2>Gizlilik</h2>
        </div>
      </header>
      <label class="switch-row">
        <span>
          <strong>Açılışta tutarları gizle</strong>
          <small>Gizliyken bir tutara dokunarak birkaç saniye görebilirsin.</small>
        </span>
        <input type="checkbox" role="switch" :checked="state.settings.hideAmounts" @change="toggleHideAmounts" />
      </label>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Veri</p>
          <h2>Bu cihazdaki kayıtlar</h2>
        </div>
      </header>
      <dl class="info-list">
        <div><dt>İşlem</dt><dd>{{ transactionCount }}</dd></div>
        <div><dt>Yüklenen ekstre</dt><dd>{{ state.imports.length }}</dd></div>
        <div v-if="storage.usage != null"><dt>Kullanılan alan</dt><dd>{{ formatBytes(storage.usage) }}</dd></div>
        <div>
          <dt>Kalıcı depolama</dt>
          <dd :class="storage.persisted ? 'ok' : 'warn'">{{ storage.persisted ? 'Açık' : 'Kapalı' }}</dd>
        </div>
      </dl>
      <p v-if="!storage.persisted" class="hint">
        Kalıcı depolama kapalıyken tarayıcı yer açmak için verileri silebilir. Uygulamayı ana ekrana ekleyip izin vermek
        riski azaltır; yine de düzenli yedek al.
      </p>
      <button v-if="!storage.persisted" type="button" class="secondary block" @click="askPersistence">Kalıcı depolama iste</button>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Yedekleme</p>
          <h2>Yedek al ve geri yükle</h2>
        </div>
      </header>
      <p class="hint">
        Son yedek: <strong>{{ lastBackupText }}</strong>. Yedek dosyasını Drive, iCloud veya e-postana kaydedebilirsin.
        Dosya şifresizdir; güvenli bir yerde sakla.
      </p>
      <button type="button" class="primary block" :disabled="busy" @click="backup">
        <AppIcon name="download" :size="18" /> Yedek al
      </button>

      <div class="restore">
        <div class="view-toggle" role="radiogroup" aria-label="Geri yükleme türü">
          <button type="button" role="radio" :aria-checked="restoreMode === 'merge'" :class="{ active: restoreMode === 'merge' }" @click="restoreMode = 'merge'">Birleştir</button>
          <button type="button" role="radio" :aria-checked="restoreMode === 'replace'" :class="{ active: restoreMode === 'replace' }" @click="restoreMode = 'replace'">Değiştir</button>
        </div>
        <p class="hint">
          {{ restoreMode === 'merge'
            ? 'Mevcut kayıtlar korunur, yedekte olup burada olmayan işlemler eklenir.'
            : 'Bu cihazdaki tüm işlemler silinir ve yedekteki veriler yüklenir.' }}
        </p>
        <label class="secondary block file-button">
          <AppIcon name="upload" :size="18" /> Yedekten geri yükle
          <input ref="restoreInput" type="file" accept="application/json,.json" :disabled="busy" @change="restore" />
        </label>
      </div>
    </section>

    <section class="card danger-zone">
      <header class="card-header">
        <div>
          <p class="eyebrow">Dikkat</p>
          <h2>Tüm verileri sil</h2>
        </div>
      </header>
      <p class="hint">İşlemler, yükleme geçmişi ve ayarlar bu cihazdan kalıcı olarak silinir.</p>
      <button type="button" class="danger block" :disabled="busy" @click="wipe">
        <AppIcon name="trash" :size="18" /> Tüm verileri sil
      </button>
    </section>

    <p class="about">
      aybashim {{ version }} · Veriler yalnızca bu cihazda saklanır, hiçbir sunucuya gönderilmez.
    </p>
  </div>
</template>

<script setup>
import { computed, onActivated, reactive, ref, watch } from 'vue';
import AppIcon from '../components/AppIcon.vue';
import { APP_BUILD, APP_VERSION } from '../diagnostics.js';
import {
  downloadBackup,
  notify,
  requestPersistentStorage,
  restoreFromFile,
  selfTransfers,
  state,
  storageStatus,
  transactions,
  updateSettings,
  wipeAllData
} from '../store.js';

const version = `${APP_VERSION} (${APP_BUILD})`;

const fullName = ref(state.settings.fullName);
const busy = ref(false);
const restoreMode = ref('merge');
const restoreInput = ref(null);
const storage = reactive({ persisted: false, usage: null, quota: null });

watch(() => state.settings.fullName, (value) => {
  fullName.value = value;
});

const transactionCount = computed(() => transactions.value.length + selfTransfers.value.length);

const lastBackupText = computed(() => {
  if (!state.settings.lastBackupAt) return 'hiç alınmadı';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(state.settings.lastBackupAt));
});

async function refreshStorage() {
  Object.assign(storage, await storageStatus());
}

onActivated(refreshStorage);
refreshStorage();

async function saveName() {
  await updateSettings({ fullName: fullName.value.trim() });
  notify('Ad soyad kaydedildi, işlemler yeniden kategorilendirildi.', 'success');
}

async function toggleHideAmounts(event) {
  const hideAmounts = event.target.checked;
  await updateSettings({ hideAmounts });
  state.amountsHidden = hideAmounts;
}

async function askPersistence() {
  const granted = await requestPersistentStorage();
  await refreshStorage();
  notify(
    granted ? 'Kalıcı depolama açıldı.' : 'Tarayıcı izin vermedi. Uygulamayı ana ekrana ekleyip tekrar dene.',
    granted ? 'success' : 'error'
  );
}

async function backup() {
  busy.value = true;
  try {
    if (await downloadBackup()) notify('Yedek hazırlandı.', 'success');
  } catch (error) {
    notify(error?.message || 'Yedek alınamadı.', 'error');
  } finally {
    busy.value = false;
  }
}

async function restore(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const confirmed = restoreMode.value === 'merge'
    || window.confirm('Bu cihazdaki tüm işlemler silinip yedekteki veriler yüklenecek. Devam edilsin mi?');
  if (!confirmed) {
    restoreInput.value.value = '';
    return;
  }

  busy.value = true;
  try {
    const { added, duplicates, skipped } = await restoreFromFile(file, restoreMode.value);
    const parts = [`${added} işlem eklendi`];
    if (duplicates) parts.push(`${duplicates} zaten vardı`);
    if (skipped) parts.push(`${skipped} geçersiz kayıt atlandı`);
    notify(`${parts.join(', ')}.`, 'success');
    await refreshStorage();
  } catch (error) {
    notify(error?.message || 'Yedek yüklenemedi.', 'error');
  } finally {
    busy.value = false;
    restoreInput.value.value = '';
  }
}

async function wipe() {
  if (!window.confirm('Tüm veriler bu cihazdan silinecek. Yedeğin yoksa geri getirilemez. Emin misin?')) return;
  if (!window.confirm('Son onay: tüm veriler silinsin mi?')) return;
  busy.value = true;
  try {
    await wipeAllData();
    notify('Tüm veriler silindi.', 'success');
  } finally {
    busy.value = false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
</script>
