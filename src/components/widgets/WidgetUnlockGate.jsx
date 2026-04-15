import React from 'react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetLockScreen from './WidgetLockScreen';

/**
 * WidgetUnlockGate
 * 
 * Wraps any page/section that requires a Widget NFT.
 * If the user owns the widget → renders children.
 * If not → renders the WidgetLockScreen with full metadata.
 * 
 * Usage:
 *   <WidgetUnlockGate featurePath="wallet.multisig">
 *     <MultisigPage />
 *   </WidgetUnlockGate>
 */
export default function WidgetUnlockGate({ featurePath, children }) {
  const { isUnlocked, getWidgetForPath, loading } = useWidgetUnlock();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-white/40 text-xs">Checking widget ownership…</span>
        </div>
      </div>
    );
  }

  if (isUnlocked(featurePath)) {
    return <>{children}</>;
  }

  // User doesn't own this widget — show lock screen with full metadata
  const widget = getWidgetForPath(featurePath);

  return (
    <WidgetLockScreen
      widgetName={widget?.widget_name}
      widgetDescription={widget?.widget_description}
      nftId={widget?.nft_id}
      featurePath={featurePath}
      widgetType={widget?.widget_type}
      category={widget?.category}
      uiBehavior={widget?.ui_behavior}
    />
  );
}