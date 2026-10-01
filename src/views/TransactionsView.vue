<template>
  <div class="view">
    <div class="segmented" role="tablist" aria-label="İşlem türü">
      <button
        v-for="option in SEGMENTS"
        :key="option.value"
        type="button"
        role="tab"
        :aria-selected="segment === option.value"
        :class="{ active: segment === option.value }"
        @click="setSegment(option.value)"
      >{{ option.label }}</button>
    </div>

    <div class="search-row">
      <label class="search-field">
        <AppIcon name="search" :size="18" />
        <span class="visually-hidden">Açıklamada ara</span>
        <input v-model="filters.keyword" type="search" placeholder="Açıklamada ara" enterkeyhint="search" />
      </label>
      <button
        type="button"
        :class="['icon-button', 'filter-button', { active: showFilters || activeFilterCount > 0 }]"
        :aria-expanded="showFilters"
        aria-label="Filtreler"
        @click="showFilters = !showFilters"
      >
        <AppIcon name="filter" />
        <span v-if="activeFilterCount > 0" class="count-dot">{{ activeFilterCount }}</span>
      </button>
    </div>

    <section v-if="showFilters" class="card filter-panel">
      <label v-if="segment === 'all'">
        Tip
        <select v-model="filters.type">
          <option value="">Tümü</option>
          <option value="DEBIT">Giden</option>
          <option value="CREDIT">Gelen</option>
        </select>
      </label>
      <label>
        Banka
        <select v-model="filters.bankName">
          <option value="">Tüm bankalar</option>
          <option v-for="bank in bankOptions" :key="bank" :value="bank">{{ bank }}</option>
        </select>
      </label>
      <label v-if="segment === 'all'">
        Ana kategori
        <select v-model="filters.mainCategory">
          <option value="">Tümü</option>
          <option v-for="code in mainCategoryOptions" :key="code" :value="code">{{ categoryLabel(code) }}</option>
        </select>
      </label>
      <label>
        Alt kategori
        <select v-model="filters.subCategory">
          <option value="">Tümü</option>
          <option v-for="code in subCategoryOptions" :key="code" :value="code">{{ categoryLabel(code) }}</option>
        </select>
      </label>
      <div class="date-range">
        <label>
          Başlangıç
          <input v-model="filters.startDate" type="date" />
        </label>
        <label>
          Bitiş
          <input v-model="filters.endDate" type="date" />
        </label>
      </div>
      <label>
        Sıralama
        <select v-model="sort">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <button type="button" class="secondary block" :disabled="activeFilterCount === 0 && !filters.keyword" @click="clearFilters">
        Filtreleri temizle
      </button>
    </section>

    <div class="list-summary">
      <span>{{ filtered.length }} işlem</span>
      <span v-if="totals.credit > 0">Gelen <MoneyAmount :value="totals.credit" tone="credit" /></span>
      <span v-if="totals.debit > 0">Giden <MoneyAmount :value="totals.debit" tone="debit" /></span>
    </div>

    <div v-if="supportsSources" class="view-toggle" role="group" aria-label="Görünüm">
      <button type="button" :class="{ active: mode === 'list' }" @click="mode = 'list'">Liste</button>
      <button type="button" :class="{ active: mode === 'sources' }" @click="mode = 'sources'">Kaynaklar</button>
    </div>

    <ul v-if="supportsSources && mode === 'sources'" class="source-list">
      <li v-for="source in sources" :key="source.key" class="source-row">
        <CategoryBadge :category="source.category" />
        <span class="source-text">
          <strong>{{ source.label }}</strong>
          <small>{{ source.count }} işlem · {{ source.bankName }}</small>
        </span>
        <MoneyAmount :value="source.total" />
      </li>
      <li v-if="sources.length === 0">
        <EmptyState title="Kaynak bulunamadı" text="Filtreleri değiştirmeyi deneyin." />
      </li>
    </ul>

    <TransactionList v-else :items="sorted" :empty-text="emptyText" />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import AppIcon from '../components/AppIcon.vue';
