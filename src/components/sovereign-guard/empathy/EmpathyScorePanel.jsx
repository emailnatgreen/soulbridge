import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

function ScoreGauge({ score, label, color }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 163.4} 163.4`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-[8px] text-white/30">{label}</span>
    </div>
  );
}

export default function EmpathyScorePanel({ decisions }) {
  if (!decisions || decisions.length === 0) return null;

  // Parse latest
  let latest = {};
  try { latest = JSON.parse(decisions[0]?.context || '{}'); } catch {}

  // Build sparkline
  const chartData = [...decisions].reverse().map((d, i) => {
    let ctx = {};
    try { ctx = JSON.parse(d.context || '{}'); } catch {}
    return { idx: i + 1, score: ctx.empathy_score ?? 0, time: new Date(d.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  });

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Empathy Score — Harmonic Mean</p>
        </div>
        <div className="flex flex-col md:flex-row">
          {/* Gauges */}
          <div className="flex items-center justify-center gap-4 p-4 border-r border-white/5">
            <ScoreGauge score={latest.empathy_score ?? 0} label="Empathy" color="#f472b6" />
            <ScoreGauge score={latest.regressive_history ?? 0} label="History" color="#a78bfa" />
            <ScoreGauge score={latest.cluster_health ?? 0} label="Cluster" color="#34d399" />
            <ScoreGauge score={Math.max(0, 100 - (latest.atrophy_risk ?? 0))} label="Vitality" color="#fbbf24" />
          </div>
          {/* Sparkline */}
          <div className="flex-1 p-3">
            <p className="text-[9px] text-white/20 mb-1">Score History ({chartData.length} evaluations)</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="idx" tick={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={false} axisLine={false} width={0} />
                  <ReferenceLine y={70} stroke="rgba(74,222,128,0.2)" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="rgba(251,191,36,0.2)" strokeDasharray="3 3" />
                  <ReferenceLine y={40} stroke="rgba(248,113,113,0.2)" strokeDasharray="3 3" />
                  <Tooltip contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }}
                    labelFormatter={(v) => `Eval #${v}`} />
                  <Line type="monotone" dataKey="score" stroke="#f472b6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-3 mt-1 text-[8px] text-white/20">
              <span><span className="inline-block w-2 h-0.5 bg-green-400/50 mr-1" />≥70 ALLOW</span>
              <span><span className="inline-block w-2 h-0.5 bg-amber-400/50 mr-1" />50-69 MODERATE</span>
              <span><span className="inline-block w-2 h-0.5 bg-red-400/50 mr-1" />&lt;40 WITHHOLD</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}