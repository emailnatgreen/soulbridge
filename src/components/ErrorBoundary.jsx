import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Ignore MetaMask / Web3 errors
    const msg = String(error?.message || error || '').toLowerCase();
    if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3') || msg.includes('wallet connect')) {
      return null; // Don't trigger error UI
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3')) return;
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-white/50 text-sm mb-6">The Village encountered an unexpected error.</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}