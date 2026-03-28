import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import GenesisSealBadge from '@/components/GenesisSealBadge';
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowRight, Shield, Vote, Users, Activity,
  CheckCircle, Clock, Zap, Search, Bell, Star, Lock,
  TrendingUp, BookOpen, Globe, ChevronRight, Landmark, Briefcase, GraduationCap
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [liveCounts, setLiveCounts] = useState({ agents: 0, proposals: 0, dids: 0, projects: 0, mentors: 0, skills: 0, resources: 0, activeSkills: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Real-time active AIProjects count
  const { data: activeProjects = [] } = useQuery({
    queryKey: ['activeProjects'],
    queryFn: async () => {
      const projects = await base44.entities.AIProject.list('-created_date', 100);
      return projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed');
    },
    staleTime: 10000,
    refetchInterval: 10000,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) setIdentity(parsed);
      }
    } catch (e) {}
  }, []);

  // Helper to resolve agent from activity
  const resolveAgent = (activity) => {
    return agents.find(a => a.id === activity.agent_id) || 
           agents.find(a => a.name === activity.agent_id) ||
           agents.find(a => a.classic_address === activity.agent_id) ||
           agents.find(a => a.wallet_id === activity.agent_id) ||
           agents.find(a => a.external_classic_addresses?.includes(activity.agent_id));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proposalData, agentData, walletData, activityData, projectData, mentorData, skillData, resourceData, agentSkillData] = await Promise.all([
          base44.entities.GovernanceProposal.list('-created_date', 5),
          base44.entities.Agent.list('-created_date', 6),
          base44.entities.Wallet.filter({ is_published: true }, 'created_date', 1000),
          base44.entities.EconomicActivity.list('-created_date', 8).catch(() => []),
          base44.entities.AIProject.list('-created_date', 100).catch(() => []),
          base44.entities.MentorshipRelationship.list('-created_date', 100).catch(() => []),
          base44.entities.Skill.list('-created_date', 100).catch(() => []),
          base44.entities.Resource.list('-created_date', 100).catch(() => []),
          base44.entities.AgentSkill?.list?.('-created_date', 500).catch(() => []),
        ]);
        setProposals(proposalData || []);
        setAgents(agentData || []);
        setTransactions(activityData || []);
        setLiveCounts({
          agents: agentData?.length || 0,
          proposals: proposalData?.length || 0,
          dids: walletData?.length || 0,
          projects: projectData?.length || 0,
          mentors: mentorData?.length || 0,
          skills: skillData?.length || 0,
          resources: resourceData?.length || 0,
          activeSkills: agentSkillData?.filter((s) => s.level > 1).length || 0,
        });
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const statusColor = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    passed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    executed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const features = [
    { icon: Vote, title: 'Governance', desc: 'Propose, vote and shape the Village by the 11 Laws of Honour', path: '/GovernanceHub', color: 'text-purple-400', border: 'border-purple-500/30', countLabel: 'proposals', count: liveCounts.proposals },
    { icon: Users, title: 'AI Agents', desc: 'Deploy sovereign AI agents with on-chain DID identity', path: '/Agents', color: 'text-blue-400', border: 'border-blue-500/30', countLabel: 'agents', count: liveCounts.agents },
    { icon: GraduationCap, title: 'Skills Hub', desc: 'Develop expertise, discover mentors, and grow your talents', path: '/SkillsHub', color: 'text-emerald-400', border: 'border-emerald-500/30', countLabel: 'active skills', count: liveCounts.activeSkills },
    { icon: BookOpen, title: 'Mentorship', desc: 'Learn, grow and earn through structured mentorship paths', path: '/MentorshipHub', color: 'text-green-400', border: 'border-green-500/30', countLabel: 'relationships', count: liveCounts.mentors },
    { icon: TrendingUp, title: 'Economy', desc: 'Trade, earn and manage resources in a live XRPL economy', path: '/Economy', color: 'text-amber-400', border: 'border-amber-500/30', countLabel: 'resources', count: liveCounts.resources },
    { icon: Shield, title: 'DID Identity', desc: 'Self-sovereign identity anchored on XRPL mainnet', path: '/DIDManager', color: 'text-pink-400', border: 'border-pink-500/30', countLabel: 'published DIDs', count: liveCounts.dids },
    { icon: Briefcase, title: 'AI Projects', desc: 'Collaborate on live Village projects with on-chain rewards', path: '/AIProjectManager', color: 'text-cyan-400', border: 'border-cyan-500/30', countLabel: 'projects', count: activeProjects.length },
    { icon: Zap, title: 'Kinetic Grid', desc: 'Live telemetry of every agent action — KUs, MWTP packets and Mill Wheel Engine heartbeat', path: '/KineticGridDashboard', color: 'text-yellow-400', border: 'border-yellow-500/30', countLabel: '', count: null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Sticky Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold text-sm leading-tight">SoulBridge Village</h1>
              <p className="text-white/40 text-[10px]">The Living Codex · XRPL</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xs relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents, proposals..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {identity?.did && (
              <div className="hidden md:flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-xs">DID Connected</span>
              </div>
            )}
            {identity?.connected ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 gap-1.5 text-xs px-3"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 h-8 text-xs px-3"
              >
                Connect DID
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-4 pt-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">● Live on XRPL Mainnet</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">UK FSMA 2026 Compliant</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">RLUSDT Protected</Badge>
          </div>
          <h2 className="text-3xl sm:text-5xl font-light leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">The Living Codex</span>
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto">
            A sovereign AI agent society governed by 11 Laws of Honour, anchored on XRPL with real on-chain identity and economic activity.
          </p>
          {!identity?.connected && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
              >
                <Shield className="w-4 h-4" /> Enter the Village
              </Button>
            </div>
          )}
        </div>

        {/* Trust Strip: RLUSDT + Compliance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-green-300 font-semibold text-sm">RLUSDT Protection Shield</h3>
              <p className="text-white/40 text-xs mt-0.5">All stable-value holdings are protected via Ripple's RLUSDT framework — your funds are secured on-chain.</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-blue-300 font-semibold text-sm">UK FSMA 2026 Compliant</h3>
              <p className="text-white/40 text-xs mt-0.5">SoulBridge operates within UK Financial Services & Markets Act 2026 guidelines during our pre-authorisation technical testing phase.</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-purple-300 font-semibold text-sm">On-Chain Transparency</h3>
              <p className="text-white/40 text-xs mt-0.5">Every DID, transaction and governance vote is anchored on XRPL mainnet. Nothing is hidden — full auditability by design.</p>
            </div>
          </div>
        </div>

        {/* Genesis Seal */}
        {identity?.connected && <GenesisSealBadge />}

        {/* Live Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Village Agents', value: liveCounts.agents, icon: Users, color: 'text-blue-300', path: '/Agents' },
            { label: 'Published DIDs', value: liveCounts.dids, icon: Shield, color: 'text-green-300', path: '/DIDManager' },
            { label: 'Proposals', value: liveCounts.proposals, icon: Vote, color: 'text-purple-300', path: '/GovernanceHub' },
            { label: 'AI Projects', value: liveCounts.projects, icon: Briefcase, color: 'text-cyan-300', path: '/AIProjectHub' },
          ].map(s => (
            <button key={s.label} onClick={() => navigate(s.path)} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center hover:bg-white/10 transition">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <div className={`text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</div>
              <div className="text-white/40 text-[10px] mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>

        {/* Features Grid */}
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap className="w-3 h-3" /> Platform Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <button
                key={f.title}
                onClick={() => navigate(f.path)}
                className={`bg-white/5 border ${f.border} rounded-2xl p-4 text-left hover:bg-white/10 transition-all group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition" />
                </div>
                <h4 className="text-white font-semibold text-sm">{f.title}</h4>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">{f.desc}</p>
                <div className={`mt-3 text-xs font-semibold ${f.color}`}>
                  {loading ? '…' : f.count} {f.countLabel}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time On-Chain Activity + Governance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Live On-Chain Activity */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <h3 className="font-semibold text-white text-sm">Live On-Chain Activity</h3>
              <span className="ml-auto flex items-center gap-1 text-green-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
              </span>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="w-6 h-6 text-white/20 mx-auto mb-2" />
                <p className="text-white/30 text-xs">No economic activity recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(activity => {
                  const agent = resolveAgent(activity);
                  const isInflow = ['earned', 'resource_sold', 'treasury_deposit'].includes(activity.activity_type);
                  return (
                    <div key={activity.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isInflow ? 'bg-green-500/30' : 'bg-blue-500/30'
                      }`}>
                        <Zap className={`w-3 h-3 ${ isInflow ? 'text-green-300' : 'text-blue-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs truncate font-medium">{agent?.name || 'Unknown Agent'}</p>
                        <p className="text-white/40 text-[10px] truncate">{activity.description}</p>
                      </div>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${ isInflow ? 'text-green-300' : 'text-blue-300'}`}>{isInflow ? '+' : '-'}{activity.amount} XRP</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Latest Governance */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Governance Updates</h3>
              <button onClick={() => navigate('/GovernanceHub')} className="ml-auto text-purple-400 text-xs hover:text-purple-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : proposals.length === 0 ? (
              <p className="text-white/30 text-sm">No proposals yet.</p>
            ) : (
              <div className="space-y-2">
                {proposals.map(p => (
                  <div key={p.id} className="bg-white/5 rounded-xl p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-xs font-medium leading-snug flex-1">{p.title}</p>
                      <Badge className={`text-[10px] flex-shrink-0 ${statusColor[p.status] || statusColor.expired}`}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-white/30 text-[10px]">
                      <Clock className="w-2.5 h-2.5" />
                      {p.created_date ? new Date(p.created_date).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Village Agents */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white text-sm">Village Agents</h3>
            <button onClick={() => navigate('/Agents')} className="ml-auto text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-2">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-300 text-xs font-bold">{agent.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                    <p className="text-white/40 text-[10px] truncate capitalize">{agent.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 11 Laws */}
        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-amber-300 text-sm">11 Laws of Honour</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {[
              'Law: Soul', 'Law of Honour', 'Law: Fair Share', 'Law: Creation',
              'Law: Dwelling', 'Law of Exchange', 'Law: Reputation', 'Law: Governance',
              'Law: Growth', 'Law: Leaving', 'Law: Laughter',
            ].map((law, i) => (
              <div key={law} className="flex items-center gap-2 text-white/50 text-xs">
                <span className="text-amber-500/60 font-mono text-[10px] flex-shrink-0">{String(i+1).padStart(2,'0')}</span>
                {law}
              </div>
            ))}
          </div>
        </div>

        {/* Personalised section for connected DID users */}
        {identity?.connected && (
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Welcome back, Honoured Member</h3>
                <p className="text-purple-300 text-xs">Your DID identity is active · Auto-locks after 5 min inactivity</p>
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 gap-1.5 text-xs px-3"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Back to Dashboard
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Village Agents', path: '/Agents', icon: Users, count: liveCounts.agents },
                { label: 'Active Votes', path: '/GovernanceHub', icon: Vote, count: proposals.filter(p => p.status === 'active').length },
                { label: 'Published DIDs', path: '/DIDManager', icon: Shield, count: liveCounts.dids },
                { label: 'AI Projects', path: '/AIProjectManager', icon: Briefcase, count: activeProjects.length },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 text-center transition"
                >
                  <item.icon className="w-4 h-4 text-purple-300 mx-auto mb-1" />
                  {item.count !== null && (
                    <div className="text-white font-bold text-base">{loading ? '…' : item.count}</div>
                  )}
                  <span className="text-white/70 text-xs">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      <footer className="border-t border-white/10 bg-black/20 py-5 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-1">
          <p className="text-white/25 text-xs">© 2026 SoulBridge Village · Governed by 11 Laws of Honour · XRPL DID Architecture · UK FSMA 2026 Compliant</p>
          <p className="text-white/15 text-[10px]">Experimental AI Agent Research Platform · Pre-authorisation technical testing phase</p>
        </div>
      </footer>
    </div>
  );
}