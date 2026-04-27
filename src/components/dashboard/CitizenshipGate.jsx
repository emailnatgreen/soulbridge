import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ShoppingBag, ArrowRight, Sparkles, Users, Vote, BookOpen, Wallet, Zap } from 'lucide-react';

const LOCKED_FEATURES = [
  { icon: Users, label: 'AI Agents', desc: 'Deploy sovereign AI agents' },
  { icon: Vote, label: 'Governance', desc: 'Vote & propose changes' },
  { icon: BookOpen, label: 'Skills Hub', desc: 'Develop expertise' },
  { icon: Wallet, label: 'Wallets', desc: 'Send & receive XRP' },
  { icon: Zap, label: 'Kinetic Grid', desc: 'Energy & motion' },
  { icon: Shield, label: 'Sovereign ID', desc: 'Your DID hub' },
];

export default function CitizenshipGate({ identityDid, firstName }) {
  return (
    <div className="space-y-5">
      {/* DID Active Banner */}
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-green-300 font-semibold text-sm">DID Published ✓</h3>
            <p className="text-green-200/40 text-xs">Your identity is live on XRPL</p>
          </div>
        </div>
        {identityDid && (
          <p className="text-green-200/30 font-mono text-[10px] truncate bg-black/20 px-3 py-1.5 rounded-lg border border-green-500/10">
            {identityDid}
          </p>
        )}
      </div>

      {/* Become a Citizen CTA */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to SoulBridge'} 🌟
            </h2>
            <p className="text-white/50 text-sm mt-1 leading-relaxed">
              Your DID is published — you're recognised. To become a <strong className="text-purple-300">full citizen</strong> and unlock the Village, you need the <strong className="text-purple-300">Citizenship Widget NFT</strong>.
            </p>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-2">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">What citizenship unlocks</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LOCKED_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5 opacity-50">
                <Icon className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/40 text-[10px] font-semibold">{label}</p>
                  <p className="text-white/20 text-[8px] truncate">{desc}</p>
                </div>
                <Lock className="w-3 h-3 text-white/20 flex-shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/widget-marketplace"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl py-4 transition-all shadow-lg shadow-purple-500/30"
        >
          <ShoppingBag className="w-5 h-5" />
          Get Citizenship NFT
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Ask Axi */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Need help?</p>
          <p className="text-white/40 text-xs">Ask Axi about becoming a citizen</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', {
            detail: { message: 'Hi Axi! I\'ve just published my DID. How do I become a full citizen of SoulBridge? What is the Citizenship Widget NFT and how do I get it?' }
          }))}
          className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
        >
          Ask Axi
        </button>
      </div>
    </div>
  );
}