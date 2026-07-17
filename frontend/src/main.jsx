// Global window.fetch credentials interceptor
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  init = init || {};
  init.credentials = 'include';
  return originalFetch(input, init);
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Fade out and remove startup splash loading screen
const removeSplash = () => {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (!isStandalone) {
    splash.remove();
    return;
  }

  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 1500);
};

if (document.readyState === 'complete') {
  removeSplash();
} else {
  window.addEventListener('load', removeSplash);
}

// Register PWA Service Worker in production mode
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}
