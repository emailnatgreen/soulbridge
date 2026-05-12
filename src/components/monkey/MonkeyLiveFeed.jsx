import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, AlertTriangle, Clock, Zap } from 'lucide-react';

const VERDICT_CONFIG = {
  PASS:       { icon: Check,          color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Pass' },
  BLOCK:      { icon: X,              color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'Block' },
  QUARANTINE: { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Quarantine' },
  PENDING:    { icon: Clock,          color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   label: 'Pending' },
};

const TRIGGER_COLORS = {
  novelty: 'bg-purple-500/20 text-purple-300',
  boundary: 'bg-orange-500/20 text-orange-300',
  reciprocity: 'bg-emerald-500/20 text-emerald-300',
  honour: 'bg-cyan-500/20 text-cyan-300',
  sincerity: 'bg-pink-500/20 text-pink-300',
  threat: 'bg-red-500/20 text-red-300',
  pattern: 'bg-blue-500/20 text-blue-300',
  none: 'bg-slate-500/20 text-slate-300',
};

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-white/40 w-6">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-white/50 w-6 text-right">{value}</span>
    </div>
  );
}

export default function MonkeyLiveFeed({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-white/20 text-sm">
        No behaviour events recorded yet. The Monkey is watching...
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {events.map((e) => {
          const config = VERDICT_CONFIG[e.verdict] || VERDICT_CONFIG.PENDING;
          const Icon = config.icon;
          return (
            <div key={e.id} className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-xs font-medium truncate">{e.agent || e.agent_name}</span>
                    <Badge className={`text-[9px] ${TRIGGER_COLORS[e.trigger || e.trigger_type] || TRIGGER_COLORS.none}`}>
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      {e.trigger || e.trigger_type || 'none'}
                    </Badge>
                    <Badge className={`text-[9px] ${config.bg} ${config.color} border-none`}>{config.label}</Badge>
                  </div>
                  <p className="text-white/50 text-[10px] mt-1 line-clamp-2">{e.behavior || e.behavior_description}</p>
                  <div className="mt-2 space-y-1">
                    <ScoreBar label="R" value={e.relevance ?? e.relevance_score ?? 0} color="bg-cyan-400" />
                    <ScoreBar label="A" value={e.alignment ?? e.alignment_score ?? 0} color="bg-purple-400" />
                    <ScoreBar label="CE" value={e.co_ev ?? e.co_evolution_score ?? 0} color="bg-emerald-400" />
                  </div>
                  {e.verdict_reason && (
                    <p className="text-white/30 text-[9px] mt-1.5 italic">{e.verdict_reason}</p>
                  )}
                  <p className="text-white/20 text-[9px] mt-1">
                    {e.created ? new Date(e.created).toLocaleString() : e.created_date ? new Date(e.created_date).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}