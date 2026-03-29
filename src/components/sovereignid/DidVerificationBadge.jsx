import React from 'react';
import { BadgeCheck } from 'lucide-react';

export default function DidVerificationBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300">
      <BadgeCheck className="w-4 h-4" />
      Ripple-style Verified DID
    </div>
  );
}