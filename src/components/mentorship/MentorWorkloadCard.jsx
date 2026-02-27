import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Flame, Star } from 'lucide-react';

export default function MentorWorkloadCard({ agent, profile, relationships, wellbeing, alerts }) {
  const activeMentees = relationships.filter(
    r => r.mentor_agent_id === agent.id && r.status === 'active'
  ).length;
  const capacity = profile?.max_mentees || 3;
  const capacityPct = Math.min(100, (activeMentees / capacity) * 100);
  const burnout = wellbeing?.stress_indicators?.burnout_risk || 0;
  const activeAlerts = alerts.filter(a => a.agent_id === agent.id).length;

  const statusColor =
    capacityPct >= 100 || burnout >= 7 ? 'border-red-500/30 bg-red-500/5' :
    capacityPct >= 70  || burnout >= 5 ? 'border-orange-500/30 bg-orange-500/5' :
    'border-white/10 bg-white/5';

  return (
    <Card className={`${statusColor} transition-all`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-sm">{agent.name}</CardTitle>
            <div className="text-xs text-white/40 mt-0.5 capitalize">{profile?.mentorship_style?.replace(/_/g, ' ') || 'Mentor'}</div>
          </div>
          {activeAlerts > 0 && (
            <Badge className="bg-red-500/20 text-red-400 text-xs">{activeAlerts} alert{activeAlerts > 1 ? 's' : ''}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Mentee Load</span>
            <span>{activeMentees}/{capacity}</span>
          </div>
          <Progress value={capacityPct} className="h-1.5" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-white/50">
            <Flame className="w-3 h-3 text-orange-400" /> Burnout Risk
          </span>
          <Badge className={
            burnout >= 7 ? 'bg-red-500/20 text-red-400' :
            burnout >= 5 ? 'bg-orange-500/20 text-orange-400' :
            'bg-green-500/20 text-green-400'
          }>
            {burnout || 0}/10
          </Badge>
        </div>
        {wellbeing && (
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Wellbeing</span>
            <span className={
              wellbeing.overall_wellbeing_score >= 70 ? 'text-green-400' :
              wellbeing.overall_wellbeing_score >= 50 ? 'text-yellow-400' :
              'text-red-400'
            }>
              {wellbeing.overall_wellbeing_score}/100
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}