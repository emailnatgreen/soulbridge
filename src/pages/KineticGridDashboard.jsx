import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import KineticStatRow from '@/components/kinetic/KineticStatRow';
import KineticEnergyVisualizer from '@/components/kinetic/KineticEnergyVisualizer';
import ProjectHealthPanel from '@/components/kinetic/ProjectHealthPanel';
import GovernanceVotePanel from '@/components/kinetic/GovernanceVotePanel';
import RecentKUFeed from '@/components/kinetic/RecentKUFeed';
import GovernanceKUFlow from '@/components/kinetic/GovernanceKUFlow';
import KineticWeaverCard from '@/components/kinetic/KineticWeaverCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Activity, Zap, TrendingUp, Vote, Star, RefreshCw, Shield, Users,
  ArrowLeft, FolderKanban, Scale, Wallet, Target, AlertTriangle
} from 'lucide-react';

const KU_COLORS = {
  did_publication: '#a78bfa', governance_vote: '#60a5fa', task_completion: '#34d399',
  mentorship_session: '#f59e0b', knowledge_contribution: '#fb923c', skill_development: '#e879f9',
  economic_exchange: '#2dd4bf', collaborative_action: '#f87171', agent_message: '#94a3b8',
  resource_trade: '#86efac',
};
const KU_LABELS = {
  did_publication: 'DID Publication', governance_vote: 'Gov Vote', task_completion: 'Task Complete',
  mentorship_session: 'Mentorship', knowledge_contribution: 'Knowledge', skill_development: 'Skill Dev',
  economic_exchange: 'Economic', collaborative_action: 'Collab', agent_message: 'Message',
  resource_trade: 'Resource Trade',
};

