import React from 'react';
import { Sparkles, ScrollText, Zap, Play } from 'lucide-react';

function ItemList({ items, icon: Icon, iconColor, emptyLabel }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center py-4">
        <span className="text-xs text-slate-600">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={item.id || i} className="flex items-center gap-2.5 rounded-lg border border-slate-700/40 bg-slate-800/30 px-3 py-2.5">
          <Icon className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
          <span className="text-sm text-slate-300">{item.type || item.name || `Item ${i + 1}`}</span>
        </div>
      ))}
    </div>
  );
}

export default function TriggersActionsPanel({ triggers, actions }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          Triggers
          <span className="text-[10px] text-slate-600 ml-auto">{triggers?.length || 0}</span>
        </h3>
        <ItemList items={triggers} icon={Sparkles} iconColor="text-amber-400/60" emptyLabel="No triggers defined" />
      </div>

      <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-teal-400" />
          Actions
          <span className="text-[10px] text-slate-600 ml-auto">{actions?.length || 0}</span>
        </h3>
        <ItemList items={actions} icon={ScrollText} iconColor="text-teal-400/60" emptyLabel="No actions defined" />
      </div>
    </div>
  );
}