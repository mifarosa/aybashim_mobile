<template>
  <div>
    <ul v-if="items.length > 0" class="tx-list">
      <li v-for="tx in visibleItems" :key="tx.key" :class="['tx-row', { expanded: expandedKey === tx.key }]">
        <button
          type="button"
          class="tx-toggle"
          :aria-expanded="expandedKey === tx.key"
          @click="toggle(tx.key)"
        >
          <CategoryBadge :category="tx.subCategory" />
          <span class="tx-text">
            <span class="tx-desc">{{ tx.description }}</span>
            <span class="tx-meta">{{ formatDate(tx.date) }} · {{ tx.bankName || '-' }} · {{ categoryLabel(tx.subCategory) }}</span>
          </span>
        </button>
        <MoneyAmount class="tx-amount" :value="tx.amount" :tone="tx.type === 'CREDIT' ? 'credit' : 'debit'" />
        <dl v-if="expandedKey === tx.key" class="tx-details">
          <div><dt>Ana kategori</dt><dd>{{ categoryLabel(tx.mainCategory) }}</dd></div>
          <div><dt>Tip</dt><dd>{{ tx.type === 'CREDIT' ? 'Gelen (alacak)' : 'Giden (borç)' }}</dd></div>
          <div v-if="tx.sourceFile"><dt>Ekstre</dt><dd>{{ tx.sourceFile }}</dd></div>
        </dl>
      </li>
    </ul>
    <EmptyState v-else title="Kayıt bulunamadı" :text="emptyText" />

    <button v-if="hiddenCount > 0" type="button" class="secondary block more-button" @click="limit += PAGE_SIZE">
      {{ Math.min(hiddenCount, PAGE_SIZE) }} işlem daha göster ({{ hiddenCount }} kaldı)
    </button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { categoryLabel } from '../core/categories.js';
import { formatDate } from '../core/dates.js';
import CategoryBadge from './CategoryBadge.vue';
import EmptyState from './EmptyState.vue';
import MoneyAmount from './MoneyAmount.vue';

const props = defineProps({
  items: { type: Array, required: true },
  emptyText: { type: String, default: 'Filtreleri değiştirmeyi deneyin.' }
});

// Long lists are rendered in pages to keep the DOM small on phones.
const PAGE_SIZE = 60;
const limit = ref(PAGE_SIZE);
const expandedKey = ref(null);

const visibleItems = computed(() => props.items.slice(0, limit.value));
const hiddenCount = computed(() => Math.max(props.items.length - limit.value, 0));

watch(() => props.items, () => {
  limit.value = PAGE_SIZE;
  expandedKey.value = null;
});

function toggle(key) {
  expandedKey.value = expandedKey.value === key ? null : key;
}
</script>
