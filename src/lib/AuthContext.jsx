import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

const getStoredDidIdentity = () => {
  try {
    const stored = localStorage.getItem('soulbridge_identity');
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.connected ? parsed : null;
  } catch (_) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const initialCheckDone = useRef(false);

  const fetchPublicSettings = useCallback(async (token) => {
    try {
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: token,
        interceptResponses: true
      });
      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setAppPublicSettings(publicSettings);
    } catch (appError) {
      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        setAuthError({ type: reason, message: appError.data?.message || reason });
      }
    }
  }, []);

  const checkAppState = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingAuth(true);
    }
    setAuthError(null);

    const refreshedToken = appParams.token || localStorage.getItem('base44_access_token') || localStorage.getItem('token');
    const hasDidIdentity = !!getStoredDidIdentity();

    // If we have a token, try to get user info
    if (refreshedToken) {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.warn('[AuthContext] auth.me() failed:', error.message);
        setUser(null);
        // Token exists but me() failed — still consider authenticated
        // (token may be valid but rate-limited or temporarily unreachable)
        setIsAuthenticated(true);
      }
    } else {
      setUser(null);
      // No platform token — check DID identity
      setIsAuthenticated(hasDidIdentity);
    }

    // Auth loading is done — page can render now
    setIsLoadingAuth(false);
    initialCheckDone.current = true;

    // Fetch public settings in background (non-blocking)
    fetchPublicSettings(refreshedToken);
  }, [fetchPublicSettings]);

  useEffect(() => {
    checkAppState(false);

    const handleFocus = () => {
      if (initialCheckDone.current) checkAppState(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && initialCheckDone.current) checkAppState(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkAppState]);

  // Hard safety net: force loading off after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoadingAuth) {
        console.warn('[AuthContext] Safety timeout — forcing loading off');
        setIsLoadingAuth(false);
        const hasToken = !!(appParams.token || localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
        setIsAuthenticated(hasToken || !!getStoredDidIdentity());
        initialCheckDone.current = true;
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoadingAuth]);

  const logout = useCallback((shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isEditorPreview = urlParams.has('_preview_token');
    const nextUrl = isEditorPreview
      ? window.location.origin + window.location.pathname
      : window.location.origin + '/';
    base44.auth.redirectToLogin(nextUrl);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};