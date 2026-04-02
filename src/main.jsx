import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { queryClientInstance } from '@/lib/query-client'

// Suppress MetaMask / Web3 browser extension errors that destabilise the editor
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || '').toLowerCase();
  if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3') || msg.includes('wallet') || msg.includes('provider')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
});
window.addEventListener('error', (event) => {
  const msg = String(event?.message || event?.error?.message || '').toLowerCase();
  if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
});

// Debounced sync — prevents white screens on mobile focus/keyboard events
let syncTimer = null;
const syncAppData = () => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    queryClientInstance.invalidateQueries();
  }, 2000); // 2s debounce
};

// Only sync on tab becoming visible after being hidden (not on every focus)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncAppData();
});
// Sync when coming back online
window.addEventListener('online', syncAppData);

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)