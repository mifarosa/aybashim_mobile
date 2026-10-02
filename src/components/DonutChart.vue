<template>
  <div class="donut" :style="{ background: gradient }" role="img" :aria-label="ariaLabel">
    <div class="donut-hole">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // [{ label, percent, color }]
  items: { type: Array, required: true }
});

const gradient = computed(() => {
  if (props.items.length === 0) return 'var(--surface-quiet)';
  let cursor = 0;
  const stops = props.items.map((item) => {
    const start = cursor;
    cursor += item.percent;
    return `${item.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
});

const ariaLabel = computed(() => props.items
  .map((item) => `${item.label} yüzde ${item.percent.toFixed(0)}`)
  .join(', ') || 'Veri yok');
</script>
