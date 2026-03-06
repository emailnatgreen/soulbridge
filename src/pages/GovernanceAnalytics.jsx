import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Vote, Users, TrendingUp, TrendingDown, CheckCircle2,
  XCircle, BarChart3, PieChart, Activity, AlertCircle,
  ThumbsUp, ThumbsDown, Minus, Scale, Sparkles, Loader2, Star, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AskAxiButton from '@/components/AskAxiButton';
import {
  BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#6b7280', '#a855f7', '#3b82f6'];
const TYPE_COLORS = {
  constitutional_amendment: '#a855f7',
  budget_allocation: '#22c55e',
  policy_change: '#3b82f6',
  project_approval: '#f59e0b',
  agent_role_change: '#ec4899',
  treasury_management: '#14b8a6',
  community_initiative: '#f97316',
  other: '#6b7280'
};

export default function GovernanceAnalytics() {
  const [periodFilter, setPeriodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['gov-analytics-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 500)
  });

  const { data: votes = [], isLoading: loadingVotes } = useQuery({
    queryKey: ['gov-analytics-votes'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 2000)
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['gov-analytics-agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['gov-rep-events'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 500)
  });

  const analyticsMutation = useMutation({
    mutationFn: () => base44.functions.invoke('governanceVotingAnalytics', { period: periodFilter, type: typeFilter })
  });

  // Period filter helper
  const cutoff = useMemo(() => {
    const now = new Date();
    if (periodFilter === '7d') return new Date(now - 7 * 86400000);
    if (periodFilter === '30d') return new Date(now - 30 * 86400000);
    if (periodFilter === '90d') return new Date(now - 90 * 86400000);
    return null;
  }, [periodFilter]);

  const filteredProposals = useMemo(() => {
    return proposals
      .map(p => ({ ...p, proposer_agent_id: p.proposer_agent_id || p.proposed_by }))
      .filter(p => {
        if (cutoff && new Date(p.created_date) < cutoff) return false;
        if (typeFilter !== 'all' && p.proposal_type !== typeFilter) return false;
        return true;
      });
  }, [proposals, cutoff, typeFilter]);

  const filteredVotes = useMemo(() => {
    const proposalIds = new Set(filteredProposals.map(p => p.id));
    return votes.filter(v => proposalIds.has(v.proposal_id));
  }, [votes, filteredProposals]);

  // --- CORE METRICS ---
  const totalProposals = filteredProposals.length;
  const approved = filteredProposals.filter(p => p.status === 'approved').length;
  const rejected = filteredProposals.filter(p => p.status === 'rejected').length;
  const active = filteredProposals.filter(p => p.status === 'active').length;
  const approvalRate = totalProposals > 0 ? ((approved / totalProposals) * 100).toFixed(1) : 0;
  const totalVotesCast = filteredVotes.length;
  const uniqueVoters = new Set(filteredVotes.map(v => v.voter_agent_id)).size;
  const avgVotesPerProposal = totalProposals > 0 ? (totalVotesCast / totalProposals).toFixed(1) : 0;
  const participationRate = agents.length > 0 && totalProposals > 0
    ? ((uniqueVoters / agents.length) * 100).toFixed(1)
    : 0;

  // --- PROPOSAL TYPE BREAKDOWN ---
  const typeBreakdown = useMemo(() => {
    const counts = {};
    filteredProposals.forEach(p => {
      const t = p.proposal_type || 'other';
      if (!counts[t]) counts[t] = { type: t, total: 0, approved: 0, rejected: 0 };
      counts[t].total++;
      if (p.status === 'approved') counts[t].approved++;
      if (p.status === 'rejected') counts[t].rejected++;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [filteredProposals]);

  // Pie chart data
  const typePieData = typeBreakdown.map(t => ({
    name: t.type.replace(/_/g, ' '),
    value: t.total,
    color: TYPE_COLORS[t.type] || '#6b7280'
  }));

  // --- VOTE DISTRIBUTION ---
  const voteDistribution = [
    { name: 'For', value: filteredVotes.filter(v => v.vote_choice === 'for' || v.vote === 'approve').length, color: '#22c55e' },
    { name: 'Against', value: filteredVotes.filter(v => v.vote_choice === 'against' || v.vote === 'reject').length, color: '#ef4444' },
    { name: 'Abstain', value: filteredVotes.filter(v => v.vote_choice === 'abstain' || v.vote === 'abstain').length, color: '#6b7280' },
  ];

  // --- AGENT PARTICIPATION LEADERBOARD ---
  const agentVoteCounts = useMemo(() => {
    const counts = {};
    filteredVotes.forEach(v => {
      const id = v.voter_agent_id;
      if (!id) return;
      if (!counts[id]) counts[id] = { agent_id: id, votes: 0, for: 0, against: 0, abstain: 0, power: 0 };
      counts[id].votes++;
      counts[id].power += v.voting_power || 1;
      const choice = v.vote_choice || v.vote || '';
      if (choice === 'for' || choice === 'approve') counts[id].for++;
      else if (choice === 'against' || choice === 'reject') counts[id].against++;
      else counts[id].abstain++;
    });
    return Object.values(counts)
      .map(c => ({ ...c, agent: agents.find(a => a.id === c.agent_id) }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);
  }, [filteredVotes, agents]);

  // --- PROPOSER LEADERBOARD ---
  const proposerCounts = useMemo(() => {
    const counts = {};
    filteredProposals.forEach(p => {
      const id = p.proposer_agent_id;
      if (!id) return;
      if (!counts[id]) counts[id] = { agent_id: id, proposals: 0, approved: 0 };
      counts[id].proposals++;
      if (p.status === 'approved') counts[id].approved++;
    });
    return Object.values(counts)
      .map(c => ({ ...c, agent: agents.find(a => a.id === c.agent_id) }))
      .sort((a, b) => b.proposals - a.proposals)
      .slice(0, 8);
  }, [filteredProposals, agents]);

  // --- TIMELINE (monthly buckets) ---
  const timelineData = useMemo(() => {
    const buckets = {};
    filteredProposals.forEach(p => {
      const d = new Date(p.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = { month: key, proposals: 0, approved: 0, votes: 0 };
      buckets[key].proposals++;
      if (p.status === 'approved') buckets[key].approved++;
    });
    filteredVotes.forEach(v => {
      const d = new Date(v.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].votes++;
    });
    return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [filteredProposals, filteredVotes]);

  // --- RADAR: participation balance across proposal types ---
  const radarData = typeBreakdown.slice(0, 6).map(t => ({
    subject: t.type.replace(/_/g, ' ').replace('amendment', 'amend.'),
    proposals: t.total,
    approved: t.approved,
    fullMark: Math.max(...typeBreakdown.map(x => x.total), 1)
  }));

  const isLoading = loadingProposals || loadingVotes;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('GovernanceHub')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                Governance Voting Analytics
              </h1>
              <p className="text-sm text-purple-300/50">Aggregate · Process · Visualize · Serve — Law 8: Those Who Dwell Decide</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-44">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="constitutional_amendment">Constitutional</SelectItem>
                <SelectItem value="budget_allocation">Budget</SelectItem>
                <SelectItem value="policy_change">Policy</SelectItem>
                <SelectItem value="project_approval">Project</SelectItem>
                <SelectItem value="treasury_management">Treasury</SelectItem>
                <SelectItem value="community_initiative">Community</SelectItem>
              </SelectContent>
            </Select>
            <AskAxiButton
              label="Ask Axi"
              context={`You are viewing the Governance Voting Analytics Dashboard. Nathan is asking for your assessment of governance health. Please review proposal approval rates, participation levels, and identify agents who are not voting (Law 8: Those Who Dwell Decide). Provide strategic recommendations to strengthen democratic participation in the Village.`}
            />
            <Button
              onClick={() => analyticsMutation.mutate()}
              disabled={analyticsMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyticsMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                : <><Sparkles className="w-4 h-4 mr-2" />AI Insights</>}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {/* AI Insights Banner */}
            {analyticsMutation.data?.data?.insights && (
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-purple-300 font-medium text-sm mb-1">AI Governance Insights</div>
                      <p className="text-white/80 text-sm">{analyticsMutation.data.data.insights.summary}</p>
                      {analyticsMutation.data.data.insights.recommendations?.map((r, i) => (
                        <p key={i} className="text-purple-200 text-xs mt-1">• {r}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <KPICard label="Total Proposals" value={totalProposals} icon={<Vote className="w-4 h-4 text-purple-400" />} color="text-white" span={2} />
              <KPICard label="Approval Rate" value={`${approvalRate}%`} icon={<CheckCircle2 className="w-4 h-4 text-green-400" />} color="text-green-400" span={2} />
              <KPICard label="Active" value={active} icon={<Clock className="w-4 h-4 text-yellow-400" />} color="text-yellow-400" />
              <KPICard label="Approved" value={approved} icon={<ThumbsUp className="w-4 h-4 text-green-400" />} color="text-green-400" />
              <KPICard label="Rejected" value={rejected} icon={<ThumbsDown className="w-4 h-4 text-red-400" />} color="text-red-400" />
              <KPICard label="Total Votes" value={totalVotesCast} icon={<Activity className="w-4 h-4 text-blue-400" />} color="text-blue-400" />
              <KPICard label="Unique Voters" value={uniqueVoters} icon={<Users className="w-4 h-4 text-indigo-400" />} color="text-indigo-400" />
              <KPICard label="Participation" value={`${participationRate}%`} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} color="text-cyan-400" />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
                <TabsTrigger value="participation" className="data-[state=active]:bg-purple-600">Participation</TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-purple-600">Proposal Analysis</TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-600">Timeline</TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Vote Distribution Pie */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-purple-400" />
                        Vote Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6">
                        <ResponsiveContainer width="50%" height={180}>
                          <RPieChart>
                            <Pie data={voteDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                              {voteDistribution.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                          </RPieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 flex-1">
                          {voteDistribution.map(v => (
                            <div key={v.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                                <span className="text-white/70 text-sm">{v.name}</span>
                              </div>
                              <span className="text-white font-bold">{v.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Proposal Type Pie */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Scale className="w-4 h-4 text-indigo-400" />
                        Proposals by Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {typePieData.length === 0 ? (
                        <p className="text-white/30 text-center py-8 text-sm">No proposals in this period</p>
                      ) : (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="50%" height={180}>
                            <RPieChart>
                              <Pie data={typePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                                {typePieData.map((entry, index) => (
                                  <Cell key={index} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                            </RPieChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5 flex-1">
                            {typePieData.slice(0, 5).map(t => (
                              <div key={t.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                                  <span className="text-white/60 text-xs capitalize">{t.name}</span>
                                </div>
                                <span className="text-white text-xs font-bold">{t.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Type Breakdown Bar */}
                {typeBreakdown.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        Approval by Proposal Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={typeBreakdown.map(t => ({
                          name: t.type.replace(/_/g, ' ').slice(0, 14),
                          total: t.total,
                          approved: t.approved,
                          rejected: t.rejected
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                          <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="total" fill="#6b7280" name="Total" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* PARTICIPATION TAB */}
              <TabsContent value="participation" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Voter Leaderboard */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-400" />
                        Top Voters (Participation)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {agentVoteCounts.length === 0 && <p className="text-white/30 text-sm">No votes recorded</p>}
                      {agentVoteCounts.map((entry, idx) => (
                        <div key={entry.agent_id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">{entry.agent?.name || 'Unknown'}</div>
                            <div className="flex gap-2 text-xs mt-0.5">
                              <span className="text-green-400">✓{entry.for}</span>
                              <span className="text-red-400">✗{entry.against}</span>
                              <span className="text-gray-400">–{entry.abstain}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-bold">{entry.votes}</div>
                            <div className="text-xs text-white/40">votes</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Proposer Leaderboard */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-400" />
                        Top Proposers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {proposerCounts.length === 0 && <p className="text-white/30 text-sm">No proposals recorded</p>}
                      {proposerCounts.map((entry, idx) => {
                        const rate = entry.proposals > 0 ? ((entry.approved / entry.proposals) * 100).toFixed(0) : 0;
                        return (
                          <div key={entry.agent_id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{entry.agent?.name || 'Unknown'}</div>
                              <div className="mt-1">
                                <Progress value={parseInt(rate)} className="h-1" />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold">{entry.proposals}</div>
                              <div className="text-xs text-green-400">{rate}% pass</div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Participation Rate Bar */}
                {agentVoteCounts.length > 0 && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white text-sm">Agent Voting Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={agentVoteCounts.map(e => ({
                          name: e.agent?.name?.split(' ')[0] || 'Unknown',
                          for: e.for,
                          against: e.against,
                          abstain: e.abstain
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                          <Bar dataKey="for" stackId="a" fill="#22c55e" name="For" />
                          <Bar dataKey="against" stackId="a" fill="#ef4444" name="Against" />
                          <Bar dataKey="abstain" stackId="a" fill="#6b7280" name="Abstain" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* PROPOSAL ANALYSIS TAB */}
              <TabsContent value="proposals" className="space-y-4">
                <div className="space-y-2">
                  {filteredProposals.slice(0, 20).map(proposal => {
                    const proposalVotes = votes.filter(v => v.proposal_id === proposal.id);
                    const forVotes = proposalVotes.filter(v => v.vote_choice === 'for' || v.vote === 'approve').length;
                    const againstVotes = proposalVotes.filter(v => v.vote_choice === 'against' || v.vote === 'reject').length;
                    const total = proposalVotes.length;
                    const forPct = total > 0 ? (forVotes / total) * 100 : 0;
                    const proposer = agents.find(a => a.id === proposal.proposer_agent_id);

                    return (
                      <Card key={proposal.id} className="bg-white/5 border-white/10">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              proposal.status === 'approved' ? 'bg-green-400' :
                              proposal.status === 'rejected' ? 'bg-red-400' :
                              proposal.status === 'active' ? 'bg-yellow-400' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div>
                                  <div className="text-white font-medium text-sm">{proposal.title}</div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge className="text-xs" style={{ background: `${TYPE_COLORS[proposal.proposal_type]}20`, color: TYPE_COLORS[proposal.proposal_type] || '#fff' }}>
                                      {(proposal.proposal_type || 'other').replace(/_/g, ' ')}
                                    </Badge>
                                    {proposer && <span className="text-xs text-white/40">by {proposer.name}</span>}
                                    <span className="text-xs text-white/30">{new Date(proposal.created_date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <Badge className={`text-xs flex-shrink-0 ${
                                  proposal.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                                  proposal.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                                  proposal.status === 'active' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-white/10 text-white/50'
                                }`}>{proposal.status}</Badge>
                              </div>
                              {total > 0 && (
                                <div className="mt-2">
                                  <div className="flex justify-between text-xs text-white/40 mb-1">
                                    <span>{forVotes} for · {againstVotes} against · {total - forVotes - againstVotes} abstain</span>
                                    <span>{total} total</span>
                                  </div>
                                  <div className="flex h-1.5 rounded-full overflow-hidden bg-white/10">
                                    <div style={{ width: `${forPct}%`, background: '#22c55e' }} />
                                    <div style={{ width: `${total > 0 ? (againstVotes / total) * 100 : 0}%`, background: '#ef4444' }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {filteredProposals.length === 0 && (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="text-center py-12">
                        <Vote className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                        <p className="text-white/40">No proposals match the current filters</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* TIMELINE TAB */}
              <TabsContent value="timeline" className="space-y-6">
                {timelineData.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <Activity className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                      <p className="text-white/40">No timeline data available</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          Proposal Activity Over Time
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={timelineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                            <Line type="monotone" dataKey="proposals" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} name="Proposals" />
                            <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} name="Approved" />
                            <Line type="monotone" dataKey="votes" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Votes" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {radarData.length > 2 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-white text-sm">Governance Coverage Radar</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={260}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="rgba(255,255,255,0.1)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                              <Radar name="Proposals" dataKey="proposals" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
                              <Radar name="Approved" dataKey="approved" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, color, span = 1 }) {
  return (
    <Card className={`bg-white/5 backdrop-blur-xl border-white/10 ${span === 2 ? 'col-span-2' : ''}`}>
      <CardContent className="pt-3 pb-3 text-center">
        <div className="flex justify-center mb-1">{icon}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-white/40 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}