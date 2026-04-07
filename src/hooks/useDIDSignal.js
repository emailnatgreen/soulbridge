import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Module-level cache so every hook instance shares the same verified result
// and we never fire more than one backend call at a time.
let _cachedSignal = null;
let _verifyPromise = null;

/**
 * Hook that exposes verified DID signal across the frontend.
 * Reads from localStorage first (zero network cost).
 * Backend verify only happens on explicit refresh() calls.
 */
export function useDIDSignal() {
  // Check localStorage for existing identity on init
  const getLocalIdentity = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
      if (stored?.did || stored?.connected) {
        return {
          isVerified: true,
          did: stored.did || null,
          role: stored.role || null,
          permissions: null,
          agentId: null,
          loading: false,
          error: null
        };
      }
    } catch (_) {}
    return null;
  };

  const initial = _cachedSignal || getLocalIdentity() || {
    isVerified: false,
    did: null,
    role: null,
    permissions: null,
    agentId: null,
    loading: false, // NOT loading — no auto backend call
    error: null
  };

  const [signal, setSignal] = useState(initial);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const verify = useCallback(async () => {
    // De-duplicate: if a verify is already in flight, reuse it
    if (_verifyPromise) return _verifyPromise;

    if (mountedRef.current) setSignal(prev => ({ ...prev, loading: true, error: null }));

    _verifyPromise = (async () => {
      try {
        const response = await base44.functions.invoke('verifyDIDStatusMainnet', {});
        const result = response?.data?.isVerified
          ? {
              isVerified: true,
              did: response.data.did,
              role: response.data.role,
              permissions: response.data.permissions,
              agentId: response.data.agentId,
              loading: false,
              error: null
            }
          : getLocalIdentity() || {
              isVerified: false, did: null, role: null, permissions: null,
              agentId: null, loading: false,
              error: response?.data?.error || 'DID verification failed'
            };
        _cachedSignal = result;
        if (mountedRef.current) setSignal(result);
      } catch (err) {
        const fallback = getLocalIdentity() || {
          isVerified: false, did: null, role: null, permissions: null,
          agentId: null, loading: false,
          error: err?.message || 'DID verification error'
        };
        _cachedSignal = fallback;
        if (mountedRef.current) setSignal(fallback);
      } finally {
        _verifyPromise = null;
      }
    })();

    return _verifyPromise;
  }, []);

  // Listen for cross-tab DID events so all instances stay in sync
  useEffect(() => {
    const onDidEvent = () => {
      const fresh = getLocalIdentity();
      if (fresh && mountedRef.current) {
        _cachedSignal = fresh;
        setSignal(fresh);
      }
    };
    window.addEventListener('did-connected', onDidEvent);
    window.addEventListener('did-validated', onDidEvent);
    window.addEventListener('storage', onDidEvent);
    return () => {
      window.removeEventListener('did-connected', onDidEvent);
      window.removeEventListener('did-validated', onDidEvent);
      window.removeEventListener('storage', onDidEvent);
    };
  }, []);

  return {
    ...signal,
    refresh: verify
  };
}