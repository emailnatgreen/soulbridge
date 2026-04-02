import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Always transition to an error state — returning null causes an infinite render loop
    // (React keeps retrying the crashed child, producing a white screen).
    // MetaMask / promise errors are swallowed in main.jsx before reaching here.
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3')) return;
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = String(this.state.error?.message || '').toLowerCase();
      // Silently recover from MetaMask / Web3 errors without showing error UI
      if (msg.includes('metamask') || msg.includes('ethereum') || msg.includes('web3') || msg.includes('wallet connect')) {
        this.state.hasError = false;
        return this.props.children;
      }
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