import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Server, Bot, Layout, Microscope, Clock } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_ICONS = {
  node: Server,
  agent: Bot,
  feature: Layout,
  general: Microscope,
};

const TYPE_COLORS = {
  node: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  agent: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  feature: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  general: 'bg-white/5 text-white/40 border-white/10',
};

export default function InvestigationHistory({ investigations, selectedId, onSelect }) {
  if (!investigations || investigations.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-4">No investigations yet</p>;
  }

  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {investigations.map(inv => {
        const Icon = TYPE_ICONS[inv.target_type] || Microscope;
        const isActive = selectedId === inv.id;
        return (
          <button
            key={inv.id}
            onClick={() => onSelect(inv.id)}
            className={`w-full text-left rounded-lg p-2.5 transition-all ${isActive ? 'bg-violet-600/20 border border-violet-500/40' : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? 'text-violet-300' : 'text-slate-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>{inv.question}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-[8px] ${TYPE_COLORS[inv.target_type] || TYPE_COLORS.general}`}>
                    {inv.target_type}
                  </Badge>
                  {inv.status === 'complete' && (
                    <Badge className="text-[8px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">done</Badge>
                  )}
                  {inv.status === 'processing' && (
                    <Badge className="text-[8px] bg-amber-500/10 text-amber-300 border-amber-500/20">running</Badge>
                  )}
                </div>
                {inv.created_date && (
                  <p className="text-slate-500 text-[9px] mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(inv.created_date), 'dd MMM HH:mm')}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}