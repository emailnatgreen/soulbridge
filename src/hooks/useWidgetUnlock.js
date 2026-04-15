import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook: useWidgetUnlock
 * 
 * Fetches the user's widget ownership state and provides
 * unlock checking utilities for the dashboard.
 * 
 * Returns:
 *   widgets       - all wallet_management widgets with ownership flag
 *   ownedWidgets  - only owned widgets
 *   unlockedPaths - array of feature_path strings the user has access to
 *   isUnlocked(featurePath) - check if a specific feature is unlocked
 *   loading       - fetch in progress
 *   refresh()     - manually re-fetch
 */
export function useWidgetUnlock() {
  const [widgets, setWidgets] = useState([]);
  const [ownedWidgets, setOwnedWidgets] = useState([]);
  const [unlockedPaths, setUnlockedPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getOwnedWidgets', {});
      const data = res.data;
      setWidgets(data.all_widgets || []);
      setOwnedWidgets(data.owned_widgets || []);
      setUnlockedPaths(data.unlocked_paths || []);
    } catch (e) {
      console.error('Widget unlock fetch failed:', e);
      setWidgets([]);
      setOwnedWidgets([]);
      setUnlockedPaths([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const isUnlocked = useCallback(
    (featurePath) => unlockedPaths.includes(featurePath),
    [unlockedPaths]
  );

  return {
    widgets,
    ownedWidgets,
    unlockedPaths,
    isUnlocked,
    loading,
    refresh: fetchWidgets,
  };
}