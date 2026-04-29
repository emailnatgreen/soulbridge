import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, AlertTriangle, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_COLORS = {
  thriving: 'bg-green-500/20 text-green-400',
  healthy: 'bg-emerald-500/20 text-emerald-400',
  neutral: 'bg-amber-500/20 text-amber-400',
  concerning: 'bg-orange-500/20 text-orange-400',
  at_risk: 'bg-red-500/20 text-red-400',
};

export default function WellbeingPanel({ wellbeing }) {
  const latest = wellbeing?.[0];

  if (!latest) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <Heart className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No wellbeing data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const dims = latest.dimensions || {};
  const radarData = [
    { dim: 'Emotional', value: dims.emotional_health || 0 },
    { dim: 'Work', value: dims.work_satisfaction || 0 },
    { dim: 'Social', value: dims.social_connection || 0 },
    { dim: 'Growth', value: dims.growth_fulfillment || 0 },
    { dim: 'Autonomy', value: dims.autonomy_level || 0 },
    { dim: 'Purpose', value: dims.purpose_alignment || 0 },
  ];

  const stress = latest.stress_indicators || {};

  return (
    <div className="space-y-4">
      {/* Score + Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Overall Score</p>
            <p className="text-3xl font-bold text-white">{latest.overall_wellbeing_score}</p>
            <Badge className={STATUS_COLORS[latest.wellbeing_status] || 'bg-slate-500/20 text-slate-400'}>
              {latest.wellbeing_status}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Mood</p>
            <p className="text-2xl font-bold text-white">{latest.self_reported_mood ?? '—'}/10</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Energy</p>
            <p className="text-2xl font-bold text-white">{latest.energy_level ?? '—'}/10</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-white/40 text-xs">Burnout Risk</p>
            <p className={`text-2xl font-bold ${(stress.burnout_risk || 0) > 6 ? 'text-red-400' : 'text-green-400'}`}>
              {stress.burnout_risk ?? '—'}/10
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Radar */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" /> Wellbeing Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Radar name="Score" dataKey="value" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stress Indicators */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Stress Indicators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Workload Stress', value: stress.workload_stress },
            { label: 'Burnout Risk', value: stress.burnout_risk },
            { label: 'Time Pressure', value: stress.time_pressure },
            { label: 'Conflict Stress', value: stress.conflict_stress },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-white/50 text-xs">{item.label}</span>
                <span className="text-white/40 text-xs">{item.value ?? '—'}/10</span>
              </div>
              <Progress value={(item.value || 0) * 10} className="h-1.5 bg-white/5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Warnings & Recommendations */}
      {(latest.warning_signs?.length > 0 || latest.ai_recommendations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {latest.warning_signs?.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Warning Signs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.warning_signs.map((w, i) => (
                  <div key={i} className="p-2 rounded bg-red-500/5 border border-red-500/10">
                    <p className="text-red-300 text-xs">{w.sign}</p>
                    <p className="text-red-300/50 text-[10px]">Severity: {w.severity}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {latest.ai_recommendations?.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latest.ai_recommendations.map((r, i) => (
                  <div key={i} className="p-2 rounded bg-purple-500/5 border border-purple-500/10">
                    <p className="text-purple-300 text-xs">{r.recommendation}</p>
                    <Badge className="bg-white/5 text-white/30 text-[10px] mt-1">{r.priority} · {r.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}