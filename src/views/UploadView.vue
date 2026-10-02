<template>
  <div class="view">
    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Ekstre yükle</p>
          <h2>Banka ve dosya seç</h2>
        </div>
      </header>

      <div class="bank-grid" role="radiogroup" aria-label="Banka">
        <button
          v-for="bank in BANKS"
          :key="bank.code"
          type="button"
          role="radio"
          :aria-checked="bankCode === bank.code"
          :class="['bank-card', { active: bankCode === bank.code }]"
          @click="selectBank(bank.code)"
        >
          <span class="bank-mark">{{ bank.mark }}</span>
          <span class="bank-text">
            <strong>{{ bank.label }}</strong>
            <small>{{ bank.detail }}</small>
          </span>
        </button>
      </div>

      <label class="file-drop">
        <AppIcon name="file" :size="28" />
        <span v-if="file" class="file-name">{{ file.name }}</span>
        <span v-else>{{ selectedBank.format === 'xls' ? 'Excel (.xls) dosyası seç' : 'PDF dosyası seç' }}</span>
        <small>Dosya bu cihazda okunur, hiçbir yere gönderilmez.</small>
        <input ref="fileInput" type="file" :accept="FILE_ACCEPT[selectedBank.format]" @change="onFileChange" />
      </label>

      <button type="button" class="primary block" :disabled="!file || busy" @click="runImport">
        <span v-if="busy" class="spinner" aria-hidden="true"></span>
        {{ busy ? 'Okunuyor…' : 'Yükle' }}
      </button>
    </section>

    <section v-if="lastResult" :class="['card', 'result-card', lastResult.result.savedCount > 0 ? 'success' : 'warn']" aria-live="polite">
      <header class="card-header">
        <div>
          <p class="file-label">{{ lastResult.fileName }}</p>
          <h2>{{ resultTitle }}</h2>
        </div>
      </header>
      <dl class="result-stats">
        <div><dt>Bulunan</dt><dd>{{ lastResult.result.parsedCount }}</dd></div>
        <div><dt>Eklenen</dt><dd>{{ lastResult.result.savedCount }}</dd></div>
        <div><dt>Zaten kayıtlı</dt><dd>{{ lastResult.result.duplicateCount }}</dd></div>
        <div v-if="lastResult.result.invalidCount"><dt>Okunamayan</dt><dd>{{ lastResult.result.invalidCount }}</dd></div>
      </dl>

      <div v-if="lastResult.result.savedCount > 0 && lastResult.result.otherBankMatches > 0" class="notice notice-warn">
        <AppIcon name="alert" />
        <p>
          Bu işlemlerin {{ lastResult.result.otherBankMatches }} tanesi başka bir banka adıyla zaten kayıtlı.
          Yanlış banka seçmiş olabilirsin; öyleyse yüklemeyi geri al ve doğru bankayla tekrar dene.
        </p>
      </div>

      <p v-if="lastResult.result.parsedCount === 0" class="hint">
        Bu dosyada işlem satırı bulunamadı. Doğru bankayı seçtiğinden emin ol. Banka ekstre formatını değiştirmiş olabilir;
        aşağıdaki metin sorunun bulunmasına yardım eder.
      </p>

      <div v-if="lastResult.text" class="raw-text">
        <button type="button" class="link-button" @click="showText = !showText">
          {{ showText ? 'Çıkarılan metni gizle' : 'Çıkarılan metni göster' }}
        </button>
        <template v-if="showText">
          <p class="hint">Bu metin kişisel bilgiler içerir. Paylaşmadan önce ad, hesap ve kart numaralarını sil.</p>
          <textarea readonly rows="10" :value="lastResult.text"></textarea>
          <button type="button" class="secondary compact" @click="copyText">
            <AppIcon name="copy" :size="18" /> Kopyala
          </button>
        </template>
      </div>

      <div v-if="lastResult.result.importId" class="result-actions">
        <button type="button" class="secondary" @click="state.tab = 'summary'">Özete git</button>
        <button type="button" class="secondary danger-text" @click="undoLastImport">Bu yüklemeyi geri al</button>
      </div>
    </section>

    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Geçmiş</p>
          <h2>Yüklenen ekstreler</h2>
        </div>
      </header>
      <ul v-if="state.imports.length > 0" class="import-list">
        <li v-for="item in state.imports" :key="item.id">
          <span class="import-text">
            <strong>{{ item.fileName || 'Adsız dosya' }}</strong>
            <small>{{ bankLabel(item.bankCode) }} · {{ formatTimestamp(item.importedAt) }} · {{ item.savedCount }} işlem</small>
          </span>
          <button type="button" class="icon-button danger" :aria-label="`${item.fileName} yüklemesini sil`" @click="remove(item)">
            <AppIcon name="trash" :size="20" />
          </button>
        </li>
      </ul>
      <p v-else class="hint">Henüz ekstre yüklenmedi.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import AppIcon from '../components/AppIcon.vue';
import { BANKS, FILE_ACCEPT, findBank } from '../core/parsers/index.js';
import { importStatement, notify, removeImport, state } from '../store.js';

const bankCode = ref(BANKS[0].code);
const file = ref(null);
const fileInput = ref(null);
const busy = ref(false);
const lastResult = ref(null);
const showText = ref(false);

const selectedBank = computed(() => findBank(bankCode.value));

const resultTitle = computed(() => {
  const { savedCount, duplicateCount, parsedCount } = lastResult.value.result;
  if (savedCount > 0) return `${savedCount} işlem eklendi`;
  if (parsedCount > 0 && duplicateCount > 0) return 'Tüm işlemler zaten kayıtlı';
  return 'İşlem bulunamadı';
});

function selectBank(code) {
  const formatChanged = findBank(code).format !== selectedBank.value.format;
  bankCode.value = code;
  if (formatChanged) resetFile();
}

function resetFile() {
  file.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function onFileChange(event) {
  file.value = event.target.files?.[0] || null;
}

async function runImport() {
  if (!file.value) return;
  busy.value = true;
  showText.value = false;
  const current = file.value;
  try {
    const { result, text } = await importStatement(current, bankCode.value);
    lastResult.value = { result, text, fileName: current.name };
    // A possible wrong bank warning is shown on the result card instead of a success toast.
    if (result.savedCount > 0 && !result.otherBankMatches) notify(`${result.savedCount} işlem eklendi.`, 'success');
    resetFile();
  } catch (error) {
    notify(error?.message || 'Ekstre okunamadı.', 'error');
  } finally {
    busy.value = false;
  }
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(lastResult.value.text);
    notify('Metin kopyalandı.', 'success');
  } catch {
    notify('Kopyalanamadı. Metni elle seçip kopyalayabilirsin.', 'error');
  }
}

async function remove(item) {
  const question = `"${item.fileName}" ile eklenen ${item.savedCount} işlem silinsin mi?`;
  if (!window.confirm(question)) return;
  try {
    const removed = await removeImport(item.id);
    if (lastResult.value?.result.importId === item.id) lastResult.value = null;
    notify(`${removed} işlem silindi.`, 'success');
  } catch (error) {
    notify(error?.message || 'Silinemedi.', 'error');
  }
}

async function undoLastImport() {
  const { importId } = lastResult.value.result;
  try {
    const removed = await removeImport(importId);
    lastResult.value = null;
    notify(`Yükleme geri alındı, ${removed} işlem silindi.`, 'success');
  } catch (error) {
    notify(error?.message || 'Geri alınamadı.', 'error');
  }
}

function bankLabel(code) {
  return findBank(code)?.label || code;
}

const timestampFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : timestampFormatter.format(date);
}
</script>
