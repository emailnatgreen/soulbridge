import React from 'react';
import { ShieldCheck, Award, Sparkles } from 'lucide-react';

export default function DidVerificationCertificate({ wallet, verification }) {
  return (
    <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-slate-900 to-purple-950 p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-sky-300/70">Verification Certificate</p>
          <h4 className="text-white font-semibold text-lg mt-1">Certified Sovereign DID</h4>
        </div>
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
          <Award className="w-5 h-5 text-sky-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-black/20 border border-white/10 p-3">
          <p className="text-white/40 text-xs mb-1">Wallet</p>
          <p className="text-white font-medium">{wallet.name || 'Primary Wallet'}</p>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/10 p-3">
          <p className="text-white/40 text-xs mb-1">Network</p>
          <p className="text-white font-medium capitalize">{wallet.network || 'testnet'}</p>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/10 p-3 md:col-span-2">
          <p className="text-white/40 text-xs mb-1">Verified DID</p>
          <p className="text-sky-300 font-mono text-xs break-all">did:xrpl:1:{wallet.classic_address}</p>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/10 p-3">
          <p className="text-white/40 text-xs mb-1">Verification Status</p>
          <p className="text-green-300 font-medium flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> On-chain verified</p>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/10 p-3">
          <p className="text-white/40 text-xs mb-1">Verified At</p>
          <p className="text-white font-medium">{verification?.verified_at ? new Date(verification.verified_at).toLocaleString() : 'Just now'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-200">
        <Sparkles className="w-4 h-4" />
        This DID has been published and confirmed on-chain.
      </div>
    </div>
  );
}