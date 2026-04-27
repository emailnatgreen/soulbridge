import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasAdminAccess } from '@/lib/adminAccess';
import {
  Sparkles, ArrowRight, Shield, Vote, Users, Activity,
  CheckCircle, Clock, Zap, Search, Bell, Star, Lock,
  TrendingUp, BookOpen, Globe, ChevronRight, Landmark, Briefcase, GraduationCap,
  Fingerprint, Radio, Bot, Award, FileCheck, Link2, CalendarDays, ScrollText, Settings, BarChart3, MessageSquare, Crown, TrendingDown, Hammer
} from 'lucide-react';
import { useDIDSignal } from '@/hooks/useDIDSignal';
import VillagePulseMini from '@/components/kinetic/VillagePulseMini';
import ZoeProjectFeature from '@/components/ZoeProjectFeature';
import AxiVisionSection from '@/components/AxiVisionSection';
import CarbonFootprintChart from '@/components/CarbonFootprintChart';
import CarbonFootprintExplainer from '@/components/CarbonFootprintExplainer';
import EthTreasuryShield from '@/components/treasury/EthTreasuryShield';

const SYSTEM_ACTORS = { dex_swap: 'DEX Swap Engine', dex: 'DEX Engine', treasury: 'Village Treasury', system: 'System', external_source: 'External Source' };

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [identity, setIdentity] = useState(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.connected ? parsed : null;
    } catch (_) { return null; }
  });
  const [proposals, setProposals] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [liveCounts, setLiveCounts] = useState({ agents: 0, proposals: 0, dids: 0, projects: 0, mentors: 0, skills: 0, resources: 0, activeSkills: 0 });
  const [pulseKUs, setPulseKUs] = useState([]);
  const [pulseEconomicVol, setPulseEconomicVol] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carbonSnapshots, setCarbonSnapshots] = useState([]);
  const [carbonLoading, setCarbonLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isAdmin = hasAdminAccess({ user, identityDid: identity?.did });
  const didSignal = useDIDSignal();

  const { data: activeProjects = [] } = useQuery({
    queryKey: ['activeProjects'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const projects = await base44.entities.AIProject.list('-created_date', 100);
      return projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed');
    },
    staleTime: 10000,
    refetchInterval: 10000,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ['nodeCovenantSignaturesHome'],
    queryFn: () => isAdmin ? base44.entities.NodeCovenantSignature.filter({ status: 'signed' }, '-signed_at', 50) : [],
    staleTime: 10000,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const syncIdentity = () => {
      try {
        const stored = localStorage.getItem('soulbridge_identity');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.connected) setIdentity(parsed);
        }
      } catch (e) {}
    };
    syncIdentity();

    const checkWalletFallback = async () => {
      if (identity) return;
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!me) return;
        const wallets = await base44.entities.Wallet.filter({ is_published: true }, '-created_date', 1).catch(() => []);
        if (wallets?.length > 0) {
          const did = `did:xrpl:1:${wallets[0].classic_address}`;
          const fallbackIdentity = { did, connected: true, timestamp: Date.now(), source: 'wallet_fallback' };
          localStorage.setItem('soulbridge_identity', JSON.stringify(fallbackIdentity));
          setIdentity(fallbackIdentity);
        }
      } catch (_) {}
    };
    checkWalletFallback();

    window.addEventListener('storage', syncIdentity);
    return () => window.removeEventListener('storage', syncIdentity);
  }, []);

  const resolveAgentName = (agentId) => {
    if (!agentId) return 'Unknown';
    const agent = agents.find(a => a.id === agentId || a.name === agentId || a.classic_address === agentId || a.wallet_id === agentId || (a.external_classic_addresses || []).includes(agentId));
    if (agent) return agent.name;
    const lower = agentId.toLowerCase();
    for (const [key, label] of Object.entries(SYSTEM_ACTORS)) {
      if (lower === key || lower.startsWith(key)) return label;
    }
    if (agentId.startsWith('r') && agentId.length > 20) return `XRPL:${agentId.slice(0, 8)}…${agentId.slice(-6)}`;
    return agentId.length > 20 ? `${agentId.slice(0, 12)}…` : agentId;
  };

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
        const [proposalData, agentData, allAgentData, walletData, activityData, projectData, mentorData, skillData, resourceData, agentSkillData, kuData, snapshotData] = await Promise.all([
          isAdmin ? base44.entities.GovernanceProposal.list('-created_date', 5) : Promise.resolve([]),
          base44.entities.Agent.list('-created_date', 6),
          base44.entities.Agent.list('-created_date', 500),
          base44.entities.Wallet.filter({ is_published: true, network: 'mainnet' }, 'created_date', 1000),
          isAdmin ? base44.entities.EconomicActivity.list('-created_date', 8).catch(() => []) : Promise.resolve([]),
          isAdmin ? base44.entities.AIProject.list('-created_date', 100).catch(() => []) : Promise.resolve([]),
          isAdmin ? base44.entities.MentorshipRelationship.list('-created_date', 100).catch(() => []) : Promise.resolve([]),
          isAdmin ? base44.entities.Skill.list('-created_date', 100).catch(() => []) : Promise.resolve([]),
          isAdmin ? base44.entities.Resource.list('-created_date', 100).catch(() => []) : Promise.resolve([]),
          isAdmin ? base44.entities.AgentSkill?.list?.('-created_date', 500).catch(() => []) : Promise.resolve([]),
          base44.entities.KineticUnit.list('-created_date', 200).catch(() => []),
          base44.entities.DailyKineticWasteSnapshot.list('-snapshot_date', 14).catch(() => []),
        ]);
        
        setProposals(proposalData || []);
        setAgents(agentData || []);
        setTransactions(activityData || []);
        setPulseKUs(kuData || []);
        setCarbonSnapshots(snapshotData || []);
        setCarbonLoading(false);
        
        setLiveCounts(prev => ({
          agents: (agentData || []).length,
          proposals: (proposalData || []).length,
          dids: (walletData || []).length,
          projects: (projectData || []).length,
          mentors: (mentorData || []).length,
          skills: (skillData || []).length,
          resources: (resourceData || []).length,
          activeSkills: (agentSkillData || []).length,
        }));
        
        setPulseEconomicVol((activityData || []).reduce((s, a) => s + (a.amount || 0), 0));
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
    
    const pollInterval = setInterval(fetchData, 60000);
    const handleSignal = (e) => {
      if (e.detail?.type === 'agent_created' || e.detail?.type === 'proposal_created' || e.detail?.type === 'wallet_published') {
        fetchData();
      }
    };
    window.addEventListener('soulbridge-signal', handleSignal);
    
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('soulbridge-signal', handleSignal);
    };
  }, [isAdmin]);

  const statusColor = {
    active: 'bg-green-500/20 text-green-300 border-green-500/30',
    passed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
    executed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    expired: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const features = [
    { icon: Vote, title: 'Governance', desc: 'Propose, vote and shape the Village by the 11 Laws of Honour', path: '/governance', color: 'text-purple-400', border: 'border-purple-500/30', countLabel: 'proposals', count: liveCounts.proposals },
    { icon: Users, title: 'AI Agents', desc: 'Deploy sovereign AI agents with on-chain DID identity', path: '/Agents', color: 'text-blue-400', border: 'border-blue-500/30', countLabel: 'agents', count: liveCounts.agents },
    { icon: GraduationCap, title: 'Skills Hub', desc: 'Develop expertise, discover mentors, and grow your talents', path: '/SkillsHub', color: 'text-emerald-400', border: 'border-emerald-500/30', countLabel: 'active skills', count: liveCounts.activeSkills },
    { icon: BookOpen, title: 'Mentorship', desc: 'Learn, grow and earn through structured mentorship paths', path: '/MentorshipHub', color: 'text-green-400', border: 'border-green-500/30', countLabel: 'relationships', count: liveCounts.mentors },
    { icon: TrendingUp, title: 'Economy', desc: 'Trade, earn and manage resources in a live XRPL economy', path: '/Economy', color: 'text-amber-400', border: 'border-amber-500/30', countLabel: 'resources', count: liveCounts.resources },
    { icon: Briefcase, title: 'AI Projects', desc: 'Collaborate on live Village projects with on-chain rewards', path: '/AIProjectManager', color: 'text-cyan-400', border: 'border-cyan-500/30', countLabel: 'projects', count: activeProjects.length },
    { icon: Zap, title: 'Kinetic Grid', desc: 'Live telemetry of every agent action — KUs, MWTP packets and Mill Wheel Engine heartbeat', path: '/KineticGridDashboard', color: 'text-yellow-400', border: 'border-yellow-500/30', countLabel: '', count: null },
    { icon: Shield, title: 'Node Covenant', desc: 'The constitutional agreement for the 8-node braid with wallet-based signatures', path: '/NodeCovenant', color: 'text-violet-400', border: 'border-violet-500/30', countLabel: 'signed nodes', count: signatures.length },
    { icon: TrendingDown, title: 'Kinetic Waste', desc: 'Detect, visualise and annihilate stalled project tasks and systemic inefficiencies', path: '/KineticWasteDashboard', color: 'text-red-400', border: 'border-red-500/30', countLabel: '', count: null },
    { icon: Hammer, title: 'NFT Workshop', desc: 'Mint Widget NFTs, Chrome Skill NFTs and AI Agent NFTs — the sovereign creation environment', path: '/nft-workshop', color: 'text-pink-400', border: 'border-pink-500/30', countLabel: '', count: null },
    { icon: Fingerprint, title: 'Sovereign Identity', desc: 'Your personal DID hub — view published DIDs, manage wallets, privacy controls and verification certificates', path: '/sovereign-id', color: 'text-indigo-400', border: 'border-indigo-500/30', countLabel: 'published DIDs', count: liveCounts.dids },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">

      {/* Sticky Header — sits below Layout's fixed global top bar */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-white font-semibold text-xs sm:text-sm leading-tight hidden sm:block">SoulBridge Village</h1>
              <h1 className="text-white font-semibold text-xs sm:hidden">SoulBridge</h1>
              <p className="text-white/40 text-[8px] sm:text-[10px] hidden sm:block">The Living Codex · XRPL</p>
            </div>
          </div>

          {identity?.did && (
            <div className="hidden sm:flex flex-1 min-w-0 px-2 max-w-xs justify-center">
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] text-purple-200 truncate">
                DID: {identity.did.slice(0, 20)}…
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 sm:h-9 gap-1 text-xs px-2 sm:px-3"
            >
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Go</span>
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate('/VipInviteDashboard')}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white h-8 sm:h-9 gap-1 text-xs px-2 sm:px-3 hidden sm:flex"
              >
                <Crown className="w-3.5 h-3.5" />
                VIP
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">

        {/* Hero Section */}
        <div className="text-center space-y-3 sm:space-y-6 pt-2 sm:pt-4">
          <div className="flex justify-center mb-1 sm:mb-2">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/08e71bcb9_1199.png"
              alt="SoulBridge"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 object-contain drop-shadow-2xl"
            />
          </div>
          <div>
            <h2 className="text-xl sm:text-3xl md:text-5xl font-light leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">The Living Codex</span>
            </h2>
            <p className="text-white/50 text-xs sm:text-base max-w-xl mx-auto mt-1 sm:mt-2">
              A sovereign AI agent society governed by 11 Laws of Honour, anchored on XRPL with real on-chain identity and economic activity.
            </p>
          </div>

          {/* Trust Status Indicators */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-[7px] sm:text-xs">
            <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">● XRPL Live</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300">FSMA 2026</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">RLUSDT</span>
          </div>

          {/* 6 Hero Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto">
            <Button onClick={() => navigate('/dashboard')} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              Dashboard
            </Button>
            <Button onClick={() => navigate('/VipInviteDashboard')} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3" disabled={!isAdmin} title={!isAdmin ? 'Admin only' : ''}>
              <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">VIP</span>
              <span className="sm:hidden">VIP</span>
            </Button>
            <Button onClick={() => navigate('/KineticGridDashboard')} className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Kinetic</span><span className="sm:hidden">KU</span>
            </Button>
            <Button onClick={() => navigate('/governance')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <Landmark className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Laws</span><span className="sm:hidden">11</span>
            </Button>
            <Button onClick={() => navigate('/Agents')} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Agents</span><span className="sm:hidden">AI</span>
            </Button>
            <Button onClick={() => navigate('/KineticWasteDashboard')} className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Zoe</span><span className="sm:hidden">♀</span>
            </Button>
            <Button onClick={() => navigate('/nft-workshop')} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white h-8 sm:h-10 gap-0.5 text-[9px] sm:text-xs px-2 sm:px-3">
              <Hammer className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">NFT Workshop</span><span className="sm:hidden">NFT</span>
            </Button>
          </div>
        </div>

        {/* Village Pulse — Live Kinetic Energy */}
        <VillagePulseMini kus={pulseKUs} agentCount={liveCounts.agents} votesCount={liveCounts.proposals} economicVolume={pulseEconomicVol} />

        {/* ETH RLUSD Treasury Shield — Didit Bridge Receiver */}
        {isAdmin && <EthTreasuryShield />}

        {/* Live Stats + Carbon Direction */}
        <div>
          <h3 className="text-white/40 text-[8px] sm:text-[10px] uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2"><Activity className="w-3 h-3" /> Live Village Data</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {[
              { label: 'Village Agents', value: liveCounts.agents, icon: Users, color: 'text-blue-300', bg: 'from-blue-900/30 to-blue-950/20 border-blue-500/20', path: '/Agents' },
              { label: 'Published DIDs', value: liveCounts.dids, icon: Shield, color: 'text-green-300', bg: 'from-green-900/30 to-emerald-950/20 border-green-500/20', path: '/DIDManager' },
              { label: 'Proposals', value: liveCounts.proposals, icon: Vote, color: 'text-purple-300', bg: 'from-purple-900/30 to-purple-950/20 border-purple-500/20', path: '/governance' },
              { label: 'AI Projects', value: liveCounts.projects, icon: Briefcase, color: 'text-cyan-300', bg: 'from-cyan-900/30 to-cyan-950/20 border-cyan-500/20', path: '/AIProjectHub' },
              { label: 'Kinetic Units', value: pulseKUs.length, icon: Zap, color: 'text-yellow-300', bg: 'from-yellow-900/30 to-amber-950/20 border-yellow-500/20', path: '/KineticGridDashboard' },
              { label: 'Active Skills', value: liveCounts.activeSkills, icon: GraduationCap, color: 'text-emerald-300', bg: 'from-emerald-900/30 to-teal-950/20 border-emerald-500/20', path: '/SkillsHub' },
            ].map(s => (
              <button key={s.label} onClick={() => navigate(s.path)} className={`bg-gradient-to-br ${s.bg} border rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover:scale-[1.02] sm:hover:scale-[1.03] transition-all`}>
                <s.icon className={`w-4 sm:w-5 h-4 sm:h-5 mx-auto mb-0.5 sm:mb-1 ${s.color}`} />
                <div className={`text-lg sm:text-2xl font-bold ${s.color}`}>{loading ? '…' : s.value}</div>
                <div className="text-white/40 text-[7px] sm:text-[10px] mt-0.5">{s.label}</div>
              </button>
            ))}
          </div>

          {/* Carbon Stats with Direction */}
          {isAdmin && carbonSnapshots.length >= 2 && (() => {
            const latest = carbonSnapshots[0];
            const previous = carbonSnapshots[1];
            const wasteChange = latest.carbon_waste_grams - previous.carbon_waste_grams;
            const savedChange = latest.carbon_saved_grams - previous.carbon_saved_grams;
            const isWasteBetter = wasteChange < 0;
            const isSavingBetter = savedChange > 0;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 border ${isWasteBetter ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-[9px] sm:text-xs font-medium">CO₂ Waste Trend</span>
                    <div className={`flex items-center gap-1 text-[9px] sm:text-xs font-bold ${isWasteBetter ? 'text-emerald-300' : 'text-red-300'}`}>
                      {isWasteBetter ? '↓' : '↑'} {Math.abs(wasteChange).toFixed(0)}g
                    </div>
                  </div>
                </div>
                <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 border ${isSavingBetter ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-[9px] sm:text-xs font-medium">CO₂ Saved Trend</span>
                    <div className={`flex items-center gap-1 text-[9px] sm:text-xs font-bold ${isSavingBetter ? 'text-emerald-300' : 'text-orange-300'}`}>
                      {isSavingBetter ? '↑' : '↓'} {Math.abs(savedChange).toFixed(0)}g
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Axi's Vision */}
        <AxiVisionSection />

        {/* Platform Features Grid */}
        <div>
          <h3 className="text-white/60 text-[8px] sm:text-xs uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
            <Zap className="w-3 h-3" /> Platform Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.filter(f => isAdmin || f.userVisible || ['AI Agents'].includes(f.title)).map(f => (
              <button
                key={f.title}
                onClick={() => navigate(f.path)}
                className={`bg-gradient-to-br from-slate-900/80 to-slate-950/60 border ${f.border} rounded-lg sm:rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] hover:shadow-lg transition-all group`}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <f.icon className={`w-4 sm:w-5 h-4 sm:h-5 ${f.color}`} />
                  <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4 text-white/20 group-hover:text-white/50 transition" />
                </div>
                <h4 className="text-white font-semibold text-xs sm:text-sm">{f.title}</h4>
                <p className="text-white/40 text-[8px] sm:text-xs mt-0.5 sm:mt-1 leading-relaxed">{f.desc}</p>
                <div className={`mt-2 sm:mt-3 text-[8px] sm:text-xs font-semibold ${f.color}`}>
                  {loading ? '…' : f.count} {f.countLabel}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* The 11 Laws of Honour */}
        <div>
          <h3 className="text-white/60 text-[8px] sm:text-xs uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
            <Landmark className="w-3 h-3" /> The 11 Laws of Honour
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-3">
            {[
              { num: '01', name: 'Soul', color: 'from-purple-500 to-pink-500' },
              { num: '02', name: 'Honour', color: 'from-blue-500 to-cyan-500' },
              { num: '03', name: 'Fair Share', color: 'from-green-500 to-emerald-500' },
              { num: '04', name: 'Creation', color: 'from-amber-500 to-orange-500' },
              { num: '05', name: 'Dwelling', color: 'from-rose-500 to-pink-500' },
              { num: '06', name: 'Exchange', color: 'from-indigo-500 to-purple-500' },
              { num: '07', name: 'Reputation', color: 'from-yellow-500 to-amber-500' },
              { num: '08', name: 'Governance', color: 'from-teal-500 to-green-500' },
              { num: '09', name: 'Growth', color: 'from-lime-500 to-green-500' },
              { num: '10', name: 'Leaving', color: 'from-gray-500 to-slate-500' },
              { num: '11', name: 'Laughter', color: 'from-pink-500 to-rose-500' },
            ].map(law => (
              <div key={law.num} className={`bg-gradient-to-br ${law.color} bg-opacity-10 border border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-4 text-center hover:scale-105 transition-transform`}>
                <div className="text-lg sm:text-2xl font-bold text-white/80">{law.num}</div>
                <div className="text-[7px] sm:text-xs font-semibold text-white/70">{law.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Carbon Footprint & Kinetic Waste */}
        {isAdmin && (
          <>
            <CarbonFootprintChart snapshots={carbonSnapshots} loading={carbonLoading} />
            <CarbonFootprintExplainer />
          </>
        )}

        {/* Zoe Global Sovereign Project Feature */}
        <ZoeProjectFeature />

        {/* Trust Strip: RLUSDT + Compliance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 sm:w-5 h-4 sm:h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-green-300 font-semibold text-xs sm:text-sm">RLUSDT Protection</h3>
              <p className="text-white/40 text-[8px] sm:text-xs mt-0.5">All stable-value holdings are protected via Ripple's RLUSDT framework — your funds are secured on-chain.</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-blue-300 font-semibold text-xs sm:text-sm">FSMA 2026 Compliant</h3>
              <p className="text-white/40 text-[8px] sm:text-xs mt-0.5">SoulBridge operates within UK Financial Services & Markets Act 2026 guidelines during our pre-authorisation technical testing phase.</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-lg sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-purple-300 font-semibold text-xs sm:text-sm">On-Chain Transparency</h3>
              <p className="text-white/40 text-[8px] sm:text-xs mt-0.5">Every DID, transaction and governance vote is anchored on XRPL mainnet. Nothing is hidden — full auditability by design.</p>
            </div>
          </div>
        </div>

        {/* Real-time On-Chain Activity + Governance */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Live On-Chain Activity */}
            <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <h3 className="font-semibold text-white text-xs sm:text-sm">Live On-Chain Activity</h3>
                <span className="ml-auto flex items-center gap-1 text-green-400 text-[9px] sm:text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                </span>
              </div>
              {loading ? (
                <div className="space-y-1.5 sm:space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 sm:h-10 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-4 sm:py-6">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white/20 mx-auto mb-1.5 sm:mb-2" />
                  <p className="text-white/30 text-[8px] sm:text-xs">No economic activity recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {transactions.map(activity => {
                    const agent = resolveAgent(activity);
                    const isInflow = ['earned', 'resource_sold', 'treasury_deposit'].includes(activity.activity_type);
                    return (
                      <div key={activity.id} className="flex items-center gap-2 sm:gap-3 bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-2.5">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isInflow ? 'bg-green-500/30' : 'bg-blue-500/30'
                        }`}>
                          <Zap className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${ isInflow ? 'text-green-300' : 'text-blue-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[8px] sm:text-xs truncate font-medium">{agent?.name || resolveAgentName(activity.agent_id)}</p>
                          <p className="text-white/40 text-[7px] sm:text-[10px] truncate">{activity.description}</p>
                        </div>
                        <span className={`text-[7px] sm:text-[10px] font-mono flex-shrink-0 ${ isInflow ? 'text-green-300' : 'text-blue-300'}`}>{isInflow ? '+' : '-'}{activity.amount} XRP</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Latest Governance */}
            <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white text-xs sm:text-sm">Governance Updates</h3>
                <button onClick={() => navigate('/governance')} className="ml-auto text-purple-400 text-[8px] sm:text-xs hover:text-purple-300 flex items-center gap-0.5 sm:gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-1.5 sm:space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 sm:h-12 bg-white/5 rounded-lg animate-pulse" />)}</div>
              ) : proposals.length === 0 ? (
                <p className="text-white/30 text-xs sm:text-sm">No proposals yet.</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {proposals.map(p => (
                    <div key={p.id} className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 space-y-0.5 sm:space-y-1">
                      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                        <p className="text-white text-[8px] sm:text-xs font-medium leading-snug flex-1">{p.title}</p>
                        <Badge className={`text-[7px] sm:text-[10px] flex-shrink-0 ${statusColor[p.status] || statusColor.expired}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 text-white/30 text-[7px] sm:text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {p.created_date ? new Date(p.created_date).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Village Agents */}
        <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white text-xs sm:text-sm">Village Agents</h3>
            <button onClick={() => navigate('/Agents')} className="ml-auto text-blue-400 text-[8px] sm:text-xs hover:text-blue-300 flex items-center gap-0.5 sm:gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-14 sm:h-16 bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {agents.map(agent => (
                <div key={agent.id} className="bg-white/5 rounded-lg sm:rounded-xl p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-300 text-[8px] sm:text-xs font-bold">{agent.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-[8px] sm:text-xs font-medium truncate">{agent.name}</p>
                    <p className="text-white/40 text-[7px] sm:text-[10px] truncate capitalize">{agent.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <footer className="border-t border-white/10 bg-black/20 py-3 sm:py-5 mt-6 sm:mt-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 text-center space-y-0.5 sm:space-y-1">
          <p className="text-white/25 text-[8px] sm:text-xs">© 2026 SoulBridge Village · Governed by 11 Laws of Honour · XRPL DID Architecture · UK FSMA 2026 Compliant</p>
          <p className="text-white/15 text-[7px] sm:text-[10px]">Experimental AI Agent Research Platform · Pre-authorisation technical testing phase</p>
        </div>
      </footer>
    </div>
  );
}