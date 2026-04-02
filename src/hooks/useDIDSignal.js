import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook that exposes verified DID signal across the frontend.
 * Calls verifyDIDStatus on mount and returns cryptographically verified identity.
 * 
 * Returns: {
 *   isVerified: boolean,
 *   did: string (classic_address if verified),
 *   role: string ('governor', 'citizen', etc),
 *   permissions: object,
 *   agentId: string or null,
 *   loading: boolean,
 *   error: string or null,
 *   refresh: async function
 * }
 */
export function useDIDSignal() {
  const [signal, setSignal] = useState({
    isVerified: false,
    did: null,
    role: null,
    permissions: null,
    agentId: null,
    loading: true,
    error: null
  });

  const verify = async () => {
    try {
      setSignal(prev => ({ ...prev, loading: true, error: null }));
      const response = await base44.functions.invoke('verifyDIDStatusMainnet', {});
      
      if (response?.data?.isVerified) {
        setSignal({
          isVerified: true,
          did: response.data.did,
          role: response.data.role,
          permissions: response.data.permissions,
          agentId: response.data.agentId,
          loading: false,
          error: null
        });
      } else {
        setSignal({
          isVerified: false,
          did: null,
          role: null,
          permissions: null,
          agentId: null,
          loading: false,
          error: response?.data?.error || 'DID verification failed'
        });
      }
    } catch (err) {
      setSignal(prev => ({
        ...prev,
        isVerified: false,
        loading: false,
        error: err?.message || 'DID verification error'
      }));
    }
  };

  // Verify on mount
  useEffect(() => {
    verify();
  }, []);

  return {
    ...signal,
    refresh: verify
  };
}