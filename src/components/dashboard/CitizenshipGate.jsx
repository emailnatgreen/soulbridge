import React from 'react';
import { Sparkles } from 'lucide-react';
import CitizenshipNFTCard from '@/components/dashboard/CitizenshipNFTCard';

/**
 * Compact welcome card for new (non-citizen) users.
 * Shows welcome message + Citizenship NFT purchase card + marketplace link.
 * Wallet, widgets, and transactions are rendered by the parent Dashboard.
 */
export default function CitizenshipGate({ identityDid, firstName }) {
  const openAxi = (msg) => {
    window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
  };

  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/40 rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to SoulBridge'} 🌟
            </h2>
            <p className="text-white/50 text-sm mt-1 leading-relaxed">
              Your DID is live. Acquire the <strong className="text-purple-300">Citizenship NFT</strong> below to unlock the full Village.
            </p>
            {identityDid && (
              <p className="text-purple-200/30 font-mono text-[10px] truncate mt-2 bg-black/20 px-2 py-1 rounded-lg border border-white/10 inline-block max-w-full">
                {identityDid}
              </p>
            )}
          </div>
        </div>

        {/* Talk to Axi */}
        <button
          onClick={() => openAxi(`Hi Axi! I'm ${firstName || 'new here'} and just published my DID. Can you walk me through how to become a citizen and what I can do in SoulBridge?`)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl px-4 py-3 transition-all"
        >
          <Sparkles className="w-4 h-4" /> Talk to Axi
        </button>
      </div>

      {/* Citizenship NFT — direct purchase + marketplace link */}
      <CitizenshipNFTCard onPurchaseComplete={() => window.location.reload()} />
    </div>
  );
}