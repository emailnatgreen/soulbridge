import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import ErrorBoundary from '@/components/ErrorBoundary'
import { queryClientInstance } from '@/lib/query-client'

// Block window.ethereum so MetaMask can't auto-connect
const blockEthereum = () => {
  try {
    Object.defineProperty(window, 'ethereum', {
      get: () => undefined,
      set: () => {},
      configurable: true,
    });
  } catch (_) {}
};
blockEthereum();
setInterval(blockEthereum, 500);

// Swallow MetaMask / Web3 errors silently
const isWeb3Error = (msg) => {
  const s = String(msg || '').toLowerCase();
  return s.includes('metamask') || s.includes('ethereum') || s.includes('web3')
    || s.includes('failed to connect') || s.includes('wallet') || s.includes('provider');
};
window.addEventListener('unhandledrejection', (event) => {
  if (isWeb3Error(event?.reason?.message) || isWeb3Error(event?.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
window.addEventListener('error', (event) => {
  if (isWeb3Error(event?.message) || isWeb3Error(event?.error?.message)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// Debounced sync — prevents white screens on mobile focus/keyboard events
let syncTimer = null;
const syncAppData = () => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    queryClientInstance.invalidateQueries();
  }, 2000);
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncAppData();
});
window.addEventListener('online', syncAppData);

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)