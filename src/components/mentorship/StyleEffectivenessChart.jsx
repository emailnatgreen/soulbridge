import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STYLE_LABELS = {
  hands_on: 'Hands-On',
  coaching: 'Coaching',
  advisory: 'Advisory',
  collaborative: 'Collaborative',
  socratic: 'Socratic',
  directive: 'Directive'
};

const COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#facc15'];

export default function StyleEffectivenessChart({ relationships, mentorProfiles }) {
  // Group by mentorship style and compute avg sessions + satisfaction
  const styleMap = {};
  relationships.forEach(rel => {
    const profile = mentorProfiles.find(mp => mp.agent_id === rel.mentor_agent_id);
    const style = profile?.mentorship_style || 'coaching';
    if (!styleMap[style]) styleMap[style] = { sessions: 0, satisfaction: [], count: 0 };
    styleMap[style].sessions += rel.sessions_completed || 0;
    if (rel.mentee_satisfaction) styleMap[style].satisfaction.push(rel.mentee_satisfaction);
    styleMap[style].count++;
  });

  const data = Object.entries(styleMap).map(([style, d]) => ({
    name: STYLE_LABELS[style] || style,
    sessions: d.count > 0 ? +(d.sessions / d.count).toFixed(1) : 0,
    satisfaction: d.satisfaction.length > 0
      ? +(d.satisfaction.reduce((a, b) => a + b, 0) / d.satisfaction.length).toFixed(2)
      : 0
  }));

  if (data.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-white text-sm">Style Effectiveness</CardTitle></CardHeader>
        <CardContent className="text-white/40 text-sm text-center py-8">Not enough data yet</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm">Avg Sessions by Mentorship Style</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#a78bfa' }}
            />
            <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}