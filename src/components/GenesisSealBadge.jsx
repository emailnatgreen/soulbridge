import React from 'react';
import { Shield, Check, Zap, Lock, Fingerprint } from 'lucide-react';

/**
 * Genesis Seal Badge — our covenant with the future.
 */
export default function GenesisSealBadge() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-8 backdrop-blur-sm">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-purple-400 shadow-lg shadow-amber-500/20">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">The Genesis Seal: Our Covenant with the Future</h3>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-4">
            This seal signifies SoulBridge's unwavering commitment to verifiable DID sovereignty, 
            institutional compliance, and privacy-preserving architecture — all immutably anchored on the XRPL. 
            It is our promise of Honour and security to every Soul.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <Fingerprint className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs sm:text-sm text-white/60">Verifiable Sovereign Identity (DID)</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs sm:text-sm text-white/60">Institutional Grade Compliance</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-xs sm:text-sm text-white/60">Privacy-First Design</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}