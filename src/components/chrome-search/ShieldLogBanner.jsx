import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

/**
 * Transparency banner showing that the search was logged.
 * Never shows the raw query — only the shield entry ID.
 */
export default function ShieldLogBanner({ shieldEntryId, searchId }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/30 rounded-lg">
      <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <p className="text-xs text-slate-500 flex-1">
        Search logged for safety and governance.
      </p>
      {shieldEntryId && (
        <span className="text-[10px] text-slate-600 font-mono">
          #{shieldEntryId.slice(0, 10)}
        </span>
      )}
    </div>
  );
}