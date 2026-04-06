import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Shield, TrendingUp, Users, CheckCircle2, XCircle, Download, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import AxiGovernanceGuide from '@/components/governance/AxiGovernanceGuide';

const COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

export default function GovernanceAnalytics() {
  const [tab, setTab] = useState('overview');

  const { data: proposals = [], isLoading: loadingP } = useQuery({
    queryKey: ['governance-proposals-analytics'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 200),
  });

  const { data: votes = [], isLoading: loadingV } = useQuery({
    queryKey: ['governance-votes-analytics'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 500),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-gov'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 200),
  });

  const totalProposals = proposals.length;
  const passedCount = proposals.filter(p => p.status === 'passed' || p.status === 'executed').length;
  const rejectedCount = proposals.filter(p => p.status === 'rejected').length;
  const activeCount = proposals.filter(p => p.status === 'active').length;
  const approvalRate = totalProposals > 0 ? Math.round((passedCount / totalProposals) * 100) : 0;

  // Vote distribution pie
  const voteDistData = [
    { name: 'For', value: votes.filter(v => v.vote_choice === 'for').length },
    { name: 'Against', value: votes.filter(v => v.vote_choice === 'against').length },
    { name: 'Abstain', value: votes.filter(v => v.vote_choice === 'abstain').length },
  ];

  // Proposal type breakdown
  const typeData = Object.entries(
    proposals.reduce((acc, p) => { acc[p.proposal_type] = (acc[p.proposal_type] || 0) + 1; return acc; }, {})
  ).map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }));

  // Top voters — match by id, classic_address, or created_by
  const voterCounts = votes.reduce((acc, v) => { if (v.voter_agent_id) acc[v.voter_agent_id] = (acc[v.voter_agent_id] || 0) + 1; return acc; }, {});
  const resolveAgentName = (id) => {
    if (!id) return 'Unknown Agent';
    const byId = agents.find(a => a.id === id);
    if (byId) return byId.name;
    const byAddr = agents.find(a => a.classic_address && a.classic_address === id);
    if (byAddr) return byAddr.name;
    const byEmail = agents.find(a => a.created_by === id);
    if (byEmail) return byEmail.name;
    return id.length > 20 ? id.slice(0, 8) + '…' : id;
  };
  const topVoters = Object.entries(voterCounts)
    .sort(([, a], [, b]) => b - a).slice(0, 10)
    .map(([id, count]) => ({
      name: resolveAgentName(id),
      agentId: id,
      votes: count,
      power: votes.filter(v => v.voter_agent_id === id).reduce((s, v) => s + (v.voting_power || 0), 0),
    }));

  // Monthly proposal trend
  const monthlyTrend = proposals.reduce((acc, p) => {
    try {
      const dateStr = p.created_date;
      if (!dateStr) return acc;
      const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      if (isNaN(d.getTime())) return acc;
      const month = format(d, 'MMM yyyy');
      if (!acc[month]) acc[month] = { month, proposals: 0, passed: 0, votes: 0 };
      acc[month].proposals++;
      if (p.status === 'passed' || p.status === 'executed') acc[month].passed++;
      acc[month].votes += (p.total_votes_cast || 0);
    } catch (e) { /* skip */ }
    return acc;
  }, {});
  const trendData = Object.values(monthlyTrend).slice(-8);

  // Timeline events for audit trail — never expose raw IDs
  const agentName = (id) => resolveAgentName(id);
  const timelineEvents = [
    ...proposals.slice(0, 30).map(p => ({
      id: p.id, type: 'governance',
      title: `Proposal: ${p.title?.slice(0, 50)}`,
      description: `Status: ${p.status} · Type: ${p.proposal_type?.replace(/_/g, ' ')} · Votes: ${p.total_votes_cast ?? 0}`,
      actor: agentName(p.proposed_by),
      timestamp: p.created_date,
    })),
    ...votes.slice(0, 20).map(v => ({
      id: v.id, type: 'governance',
      title: `Vote Cast: ${v.vote_choice?.toUpperCase()}`,
      description: `Voting power: ${v.voting_power ?? 1}${v.rationale ? ' · ' + v.rationale.slice(0, 80) : ''}`,
      actor: agentName(v.voter_agent_id),
      timestamp: v.created_date,
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/governance">
              <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-3 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Governance
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />Governance Analytics
            </h1>
            <p className="text-slate-400 text-sm mt-1">{totalProposals} proposals · {votes.length} votes cast</p>
          </div>
        </div>

        {/* Axi Governance Guide */}
        <AxiGovernanceGuide
          stats={{
            totalProposals,
            activeProposals: activeCount,
            approvedProposals: passedCount,
            totalVotes: votes.length,
            participationRate: agents.length > 0 && totalProposals > 0
              ? ((votes.length / (totalProposals * agents.length)) * 100).toFixed(1)
              : 0,
          }}
          currentPage="Governance Analytics"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Proposals', val: totalProposals, color: 'text-white', sub: `${activeCount} active` },
            { label: 'Approval Rate', val: `${approvalRate}%`, color: 'text-green-400', sub: `${passedCount} passed` },
            { label: 'Rejected', val: rejectedCount, color: 'text-red-400', sub: 'proposals' },
            { label: 'Total Votes', val: votes.length, color: 'text-purple-400', sub: `${Object.keys(voterCounts).length} unique voters` },
            { label: 'Total Voting Power', val: votes.reduce((s, v) => s + (v.voting_power || 0), 0).toFixed(0), color: 'text-yellow-400', sub: 'cumulative power' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
              <div className="text-xs text-slate-600">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-2">
          {['overview', 'participation', 'audit'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Vote Distribution */}
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Vote Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={voteDistData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {voteDistData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Proposal Types */}
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Proposals by Type</CardTitle></CardHeader>
              <CardContent>
                {typeData.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No proposal type data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={typeData} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis type="category" dataKey="type" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                      <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card className="bg-slate-900/60 border-slate-700/40 md:col-span-2">
              <CardHeader><CardTitle className="text-white text-sm">Proposal Activity Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Line type="monotone" dataKey="proposals" stroke="#a855f7" strokeWidth={2} dot={false} name="Proposals" />
                    <Line type="monotone" dataKey="passed" stroke="#22c55e" strokeWidth={2} dot={false} name="Passed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'participation' && (
          <div className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Top Voters by Participation</CardTitle></CardHeader>
              <CardContent>
                {topVoters.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No voting data available yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topVoters}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                      <Bar dataKey="votes" fill="#6366f1" radius={[4, 4, 0, 0]} name="Votes Cast" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Voter Detail Table */}
            {topVoters.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/40">
                <CardHeader><CardTitle className="text-white text-sm">Voter Power Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topVoters.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex items-center gap-3">
                          <span className="text-purple-400 font-mono text-xs w-6">#{i + 1}</span>
                          <span className="text-white text-sm">{v.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-blue-300">{v.votes} votes</span>
                          <span className="text-yellow-300">{v.power.toFixed(0)} power</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <ActivityTimeline
            events={timelineEvents}
            title="Governance Audit Trail"
            maxHeight="600px"
          />
        )}
      </div>
    </div>
  );
}