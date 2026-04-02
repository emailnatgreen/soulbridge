import { useEffect, useState, useCallback } from 'react';
import { walletDidSignal } from '@/lib/walletDidSignal';

/**
 * Hook to listen for wallet & DID data changes across the app
 * @param {Object} options - { type?: 'wallet' | 'did', onUpdate?: Function }
 * @returns {Object} { lastSignal, isUpdating }
 */
export function useWalletDidSignal(options = {}) {
  const [lastSignal, setLastSignal] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleSignal = (event) => {
      // Filter by type if specified
      if (options.type && event.type !== options.type) return;
      
      setIsUpdating(true);
      setLastSignal(event);
      
      // Call custom handler if provided
      if (options.onUpdate) {
        options.onUpdate(event);
      }

      // Reset updating state after a brief moment
      setTimeout(() => setIsUpdating(false), 500);
    };

    const unsubscribe = walletDidSignal.subscribe(handleSignal);
    return unsubscribe;
  }, [options.type, options.onUpdate]);

  return { lastSignal, isUpdating };
}

/**
 * Emit a wallet data change (convenience function)
 */
export function emitWalletSignal(action, data) {
  walletDidSignal.emit({
    type: 'wallet',
    action,
    data
  });
}

/**
 * Emit a DID data change (convenience function)
 */
export function emitDidSignal(action, data) {
  walletDidSignal.emit({
    type: 'did',
    action,
    data
  });
}