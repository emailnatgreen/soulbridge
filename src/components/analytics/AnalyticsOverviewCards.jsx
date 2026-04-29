import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Zap, Vote, Brain, ShoppingBag, Heart, Award, Activity } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-xs mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsOverviewCards({ agent, kineticUnits, votes, skillProgress, transactions, wellbeing, metrics }) {
  const latestMetric = metrics?.[0];
  const latestWellbeing = wellbeing?.[0];
  const totalBought = transactions?.bought?.length || 0;
  const totalSold = transactions?.sold?.length || 0;
  const activeSkills = skillProgress?.filter(s => s.status === 'active').length || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Award}
        label="Honor Score"
        value={agent.honor_score ?? 100}
        sub={latestMetric?.performance_trend ? `Trend: ${latestMetric.performance_trend}` : undefined}
        color="bg-amber-500/20 text-amber-400"
      />
      <StatCard
        icon={Zap}
        label="Kinetic Units"
        value={kineticUnits.length}
        sub={`${kineticUnits.filter(k => {
          const d = new Date(k.created_date);
          const week = new Date();
          week.setDate(week.getDate() - 7);
          return d > week;
        }).length} this week`}
        color="bg-cyan-500/20 text-cyan-400"
      />
      <StatCard
        icon={Vote}
        label="Votes Cast"
        value={votes.length}
        sub={`${votes.filter(v => v.vote_choice === 'for').length} for, ${votes.filter(v => v.vote_choice === 'against').length} against`}
        color="bg-purple-500/20 text-purple-400"
      />
      <StatCard
        icon={Brain}
        label="Active Skills"
        value={activeSkills}
        sub={`${skillProgress?.filter(s => s.status === 'completed').length || 0} completed`}
        color="bg-emerald-500/20 text-emerald-400"
      />
      <StatCard
        icon={ShoppingBag}
        label="Transactions"
        value={totalBought + totalSold}
        sub={`${totalBought} bought, ${totalSold} sold`}
        color="bg-blue-500/20 text-blue-400"
      />
      <StatCard
        icon={Heart}
        label="Wellbeing"
        value={latestWellbeing?.overall_wellbeing_score ?? '—'}
        sub={latestWellbeing?.wellbeing_status || 'No data'}
        color="bg-pink-500/20 text-pink-400"
      />
      <StatCard
        icon={TrendingUp}
        label="Performance"
        value={latestMetric?.overall_score ?? '—'}
        sub={latestMetric ? `${latestMetric.period_start?.slice(0, 10) || ''}` : 'No data'}
        color="bg-orange-500/20 text-orange-400"
      />
      <StatCard
        icon={Activity}
        label="Total Txns"
        value={agent.total_transactions ?? 0}
        sub={`Status: ${agent.status || 'active'}`}
        color="bg-indigo-500/20 text-indigo-400"
      />
    </div>
  );
}