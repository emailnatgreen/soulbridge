import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useIdentity } from '@/hooks/useIdentity';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Store } from 'lucide-react';
import WidgetLockScreen from '@/components/widgets/WidgetLockScreen';
import StorefrontSetup from '@/components/storefront/StorefrontSetup';
import StorefrontDashboard from '@/components/storefront/StorefrontDashboard';

const STOREFRONT_FEATURE_PATH = '/storefront';

export default function StorefrontHub() {
  const { user } = useAuth();
  const { isAdmin: identityAdmin } = useIdentity();
  const isAdmin = identityAdmin || user?.role === 'admin';
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();

  const hasAccess = isAdmin || isUnlocked(STOREFRONT_FEATURE_PATH);

  // Get user's DID
  const userDid = (() => {
    try {
      const identity = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
      return identity?.did || null;
    } catch { return null; }
  })();

  // Fetch user's storefront
  const { data: storefronts = [], isLoading } = useQuery({
    queryKey: ['myStorefront', user?.email],
    queryFn: () => base44.entities.Storefront.filter({ owner_email: user?.email }, '-created_date', 1),
    enabled: !!user?.email && hasAccess,
    staleTime: 10000,
  });

  const myStorefront = storefronts[0] || null;

  if (widgetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    const widget = getWidgetForPath(STOREFRONT_FEATURE_PATH);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <WidgetLockScreen
          widgetName={widget?.widget_name || 'Storefront Unlock'}
          widgetDescription="The Storefront requires the Storefront Unlock NFT (WIDGET-SFU-001) — the Merchant's Key — to access. This NFT grants you the ability to create and manage your own digital storefront in SoulBridge Village."
          nftId={widget?.nft_id || 'WIDGET-SFU-001'}
          featurePath={STOREFRONT_FEATURE_PATH}
          widgetType="unlock"
          category="other"
          uiBehavior="unlock_page"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white gap-1 -ml-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Button>
            </Link>
            <Link to="/home">
              <Button variant="ghost" size="sm" className="text-white/40 hover:text-white gap-1">
                Home
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-600/30 border border-amber-500/30 flex items-center justify-center">
              <Store className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                My Storefront
              </h1>
              <p className="text-white/40 text-xs sm:text-sm">
                Manage your digital storefront in SoulBridge Village
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : myStorefront ? (
          <StorefrontDashboard storefront={myStorefront} />
        ) : (
          <StorefrontSetup userEmail={user?.email} userDid={userDid} />
        )}
      </div>
    </div>
  );
}