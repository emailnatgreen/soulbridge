import React, { createContext, useState, useContext, useEffect } from 'react';
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

  useEffect(() => {
    checkAppState();

    const handleFocus = () => checkAppState();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkAppState();
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

  const checkAppState = async () => {
    try {
      const refreshedToken = appParams.token || localStorage.getItem('base44_access_token') || localStorage.getItem('token');
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: refreshedToken,
        interceptResponses: true
      });

      // Safety timeout so spinner never gets stuck
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('App settings fetch timed out')), 10000)
      );
      
      try {
        const publicSettings = await Promise.race([
          appClient.get(`/prod/public-settings/by-id/${appParams.appId}`),
          timeoutPromise
        ]);
        setAppPublicSettings(publicSettings);
        
        if (refreshedToken) {
          await checkUserAuth();
        } else {
          setUser(null);
          setIsLoadingAuth(false);
          setIsAuthenticated(!!getStoredDidIdentity());
        }
        setIsLoadingPublicSettings(false);
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
        } else {
          // For timeouts or unknown errors, don't block — just clear loading
          setAuthError(null);
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        // Even on error, allow DID-only users through
        setIsAuthenticated(!!getStoredDidIdentity());
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setIsAuthenticated(!!getStoredDidIdentity());
    }
  };

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