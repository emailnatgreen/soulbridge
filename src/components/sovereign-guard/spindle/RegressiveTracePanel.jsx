import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { History, Gauge } from 'lucide-react';

function SincerityGauge({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 70 ? '#4ade80' : pct >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-[9px] text-white/30">Sincerity</span>
    </div>
  );
}

export default function RegressiveTracePanel({ decisions }) {
  if (!decisions || decisions.length === 0) return null;

  // Build sincerity timeline from decisions (newest first in data, reverse for chart)
  const chartData = [...decisions].reverse().map((d, i) => {
    let ctx = {};
    try { ctx = JSON.parse(d.context || '{}'); } catch { /* */ }
    return {
      idx: i + 1,
      sincerity: ctx.sincerity_score ?? 0,
      verdict: ctx.verdict,
      time: new Date(d.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  });

  const latestScore = chartData.length > 0 ? chartData[chartData.length - 1].sincerity : 0;

  // Build event timeline (newest first)
  const timeline = decisions.slice(0, 10).map((d) => {
    let ctx = {};
    try { ctx = JSON.parse(d.context || '{}'); } catch { /* */ }
    return {
      id: d.id,
      time: new Date(d.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      verdict: ctx.verdict,
      sincerity: ctx.sincerity_score,
      monkey: ctx.monkey_verdict,
      block_source: ctx.block_source,
    };
  });

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            <History className="w-3 h-3 inline mr-1" />
            Panel 2 — Regressive Trace & Sincerity
          </p>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left: Timeline */}
          <div className="flex-1 border-r border-white/5 p-3">
            <p className="text-[9px] text-white/20 uppercase mb-2">Shadow Timeline</p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {timeline.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-white/[0.03]">
                    <span className="text-white/25 font-mono w-16 shrink-0">{ev.time}</span>
                    <Badge className={`text-[8px] border ${ev.verdict === 'PASS' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                      {ev.verdict}
                    </Badge>
                    <span className="text-white/40">S:{ev.sincerity}</span>
                    <span className="text-white/25 truncate">{ev.block_source || '—'}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Gauge + Chart */}
          <div className="w-full md:w-64 p-3 flex flex-col items-center gap-3">
            <SincerityGauge score={latestScore} />
            <div className="w-full h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="idx" tick={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={false} axisLine={false} width={0} />
                  <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                    labelFormatter={(v) => `Eval #${v}`}
                  />
                  <Line type="monotone" dataKey="sincerity" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-white/20">Sincerity over last {chartData.length} evaluations</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}