import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import GenesisSealBadge from '@/components/GenesisSealBadge';
import { Badge } from "@/components/ui/badge";
import { hasAdminAccess } from '@/lib/adminAccess';
import {
  Sparkles, ArrowRight, Shield, Vote, Users, Activity,
  CheckCircle, Clock, Zap, Search, Bell, Star, Lock,
  TrendingUp, BookOpen, Globe, ChevronRight, Landmark, Briefcase, GraduationCap,
  Fingerprint, Radio, Bot, Award, FileCheck, Link2, CalendarDays, ScrollText, Settings, BarChart3, MessageSquare, Crown, TrendingDown
} from 'lucide-react';
import { useDIDSignal } from '@/hooks/useDIDSignal';
import VillagePulseMini from '@/components/kinetic/VillagePulseMini';
import ZoeProjectFeature from '@/components/ZoeProjectFeature';
import AxiVisionSection from '@/components/AxiVisionSection';
import CarbonFootprintChart from '@/components/CarbonFootprintChart';

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
  const [hasInviteSession, setHasInviteSession] = useState(false);
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

  // Real-time active AIProjects count
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

  // Re-check identity from localStorage + DB wallets as fallback
  useEffect(() => {
    const syncIdentity = () => {
      try {
        const stored = localStorage.getItem('soulbridge_identity');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.connected) setIdentity(parsed);
        }
        const inviteSession = localStorage.getItem('sb_invite_session');
        const inviteWallet = localStorage.getItem('sb_invite_wallet');
        const parsedWallet = inviteWallet ? JSON.parse(inviteWallet) : null;
        if (inviteSession && parsedWallet) {
          setHasInviteSession(true);
        }
      } catch (e) {}
    };
    syncIdentity();

    // Fallback: if no localStorage identity, check DB for published wallets
    const checkWalletFallback = async () => {
      if (identity) return; // already have identity
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

  // Comprehensive agent resolver — checks ID, name, classic_address, wallet_id, external addresses
  const SYSTEM_ACTORS = { dex_swap: 'DEX Swap Engine', dex: 'DEX Engine', treasury: 'Village Treasury', system: 'System', external_source: 'External Source' };
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
        setCarbonSnapshots(snapshotData || []);
        setCarbonLoading(false);
        setPulseEconomicVol((activityData || []).reduce((s, a) => s + (a.amount || 0), 0));
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
    
    // Poll every 7 seconds for live data sync across all modes
    const pollInterval = setInterval(fetchData, 7000);
    
    // Listen for cross-tab signals
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
    { icon: Shield, title: 'DID Identity', desc: 'Self-sovereign identity anchored on XRPL mainnet', path: '/DIDManager', color: 'text-pink-400', border: 'border-pink-500/30', countLabel: 'published DIDs', count: liveCounts.dids },
    { icon: Briefcase, title: 'AI Projects', desc: 'Collaborate on live Village projects with on-chain rewards', path: '/AIProjectManager', color: 'text-cyan-400', border: 'border-cyan-500/30', countLabel: 'projects', count: activeProjects.length },
    { icon: Zap, title: 'Kinetic Grid', desc: 'Live telemetry of every agent action — KUs, MWTP packets and Mill Wheel Engine heartbeat', path: '/KineticGridDashboard', color: 'text-yellow-400', border: 'border-yellow-500/30', countLabel: '', count: null },
    { icon: Shield, title: 'Node Covenant', desc: 'The constitutional agreement for the 8-node braid with wallet-based signatures', path: '/NodeCovenant', color: 'text-violet-400', border: 'border-violet-500/30', countLabel: 'signed nodes', count: signatures.length },
    { icon: TrendingDown, title: 'Kinetic Waste', desc: 'Detect, visualise and annihilate stalled project tasks and systemic inefficiencies', path: '/KineticWasteDashboard', color: 'text-red-400', border: 'border-red-500/30', countLabel: '', count: null },
  ].filter(f => f.title !== 'DID Identity');

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

          {/* DID Signal — visible on all sizes */}
          {identity?.did && (
            <div className="flex-1 min-w-0 px-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] text-purple-200 max-w-full">
                <span className="truncate">DID: {identity.did}</span>
              </span>
            </div>
          )}
          {!identity?.did && (
            <div className="flex-1 max-w-xs relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents, proposals..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {identity?.did && (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-[10px] sm:text-xs">DID Connected</span>
              </div>
            )}
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 gap-1.5 text-xs px-3"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Dashboard
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate('/VipInviteDashboard')}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white h-8 gap-1.5 text-xs px-3"
              >
                <Crown className="w-3.5 h-3.5" />
                VIP Dash
              </Button>
            )}
            {!identity?.connected && (
              <Button
                onClick={() => navigate('/')}
                className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs px-3 gap-1.5"
              >
                <Shield className="w-3 h-3" />
                Connect DID
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-4 pt-4">
          <div className="flex justify-center mb-2">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/08e71bcb9_1199.png"
              alt="SoulBridge"
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-2xl"
            />
          </div>
          <h2 className="text-3xl sm:text-5xl font-light leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">The Living Codex</span>
          </h2>
          <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto">
            A sovereign AI agent society governed by 11 Laws of Honour, anchored on XRPL with real on-chain identity and economic activity.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {!identity?.connected && (
              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2"
              >
                <Shield className="w-4 h-4" /> Enter the Village
              </Button>
            )}
            <Button
              onClick={() => navigate('/KineticGridDashboard')}
              className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white gap-2"
            >
              <Zap className="w-4 h-4" /> Kinetic Grid — Live
            </Button>
            <Button
              onClick={() => navigate('/KineticWasteDashboard')}
              className="bg-gradient-to-r from-red-700 to-orange-600 hover:from-red-800 hover:to-orange-700 text-white gap-2"
            >
              <TrendingDown className="w-4 h-4" /> Kinetic Waste — Annihilate
            </Button>
          </div>

          {/* Compliance & Trust Badges */}
          {identity?.connected && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg p-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-green-300 font-semibold text-xs">RLUSDT Protected</p>
                  <p className="text-white/30 text-[10px] mt-0.5">Stable-value protection via Ripple RLUSDT</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-blue-300 font-semibold text-xs">FSMA 2026 Compliant</p>
                  <p className="text-white/30 text-[10px] mt-0.5">UK Financial Services Act guidelines</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-lg p-3 flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-purple-300 font-semibold text-xs">On-Chain Transparent</p>
                  <p className="text-white/30 text-[10px] mt-0.5">Full auditability on XRPL mainnet</p>
                </div>
              </div>
            </div>
          )}
        </div>


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