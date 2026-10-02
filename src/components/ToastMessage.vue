<template>
  <Transition name="toast">
    <div v-if="state.toast" :key="state.toast.id" :class="['toast', state.toast.type]" role="status" aria-live="polite">
      <AppIcon :name="state.toast.type === 'error' ? 'alert' : 'check'" :size="18" />
      <span>{{ state.toast.message }}</span>
      <button type="button" class="icon-button" aria-label="Kapat" @click="state.toast = null">
        <AppIcon name="x" :size="16" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { state } from '../store.js';
import AppIcon from './AppIcon.vue';
</script>
