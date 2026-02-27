import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Award } from 'lucide-react';

export default function TopMentorsTable({ relationships, agents, mentorProfiles }) {
  // Aggregate per mentor
  const mentorMap = {};
  relationships.forEach(rel => {
    const id = rel.mentor_agent_id;
    if (!id) return;
    if (!mentorMap[id]) mentorMap[id] = { sessions: 0, hours: 0, satisfactions: [], menteeCount: 0 };
    mentorMap[id].sessions += rel.sessions_completed || 0;
    mentorMap[id].hours += rel.total_hours || 0;
    if (rel.mentee_satisfaction) mentorMap[id].satisfactions.push(rel.mentee_satisfaction);
    mentorMap[id].menteeCount++;
  });

  const rows = Object.entries(mentorMap).map(([agentId, d]) => {
    const agent = agents.find(a => a.id === agentId);
    const profile = mentorProfiles.find(mp => mp.agent_id === agentId);
    return {
      name: agent?.name || 'Unknown',
      style: profile?.mentorship_style?.replace(/_/g, ' ') || '—',
      sessions: d.sessions,
      hours: d.hours.toFixed(1),
      mentees: d.menteeCount,
      avgSatisfaction: d.satisfactions.length > 0
        ? (d.satisfactions.reduce((a, b) => a + b, 0) / d.satisfactions.length).toFixed(1)
        : null
    };
  }).sort((a, b) => b.sessions - a.sessions).slice(0, 6);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Top Mentors by Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className="text-white/30 text-xs w-4 text-center">{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{row.name}</div>
                  <div className="text-xs text-white/40 capitalize">{row.style}</div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div className="text-purple-300">{row.sessions} sessions</div>
                  <div className="text-white/40">{row.hours}h · {row.mentees} mentee{row.mentees !== 1 ? 's' : ''}</div>
                </div>
                {row.avgSatisfaction && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs ml-2">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {row.avgSatisfaction}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}