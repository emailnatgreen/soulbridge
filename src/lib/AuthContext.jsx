import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const checkedOnce = useRef(false);

  useEffect(() => {
    checkAppState();

    const handleFocus = () => {
      // Only re-check on focus if we already loaded once — don't re-show spinner
      if (checkedOnce.current) checkAppState(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && checkedOnce.current) checkAppState(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const getStoredDidIdentity = () => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.connected ? parsed : null;
    } catch (_) {
      return null;
    }
  };

  const checkAppState = async (isRefresh = false) => {
    // On refresh (focus/visibility), don't show the loading spinner again
    if (!isRefresh) {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
    }
    setAuthError(null);

    const refreshedToken = appParams.token || localStorage.getItem('base44_access_token') || localStorage.getItem('token');

    try {
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: refreshedToken,
        interceptResponses: true
      });

      const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
      setAppPublicSettings(publicSettings);

      if (refreshedToken) {
        await checkUserAuth();
      } else {
        setUser(null);
        setIsLoadingAuth(false);
        setIsAuthenticated(!!getStoredDidIdentity());
      }
      setIsLoadingPublicSettings(false);
      checkedOnce.current = true;
    } catch (appError) {
      console.error('App state check failed:', appError);

      if (appError.status === 403 && appError.data?.extra_data?.reason) {
        const reason = appError.data.extra_data.reason;
        if (reason === 'auth_required') {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } else if (reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else {
          setAuthError({ type: reason, message: appError.message });
        }
      }

      // Always clear loading — never leave spinner stuck
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setIsAuthenticated(!!getStoredDidIdentity());
      checkedOnce.current = true;
    }
  };

  // Hard safety net: if loading states are still true after 8 seconds, force them off
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoadingPublicSettings || isLoadingAuth) {
        console.warn('[AuthContext] Safety timeout — forcing loading states off');
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setIsAuthenticated(!!getStoredDidIdentity());
        checkedOnce.current = true;
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsLoadingAuth(false);
      setIsAuthenticated(!!getStoredDidIdentity());
      setAuthError(null);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isEditorPreview = urlParams.has('_preview_token');
    const nextUrl = isEditorPreview
      ? window.location.origin + window.location.pathname
      : window.location.origin + '/';
    base44.auth.redirectToLogin(nextUrl);
  };

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