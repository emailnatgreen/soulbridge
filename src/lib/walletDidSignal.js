// Global signal emitter for wallet & DID data changes
const listeners = new Set();

export const walletDidSignal = {
  /**
   * Emit a wallet or DID data change
   * @param {Object} event - { type: 'wallet' | 'did', action: 'update' | 'create' | 'delete', data: {...}, timestamp: Date }
   */
  emit(event) {
    const payload = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      id: Math.random().toString(36).slice(2)
    };
    
    listeners.forEach(listener => listener(payload));
    
    // Broadcast across tabs
    try {
      window.localStorage.setItem('wallet_did_signal', JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to store signal:', e);
    }
  },

  /**
   * Subscribe to wallet/DID changes
   * @param {Function} callback - (event) => void
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    listeners.add(callback);
    
    // Also listen to cross-tab signals
    const handleStorageChange = (e) => {
      if (e.key === 'wallet_did_signal' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          callback(payload);
        } catch (err) {
          console.warn('Failed to parse signal:', err);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      window.removeEventListener('storage', handleStorageChange);
    };
  },

  /**
   * Clear all listeners (for cleanup)
   */
  clear() {
    listeners.clear();
  }
};