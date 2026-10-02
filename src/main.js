// Must stay first: older phone browsers lack some built-ins used by the app and pdf.js.
import './core/polyfills.js';
import { createApp } from 'vue';
import App from './App.vue';
import { init } from './store.js';
import './styles.css';

init();
createApp(App).mount('#app');

// Silences the startup error reporter in index.html.
window.__aybashimMounted = true;
