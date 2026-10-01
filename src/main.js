import { createApp } from 'vue';
import App from './App.vue';
import { init } from './store.js';
import './styles.css';

init();
createApp(App).mount('#app');
