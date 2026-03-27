import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity, Zap, TrendingUp, Vote, Star, RefreshCw, Shield, Users } from 'lucide-react';

// KU type colour palette
const KU_COLORS = {
  did_publication: '#a78bfa',
  governance_vote: '#60a5fa',
  task_completion: '#34d399',
  mentorship_session: '#f59e0b',
  knowledge_contribution: '#fb923c',
  skill_development: '#e879f9',
  economic_exchange: '#2dd4bf',
  collaborative_action: '#f87171',
  agent_message: '#94a3b8',
  resource_trade: '#86efac',
};

const KU_LABELS = {
  did_publication: 'DID Publication',
  governance_vote: 'Gov Vote',
  task_completion: 'Task Complete',
  mentorship_session: 'Mentorship',
  knowledge_contribution: 'Knowledge',
  skill_development: 'Skill Dev',
  economic_exchange: 'Economic',
  collaborative_action: 'Collab',
  agent_message: 'Message',
  resource_trade: 'Resource Trade',
};

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-white/30 text-xs mt-0.5">{sub}</p>}
          </div>
          <Icon className="w-7 h-7 opacity-20 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function KineticGridDashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: kus = [], refetch: refetchKus, isFetching: fetchingKus } = useQuery({
    queryKey: ['kinetic-grid-kus'],
    queryFn: () => base44.entities.KineticUnit.list('-created_date', 500),
    refetchInterval: 30000,
  });

  const { data: packets = [], refetch: refetchPackets } = useQuery({
    queryKey: ['kinetic-grid-packets'],
    queryFn: () => base44.entities.MWTPPacket.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['kinetic-grid-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['kinetic-grid-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 50),
  });

  const { data: perfMetrics = [] } = useQuery({
    queryKey: ['kinetic-grid-perf'],
    queryFn: () => base44.entities.AgentPerformanceMetrics.list('-created_date', 100),
  });

  const { data: reputations = [] } = useQuery({
    queryKey: ['kinetic-grid-rep'],
    queryFn: () => base44.entities.ReputationScore.list('-created_date', 100),
  });

  const handleRefresh = () => {
    refetchKus(); refetchPackets(); setLastRefresh(new Date());
  };

  // ── Derived metrics ──────────────────────────────────────────────────────
  const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const ingestedKus = kus.filter(k => k.status === 'ingested');
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  // KU type distribution (pie)
  const kuTypeData = Object.entries(
    kus.reduce((acc, ku) => {
      acc[ku.ku_type] = (acc[ku.ku_type] || 0) + (ku.weighted_score || 1);
      return acc;
    }, {})
  ).map(([type, value]) => ({ name: KU_LABELS[type] || type, value: +value.toFixed(2), color: KU_COLORS[type] || '#64748b' }));

  // KU flow over time (area chart — group by day)
  const flowByDay = {};
  kus.forEach(ku => {
    const day = new Date(ku.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    flowByDay[day] = (flowByDay[day] || 0) + (ku.weighted_score || 1);
  });
  const flowData = Object.entries(flowByDay).slice(-14).map(([day, score]) => ({ day, score: +score.toFixed(2) }));

  // Top agents by KU score
  const agentKuMap = {};
  kus.forEach(ku => {
    agentKuMap[ku.agent_id] = (agentKuMap[ku.agent_id] || 0) + (ku.weighted_score || 1);
  });
  const topAgents = Object.entries(agentKuMap)
    .map(([id, score]) => ({ name: agentMap[id]?.name || 'Unknown', score: +score.toFixed(2) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // Governance proposal KU context enrichment status
  const enrichedProposals = proposals.filter(p => p.relevant_context);

  // Layer breakdown
  const layerCounts = { micro: 0, meso: 0, macro: 0 };
  packets.forEach(p => { layerCounts[p.layer] = (layerCounts[p.layer] || 0) + 1; });

  // Radar for constitutional law alignment
  const lawMap = {};
  kus.forEach(ku => {
    (ku.constitutional_laws || []).forEach(law => {
      lawMap[law] = (lawMap[law] || 0) + (ku.weighted_score || 1);
    });
  });
  const radarData = Object.entries(lawMap).map(([law, value]) => ({
    law: law.replace('Law ', 'L').replace(': ', ' '),
    value: +value.toFixed(2),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">Kinetic Grid Dashboard</h1>
              <p className="text-purple-300/50 text-xs">Mill Wheel Telemetry · Live Village Heartbeat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/30 text-xs hidden sm:block">
              Refreshed {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </Badge>
            <Button
              size="sm" variant="ghost"
              onClick={handleRefresh}
              disabled={fetchingKus}
              className="text-white/50 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${fetchingKus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Stat Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total KUs Generated" value={kus.length} sub={`${ingestedKus.length} ingested`} color="text-purple-300" Icon={Zap} />
          <StatCard label="Total Weighted Score" value={totalWeighted.toFixed(1)} sub="across all agents" color="text-amber-300" Icon={TrendingUp} />
          <StatCard label="MWTP Packets" value={packets.length} sub={`micro:${layerCounts.micro} meso:${layerCounts.meso}`} color="text-blue-300" Icon={Activity} />
          <StatCard label="Proposals Enriched" value={enrichedProposals.length} sub={`of ${proposals.length} total`} color="text-green-300" Icon={Vote} />
        </div>

        {/* KU Flow Over Time + Type Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> KU Weighted Score Flow (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flowData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-white/30 text-sm">No flow data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={flowData}>
                    <defs>
                      <linearGradient id="kuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#ffffff50', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                    <Area type="monotone" dataKey="score" stroke="#a78bfa" fill="url(#kuGrad)" strokeWidth={2} dot={{ fill: '#a78bfa', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> KU Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kuTypeData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-white/30 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={kuTypeData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={0}>
                        {kuTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                    {kuTypeData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-white/60 flex-1 truncate">{d.name}</span>
                        <span className="text-white/80 font-mono">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Agents + Constitutional Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Top Agents by KU Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topAgents.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-white/30 text-sm">No agent data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topAgents} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#ffffff70', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="score" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" /> Constitutional Law Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-white/30 text-sm">No law alignment data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="law" tick={{ fill: '#ffffff60', fontSize: 10 }} />
                    <Radar name="KU Score" dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance + Reputation Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" /> Agent Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfMetrics.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">No performance data yet — run kineticGridIntegration sync_all</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {perfMetrics.slice(0, 10).map(m => {
                    const agent = agentMap[m.agent_id];
                    return (
                      <div key={m.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-300 text-xs font-bold">{(agent?.name || '?')[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{agent?.name || m.agent_id}</p>
                          <p className="text-white/40 text-[10px]">{m.performance_trend || 'stable'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-amber-300 font-bold text-sm">{m.overall_score}</p>
                          <p className="text-white/30 text-[10px]">score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reputation Scores */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Reputation Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reputations.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">No reputation data yet</div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reputations.slice(0, 10).map(r => {
                    const trustColor = {
                      verified: 'text-green-300 bg-green-500/15',
                      trusted: 'text-blue-300 bg-blue-500/15',
                      established: 'text-amber-300 bg-amber-500/15',
                      new: 'text-slate-300 bg-slate-500/15',
                    }[r.trust_level] || 'text-slate-300 bg-slate-500/15';
                    return (
                      <div key={r.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium font-mono truncate">{r.did_classic_address?.slice(0, 18)}…</p>
                          <p className="text-white/40 text-[10px]">{(r.strengths || []).slice(0, 2).join(', ')}</p>
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${trustColor}`}>{r.trust_level}</Badge>
                        <span className="text-white font-bold text-sm flex-shrink-0">{r.overall_score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Governance Proposal Impact */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Vote className="w-4 h-4 text-blue-400" /> Governance Proposals — KU Context Enrichment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrichedProposals.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-sm">No proposals enriched yet</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enrichedProposals.map(p => {
                  let ctx = null;
                  try { ctx = JSON.parse(p.relevant_context); } catch {}
                  return (
                    <div key={p.id} className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-xs font-medium leading-snug flex-1">{p.title}</p>
                        <Badge className={`text-[10px] flex-shrink-0 ${p.status === 'active' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-slate-500/20 text-slate-300'}`}>
                          {p.status}
                        </Badge>
                      </div>
                      {ctx && (
                        <div className="flex gap-3 text-[10px] text-white/40">
                          <span>KU Score: <span className="text-amber-300 font-bold">{ctx.proposer_total_ku_score?.toFixed(2)}</span></span>
                          <span>Gov Votes: <span className="text-blue-300">{ctx.proposer_governance_votes}</span></span>
                          <span>Knowledge: <span className="text-green-300">{ctx.proposer_knowledge_contributions}</span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent KUs */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> Recent Kinetic Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {kus.slice(0, 20).map(ku => {
                const agent = agentMap[ku.agent_id];
                const color = KU_COLORS[ku.ku_type] || '#64748b';
                return (
                  <div key={ku.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-white/60 text-xs w-32 flex-shrink-0 truncate">{KU_LABELS[ku.ku_type] || ku.ku_type}</span>
                    <span className="text-white/80 text-xs flex-1 truncate">{agent?.name || ku.agent_id}</span>
                    <span className="font-mono text-amber-300 text-xs flex-shrink-0">×{ku.weight || 1.0}</span>
                    <Badge className="text-[10px] bg-purple-500/15 text-purple-300 flex-shrink-0">{ku.status}</Badge>
                    <span className="text-white/30 text-[10px] flex-shrink-0">{new Date(ku.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              {kus.length === 0 && (
                <div className="text-center py-8 text-white/30 text-sm">No Kinetic Units yet — trigger generate_ku to begin</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}