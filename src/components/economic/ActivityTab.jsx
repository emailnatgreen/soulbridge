import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Package, ShoppingCart, Wallet, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FLOW_CONFIG, resolveAgentName, getValidActivities } from '@/lib/economicUtils';

// Icon + visual config per activity type (consistent with FLOW_CONFIG directions)
const TYPE_VISUALS = {
  earned:              { icon: ArrowUpRight,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  resource_sold:       { icon: ShoppingCart,  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  spent:               { icon: ArrowDownRight, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  treasury_withdrawal: { icon: Landmark,      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  treasury_deposit:    { icon: Landmark,      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  resource_acquired:   { icon: Package,       color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' },
  traded:              { icon: RefreshCw,     color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/30' },
};

const DEFAULT_VISUAL = { icon: Wallet, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' };

export default function ActivityTab({ activities = [], agents = [] }) {
  const [filter, setFilter] = useState('all');

  const valid = getValidActivities(activities);
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
      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-colors ${
              filter === t
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {t === 'all' ? 'All' : (FLOW_CONFIG[t]?.label || t.replace(/_/g, ' '))}
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-xs">{filtered.length} activities</p>

      {/* Activity List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.slice(0, 80).map(a => {
          const flowCfg = FLOW_CONFIG[a.activity_type];
          const vis = TYPE_VISUALS[a.activity_type] || DEFAULT_VISUAL;
          const Icon = vis.icon;
          const agentName = resolveAgentName(a.agent_id, agents);
          const flow = flowCfg?.flow;

          let signPrefix = '';
          let amountColor = 'text-slate-400';
          if (flow === 'inflow') { signPrefix = '+'; amountColor = 'text-emerald-400'; }
          else if (flow === 'outflow' || flow === 'acquisition') { signPrefix = '−'; amountColor = 'text-red-400'; }
          else if (flow === 'deposit') { signPrefix = '→'; amountColor = 'text-blue-400'; }
          else if (flow === 'swap') { signPrefix = '⇄'; amountColor = 'text-indigo-400'; }

          const ts = (() => {
            try { return format(parseISO(a.created_date), 'MMM d, HH:mm'); } catch { return ''; }
          })();

          return (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/40 rounded-xl">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${vis.bg}`}>
                <Icon className={`w-4 h-4 ${vis.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-200 text-sm font-medium">{agentName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${vis.bg} ${vis.color}`}>
                    {flowCfg?.label || a.activity_type}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-0.5 truncate">{a.description || 'No description'}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-semibold text-sm ${amountColor}`}>
                  {signPrefix}{a.amount} XRP
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