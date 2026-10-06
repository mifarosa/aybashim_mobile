<template>
  <div class="view">
    <section v-if="outdatedImports.length > 0" class="notice notice-warn" role="alert">
      <AppIcon name="alert" />
      <div>
        <strong>Bazı tutarlar hatalı olabilir</strong>
        <p>
          {{ outdatedImports.length }} ING hesap ekstresi, sonradan düzeltilen eski bir okuyucuyla yüklenmiş. Bu kayıtları
          silip aynı dosyaları yeniden yükle; gelir ve gider ancak o zaman doğru görünür.
        </p>
        <button type="button" class="secondary compact" :disabled="cleaning" @click="cleanOutdated">
          <AppIcon name="trash" :size="18" /> Eski kayıtları sil
        </button>
      </div>
    </section>

    <section v-if="backupDue" class="notice notice-warn">
      <AppIcon name="shield" />
      <div>
        <strong>Yedek alma zamanı</strong>
        <p>Verilerin yalnızca bu cihazda. Telefon kaybolursa ya da tarayıcı verisi silinirse geri gelmez.</p>
        <button type="button" class="secondary compact" :disabled="backingUp" @click="backup">
          <AppIcon name="download" :size="18" /> Yedek al
        </button>
      </div>
    </section>

    <EmptyState
      v-if="transactions.length === 0"
      title="Henüz işlem yok"
      text="Bankandan indirdiğin ekstreyi yükle; işlemler otomatik kategorilendirilsin. Veriler yalnızca bu cihazda saklanır."
    >
      <button type="button" class="primary" @click="state.tab = 'upload'">
        <AppIcon name="upload" :size="18" /> Ekstre yükle
      </button>
    </EmptyState>

    <template v-else>
      <section class="card month-card">
        <div class="month-switch">
          <button type="button" class="icon-button" :disabled="!olderMonth" aria-label="Önceki ay" @click="selectMonth(olderMonth)">
            <AppIcon name="chevron-left" />
          </button>
          <label class="month-select">
            <span class="visually-hidden">Ay seç</span>
            <select v-model="selectedMonth">
              <option v-for="month in months" :key="month" :value="month">{{ formatMonth(month) }}</option>
            </select>
            <AppIcon name="chevron-down" :size="18" />
          </label>
          <button type="button" class="icon-button" :disabled="!newerMonth" aria-label="Sonraki ay" @click="selectMonth(newerMonth)">
            <AppIcon name="chevron-right" />
          </button>
        </div>

        <div class="net-total">
          <span>Net denge</span>
          <strong><MoneyAmount :value="totals.net" tone="net" /></strong>
        </div>

        <div class="split-totals">
          <button type="button" class="split-item income" @click="openTransactions('income', range)">
            <span>Gelir</span>
            <strong><MoneyAmount :value="totals.credit" /></strong>
            <small>{{ incomeCaption }}</small>
          </button>
          <button type="button" class="split-item expense" @click="openTransactions('expense', range)">
            <span>Gider</span>
            <strong><MoneyAmount :value="totals.debit" /></strong>
            <small>{{ expenseCaption }}</small>
          </button>
        </div>
      </section>

      <section class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Gider dağılımı</p>
            <h2>{{ formatMonth(selectedMonth) }}</h2>
          </div>
        </header>

        <template v-if="breakdown.items.length > 0">
          <DonutChart :items="breakdown.items">
            <span>Gider</span>
            <strong><MoneyAmount :value="breakdown.total" /></strong>
          </DonutChart>

          <ul class="legend">
            <li v-for="item in breakdown.items" :key="item.code">
              <component
                :is="item.code === 'OTHER_REST' ? 'div' : 'button'"
                :type="item.code === 'OTHER_REST' ? undefined : 'button'"
                class="legend-row"
                @click="item.code !== 'OTHER_REST' && openTransactions('expense', { ...range, subCategory: item.code })"
              >
                <i class="legend-dot" :style="{ background: item.color }"></i>
                <span class="legend-label">{{ item.label }}</span>
                <small>%{{ item.percent.toFixed(1) }}</small>
                <b><MoneyAmount :value="item.total" /></b>
              </component>
            </li>
          </ul>
        </template>
        <EmptyState v-else title="Bu ay gider yok" text="Seçili ay için gider hareketi bulunamadı." />
      </section>

      <section class="card">
        <header class="card-header">
          <div>
            <p class="eyebrow">Nakit akışı</p>
            <h2>Son aylar</h2>
          </div>
          <div class="bar-key">
            <span><i class="credit"></i>Gelir</span>
            <span><i class="debit"></i>Gider</span>
          </div>
        </header>
        <ul class="cashflow">
          <li v-for="row in cashflowRows" :key="row.month">
            <button type="button" :class="['cashflow-row', { active: row.month === selectedMonth }]" @click="selectMonth(row.month)">
              <span class="cashflow-month">{{ formatMonth(row.month, { short: true }) }}</span>
              <span class="cashflow-bars">
                <span class="bar credit" :style="{ width: `${row.creditPercent}%` }"></span>
                <span class="bar debit" :style="{ width: `${row.debitPercent}%` }"></span>
              </span>
              <MoneyAmount :value="row.net" tone="net" />
            </button>
          </li>
        </ul>
      </section>

      <section class="stat-grid">
        <button type="button" class="stat" @click="openTransactions('all')">
          <span>Toplam işlem</span>
          <strong>{{ transactions.length }}</strong>
        </button>
        <button type="button" class="stat" @click="openTransactions('self')">
          <span>Kendime transfer</span>
          <strong>{{ selfTransfers.length }}</strong>
        </button>
      </section>

      <CoffeeButton />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import AppIcon from '../components/AppIcon.vue';
