import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle2, Clock, Pause } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_CONFIG = {
  active: { icon: Clock, color: 'bg-blue-500/20 text-blue-400', label: 'Active' },
  completed: { icon: CheckCircle2, color: 'bg-green-500/20 text-green-400', label: 'Completed' },
  paused: { icon: Pause, color: 'bg-amber-500/20 text-amber-400', label: 'Paused' },
  abandoned: { icon: Pause, color: 'bg-red-500/20 text-red-400', label: 'Abandoned' },
};

export default function SkillGrowthPanel({ skillProgress }) {
  if (!skillProgress || skillProgress.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <Brain className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No skill progress data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = skillProgress.slice(0, 10).map(s => ({
    name: s.skill_name?.length > 12 ? s.skill_name.slice(0, 12) + '…' : s.skill_name,
    current: s.current_level || 0,
    target: s.target_level || 10,
  }));

  return (
    <div className="space-y-4">
      {/* Chart */}
      {chartData.length > 1 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              Skill Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="current" fill="#10b981" name="Current" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="rgba(255,255,255,0.1)" name="Target" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Skill List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm">Skill Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {skillProgress.map(skill => {
            const config = STATUS_CONFIG[skill.status] || STATUS_CONFIG.active;
            return (
              <div key={skill.id} className="p-3 rounded-lg bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/80 text-sm font-medium">{skill.skill_name}</p>
                  <Badge className={`${config.color} text-[10px]`}>{config.label}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-8">{skill.current_level || 0}</span>
                  <Progress value={skill.progress_percentage || 0} className="flex-1 h-2 bg-white/5" />
                  <span className="text-white/30 text-xs w-8 text-right">{skill.target_level || 10}</span>
                </div>
                {skill.peer_endorsements > 0 && (
                  <p className="text-white/20 text-xs mt-1">{skill.peer_endorsements} endorsements · {skill.mentorship_hours || 0}h mentorship</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}