import React from 'react';
import { DollarSign, Landmark, ArrowRightLeft, Users } from 'lucide-react';
import { xrpToRlusd } from '@/lib/economicUtils';

const KPI_CONFIG = [
  { key: 'volume', label: 'Total Volume', icon: DollarSign, color: 'text-emerald-400', border: 'border-emerald-500/30', format: v => `${v.toFixed(0)} XRP`, showRlusd: true },
  { key: 'treasury', label: 'Treasury Balance', icon: Landmark, color: 'text-blue-400', border: 'border-blue-500/30', format: v => `${v.toFixed(0)} XRP`, showRlusd: true },
  { key: 'transactions', label: 'Transactions', icon: ArrowRightLeft, color: 'text-white', border: 'border-slate-500/30', format: v => v },
  { key: 'agents', label: 'Active Agents', icon: Users, color: 'text-amber-400', border: 'border-amber-500/30', format: v => v },
];

export default function EconomicKPIs({ volume = 0, treasury = 0, transactions = 0, agents = 0 }) {
  const values = { volume, treasury, transactions, agents };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {KPI_CONFIG.map(k => (
        <div key={k.key} className={`bg-slate-900/60 border ${k.border} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <k.icon className={`w-4 h-4 ${k.color}`} />
            <span className="text-xs text-slate-500">{k.label}</span>
          </div>
          <div className={`text-2xl font-bold ${k.color}`}>{k.format(values[k.key])}</div>
          {k.showRlusd && <div className="text-[10px] text-slate-500 mt-0.5">≈${xrpToRlusd(values[k.key])} RLUSD</div>}
        </div>
      ))}
    </div>
  );
}