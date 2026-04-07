import React from 'react';
import { DollarSign, Landmark, ArrowRightLeft, Users, Globe, Activity } from 'lucide-react';
import { xrpToRlusd } from '@/lib/economicUtils';
import { useXrpPriceContext } from '@/components/economic/XrpPriceContext';

export default function EconomicKPIs({
  volume = 0,
  treasury = 0,
  transactions = 0,
  agents = 0,
  internalVolume = 0,
  internalCount = 0,
  activityCount = 0,
}) {
  const { price, source } = useXrpPriceContext();
  const totalVolume = volume + internalVolume;
  const totalTxCount = transactions + internalCount;

  return (
    <div className="space-y-3">
      {/* Rate indicator */}
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span>XRP/USD: <span className="text-emerald-400 font-medium">${price.toFixed(4)}</span></span>
        <span className="text-slate-700">·</span>
        <span>{source === 'coingecko' ? 'Live rate via CoinGecko' : 'Fallback rate'}</span>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={Globe}
          label="On-Chain Volume"
          value={`${volume.toFixed(0)} XRP`}
          sub={`≈$${xrpToRlusd(volume, price)} RLUSD`}
          color="emerald"
          footnote={`${transactions} verified XRPL txns`}
        />
        <KPICard
          icon={Landmark}
          label="Treasury Balance"
          value={`${treasury.toFixed(0)} XRP`}
          sub={`≈$${xrpToRlusd(treasury, price)} RLUSD`}
          color="blue"
        />
        <KPICard
          icon={Activity}
          label="Total Ecosystem Activity"
          value={`${totalVolume.toLocaleString()} XRP`}
          sub={`≈$${xrpToRlusd(totalVolume, price)} RLUSD`}
          color="purple"
          footnote={`${totalTxCount} txns (${transactions} on-chain + ${internalCount} internal)`}
        />
        <KPICard
          icon={Users}
          label="Active Agents"
          value={agents}
          color="amber"
          footnote={`${activityCount} economic activities recorded`}
        />
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color, footnote }) {
  const colors = {
    emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'text-emerald-400' },
    blue:    { border: 'border-blue-500/30',    text: 'text-blue-400',    icon: 'text-blue-400' },
    purple:  { border: 'border-purple-500/30',  text: 'text-purple-400',  icon: 'text-purple-400' },
    amber:   { border: 'border-amber-500/30',   text: 'text-amber-400',   icon: 'text-amber-400' },
  };
  const c = colors[color] || colors.emerald;

  return (
    <div className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
      {footnote && <div className="text-[10px] text-slate-600 mt-1">{footnote}</div>}
    </div>
  );
}