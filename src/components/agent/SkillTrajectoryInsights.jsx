import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Minus, Zap,
  Star, AlertTriangle, Target, Users, Loader2, RefreshCw,
  Trophy, Lightbulb, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';

const VELOCITY_CONFIG = {
  fast:     { label: 'Fast Growth',   color: 'text-green-400',  badge: 'bg-green-500/20 text-green-300',  icon: TrendingUp },
  steady:   { label: 'Steady Growth', color: 'text-blue-400',   badge: 'bg-blue-500/20 text-blue-300',   icon: TrendingUp },
  slow:     { label: 'Slow Growth',   color: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300', icon: Minus },
  stagnant: { label: 'Stagnant',      color: 'text-red-400',    badge: 'bg-red-500/20 text-red-300',    icon: TrendingDown },
};

const TRAJ_COLORS = {
  accelerating: '#4ade80',
  growing: '#60a5fa',
  stable: '#94a3b8',
  declining: '#f87171',
};

function InsightCard({ icon: Icon, title, children, accent = 'purple' }) {
  const accents = {
    purple: 'border-purple-500/30 bg-purple-500/5',
    green:  'border-green-500/30 bg-green-500/5',
    red:    'border-red-500/30 bg-red-500/5',
    blue:   'border-blue-500/30 bg-blue-500/5',
    amber:  'border-amber-500/30 bg-amber-500/5',
    cyan:   'border-cyan-500/30 bg-cyan-500/5',
  };
  const iconColors = {
    purple: 'text-purple-400', green: 'text-green-400', red: 'text-red-400',
    blue: 'text-blue-400', amber: 'text-amber-400', cyan: 'text-cyan-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <div className={`flex items-center gap-2 mb-2 ${iconColors[accent]}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function SkillTrajectoryInsights({ agentId, agentName }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateSkillTrajectoryInsights', { agent_id: agentId });
      if (res.data?.success) {
        setInsights(res.data.insights);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const velocity = insights ? (VELOCITY_CONFIG[insights.growth_velocity] || VELOCITY_CONFIG.steady) : null;
  const VelocityIcon = velocity?.icon || TrendingUp;

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-purple-300" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-white text-xl font-semibold mb-2">AI Growth Insights</h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Generate a personalized analysis of {agentName}'s skill trajectory — including growth velocity, breakthrough predictions, and mentor recommendations.
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white border-0"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? 'Analyzing Growth…' : 'Generate Insights'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={`${velocity.badge} text-sm px-3 py-1 flex items-center gap-1.5`}>
            <VelocityIcon className="w-3.5 h-3.5" />
            {velocity.label}
          </Badge>
          <span className="text-white/40 text-xs">{insights.trajectory_chart_data?.length || 0} skills analyzed</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={generate}
          disabled={loading}
          className="text-white/40 hover:text-white text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Narrative */}
      <InsightCard icon={Brain} title="Growth Story" accent="purple">
        <p className="text-white/80 text-sm leading-relaxed italic">"{insights.narrative_summary}"</p>
      </InsightCard>

      {/* Trajectory Bar Chart */}
      {insights.trajectory_chart_data?.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              30-Day Proficiency Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.trajectory_chart_data}
                  margin={{ top: 4, right: 4, bottom: 30, left: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="skill_name"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: 'white', fontWeight: 600 }}
                    itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="current_proficiency" name="Current %" radius={[3,3,0,0]}>
                    {insights.trajectory_chart_data.map((entry, i) => (
                      <Cell key={i} fill={TRAJ_COLORS[entry.trajectory] || '#94a3b8'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <Bar dataKey="projected_30d_proficiency" name="30d Projection %" fill="rgba(255,255,255,0.15)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3-column insight grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Growing */}
        <InsightCard icon={TrendingUp} title="Rising Fast" accent="green">
          {insights.top_growing_skills?.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              {insights.top_growing_skills.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="text-green-400 font-bold text-xs">#{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
          ) : <p className="text-white/40 text-xs mt-1">None detected</p>}
        </InsightCard>

        {/* At Risk */}
        <InsightCard icon={AlertTriangle} title="Needs Attention" accent="red">
          {insights.at_risk_skills?.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              {insights.at_risk_skills.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="text-red-400">⚠</span> {s}
                </div>
              ))}
            </div>
          ) : <p className="text-white/40 text-xs mt-1">All skills healthy</p>}
        </InsightCard>

        {/* Recommended Focus */}
        <InsightCard icon={Target} title="Focus Next" accent="amber">
          <p className="text-white/80 text-sm mt-1">{insights.recommended_focus}</p>
        </InsightCard>
      </div>

      {/* Breakthrough Prediction */}
      <InsightCard icon={Zap} title="Breakthrough Prediction" accent="cyan">
        <p className="text-white/80 text-sm">{insights.breakthrough_prediction}</p>
      </InsightCard>

      {/* Learning Style */}
      <InsightCard icon={Lightbulb} title="Your Learning Style" accent="purple">
        <p className="text-white/80 text-sm">{insights.learning_style_insight}</p>
      </InsightCard>

      {/* Skill Synergies */}
      {insights.skill_synergies?.length > 0 && (
        <InsightCard icon={Sparkles} title="Skill Synergies" accent="blue">
          <div className="space-y-2 mt-1">
            {insights.skill_synergies.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                <ArrowRight className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </InsightCard>
      )}

      {/* Mentor Recommendation */}
      <InsightCard icon={Users} title="Mentor Recommendation" accent="purple">
        <p className="text-white/80 text-sm">{insights.mentor_recommendation}</p>
      </InsightCard>

      {/* Celebration */}
      <InsightCard icon={Trophy} title="Celebrate This" accent="amber">
        <p className="text-white/80 text-sm">🎉 {insights.celebration_moment}</p>
      </InsightCard>
    </div>
  );
}