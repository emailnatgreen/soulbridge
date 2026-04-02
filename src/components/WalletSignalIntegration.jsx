import { useEffect } from 'react';
import { emitWalletSignal, emitDidSignal } from '@/hooks/useWalletDidSignal';

/**
 * Wrapper component to integrate wallet/DID page mutations with the global signal
 * Usage: wrap wallet/DID operations with onSuccess callbacks that call emitWalletSignal/emitDidSignal
 */

export function useWalletMutation() {
  return {
    onWalletUpdate: (walletData) => {
      emitWalletSignal('update', walletData);
    },
    onWalletCreate: (walletData) => {
      emitWalletSignal('create', walletData);
    },
    onWalletDelete: (walletId) => {
      emitWalletSignal('delete', { id: walletId });
    }
  };
}

export function useDidMutation() {
  return {
    onDidUpdate: (didData) => {
      emitDidSignal('update', didData);
    },
    onDidCreate: (didData) => {
      emitDidSignal('create', didData);
    },
    onDidPublish: (didData) => {
      emitDidSignal('update', { ...didData, status: 'published' });
    },
    onDidLink: (didData) => {
      emitDidSignal('update', { ...didData, action: 'agent_linked' });
    }
  };
}

/**
 * Example integration in a page:
 * 
 * import { useWalletMutation } from '@/components/WalletSignalIntegration';
 * 
 * function MyWalletPage() {
 *   const { onWalletUpdate } = useWalletMutation();
 *   const mutation = useMutation({
 *     mutationFn: async (data) => { ... },
 *     onSuccess: (data) => {
 *       onWalletUpdate(data);  // Emit signal to all listeners
 *     }
 *   });
 * }
 */