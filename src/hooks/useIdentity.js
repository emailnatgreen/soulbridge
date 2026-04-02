import { useAuth } from '@/lib/AuthContext';
import { useDIDSignal } from './useDIDSignal';
import { useWalletDidSignal } from './useWalletDidSignal';
import { hasAdminAccess } from '@/lib/adminAccess';

/**
 * Consolidated identity hook — single source for auth + DID + wallet signals
 * 
 * @returns {object} {
 *   user: Base44 user object
 *   isAuthenticated: boolean
 *   didSignal: DID verification state
 *   walletSignal: last wallet/DID signal
 *   isRecognized: true if user has verified DID or Base44 auth or local token
 *   isAdmin: true if user can access admin features
 *   loading: true while verifying identity
 * }
 */
export function useIdentity() {
  const { user, isAuthenticated } = useAuth();
  const didSignal = useDIDSignal();
  const { lastSignal } = useWalletDidSignal();

  // Check if user is recognized via any auth method
  const isRecognized = (() => {
    // Priority: Verified DID (cryptographically proven)
    if (didSignal?.isVerified) return true;
    // Fallback: Base44 auth
    if (isAuthenticated) return true;
    // Legacy: local storage tokens
    if (localStorage.getItem('base44_access_token') || localStorage.getItem('token')) return true;
    try {
      const id = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
      if (id?.did || id?.connected) return true;
    } catch (_) {}
    return false;
  })();

  // Get identity from localStorage for admin checks
  const identity = (() => {
    try {
      return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
    } catch (_) {
      return null;
    }
  })();

  // Check admin access
  const isAdmin = isRecognized && hasAdminAccess({ user, identityDid: identity?.did });

  return {
    user,
    isAuthenticated,
    didSignal,
    walletSignal: lastSignal,
    isRecognized,
    isAdmin,
    loading: didSignal?.loading
  };
}