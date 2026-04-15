import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook: useWidgetUnlock
 * 
 * Single source of truth for widget ownership on the frontend.
 * Fetches from the Unlock Engine backend and exposes:
 *   - widgets / ownedWidgets / unlockedPaths
 *   - routeMap: { [feature_path]: { unlocked, route, widget_name, nft_id, ... } }
 *   - isUnlocked(featurePath): boolean
 *   - getWidgetForPath(featurePath): widget metadata or null
 *   - loading / refresh
 */
export function useWidgetUnlock() {
  const [widgets, setWidgets] = useState([]);
  const [ownedWidgets, setOwnedWidgets] = useState([]);
  const [unlockedPaths, setUnlockedPaths] = useState([]);
  const [routeMap, setRouteMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    try {
      // Pass user DID if available from local identity
      let did = null;
      try {
        const identity = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
        did = identity?.did || null;
      } catch (_) {}

      const res = await base44.functions.invoke('getOwnedWidgets', { did });
      const data = res.data;
      setWidgets(data.all_widgets || []);
      setOwnedWidgets(data.owned_widgets || []);
      setUnlockedPaths(data.unlocked_paths || []);
      setRouteMap(data.route_map || {});
    } catch (e) {
      console.error('Widget unlock fetch failed:', e);
      setWidgets([]);
      setOwnedWidgets([]);
      setUnlockedPaths([]);
      setRouteMap({});
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

  const getWidgetForPath = useCallback(
    (featurePath) => routeMap[featurePath] || null,
    [routeMap]
  );

  return {
    widgets,
    ownedWidgets,
    unlockedPaths,
    routeMap,
    isUnlocked,
    getWidgetForPath,
    loading,
    refresh: fetchWidgets,
  };
}