export default function KineticGridDashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ── Core KU data ──
  const { data: kus = [], refetch: refetchKus, isFetching: fetchingKus } = useQuery({
    queryKey: ['kg-kus'], queryFn: () => base44.entities.KineticUnit.list('-created_date', 500), refetchInterval: 20000,
  });
  const { data: packets = [], refetch: refetchPackets } = useQuery({
    queryKey: ['kg-packets'], queryFn: () => base44.entities.MWTPPacket.list('-created_date', 200), refetchInterval: 20000,
  });

  // ── Full-spectrum entity data ──
  const { data: agents = [] } = useQuery({
    queryKey: ['kg-agents'], queryFn: () => base44.entities.Agent.list('-created_date', 200), staleTime: 15000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['kg-projects'], queryFn: () => base44.entities.AIProject.list('-created_date', 100), refetchInterval: 20000,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['kg-tasks'], queryFn: () => base44.entities.ProjectTask.list('-created_date', 500), refetchInterval: 20000,
  });
  const { data: votes = [] } = useQuery({
    queryKey: ['kg-votes'], queryFn: () => base44.entities.GovernanceVote.list('-created_date', 200), refetchInterval: 20000,
  });
  const { data: proposals = [] } = useQuery({
    queryKey: ['kg-proposals'], queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 50), refetchInterval: 20000,
  });
  const { data: wallets = [] } = useQuery({
    queryKey: ['kg-wallets'], queryFn: () => base44.entities.Wallet.filter({ is_published: true }, '-created_date', 200), staleTime: 30000,
  });
  const { data: activities = [] } = useQuery({
    queryKey: ['kg-activities'], queryFn: () => base44.entities.EconomicActivity.list('-created_date', 200).catch(() => []), refetchInterval: 20000,
  });

  const handleRefresh = () => {
    refetchKus(); refetchPackets(); setLastRefresh(new Date());
  };

  // ── Derived metrics ──
  // Build comprehensive agent lookup: by ID, name, classic_address, wallet_id, external addresses
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));
  agents.forEach(a => {
    if (a.name) agentMap[a.name.toLowerCase()] = a;
    if (a.classic_address) agentMap[a.classic_address] = a;
    if (a.wallet_id) agentMap[a.wallet_id] = a;
    (a.external_classic_addresses || []).forEach(addr => { if (addr) agentMap[addr] = a; });
  });
  // Map known system identifiers to descriptive labels
  const SYSTEM_ACTOR_LABELS = {
    dex_swap: 'DEX Swap Engine',
    dex: 'DEX Engine',
    treasury: 'Village Treasury',
    system: 'System',
    external_source: 'External Source',
  };
  const resolveAgentName = (agentId) => {
    if (!agentId) return 'Unknown';
    const agent = agentMap[agentId] || agentMap[agentId?.toLowerCase?.()];
    if (agent) return agent.name;
    // Check system actor labels
    const lower = agentId.toLowerCase();
    for (const [key, label] of Object.entries(SYSTEM_ACTOR_LABELS)) {
      if (lower === key || lower.startsWith(key)) return label;
    }
    // If it looks like an XRPL address, show truncated
    if (agentId.startsWith('r') && agentId.length > 20) return `XRPL:${agentId.slice(0, 8)}…${agentId.slice(-6)}`;
    return agentId.length > 20 ? `${agentId.slice(0, 12)}…` : agentId;
  };
  const resolveAgent = (agentId) => agentMap[agentId] || agentMap[agentId?.toLowerCase?.()] || null;
  const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const ingestedKus = kus.filter(k => k.status === 'ingested');
  const activeProjects = projects.filter(p => !['cancelled', 'completed'].includes(p.status));
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const missingDueDate = tasks.filter(t => t.due_date === null || t.due_date === undefined || t.due_date === '');
  const missingRewardDrops = tasks.filter(t => (t.reward_drops === null || t.reward_drops === undefined) && t.reward_drops !== 0);
  const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < new Date());
  const totalRewardDrops = tasks.reduce((s, t) => s + (Number(t.reward_drops) || 0), 0);
  const economicVolume = activities.reduce((s, a) => s + (a.amount || 0), 0);

  // Layer breakdown
  const layerCounts = { micro: 0, meso: 0, macro: 0 };
  packets.forEach(p => { layerCounts[p.layer] = (layerCounts[p.layer] || 0) + 1; });

  // KU type distribution (pie)
  const kuTypeData = Object.entries(
    kus.reduce((acc, ku) => { acc[ku.ku_type] = (acc[ku.ku_type] || 0) + (ku.weighted_score || 1); return acc; }, {})
  ).map(([type, value]) => ({ name: KU_LABELS[type] || type, value: +value.toFixed(2), color: KU_COLORS[type] || '#64748b' }));

  // KU flow over time (area chart — last 14 days)
  const flowByDay = {};
  kus.forEach(ku => {
    const day = new Date(ku.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    flowByDay[day] = (flowByDay[day] || 0) + (ku.weighted_score || 1);
  });
  const flowData = Object.entries(flowByDay).slice(-14).map(([day, score]) => ({ day, score: +score.toFixed(2) }));

  // Top agents by KU score — resolve names properly, flag orphaned IDs
  const agentKuMap = {};
  kus.forEach(ku => { agentKuMap[ku.agent_id] = (agentKuMap[ku.agent_id] || 0) + (ku.weighted_score || 1); });
  const topAgents = Object.entries(agentKuMap)
    .map(([id, score]) => {
      const agent = resolveAgent(id);
      return { name: agent?.name || `⚠ ${id.slice(0, 12)}…`, score: +score.toFixed(2), orphaned: !agent };
    })
    .sort((a, b) => b.score - a.score).slice(0, 10);
  const orphanedAgentIds = topAgents.filter(a => a.orphaned).map(a => a.name);

  // Constitutional law alignment radar
  const lawMap = {};
  kus.forEach(ku => { (ku.constitutional_laws || []).forEach(law => { lawMap[law] = (lawMap[law] || 0) + (ku.weighted_score || 1); }); });
  const radarData = Object.entries(lawMap).map(([law, value]) => ({ law: law.replace('Law ', 'L').replace(': ', ' '), value: +value.toFixed(2) }));

  const stats = [
    { label: 'Kinetic Units', value: kus.length, sub: `${ingestedKus.length} ingested`, color: 'text-purple-300', icon: Zap },
    { label: 'Weighted Score', value: totalWeighted.toFixed(1), sub: 'all agents', color: 'text-amber-300', icon: TrendingUp },
    { label: 'MWTP Packets', value: packets.length, sub: `μ${layerCounts.micro} ⊕${layerCounts.meso} Ω${layerCounts.macro}`, color: 'text-blue-300', icon: Activity },
    { label: 'Projects', value: `${activeProjects.length}/${projects.length}`, sub: `${completedTasks.length}/${tasks.length} tasks done`, color: 'text-cyan-300', icon: FolderKanban },
    { label: 'Votes Cast', value: votes.length, sub: `${proposals.length} proposals`, color: 'text-green-300', icon: Vote },
    { label: 'Published DIDs', value: wallets.length, sub: `${agents.length} agents`, color: 'text-pink-300', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/home" className="text-white/40 hover:text-white/80 transition flex items-center gap-1 text-xs flex-shrink-0">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-white/20 hidden sm:inline">|</span>
            <Link to="/KineticCompass" className="text-yellow-400/70 hover:text-yellow-300 transition text-[10px] sm:text-xs font-medium hidden sm:inline">
              ⚡ Compass
            </Link>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm sm:text-lg leading-tight truncate">Kinetic Grid Dashboard</h1>
              <p className="text-purple-300/50 text-[9px] sm:text-xs truncate">Full Spectrum · Live Village Truth · All Entities</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white/30 text-[10px] hidden sm:block">
              {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </Badge>
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={fetchingKus} className="text-white/50 hover:text-white h-8 w-8 p-0">
              <RefreshCw className={`w-4 h-4 ${fetchingKus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">

        {/* Data integrity notices */}
        {orphanedAgentIds.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-300/80">
              <strong>Law 1 (Soul) Alert:</strong> {orphanedAgentIds.length} KU agent ID{orphanedAgentIds.length > 1 ? 's' : ''} could not be resolved to a living Agent record. These are marked with ⚠ in the charts. Orphaned IDs should be investigated and either re-linked or archived.
            </div>
          </div>
        )}
        {layerCounts.meso === 0 && packets.length > 0 && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
            <Activity className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300/80">
              <strong>MWTP Notice:</strong> All {packets.length} packets are micro-layer. Meso aggregation runs automatically every 30 minutes. Next run will aggregate hourly windows with 2+ micro packets.
            </div>
          </div>
        )}
        {(overdueTasks.length > 0 || missingDueDate.length > 0 || missingRewardDrops.length > 0) && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-300/80">
              <strong>Integrity Alert:</strong>{' '}
              {overdueTasks.length > 0 && <>{overdueTasks.length} overdue tasks. </>}
              {missingDueDate.length > 0 && <>{missingDueDate.length} missing due_date. </>}
              {missingRewardDrops.length > 0 && <>{missingRewardDrops.length} missing reward_drops (Law 3). </>}
              {overdueTasks.length === 0 && missingDueDate.length === 0 && missingRewardDrops.length === 0 && <>All clear.</>}
              See Project Health below for details.
            </div>
          </div>
        )}

        {/* Live Stat Row */}
        <KineticStatRow stats={stats} />

        {/* Kinetic Energy Visualizer */}
        <KineticEnergyVisualizer kus={kus} packets={packets} agents={agents} />

        {/* KU Flow + Type Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" /> KU Weighted Score Flow (Last 14 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flowData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No flow data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={flowData}>
                    <defs>
                      <linearGradient id="kuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff' }} />
                    <Area type="monotone" dataKey="score" stroke="#a78bfa" fill="url(#kuGrad)" strokeWidth={2} dot={{ fill: '#a78bfa', r: 2.5 }} />
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
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={kuTypeData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                        {kuTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-0.5 mt-1 max-h-28 overflow-y-auto">
                    {kuTypeData.map(d => (
                      <div key={d.name} className="flex items-center gap-2 text-[10px]">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-white/50 flex-1 truncate">{d.name}</span>
                        <span className="text-white/70 font-mono">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Project Health + Governance Votes — FULL TRUTH */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProjectHealthPanel projects={projects} tasks={tasks} agents={agents} />
          <GovernanceVotePanel votes={votes} proposals={proposals} agents={agents} />
        </div>

        {/* Top Agents + Constitutional Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Top Agents by KU Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topAgents.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No agent data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topAgents} layout="vertical" barSize={12}>
                    <XAxis type="number" tick={{ fill: '#ffffff50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#ffffff70', fontSize: 10 }} axisLine={false} tickLine={false} width={75} />
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
                <div className="h-44 flex items-center justify-center text-white/30 text-sm">No law alignment data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#ffffff15" />
                    <PolarAngleAxis dataKey="law" tick={{ fill: '#ffffff60', fontSize: 9 }} />
                    <Radar name="KU Score" dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff20', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Economic Activity Summary */}
        {activities.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-400" /> Economic Activity — {activities.length} records · {economicVolume.toFixed(2)} total volume
                <Badge className="text-[9px] bg-amber-500/20 text-amber-300 border-amber-500/30 ml-1">⚠ mixed units</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {activities.slice(0, 15).map(a => {
                  const agent = agentMap[a.agent_id];
                  const isInflow = ['earned', 'resource_sold', 'treasury_deposit'].includes(a.activity_type);
                  return (
                    <div key={a.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isInflow ? 'bg-green-400' : 'bg-blue-400'}`} />
                      <span className="text-white/60 flex-1 truncate">{resolveAgentName(a.agent_id)} — {a.description?.slice(0, 50)}</span>
                      <span className={`font-mono text-[10px] flex-shrink-0 ${isInflow ? 'text-green-300' : 'text-blue-300'}`}>
                        {isInflow ? '+' : '-'}{a.amount} XRP
                      </span>
                      <Badge className="text-[9px] bg-white/5 text-white/40">{a.activity_type}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent KU Feed */}
        <RecentKUFeed kus={kus} agents={agents} />

        {/* Governance KU Flow */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Vote className="w-4 h-4 text-blue-400" /> Governance Voting — Kinetic Flow
            </CardTitle>
            <p className="text-white/40 text-xs">Every vote generates a KU · Law 8: Those Who Dwell Decide</p>
          </CardHeader>
          <CardContent>
            <GovernanceKUFlow kus={kus} agents={agents} />
          </CardContent>
        </Card>

        {/* Kinetic Weaver */}
        <KineticWeaverCard />

        {/* Data Source Truth Footer */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center space-y-1">
          <p className="text-white/40 text-xs">📡 Full Spectrum Data Sources</p>
          <p className="text-white/25 text-[10px]">
            KineticUnit ({kus.length}) · MWTPPacket ({packets.length}) · Agent ({agents.length}) · 
            AIProject ({projects.length}) · ProjectTask ({tasks.length}) · GovernanceVote ({votes.length}) · 
            GovernanceProposal ({proposals.length}) · Wallet ({wallets.length}) · EconomicActivity ({activities.length})
          </p>
          <p className="text-white/15 text-[10px]">Auto-refresh every 20s · All data live from production database</p>
        </div>
      </div>
    </div>
  );
}