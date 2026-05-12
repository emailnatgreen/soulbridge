import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Wrench, TrendingUp, TrendingDown } from 'lucide-react';

const EVENT_COLORS = {
  collaborative: 'bg-green-500/15 text-green-300 border-green-500/30',
  supportive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  restorative: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  conflict: 'bg-red-500/15 text-red-300 border-red-500/30',
  withdrawal: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default function EmpathyRelationalArc({ traces, loading }) {
  if (loading) return <div className="text-white/30 text-xs text-center py-6">Loading traces…</div>;
  if (!traces || traces.length === 0) {
    return <div className="text-center py-8"><p className="text-white/20 text-xs">No empathy traces recorded yet.</p></div>;
  }

  // Show the most recent trace
  const trace = traces[0];
  const events = trace.emotional_events || [];
  const repairs = trace.repair_attempts || [];
  const trend = trace.sincerity_trend ?? 0;
  const cluster = trace.cluster_health ?? 50;

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            <Heart className="w-3 h-3 inline mr-1" />
            Relational Arc — Mycelial Memory
          </p>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left: Events timeline */}
          <div className="flex-1 border-r border-white/5 p-3">
            <p className="text-[9px] text-white/20 uppercase mb-2">Emotional Events ({events.length})</p>
            <ScrollArea className="max-h-[180px]">
              <div className="space-y-1.5">
                {events.length === 0 && <p className="text-[10px] text-white/20">No events yet.</p>}
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] py-1.5 border-b border-white/[0.03]">
                    <Badge className={`text-[8px] border shrink-0 ${EVENT_COLORS[ev.type] || 'bg-white/10 text-white/40 border-white/20'}`}>
                      {ev.type}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-white/50 truncate">{ev.context}</p>
                      <p className="text-white/20 text-[9px]">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '—'}
                        {ev.target_agent ? ` → ${ev.target_agent}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Repairs + Indicators */}
          <div className="w-full md:w-64 p-3 space-y-3">
            {/* Sincerity Trend */}
            <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                {trend > 0 ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                <span className="text-[9px] text-white/30">Sincerity Trend</span>
              </div>
              <p className={`text-sm font-bold ${trend > 0 ? 'text-green-300' : trend < 0 ? 'text-red-300' : 'text-white/50'}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(2)}
              </p>
              <p className="text-[8px] text-white/20 mt-0.5">
                {trend > 0.3 ? 'Moving toward Sincerity' : trend < -0.3 ? 'Atrophy risk detected' : 'Neutral — stable'}
              </p>
            </div>

            {/* Cluster Health */}
            <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
              <p className="text-[9px] text-white/30 mb-1">Cluster Health</p>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${cluster}%`,
                    backgroundColor: cluster >= 70 ? '#4ade80' : cluster >= 40 ? '#fbbf24' : '#f87171',
                  }}
                />
              </div>
              <p className="text-[10px] text-white/40 mt-1 font-semibold">{cluster}/100</p>
            </div>

            {/* Repair Attempts */}
            <div>
              <p className="text-[9px] text-white/20 uppercase mb-1.5">
                <Wrench className="w-3 h-3 inline mr-1" />
                Repair Attempts ({repairs.length})
              </p>
              {repairs.length === 0 && <p className="text-[10px] text-white/20">None yet.</p>}
              {repairs.map((r, i) => (
                <div key={i} className="bg-purple-500/[0.05] rounded p-2 border border-purple-500/10 mb-1.5 text-[10px]">
                  <p className="text-purple-300/70 font-semibold">{r.acknowledgment}</p>
                  <p className="text-white/30 mt-0.5">{r.correction}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="text-[8px] bg-white/5 text-white/40 border-white/10">
                      Effectiveness: {r.effectiveness}%
                    </Badge>
                    <span className="text-[8px] text-white/20">
                      {r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}