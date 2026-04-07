import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Globe, Server } from 'lucide-react';
import { xrpToRlusd } from '@/lib/economicUtils';
import { useXrpPriceContext } from '@/components/economic/XrpPriceContext';

export default function DataScopeNotice({
  onChainCount,
  onChainVolume,
  internalCount,
  internalVolume,
  activityCount,
}) {
  const [expanded, setExpanded] = useState(false);
  const { price } = useXrpPriceContext();
  const totalCount = onChainCount + internalCount;
  const totalVolume = onChainVolume + internalVolume;

  if (totalCount === 0) return null;

  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-slate-300">
            <span className="text-emerald-400 font-medium">{onChainCount} on-chain</span>
            {' + '}
            <span className="text-slate-400 font-medium">{internalCount} internal</span>
            {' = '}
            <span className="text-white font-medium">{totalCount} total transactions</span>
            <span className="text-slate-500 ml-2">· {activityCount} economic activities</span>
          </span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-700/40 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The dashboard separates <strong className="text-emerald-400">verified on-chain XRPL transactions</strong> from{' '}
            <strong className="text-slate-300">internal/simulated activity</strong> to ensure KPIs reflect real economic movement.
            Both categories are tracked — here's the breakdown:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">On-Chain (XRPL Verified)</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">{onChainVolume.toLocaleString()} XRP</div>
              <div className="text-[10px] text-emerald-300/60">≈${xrpToRlusd(onChainVolume, price)} RLUSD · {onChainCount} transactions</div>
              <p className="text-[10px] text-slate-500 mt-1">Verified with 64-char XRPL transaction hashes. These power the primary KPIs.</p>
            </div>

            <div className="bg-slate-500/5 border border-slate-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Server className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Internal / Simulated</span>
              </div>
              <div className="text-lg font-bold text-slate-300">{internalVolume.toLocaleString()} XRP</div>
              <div className="text-[10px] text-slate-400/60">≈${xrpToRlusd(internalVolume, price)} RLUSD · {internalCount} transactions</div>
              <p className="text-[10px] text-slate-500 mt-1">System operations, task rewards, and simulated flows. Included in Total Ecosystem Activity.</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-600">
            Economic Activities ({activityCount}) are a separate entity that tracks agent-level events (earned, spent, traded, treasury deposits/withdrawals, resource acquisitions). They overlap with but are not identical to Transaction records.
          </p>
        </div>
      )}
    </div>
  );
}