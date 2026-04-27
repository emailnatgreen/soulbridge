import React from 'react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import { useIdentity } from '@/hooks/useIdentity';
import WidgetLockScreen from '@/components/widgets/WidgetLockScreen';
import WidgetPageNavBar from '@/components/widgets/WidgetPageNavBar';
import WidgetFeatureStatusBar from '@/components/widgets/WidgetFeatureStatusBar';
import SeedWalletCreatorPanel from '@/components/seed/SeedWalletCreatorPanel';
import { TreePine, Loader2 } from 'lucide-react';

const FEATURE_PATH = '/seed-golden-acorn';

export default function SeedGoldenAcorn() {
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();
  const { isRecognized, isAdmin } = useIdentity();

  const unlocked = isUnlocked(FEATURE_PATH) || isAdmin;
  const widgetMeta = getWidgetForPath(FEATURE_PATH);

  if (widgetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950 p-4 sm:p-6">
        <WidgetLockScreen
          featurePath={FEATURE_PATH}
          widgetName={widgetMeta?.widget_name || 'Seed Ista Golden Acorn'}
          nftId={widgetMeta?.nft_id || 'WIDGET-SEED-002'}
          description="The Seed Ista Golden Acorn NFT unlocks the Multi-Node Wallet Creator — empowering you to create multiple XRPL wallets and publish DIDs as sovereign nodes. This is the power of the blockchain gods, simplified."
          widgetType="unlock"
          category="wallet_management"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <WidgetPageNavBar
          title="Seed Ista Golden Acorn"
          subtitle="Multi-Node Wallet Creator"
          icon={TreePine}
          iconColor="text-amber-400"
          isUnlocked={true}
          widgetName={widgetMeta?.widget_name || 'Seed Ista Golden Acorn'}
          nftId={widgetMeta?.nft_id || 'WIDGET-SEED-002'}
        />

        <WidgetFeatureStatusBar
          isUnlocked={true}
          featureName="Seed Ista Golden Acorn"
          featurePath={FEATURE_PATH}
        />

        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/15 border border-amber-500/20 rounded-2xl p-5 sm:p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
            <TreePine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-bold text-xl sm:text-2xl">The Seed Ista Golden Acorn</h1>
          <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
            From a single seed, an oak grows many branches. Create multiple XRPL wallets, publish DIDs, and run your own network of sovereign nodes — all from your dashboard.
          </p>
          <div className="flex justify-center gap-4 pt-1">
            <div className="text-center">
              <p className="text-amber-300 font-bold text-lg">12</p>
              <p className="text-white/30 text-[10px]">RLUSD · First Wallet</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className="text-green-300 font-bold text-lg">2</p>
              <p className="text-white/30 text-[10px]">RLUSD · Each Additional</p>
            </div>
          </div>
        </div>

        {/* Wallet Creator Panel */}
        <SeedWalletCreatorPanel />
      </div>
    </div>
  );
}