<template>
  <div class="view">
    <section class="card">
      <header class="card-header">
        <div>
          <p class="eyebrow">Ekstre yükle</p>
          <h2>Ekstre dosyasını seç</h2>
        </div>
      </header>

      <label :class="['file-drop', { loaded: loaded }]">
        <span v-if="reading" class="spinner large" aria-hidden="true"></span>
        <AppIcon v-else name="file" :size="28" />
        <span v-if="reading">Dosya okunuyor…</span>
        <span v-else-if="loaded" class="file-name">{{ loaded.fileName }}</span>
        <span v-else>PDF veya Excel ekstresi seç</span>
        <small>{{ loaded ? 'Başka bir dosya seçmek için dokun.' : 'Banka otomatik algılanır. Dosya bu cihazda okunur, hiçbir yere gönderilmez.' }}</small>
        <input ref="fileInput" type="file" :accept="FILE_ACCEPT" :disabled="reading || busy" @change="onFileChange" />
      </label>

      <template v-if="loaded">
        <div :class="['detect-note', detection.code ? 'found' : 'unsure']" role="status">
          <AppIcon :name="detection.code ? 'check' : 'alert'" :size="20" />
          <p v-if="detection.code">
            <strong>{{ bankLabel(detection.code) }}</strong> ekstresi {{ detection.reason === 'marker' ? 'algılandı' : 'olarak tahmin edildi' }}
            · {{ detection.counts[detection.code] }} işlem bulundu.
          </p>
          <p v-else-if="detection.reason === 'ambiguous'">Banka kesin olarak anlaşılamadı. Aşağıdan bankayı seç.</p>
          <p v-else>Bu dosyada desteklenen bir ekstre biçimi bulunamadı.</p>
        </div>

        <RawTextPanel v-if="detection.reason === 'none' && loaded.text" :text="loaded.text" />

        <template v-if="detection.reason !== 'none'">
          <p class="hint">{{ detection.code ? 'Yanlışsa bankayı değiştir:' : 'Banka:' }}</p>
          <div class="bank-grid" role="radiogroup" aria-label="Banka">
            <button
              v-for="bank in banksForFile"
              :key="bank.code"
              type="button"
              role="radio"
              :aria-checked="bankCode === bank.code"
              :class="['bank-card', { active: bankCode === bank.code }]"
              @click="bankCode = bank.code"
            >
              <span class="bank-mark">{{ bank.mark }}</span>
              <span class="bank-text">
                <strong>{{ bank.label }}</strong>
                <small>{{ detection.counts[bank.code] }} işlem</small>
              </span>
            </button>
          </div>

          <button type="button" class="primary block" :disabled="!bankCode || busy" @click="runImport">
            <span v-if="busy" class="spinner" aria-hidden="true"></span>
            {{ busy ? 'Kaydediliyor…' : bankCode ? `${detection.counts[bankCode]} işlemi yükle` : 'Önce bankayı seç' }}
          </button>
        </template>
      </template>
    </section>

    <section v-if="readError" class="card result-card warn" role="alert">
      <header class="card-header">
        <div>
          <p class="file-label">{{ readError.fileName }}</p>
          <h2>Dosya okunamadı</h2>
        </div>
      </header>
      <p class="hint">{{ readError.message }}</p>
      <p class="hint">Sorun sürerse aşağıdaki teknik bilgiyi kopyalayıp gönder; kişisel veri içermez.</p>
      <textarea readonly rows="7" :value="readError.details"></textarea>
      <button type="button" class="secondary compact" @click="copyDetails">
        <AppIcon name="copy" :size="18" /> Kopyala
      </button>
    </section>

    <section v-if="lastResult" :class="['card', 'result-card', lastResult.result.savedCount > 0 ? 'success' : 'warn']" aria-live="polite">
      <header class="card-header">
        <div>
          <p class="file-label">{{ lastResult.fileName }} · {{ bankLabel(lastResult.bankCode) }}</p>
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
          Yanlış banka seçilmiş olabilir; öyleyse yüklemeyi geri al ve doğru bankayla tekrar dene.
        </p>
      </div>

      <template v-if="lastResult.result.parsedCount === 0">
        <p class="hint">
          Bu dosyada işlem satırı bulunamadı. Banka ekstre formatını değiştirmiş olabilir; aşağıdaki metin sorunun
          bulunmasına yardım eder.
        </p>
        <RawTextPanel v-if="lastResult.text" :text="lastResult.text" />
      </template>

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
import RawTextPanel from '../components/RawTextPanel.vue';
import { BANKS, FILE_ACCEPT, findBank } from '../core/parsers/index.js';
import { describeError } from '../diagnostics.js';
import { importStatement, loadStatement, notify, removeImport, state } from '../store.js';

const fileInput = ref(null);
const loaded = ref(null);
const bankCode = ref(null);
const reading = ref(false);
const busy = ref(false);
const lastResult = ref(null);
const readError = ref(null);

const detection = computed(() => loaded.value?.detection);
const banksForFile = computed(() => BANKS.filter((bank) => bank.format === loaded.value?.format));

const resultTitle = computed(() => {
  const { savedCount, duplicateCount, parsedCount } = lastResult.value.result;
  if (savedCount > 0) return `${savedCount} işlem eklendi`;
  if (parsedCount > 0 && duplicateCount > 0) return 'Tüm işlemler zaten kayıtlı';
  return 'İşlem bulunamadı';
});

function resetFile() {
  loaded.value = null;
  bankCode.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

async function onFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  lastResult.value = null;
  readError.value = null;
  loaded.value = null;
  bankCode.value = null;
  reading.value = true;
  try {
    const statement = await loadStatement(file);
    loaded.value = statement;
    bankCode.value = statement.detection.code;
  } catch (error) {
    readError.value = { fileName: file.name, message: error?.message || 'Dosya okunamadı.', details: describeError(error) };
    resetFile();
  } finally {
    reading.value = false;
  }
}

async function runImport() {
  if (!loaded.value || !bankCode.value) return;
  busy.value = true;
  const statement = loaded.value;
  const code = bankCode.value;
  try {
    const result = await importStatement(statement, code);
    lastResult.value = { result, text: statement.text, fileName: statement.fileName, bankCode: code };
    // A possible wrong bank warning is shown on the result card instead of a success toast.
    if (result.savedCount > 0 && !result.otherBankMatches) notify(`${result.savedCount} işlem eklendi.`, 'success');
    resetFile();
  } catch (error) {
    notify(error?.message || 'Ekstre kaydedilemedi.', 'error');
  } finally {
    busy.value = false;
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

async function copyDetails() {
  try {
    await navigator.clipboard.writeText(readError.value.details);
    notify('Teknik bilgi kopyalandı.', 'success');
  } catch {
    notify('Kopyalanamadı. Metni elle seçip kopyalayabilirsin.', 'error');
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