import CategoryBadge from '../components/CategoryBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import MoneyAmount from '../components/MoneyAmount.vue';
import TransactionList from '../components/TransactionList.vue';
import {
  EMPTY_FILTERS,
  expenseSourceLabel,
  filterTransactions,
  groupSources,
  incomeSourceLabel,
  isExpense,
  isIncome,
  sortTransactions,
  uniqueSorted
} from '../core/analytics.js';
import { categoryLabel } from '../core/categories.js';
import { toCents } from '../core/money.js';
import { selfTransfers, state, transactions } from '../store.js';

const SEGMENTS = [
  { value: 'all', label: 'Tümü' },
  { value: 'expense', label: 'Gider' },
  { value: 'income', label: 'Gelir' },
  { value: 'self', label: 'Kendime' }
];

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Tarih (yeniden eskiye)' },
  { value: 'date-asc', label: 'Tarih (eskiden yeniye)' },
  { value: 'amount-desc', label: 'Tutar (büyükten küçüğe)' },
  { value: 'amount-asc', label: 'Tutar (küçükten büyüğe)' },
  { value: 'description-asc', label: 'Açıklama (A-Z)' },
  { value: 'category-asc', label: 'Kategori (A-Z)' }
];

const EMPTY_TEXTS = {
  all: 'Filtreleri değiştirmeyi ya da yeni ekstre yüklemeyi deneyin.',
  expense: 'Gider kaydı bulunamadı.',
  income: 'Maaş ve ek gelir kayıtları burada görünür.',
  self: 'Ayarlar’daki ad soyadınla eşleşen EFT/havale/FAST işlemleri burada görünür.'
};

const segment = ref('all');
const mode = ref('list');
const sort = ref('date-desc');
const showFilters = ref(false);
const filters = reactive({ ...EMPTY_FILTERS });

const base = computed(() => {
  if (segment.value === 'expense') return transactions.value.filter(isExpense);
  if (segment.value === 'income') return transactions.value.filter(isIncome);
  if (segment.value === 'self') return selfTransfers.value;
  return transactions.value;
});

// Type and main category filters only apply to the "all" segment.
const effectiveFilters = computed(() => (
  segment.value === 'all' ? filters : { ...filters, type: '', mainCategory: '' }
));

const filtered = computed(() => filterTransactions(base.value, effectiveFilters.value));

const sorted = computed(() => {
  const [key, direction] = sort.value.split('-');
  return sortTransactions(filtered.value, key, direction);
});

const totals = computed(() => {
  let credit = 0;
  let debit = 0;
  for (const tx of filtered.value) {
    if (tx.type === 'CREDIT') credit += toCents(tx.amount);
    else debit += toCents(tx.amount);
  }
  return { credit: credit / 100, debit: debit / 100 };
});

const supportsSources = computed(() => segment.value === 'expense' || segment.value === 'income');

const sources = computed(() => groupSources(
  filtered.value,
  segment.value === 'income' ? incomeSourceLabel : expenseSourceLabel
));

const bankOptions = computed(() => uniqueSorted(base.value.map((tx) => tx.bankName)));
const byLabel = (codes) => [...new Set(codes)].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'tr'));
const mainCategoryOptions = computed(() => byLabel(base.value.map((tx) => tx.mainCategory)));
const subCategoryOptions = computed(() => byLabel(base.value.map((tx) => tx.subCategory)));

const activeFilterCount = computed(() => Object.entries(effectiveFilters.value)
  .filter(([key, value]) => key !== 'keyword' && value)
  .length);

const emptyText = computed(() => EMPTY_TEXTS[segment.value]);

function setSegment(value) {
  segment.value = value;
  mode.value = 'list';
}

function clearFilters() {
  Object.assign(filters, EMPTY_FILTERS);
}

// Applies segment and filters requested by another view.
watch(() => state.transactionsPreset, (preset) => {
  if (!preset) return;
  setSegment(preset.segment);
  Object.assign(filters, preset.filters);
  showFilters.value = false;
  state.transactionsPreset = null;
}, { immediate: true });
</script>
