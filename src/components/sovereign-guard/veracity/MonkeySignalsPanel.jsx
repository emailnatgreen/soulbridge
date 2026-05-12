import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MonitorSmartphone, ShieldCheck, AlertTriangle, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import RealitySignalCard from './RealitySignalCard';

const TREND_LABELS = { rising: '↑ Rising', falling: '↓ Falling', stable: '— Stable' };
const TREND_COLORS = { rising: 'text-emerald-400', falling: 'text-red-400', stable: 'text-white/30' };

export default function MonkeySignalsPanel({ agentId, showLore }) {
  const { data, isLoading } = useQuery({
    queryKey: ['veracity-monkey', agentId],
    queryFn: () => base44.functions.invoke('monkeyGate', { action: 'inspect_reality', agent_id: agentId }),
    enabled: !!agentId,
    select: (res) => res.data,
  });

  if (!agentId) return null;
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>;
  if (!data) return null;

  const s = data.signals || {};
  const score = data.monkey_score;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <MonitorSmartphone className="w-4 h-4 text-amber-400" />
        <h4 className="text-white text-sm font-semibold">{showLore ? 'Monkey Layer — Behavioral Membrane' : 'Monkey Gate Signals'}</h4>
      </div>

      {/* Overall Monkey Score */}
      <Card className={`border ${
        score >= 70 ? 'bg-emerald-500/10 border-emerald-500/30' :
        score >= 50 ? 'bg-amber-500/10 border-amber-500/30' :
        score >= 25 ? 'bg-orange-500/10 border-orange-500/30' :
        'bg-red-500/10 border-red-500/30'
      }`}>
        <CardContent className="py-3 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              {showLore ? 'Behavioral Resonance Index' : 'Monkey Health Score'}
            </p>
            <p className="text-2xl font-bold text-white">{score}<span className="text-white/30 text-sm">/100</span></p>
            {showLore && (
              <p className="text-purple-300/60 text-[10px] italic mt-0.5">
                {score >= 70 ? '"The branches sway in harmony — instincts aligned"' :
                 score >= 50 ? '"The monkey watches, alert but cautious"' :
                 score >= 25 ? '"Erratic swings detected — the canopy shudders"' :
                 '"The monkey screams — something is deeply wrong"'}
              </p>
            )}
          </div>
          {score >= 70 ? <ShieldCheck className="w-6 h-6 text-emerald-400" /> :
           score >= 50 ? <Minus className="w-6 h-6 text-amber-400" /> :
           <AlertTriangle className="w-6 h-6 text-red-400" />}
        </CardContent>
      </Card>

      {/* Signal Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RealitySignalCard
          label={showLore ? "Actions Witnessed" : "Total Events"}
          value={s.total_events}
          trend={s.total_events > 5 ? 'up' : 'neutral'}
          loreNote={showLore ? "How many deeds the Monkey has observed" : null}
        />
        <RealitySignalCard
          label={showLore ? "Passages Granted" : "Pass Count"}
          value={s.pass_count}
          trend="up"
          loreNote={showLore ? "Actions that passed the instinct gate" : null}
        />
        <RealitySignalCard
          label={showLore ? "Paths Blocked" : "Block Count"}
          value={s.block_count}
          trend={s.block_count === 0 ? 'up' : 'down'}
          loreNote={showLore ? "Actions denied at the threshold" : null}
        />
        <RealitySignalCard
          label={showLore ? "Quarantine Seals" : "Quarantine Count"}
          value={s.quarantine_count}
          trend={s.quarantine_count === 0 ? 'up' : 'down'}
          loreNote={showLore ? "Actions isolated for deep review" : null}
        />
        <RealitySignalCard
          label={showLore ? "Shadow Ratio" : "Block Ratio"}
          value={`${s.block_ratio}%`}
          isText
          trend={s.block_ratio <= 10 ? 'up' : s.block_ratio <= 25 ? 'neutral' : 'down'}
          loreNote={showLore ? "What proportion of intent was rejected" : null}
        />
        <RealitySignalCard
          label={showLore ? "Anti-Co-Evolution Flags" : "Anti-CoEv Count"}
          value={s.anti_co_evolution_count}
          trend={s.anti_co_evolution_count === 0 ? 'up' : 'down'}
          loreNote={showLore ? "Actions that threatened the Village" : null}
        />
        <RealitySignalCard
          label={showLore ? "Alignment Current" : "Avg Alignment"}
          value={s.avg_alignment}
          suffix="/100"
          trend={s.avg_alignment >= 60 ? 'up' : s.avg_alignment >= 40 ? 'neutral' : 'down'}
          loreNote={showLore ? "How well actions match purpose" : null}
        />
        <RealitySignalCard
          label={showLore ? "Co-Evolution Pulse" : "Avg Co-Evolution"}
          value={s.avg_co_evolution}
          suffix="/100"
          trend={s.avg_co_evolution >= 60 ? 'up' : s.avg_co_evolution >= 40 ? 'neutral' : 'down'}
          loreNote={showLore ? "Contribution to collective growth" : null}
        />
      </div>

      {/* Trend Indicators */}
      <div className="flex gap-4 text-[10px]">
        <span className="text-white/30">Trends:</span>
        <span className={TREND_COLORS[s.relevance_trend] || 'text-white/30'}>Relevance {TREND_LABELS[s.relevance_trend] || '—'}</span>
        <span className={TREND_COLORS[s.alignment_trend] || 'text-white/30'}>Alignment {TREND_LABELS[s.alignment_trend] || '—'}</span>
        <span className={TREND_COLORS[s.co_evolution_trend] || 'text-white/30'}>CoEv {TREND_LABELS[s.co_evolution_trend] || '—'}</span>
      </div>

      {/* Trigger Distribution */}
      {s.trigger_distribution && Object.keys(s.trigger_distribution).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-white/30 text-[10px] mr-1">{showLore ? 'Instinct Triggers:' : 'Triggers:'}</span>
          {Object.entries(s.trigger_distribution).map(([trigger, count]) => (
            <Badge key={trigger} className="text-[9px] bg-white/5 text-white/50 border-white/10">
              {trigger}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Methodology */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
        <p className="text-white/20 text-[10px] leading-relaxed">
          <span className="text-amber-400/50 font-semibold">Monkey Method:</span> Score = base(60) − blockRatio({s.block_ratio}%) − quarantines({s.quarantine_count}) − antiCoEv({s.anti_co_evolution_count}) + alignment({s.avg_alignment >= 70 ? '+10' : s.avg_alignment >= 50 ? '+5' : '0'}) + coEv({s.avg_co_evolution >= 70 ? '+10' : s.avg_co_evolution >= 50 ? '+5' : '0'}) = {score}. 
          From {s.total_events} MonkeyBehaviorEvent records. No LLM. Pure entity math.
        </p>
      </div>
    </div>
  );
}