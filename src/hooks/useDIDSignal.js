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

  // Auto-verify on mount if not already verified from cache/localStorage
  useEffect(() => {
    if (_cachedSignal?.isVerified) return; // Already verified
    const local = getLocalIdentity();
    if (local?.isVerified) return; // localStorage has valid identity
    // No cached or local identity — trigger backend verification once
    const doVerify = async () => {
      try {
        const isAuthed = await base44.auth.isAuthenticated();
        if (!isAuthed) return; // Can't verify without auth
        // Small delay to avoid competing with initial page load API calls
        await new Promise(r => setTimeout(r, 1500));
        if (!mountedRef.current) return;
        verify();
      } catch (_) {}
    };
    doVerify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              classicAddress: response.data.classic_address || null,
              loading: false,
              error: null
            }
          : getLocalIdentity() || {
              isVerified: false, did: null, role: null, permissions: null,
              agentId: null, loading: false,
              error: response?.data?.error || 'DID verification failed'
            };
        // Persist verified identity to localStorage so other components pick it up
        if (result.isVerified && result.did) {
          try {
            const identityData = {
              did: result.did,
              connected: true,
              role: result.role,
              agentId: result.agentId,
              classicAddress: result.classicAddress,
              timestamp: Date.now(),
              source: 'did_verification'
            };
            localStorage.setItem('soulbridge_identity', JSON.stringify(identityData));
            window.dispatchEvent(new CustomEvent('did-validated', { detail: identityData }));
          } catch (_) {}
        }
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