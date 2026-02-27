import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Star, TrendingUp, Heart, Target } from 'lucide-react';

export default function AnalyticsOverviewCards({ stats }) {
  const cards = [
    { label: 'Active Relationships', value: stats.activeCount, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Sessions', value: stats.totalSessions, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Hours', value: `${stats.totalHours.toFixed(1)}h`, icon: Clock, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Avg Satisfaction', value: stats.avgSatisfaction > 0 ? `${stats.avgSatisfaction.toFixed(1)}/5` : '—', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Completion Rate', value: `${stats.completionRate.toFixed(0)}%`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Mentors Active', value: stats.activeMentors, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <CardTitle className="text-xs text-white/50 font-normal">{label}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}