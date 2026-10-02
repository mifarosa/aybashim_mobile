<template>
  <button
    v-if="hidden"
    type="button"
    class="money money-masked"
    aria-label="Gizli tutar, göstermek için dokunun"
    @click.stop="revealBriefly"
  >••••••</button>
  <span v-else :class="['money', toneClass]">{{ text }}</span>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { formatMoney } from '../core/money.js';
import { state } from '../store.js';

const props = defineProps({
  value: { type: Number, required: true },
  // "credit" / "debit" prefix a sign and color the amount; "net" colors by sign.
  tone: { type: String, default: 'plain' }
});

const REVEAL_MS = 4000;
const revealed = ref(false);
let timer = null;

const hidden = computed(() => state.amountsHidden && !revealed.value);

const text = computed(() => {
  const formatted = formatMoney(Math.abs(props.value));
  if (props.tone === 'credit') return `+${formatted}`;
  if (props.tone === 'debit') return `−${formatted}`;
  if (props.tone === 'net' && props.value < 0) return `−${formatted}`;
  return props.tone === 'plain' ? formatMoney(props.value) : formatted;
});

const toneClass = computed(() => {
  if (props.tone === 'net') return props.value < 0 ? 'money-debit' : 'money-credit';
  return props.tone === 'plain' ? '' : `money-${props.tone}`;
});

// Hover does not exist on touch screens, so a tap shows the amount for a few seconds.
function revealBriefly() {
  revealed.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    revealed.value = false;
  }, REVEAL_MS);
}

onBeforeUnmount(() => clearTimeout(timer));
</script>
