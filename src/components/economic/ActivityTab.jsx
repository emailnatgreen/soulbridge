import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Package, ShoppingCart, Wallet, Clock, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FLOW_CONFIG, resolveAgentName, getValidActivities } from '@/lib/economicUtils';

// Visual config per activity type — icons, colors, and amount display
const TYPE_VISUALS = {
  earned: {
    icon: ArrowUpRight,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    amountColor: 'text-emerald-400',
    prefix: '+',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  resource_sold: {
    icon: ShoppingCart,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    amountColor: 'text-emerald-400',
    prefix: '+',
    tagColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  spent: {
    icon: ArrowDownRight,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/15 border-red-500/30',
    amountColor: 'text-red-400',
    prefix: '−',
    tagColor: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  treasury_withdrawal: {
    icon: Landmark,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    amountColor: 'text-amber-400',
    prefix: '−',
    tagColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  treasury_deposit: {
    icon: Landmark,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/15 border-blue-500/30',
    amountColor: 'text-blue-400',
    prefix: '→',
    tagColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  resource_acquired: {
    icon: Package,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    amountColor: 'text-cyan-400',
    prefix: '−',
    tagColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  traded: {
    icon: RefreshCw,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    amountColor: 'text-indigo-400',
    prefix: '⇄',
    tagColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
};

const DEFAULT_VISUAL = {
  icon: Wallet,
  iconColor: 'text-slate-400',
  iconBg: 'bg-slate-500/15 border-slate-500/30',
  amountColor: 'text-slate-400',
  prefix: '',
  tagColor: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

// Ordered filter tabs matching the user's expected categories
const FILTER_ORDER = ['all', 'treasury_deposit', 'resource_acquired', 'treasury_withdrawal', 'earned', 'spent', 'traded', 'resource_sold'];

export default function ActivityTab({ activities = [], agents = [] }) {
  const [filter, setFilter] = useState('all');

  const valid = getValidActivities(activities);

  // Build available filter types from data, but keep them in a logical order
  const presentTypes = new Set(valid.map(a => a.activity_type).filter(Boolean));
  const types = FILTER_ORDER.filter(t => t === 'all' || presentTypes.has(t));

  const filtered = filter === 'all' ? valid : valid.filter(a => a.activity_type === filter);

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No economic activity recorded yet.</p>
        <p className="text-slate-600 text-xs mt-1">Activities appear when agents trade, earn, or interact with the treasury.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Filter by type</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {types.map(t => {
            const vis = TYPE_VISUALS[t];
            const label = t === 'all' ? 'All' : (FLOW_CONFIG[t]?.label || t.replace(/_/g, ' '));
            const count = t === 'all' ? valid.length : valid.filter(a => a.activity_type === t).length;
            const isActive = filter === t;

            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-600'
                }`}
              >
                {vis && <vis.icon className="w-3 h-3" />}
                {label}
                <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-white/20' : 'bg-slate-700/60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <p className="text-slate-500 text-xs">
        Showing {filtered.length} of {valid.length} verified activities
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="ml-2 text-emerald-400 hover:text-emerald-300 underline">
            Clear filter
          </button>
        )}
      </p>

      {/* Empty state for filter */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-700/40 rounded-xl">
          <Package className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No {FLOW_CONFIG[filter]?.label || filter} activities found.</p>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.slice(0, 80).map(a => (
          <ActivityRow key={a.id} activity={a} agents={agents} />
        ))}
        {filtered.length > 80 && (
          <p className="text-center text-slate-600 text-xs py-2">
            Showing first 80 of {filtered.length} results
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity, agents }) {
  const vis = TYPE_VISUALS[activity.activity_type] || DEFAULT_VISUAL;
  const flowCfg = FLOW_CONFIG[activity.activity_type];
  const Icon = vis.icon;
  const agentName = resolveAgentName(activity.agent_id, agents);
  const relatedName = activity.related_agent_id ? resolveAgentName(activity.related_agent_id, agents) : null;

  const ts = (() => {
    try { return format(parseISO(activity.created_date), 'MMM d, HH:mm'); } catch { return ''; }
  })();

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/40 rounded-xl hover:border-slate-600/60 transition-colors">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${vis.iconBg}`}>
        <Icon className={`w-4 h-4 ${vis.iconColor}`} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-200 text-sm font-medium">{agentName}</span>
          {relatedName && (
            <span className="text-slate-500 text-xs">→ {relatedName}</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${vis.tagColor}`}>
            {flowCfg?.label || activity.activity_type}
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5 truncate">{activity.description || 'No description'}</p>
        {activity.transaction_hash && activity.transaction_hash !== 'N/A - manual confirmation' && (
          <p className="text-slate-600 text-[10px] font-mono mt-0.5 truncate">
            tx: {activity.transaction_hash.slice(0, 16)}…
          </p>
        )}
      </div>

      {/* Amount + Time */}
      <div className="text-right shrink-0">
        <div className={`font-semibold text-sm ${vis.amountColor}`}>
          {vis.prefix}{activity.amount} XRP
        </div>
        {ts && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-0.5 justify-end">
            <Clock className="w-2.5 h-2.5" />{ts}
          </div>
        )}
      </div>
    </div>
  );
}