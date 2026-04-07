import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, ShoppingCart, Package, Wallet, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TYPE_CONFIG = {
  earned:               { icon: ArrowUpRight,   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',  label: 'Earned',       flow: 'in' },
  spent:                { icon: ArrowDownRight,  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',      label: 'Spent',        flow: 'out' },
  traded:               { icon: RefreshCw,       color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30',label: 'Traded',       flow: 'out' },
  treasury_deposit:     { icon: Landmark,        color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Treasury Deposit', flow: 'in' },
  treasury_withdrawal:  { icon: Landmark,        color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30',  label: 'Treasury Withdrawal', flow: 'out' },
  resource_acquired:    { icon: Package,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/30',    label: 'Resource Acquired', flow: 'in' },
  resource_sold:        { icon: ShoppingCart,     color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/30',    label: 'Resource Sold', flow: 'in' },
};

const DEFAULT_CONFIG = { icon: Wallet, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', label: 'Activity', flow: 'neutral' };

// Filter out simulated mega-transactions
function isRealisticAmount(a) {
  if (a.transaction_hash?.startsWith('TASK_') && a.amount > 1000) return false;
  if (a.amount > 10000 && !/^[A-Fa-f0-9]{64}$/.test(a.transaction_hash || '')) return false;
  return true;
}

function resolveAgentName(agentId, agents) {
  if (!agentId) return 'Unknown';
  const byId = agents.find(a => a.id === agentId);
  if (byId) return byId.name;
  const byAddress = agents.find(a => a.classic_address === agentId);
  if (byAddress) return byAddress.name;
  const byWallet = agents.find(a => a.wallet_id === agentId);
  if (byWallet) return byWallet.name;
  if (agentId === 'dex_swap') return 'DEX Swap Engine';
  if (agentId === 'rAXI' || agentId === 'axi_main_001') return 'Axi';
  if (agentId.startsWith('r') && agentId.length > 20) return `${agentId.slice(0, 6)}…${agentId.slice(-4)}`;
  return agentId.length > 12 ? `${agentId.slice(0, 10)}…` : agentId;
}

export default function ActivityTab({ activities = [], agents = [] }) {
  const [filter, setFilter] = useState('all');

  // Only show completed + realistic activities
  const valid = activities.filter(a => a.status === 'completed' && isRealisticAmount(a));
  const types = ['all', ...new Set(valid.map(a => a.activity_type).filter(Boolean))];
  const filtered = filter === 'all' ? valid : valid.filter(a => a.activity_type === filter);

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No economic activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors ${
              filter === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {t === 'all' ? 'All' : (TYPE_CONFIG[t]?.label || t.replace(/_/g, ' '))}
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-xs">{filtered.length} activities</p>

      {/* List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.slice(0, 80).map(a => {
          const cfg = TYPE_CONFIG[a.activity_type] || DEFAULT_CONFIG;
          const Icon = cfg.icon;
          const agentName = resolveAgentName(a.agent_id, agents);
          const ts = (() => {
            try { return format(parseISO(a.created_date), 'MMM d, HH:mm'); } catch { return ''; }
          })();

          return (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/40 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-200 text-sm font-medium">{agentName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 truncate">{a.description || 'No description'}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-semibold text-sm ${cfg.flow === 'in' ? 'text-green-400' : cfg.flow === 'out' ? 'text-blue-400' : 'text-slate-400'}`}>
                  {cfg.flow === 'in' ? '+' : cfg.flow === 'out' ? '-' : ''}{a.amount} XRP
                </div>
                {ts && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5 justify-end">
                    <Clock className="w-2.5 h-2.5" />{ts}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}