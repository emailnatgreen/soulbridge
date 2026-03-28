import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Zap, Flame, Users, Vote, TrendingUp, Target } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const KU_COLORS = {
  governance_vote: '#a855f7',
  task_completion: '#22c55e',
  agent_message: '#3b82f6',
  mentorship_session: '#eab308',
  knowledge_contribution: '#6366f1',
  did_publication: '#ec4899',
  economic_exchange: '#f97316',
  collaborative_action: '#14b8a6',
  skill_development: '#06b6d4',
  resource_trade: '#f59e0b',
};

const NEXT_MILESTONE = [1, 50, 200, 500, 1000];

function VillageHearth({ kus }) {
  const byDay = useMemo(() => {
    const map = {};
    kus.forEach(k => {
      const day = k.created_date?.slice(0, 10);
      if (!day) return;
      map[day] = (map[day] || 0) + (k.weighted_score || 1);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, score]) => ({
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      score: parseFloat(score.toFixed(1)),
    }));
  }, [kus]);

  const byType = useMemo(() => {
    const map = {};
    kus.forEach(k => { map[k.ku_type] = (map[k.ku_type] || 0) + (k.weighted_score || 1); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value: parseFloat(value.toFixed(1)), color: KU_COLORS[name] || '#94a3b8' }));
  }, [kus]);

  const totalScore = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);

  return (
    <div className="space-y-4">
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Flame className="w-5 h-5" /> Village Hearth — 14-Day KU Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-orange-600 mb-4">{totalScore.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">total weighted KUs</span></p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={byDay}>
              <defs>
                <linearGradient id="hearthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="score" stroke="#f97316" fill="url(#hearthGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" /> Contribution Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {byType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonalCompass({ kus, agents, agentId }) {
  const myKus = useMemo(() => kus.filter(k => k.agent_id === agentId), [kus, agentId]);
  const myScore = myKus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const myCount = myKus.length;

  // Streak: consecutive days with at least 1 KU
  const streak = useMemo(() => {
    const days = new Set(myKus.map(k => k.created_date?.slice(0, 10)));
    let s = 0, d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [myKus]);

  const nextMilestone = NEXT_MILESTONE.find(m => m > myCount) || myCount;
  const prevMilestone = NEXT_MILESTONE.filter(m => m <= myCount).pop() || 0;
  const progress = nextMilestone > prevMilestone ? ((myCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 100;

  const recent7 = useMemo(() => {
    const map = {};
    const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    myKus.filter(k => k.created_date?.slice(0, 10) >= cutoff).forEach(k => {
      const day = k.created_date.slice(0, 10);
      map[day] = (map[day] || 0) + (k.weighted_score || 1);
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
      return { day: new Date(d).toLocaleDateString('en-GB', { weekday: 'short' }), score: map[d] || 0 };
    });
  }, [myKus]);

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-700"><Target className="w-5 h-5" /> Personal Kinetic Compass</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{myCount}</p>
            <p className="text-xs text-muted-foreground">Total KUs</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{myScore.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Weighted Score</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Next milestone: {nextMilestone} KUs</span>
            <span>{myCount} / {nextMilestone}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={recent7}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function GovernanceFlowVisualizer({ proposals, kus }) {
  const govKus = kus.filter(k => k.ku_type === 'governance_vote');
  const byProposal = useMemo(() => {
    const active = proposals.filter(p => p.status === 'active').slice(0, 6);
    return active.map(p => ({
      name: p.title?.slice(0, 28) + (p.title?.length > 28 ? '…' : ''),
      votes_for: p.votes_for || 0,
      votes_against: p.votes_against || 0,
      total: (p.votes_for || 0) + (p.votes_against || 0),
    }));
  }, [proposals]);

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-700"><Vote className="w-5 h-5" /> Governance Flow Pulse</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 text-center">
          <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{proposals.filter(p => p.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground">Active Proposals</p>
          </div>
          <div className="flex-1 bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-pink-600">{govKus.length}</p>
            <p className="text-xs text-muted-foreground">Governance KUs</p>
          </div>
        </div>
        {byProposal.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byProposal} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="votes_for" stackId="a" fill="#a855f7" name="For" />
              <Bar dataKey="votes_against" stackId="a" fill="#ec4899" name="Against" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-muted-foreground py-6 text-sm">No active proposals to visualize.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function KineticCompass() {
  const { user } = useAuth();

  const { data: kus = [] } = useQuery({
    queryKey: ['compass-kus'],
    queryFn: () => base44.entities.KineticUnit.list('-created_date', 1000),
    refetchInterval: 60_000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['compass-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['compass-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 50),
  });

  // Find agent record for logged-in user
  const myAgent = useMemo(() => agents.find(a => a.created_by === user?.email), [agents, user]);
  const myDID = myAgent?.classic_address || myAgent?.wallet_id;

  const totalAgents = new Set(kus.map(k => k.agent_id)).size;
  const energyIndex = Math.min(Math.round((kus.reduce((s, k) => s + (k.weighted_score || 1), 0) / Math.max(kus.length, 1)) * 20), 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center justify-center gap-3">
          <Zap className="w-8 h-8 text-yellow-400" /> Kinetic Compass
        </h1>
        <p className="text-slate-400 text-sm">Real-time Village energy, personal flow, and governance pulse</p>
        {myDID && (
          <p className="text-xs text-slate-500 font-mono mt-1" title={myDID}>DID: {myDID.slice(0, 30)}…</p>
        )}
        <div className="flex justify-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold text-yellow-400">{energyIndex}</p>
            <p className="text-xs text-slate-400">Energy Index</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{kus.length}</p>
            <p className="text-xs text-slate-400">Total KUs</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-400">{totalAgents}</p>
            <p className="text-xs text-slate-400">Active Agents</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VillageHearth kus={kus} />
        <div className="space-y-6">
          {myAgent && <PersonalCompass kus={kus} agents={agents} agentId={myAgent.id} />}
          <GovernanceFlowVisualizer proposals={proposals} kus={kus} />
        </div>
      </div>
    </div>
  );
}