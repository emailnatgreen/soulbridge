import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)