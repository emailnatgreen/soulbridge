import React from 'react';
import { cn } from '@/lib/utils';
import { Star, Sun, CloudSun } from 'lucide-react';

/**
 * Honour badge for search results.
 * Radiant (≥0.8), Warm (≥0.4), Dim (<0.4)
 */
export default function HonourBadge({ score }) {
  const s = score ?? 0;

  if (s >= 0.8) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500/15 text-teal-300 border border-teal-500/30')}>
        <Star className="w-3 h-3" /> Radiant
      </span>
    );
  }
  if (s >= 0.4) {
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30')}>
        <Sun className="w-3 h-3" /> Warm
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30')}>
      <CloudSun className="w-3 h-3" /> Dim
    </span>
  );
}