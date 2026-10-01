<template>
  <div class="app">
    <div v-if="!state.ready" class="splash" aria-busy="true">
      <span class="empty-visual">AY</span>
    </div>

    <div v-else-if="state.loadError" class="fatal">
      <AppIcon name="alert" :size="32" />
      <h1>Veriler açılamadı</h1>
      <p>
        Tarayıcı yerel veritabanına erişime izin vermedi. Gizli sekmede olabilirsin ya da site verisi engellenmiş olabilir.
      </p>
      <code>{{ state.loadError }}</code>
    </div>

    <OnboardingView v-else-if="!state.settings.onboarded" />

    <template v-else>
      <header class="app-header">
        <div>
          <p class="eyebrow brand">aybashim</p>
          <h1>{{ currentTab.title }}</h1>
        </div>
        <button
          type="button"
          class="icon-button"
          :aria-label="state.amountsHidden ? 'Tutarları göster' : 'Tutarları gizle'"
          :aria-pressed="!state.amountsHidden"
          @click="state.amountsHidden = !state.amountsHidden"
        >
          <AppIcon :name="state.amountsHidden ? 'eye-off' : 'eye'" />
        </button>
      </header>

      <main class="app-main">
        <KeepAlive>
          <component :is="currentTab.component" :key="state.tab" />
        </KeepAlive>
      </main>

      <nav class="bottom-nav" aria-label="Ana menü">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          :class="{ active: state.tab === tab.id }"
          :aria-current="state.tab === tab.id ? 'page' : undefined"
          @click="state.tab = tab.id"
        >
          <AppIcon :name="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </template>

    <UpdatePrompt />
    <ToastMessage />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import AppIcon from './components/AppIcon.vue';
import ToastMessage from './components/ToastMessage.vue';
import UpdatePrompt from './components/UpdatePrompt.vue';
import { state } from './store.js';
import OnboardingView from './views/OnboardingView.vue';
import SettingsView from './views/SettingsView.vue';
import SummaryView from './views/SummaryView.vue';
import TransactionsView from './views/TransactionsView.vue';
import UploadView from './views/UploadView.vue';

const TABS = [
  { id: 'summary', label: 'Özet', title: 'Aylık özet', icon: 'home', component: SummaryView },
  { id: 'transactions', label: 'İşlemler', title: 'İşlemler', icon: 'list', component: TransactionsView },
  { id: 'upload', label: 'Yükle', title: 'Ekstre yükle', icon: 'upload', component: UploadView },
  { id: 'settings', label: 'Ayarlar', title: 'Ayarlar', icon: 'settings', component: SettingsView }
];

const currentTab = computed(() => TABS.find((tab) => tab.id === state.tab) || TABS[0]);

// The active tab is mirrored to the URL hash so the Android back button moves between tabs.
function tabFromHash() {
  const id = window.location.hash.slice(1);
  return TABS.some((tab) => tab.id === id) ? id : 'summary';
}

function onHashChange() {
  state.tab = tabFromHash();
}

watch(() => state.tab, (tab) => {
  if (tabFromHash() !== tab) window.location.hash = tab;
  window.scrollTo({ top: 0 });
});

onMounted(() => {
  state.tab = tabFromHash();
  window.addEventListener('hashchange', onHashChange);
});

onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange));
</script>
