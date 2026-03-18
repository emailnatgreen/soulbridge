import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

/**
 * Comprehensive page signal hook for Jukebox Brain nervous system
 * Automatically captures page views, context, and system state across all pages
 */
export function usePageSignal() {
  const location = useLocation();

  useEffect(() => {
    const emitPageSignal = async () => {
      try {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const pageName = pathSegments[0] || 'Home';
        
        // Capture current user if available
        let currentUser = null;
        try {
          currentUser = await base44.auth.me();
        } catch (e) {
          // User not authenticated, continue without user data
        }

        // Construct comprehensive signal payload
        const signalPayload = {
          page: pageName,
          path: location.pathname,
          search: location.search,
          timestamp: new Date().toISOString(),
          userEmail: currentUser?.email,
          userId: currentUser?.id,
          metadata: {
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            referrer: document.referrer,
            title: document.title,
          },
        };

        // Emit to Jukebox Brain via routePageSignal
        await base44.functions.invoke('routePageSignal', signalPayload);
      } catch (error) {
        console.error('Failed to emit page signal:', error);
      }
    };

    emitPageSignal();
  }, [location.pathname, location.search]);
}