import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

/**
 * Safety badge for search results.
 * Safe (no flags), Caution (warned), Low Safety (blocked or error)
 */
export default function SafetyBadge({ safetyFlags = [], outcomeStatus }) {
  const hasBlock = safetyFlags.includes('EARTH_BLOCKED_QUERY') || safetyFlags.includes('COLLECTIVE_BLOCKED');
  const hasWarn = safetyFlags.includes('COLLECTIVE_WARNED') || outcomeStatus === 'warned';
  const hasError = safetyFlags.includes('ENGINE_ERROR');

  if (hasBlock || hasError) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/30')}>
        <ShieldOff className="w-3 h-3" /> {hasBlock ? 'Blocked' : 'Error'}
      </span>
    );
  }
  if (hasWarn) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30')}>
        <ShieldAlert className="w-3 h-3" /> Caution
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30')}>
      <ShieldCheck className="w-3 h-3" /> Safe
    </span>
  );
}