import CoffeeButton from '../components/CoffeeButton.vue';
import DonutChart from '../components/DonutChart.vue';
import EmptyState from '../components/EmptyState.vue';
import MoneyAmount from '../components/MoneyAmount.vue';
import {
  expenseBreakdown,
  expenseSourceLabel,
  groupSources,
  incomeSourceLabel,
  expenseCents,
  isExpense,
  isIncome,
  monthKeys,
  monthTotals,
  monthlyRows,
  sourcesCaption
} from '../core/analytics.js';
import { currentMonthKey, formatMonth, monthKey, monthRange } from '../core/dates.js';
import {
  backupDue,
  downloadBackup,
  notify,
  openTransactions,
  outdatedImports,
  removeOutdatedImports,
  selfTransfers,
  state,
  transactions
} from '../store.js';

const CASHFLOW_MONTHS = 6;

const months = computed(() => monthKeys(transactions.value));

const selectedMonth = computed({
  get: () => state.summaryMonth,
  set: (value) => {
    state.summaryMonth = value;
  }
});

// Default to the current month, or the newest month with data.
watch(months, (list) => {
  if (list.length === 0 || list.includes(state.summaryMonth)) return;
  const current = currentMonthKey();
  state.summaryMonth = list.includes(current) ? current : list[0];
}, { immediate: true });

const monthIndex = computed(() => months.value.indexOf(selectedMonth.value));
const olderMonth = computed(() => months.value[monthIndex.value + 1] || null);
const newerMonth = computed(() => (monthIndex.value > 0 ? months.value[monthIndex.value - 1] : null));

function selectMonth(month) {
  if (month) selectedMonth.value = month;
}

const range = computed(() => {
  const { start, end } = monthRange(selectedMonth.value);
  return { startDate: start, endDate: end };
});

const totals = computed(() => monthTotals(transactions.value, selectedMonth.value));
const breakdown = computed(() => expenseBreakdown(transactions.value, selectedMonth.value));
const cashflowRows = computed(() => monthlyRows(transactions.value).slice(0, CASHFLOW_MONTHS));

const monthItems = computed(() => transactions.value.filter((tx) => monthKey(tx.date) === selectedMonth.value));
const incomeCaption = computed(() => sourcesCaption(groupSources(monthItems.value.filter(isIncome), incomeSourceLabel), 'Gelir kaydı yok'));
const expenseCaption = computed(() => sourcesCaption(groupSources(monthItems.value.filter(isExpense), expenseSourceLabel, expenseCents), 'Gider kaydı yok'));

const backingUp = ref(false);
const cleaning = ref(false);

async function cleanOutdated() {
  const names = outdatedImports.value.map((item) => item.fileName).join(', ');
  if (!window.confirm(`Şu yüklemeler ve işlemleri silinecek: ${names}. Sonra aynı dosyaları yeniden yüklemen gerekiyor. Devam edilsin mi?`)) return;
  cleaning.value = true;
  try {
    const removed = await removeOutdatedImports();
    notify(`${removed} işlem silindi. Şimdi ING hesap ekstrelerini yeniden yükle.`, 'success');
    state.tab = 'upload';
  } catch (error) {
    notify(error?.message || 'Silinemedi.', 'error');
  } finally {
    cleaning.value = false;
  }
}

async function backup() {
  backingUp.value = true;
  try {
    if (await downloadBackup()) notify('Yedek hazırlandı.', 'success');
  } catch (error) {
    notify(error.message || 'Yedek alınamadı.', 'error');
  } finally {
    backingUp.value = false;
  }
}
</script>
