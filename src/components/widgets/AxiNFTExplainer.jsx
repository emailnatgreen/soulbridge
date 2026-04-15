import React from 'react';
import { Sparkles, Shield, Layers, Tag, Zap, HelpCircle, ArrowRight } from 'lucide-react';

/**
 * AxiNFTExplainer
 * 
 * Contextual Axi-powered explainer section for widget-gated pages.
 * Shows a deep explanation of how NFT widgets work, specific to the
 * current page's feature, and an "Ask Axi" CTA for deeper help.
 * 
 * Props:
 *   featureName - e.g. "Constitutional Multi-Sig"
 *   featurePath - e.g. "wallet.multisig"
 *   widgetName - e.g. "Multisig Setup Widget"
 *   nftId - e.g. "WIDGET-WM-001"
 *   description - What this feature does
 *   setupSteps - Array of step strings for setup instructions
 *   isUnlocked - Whether the user owns the widget
 */
export default function AxiNFTExplainer({
  featureName,
  featurePath,
  widgetName,
  nftId,
  description,
  setupSteps = [],
  isUnlocked,
}) {
  const defaultSteps = [
    'Your DID must be published on XRPL mainnet — this is your sovereign identity anchor.',
    'Widget NFTs are minted by the Village Treasury and bound to your DID address.',
    `The "${widgetName || 'Widget'}" NFT grants access to this specific feature.`,
    'Once owned, the Widget Unlock Engine verifies your ownership each time you visit.',
    'Widgets can be earned through contributions, governance, or traded in the Marketplace.',
  ];

  const steps = setupSteps.length > 0 ? setupSteps : defaultSteps;

  const axiMessage = `Hi Axi! I'm looking at the ${featureName || 'widget-gated feature'} page. Can you explain how Widget NFTs work, how I can get the "${widgetName || 'required widget'}" (${nftId || 'NFT'}), and walk me through setting up this feature step by step? My feature path is ${featurePath || 'unknown'}.`;

  return (
    <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/50 to-pink-950/30 border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-purple-300" />
            Axi's Guide — {featureName || 'Widget Feature'}
          </h3>
          <p className="text-purple-300/50 text-[10px]">
            How NFT widgets work · Setup instructions · DID requirements
          </p>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
          isUnlocked
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {isUnlocked ? '✓ Owned' : '⚠ Required'}
        </span>
      </div>

      {/* Feature description */}
      {description && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-white/70 text-xs leading-relaxed">{description}</p>
        </div>
      )}

      {/* How it works */}
      <div className="space-y-2">
        <p className="text-purple-300/60 text-[10px] uppercase tracking-widest flex items-center gap-1">
          <Layers className="w-3 h-3" /> How Widget NFT Access Works
        </p>
        <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] text-purple-300 font-bold">
                {i + 1}
              </span>
              <p className="text-white/60 text-xs leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Widget metadata */}
      <div className="flex flex-wrap gap-1.5">
        {nftId && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
            <Shield className="w-2.5 h-2.5" /> {nftId}
          </span>
        )}
        {featurePath && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">
            <Zap className="w-2.5 h-2.5" /> {featurePath}
          </span>
        )}
        {widgetName && (
          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
            <Tag className="w-2.5 h-2.5" /> {widgetName}
          </span>
        )}
      </div>

      {/* Ask Axi CTA */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: axiMessage } }))}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl py-2.5 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" /> Ask Axi About This Feature
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', {
            detail: { message: `Hi Axi! How do I earn or acquire Widget NFTs in SoulBridge? I want to understand the full NFT widget system and how ownership works on the XRPL.` }
          }))}
          className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10 text-white/70 hover:text-white text-xs rounded-xl py-2.5 px-4 transition-all"
        >
          Learn NFT System <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Footer */}
      <p className="text-purple-300/30 text-[8px] text-center">
        Widget NFTs are sovereign access tokens on the XRP Ledger · Governed by the 11 Laws of Honour · Powered by XRPL
      </p>
    </div>
  );
}