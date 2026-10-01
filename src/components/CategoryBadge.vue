<template>
  <span class="category-badge" :style="{ '--badge-bg': color || badge.color }" :title="categoryLabel(category)" aria-hidden="true">
    {{ badge.short }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { categoryBadge, categoryLabel } from '../core/categories.js';

const props = defineProps({
  category: { type: String, default: 'UNKNOWN' },
  color: { type: String, default: '' }
});

const badge = computed(() => categoryBadge(props.category));
</script>
