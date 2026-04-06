import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, TrendingUp, Users, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const VOTE_COLORS = { for: '#22c55e', against: '#ef4444', abstain: '#94a3b8' };

export default function GovernanceKUFlow({ kus, agents }) {
  const agentMap = useMemo(() => Object.fromEntries((agents || []).map(a => [a.id, a])), [agents]);

  const govKus = useMemo(() =>
    (kus || []).filter(k => k.ku_type === 'governance_vote'),
  [kus]);

  // Stats
  const totalGovScore = govKus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const uniqueVoters = new Set(govKus.map(k => k.agent_id)).size;

  // Vote choice breakdown from metadata
  const choiceBreakdown = useMemo(() => {
    const map = { for: 0, against: 0, abstain: 0 };
    govKus.forEach(k => {
      const choice = k.metadata?.vote_choice;
      if (choice && map[choice] !== undefined) map[choice] += (k.weighted_score || 1);
    });
    return Object.entries(map).map(([choice, score]) => ({
      choice, score: +score.toFixed(2), fill: VOTE_COLORS[choice]
    }));
  }, [govKus]);

  // Top governance contributors
  const topGovAgents = useMemo(() => {
    const map = {};
    govKus.forEach(k => { map[k.agent_id] = (map[k.agent_id] || 0) + (k.weighted_score || 1); });
    return Object.entries(map)
      .map(([id, score]) => ({ name: agentMap[id]?.name || 'Unknown', score: +score.toFixed(2) }))
      .sort((a, b) => b.score - a.score).slice(0, 6);
  }, [govKus, agentMap]);

  // Recent governance KUs
  const recentGov = govKus.slice(0, 8);

  if (govKus.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-8 text-center">
          <Vote className="w-8 h-8 mx-auto mb-2 opacity-20 text-white" />
          <p className="text-white/30 text-sm">No governance KUs generated yet — votes will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-3 text-center">
          <p className="text-blue-300 text-2xl font-bold">{govKus.length}</p>
          <p className="text-white/40 text-xs">Gov KUs</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 text-center">
          <p className="text-amber-300 text-2xl font-bold">{totalGovScore.toFixed(1)}</p>
          <p className="text-white/40 text-xs">Weighted Score</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-3 text-center">
          <p className="text-purple-300 text-2xl font-bold">{uniqueVoters}</p>
          <p className="text-white/40 text-xs">Unique Voters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vote Choice Distribution */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Vote className="w-4 h-4 text-blue-400" /> Vote KU Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={choiceBreakdown} barSize={28}>
                <XAxis dataKey="choice" tick={{ fill: '#ffffff70', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {choiceBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Gov Contributors */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Top Governance Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {topGovAgents.map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 text-xs font-mono w-4">#{i + 1}</span>
                    <span className="text-white text-xs">{a.name}</span>
                  </div>
                  <span className="text-amber-300 text-xs font-bold">{a.score}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Gov KU Feed */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" /> Recent Governance KU Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentGov.map(ku => {
              const agent = agentMap[ku.agent_id];
              const choice = ku.metadata?.vote_choice;
              return (
                <div key={ku.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: VOTE_COLORS[choice] || '#64748b' }} />
                  <span className="text-white/80 flex-1 truncate">{agent?.name || 'Unknown'}</span>
                  <Badge className={`text-[10px] ${choice === 'for' ? 'bg-green-500/15 text-green-300' : choice === 'against' ? 'bg-red-500/15 text-red-300' : 'bg-slate-500/15 text-slate-300'}`}>
                    {choice?.toUpperCase() || ku.trigger_event}
                  </Badge>
                  <span className="text-amber-300 font-mono">×{(ku.weighted_score || 1).toFixed(2)}</span>
                  <span className="text-white/30">{new Date(ku.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}