import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Leaf } from 'lucide-react';

const COLOR_MAP = {
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', icon: 'text-red-400', dot: 'bg-red-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', icon: 'text-purple-400', dot: 'bg-purple-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', icon: 'text-amber-400', dot: 'bg-amber-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', icon: 'text-cyan-400', dot: 'bg-cyan-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'text-blue-400', dot: 'bg-blue-400' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300', icon: 'text-slate-400', dot: 'bg-slate-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', icon: 'text-orange-400', dot: 'bg-orange-400' },
};

export default function ExperimentalLeafCard({ leaf, expanded, onToggle, children }) {
  const c = COLOR_MAP[leaf.color] || COLOR_MAP.slate;
  const Icon = leaf.icon;

  const statusColors = {
    live: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    cloned: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    experimental: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    skeleton: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-4 cursor-pointer transition-all hover:scale-[1.01]`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${c.text}`}>{leaf.label || `Leaf ${leaf.id}: ${leaf.name}`}</span>
            <Badge className={`text-[8px] ${statusColors[leaf.status] || statusColors.skeleton}`}>
              {leaf.status}
            </Badge>
          </div>
        </div>
        <span className={`w-2 h-2 rounded-full ${c.dot} opacity-30`} />
      </div>

      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-white/5" onClick={e => e.stopPropagation()}>
          <p className="text-white/50 text-xs leading-relaxed">{leaf.desc}</p>
          {leaf.source && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Data Source</p>
                <p className="text-white/50 text-xs">{leaf.source}</p>
              </div>
              <div>
                <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Output</p>
                <p className="text-white/50 text-xs">{leaf.output}</p>
              </div>
            </div>
          )}
          {children || (
            <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-center">
              <Leaf className="w-6 h-6 text-white/10 mx-auto mb-1" />
              <p className="text-white/20 text-[10px]">Awaiting experimental implementation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}