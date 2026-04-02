import React from 'react';
import { BadgeCheck, AlertTriangle } from 'lucide-react';

export default function DidVerificationBadge({ verified = true, network }) {
  if (!verified) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5" />
        Unverified
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
      <BadgeCheck className="w-3.5 h-3.5" />
      XRPL On-Chain Verified{network ? ` · ${network}` : ''}
    </div>
  );
}