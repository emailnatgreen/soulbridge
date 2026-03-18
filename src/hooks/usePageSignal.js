import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export function usePageSignal() {
  const location = useLocation();

  useEffect(() => {
    const emitPageSignal = async () => {
      try {
        const pageName = location.pathname.split('/').filter(Boolean)[0] || 'Home';
        
        await base44.functions.invoke('routePageSignal', {
          page: pageName,
          path: location.pathname,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to emit page signal:', error);
      }
    };

    emitPageSignal();
  }, [location.pathname]);
}