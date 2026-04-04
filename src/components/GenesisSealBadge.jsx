import React from 'react';
import { Shield, Check, Zap } from 'lucide-react';

/**
 * Genesis Seal Badge — static compliance display.
 * No API calls needed; the seal is a known constant.
 */
export default function GenesisSealBadge() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-purple-400">
            <Shield className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Genesis Seal Verified</h3>
          <p className="text-white/70 text-sm mb-3">
            SoulBridge's institutional compliance and verifiable DID sovereignty — anchored on XRPL.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-white/60">Institutional Verified</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-xs text-white/60">Privacy Preserving</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs text-white/60">UK FSMA 2026 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}