import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Wallet, Plus, Users, Shield, Brain, Heart, Network, ChevronDown, Laugh, Vote, CheckCircle, ExternalLink, ShieldAlert, Zap, Scale, ClipboardList, Globe, TrendingUp, LogOut, Award, GraduationCap, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import HomeRecentTransactions from '../components/HomeRecentTransactions';
import AskAxiButton from '../components/AskAxiButton';
import NotificationCenter from '../components/NotificationCenter';
import PrivacyQuickToggle from '../components/PrivacyQuickToggle';
import MobileNav from '../components/MobileNav';
import MobileBottomNav from '../components/MobileBottomNav';
import DidAuthStatus from '../components/DidAuthStatus';
import ShieldedWalletBalance from '../components/ShieldedWalletBalance';
import TreasuryMonitor from '../components/TreasuryMonitor';
import DidActivationPipeline from '../components/DidActivationPipeline';
import GuidedTour from '../components/onboarding/GuidedTour';

export default function Home() {
  usePageSignal();

  const [didConnected, setDidConnected] = useState(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  });

  const navigate = useNavigate();

  const handleDisconnectDID = () => {
    localStorage.removeItem('soulbridge_identity');
    localStorage.removeItem('sb_public_conv_id');
    if (window.__soulbridge) delete window.__soulbridge.identity;
    setDidConnected(null);
    navigate('/');
  };

  const handleSignOut = () => {
    localStorage.removeItem('soulbridge_identity');
    localStorage.removeItem('sb_public_conv_id');
    if (window.__soulbridge) delete window.__soulbridge.identity;
    base44.auth.logout('/');
  };

  // Removed global error listener — it was catching unrelated XRPL/backend errors
  // and causing a white screen on rate limit errors.

  // Open Axi on desktop after brief delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (window.innerWidth >= 768) {
        window.dispatchEvent(new CustomEvent('open-axi'));
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const STALE = 10 * 60 * 1000; // 10 min cache
  const RETRY_OPTS = { retry: 1, retryDelay: 3000 };

  // Tier 1 — load immediately (critical)
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-all'],
    queryFn: () => base44.entities.Agent.list(),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-home'],
    queryFn: () => base44.entities.Wallet.list(),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['governance-proposals-active'],
    queryFn: () => base44.entities.GovernanceProposal.filter({ status: 'active' }),
    staleTime: STALE, ...RETRY_OPTS,
  });

  // Tier 2 — deferred by 1s to avoid burst
  const { data: credentials = [] } = useQuery({
    queryKey: ['did-credentials-active'],
    queryFn: () => new Promise(r => setTimeout(r, 1000)).then(() => base44.entities.DidCredential.filter({ status: 'active' })),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: wellbeings = [] } = useQuery({
    queryKey: ['agent-wellbeing'],
    queryFn: () => new Promise(r => setTimeout(r, 1500)).then(() => base44.entities.AgentWellbeing.list()),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks-all'],
    queryFn: () => new Promise(r => setTimeout(r, 2000)).then(() => base44.entities.RiskRegister.list()),
    staleTime: STALE, ...RETRY_OPTS,
  });

  // Tier 3 — deferred by 3s (badge-only, low priority)
  const { data: trustLinks = [] } = useQuery({
    queryKey: ['trust-relationships'],
    queryFn: () => new Promise(r => setTimeout(r, 3000)).then(() => base44.entities.TrustRelationship.filter({ status: 'active' })),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: mentorships = [] } = useQuery({
    queryKey: ['mentorships-active'],
    queryFn: () => new Promise(r => setTimeout(r, 3500)).then(() => base44.entities.MentorshipRelationship.filter({ status: 'active' })),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const { data: jokeSubmissions = [] } = useQuery({
    queryKey: ['joke-submissions'],
    queryFn: () => new Promise(r => setTimeout(r, 4000)).then(() => base44.entities.JokeSubmission.list()),
    staleTime: STALE, ...RETRY_OPTS,
  });

  const sendableWallets = wallets.filter(w => w.classic_address && w.network === 'mainnet');

  const activeAgents = agents.filter(a => a.status === 'active');
  const criticalRisks = risks.filter(r => r.severity === 'Critical' || r.severity === 'High');
  const unhealthyAgents = wellbeings.filter(w => w.wellbeing_status !== 'healthy');
  const avgHarmony = wellbeings.length > 0
    ? Math.round(wellbeings.reduce((sum, w) => sum + (w.overall_wellbeing_score || 70), 0) / wellbeings.length)
    : null;

  const homeTourSteps = [
    { title: 'Welcome to SoulBridge Village!', content: 'This is your command dashboard. Here you can monitor agents, treasury, governance, and more at a glance.', target: null },
    { title: 'Quick Access Cards', content: 'These cards link to the most important features — DID Manager, Credentials, Governance, and more.', target: '.grid' },
    { title: 'Ask Axi', content: 'Click "Ask Axi" anytime to get an intelligent briefing or ask questions about the Village.', target: null },
    { title: 'Navigation', content: 'Use the top navigation menus to explore all sections: Wallets, DID, Agents, Governance, Skills, Economy, and more.', target: 'nav' },
  ];

  return (
    <>
    <GuidedTour steps={homeTourSteps} tourKey="home-dashboard-tour" />
    <TreasuryMonitor />
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative pb-20 md:pb-0">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <div className="flex-shrink-0">
                <MobileNav />
              </div>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <img
                  src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
                  alt="SoulBridge"
                  className="w-7 h-7 rounded-md object-contain flex-shrink-0"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                <h1 className="text-lg font-semibold text-white">
                  SoulBridge
                </h1>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Disconnect & go to Landing"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
                <NotificationCenter agentId="axi_main_001" />
              </div>
            </div>
            
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
                  alt="SoulBridge"
                  className="w-12 h-12 rounded-lg object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                />
                <div>
                  <h1 className="text-3xl font-light tracking-tight text-white">
                    SoulBridge
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg px-3 py-1.5 transition-colors"
                  title="Sign out and return to Landing"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
                <PrivacyQuickToggle />
                <NotificationCenter agentId="axi_main_001" />
                <Link to={createPageUrl('MemoryBrowser')}>
                  <Button variant="outline" className="border-violet-500/40 text-violet-300 hover:bg-white/10 gap-2">
                    <Brain className="w-4 h-4" />
                    Memory Browser
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/25 transition-all duration-300">
                      <Plus className="w-4 h-4 mr-2" />
                      Send XRP
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-900 border-white/10 text-white min-w-[220px]">
                    <DropdownMenuLabel className="text-xs text-gray-500">Send from wallet</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sendableWallets.length === 0 ? (
                      <DropdownMenuItem disabled>No mainnet wallets found</DropdownMenuItem>
                    ) : (
                      sendableWallets.map(w => (
                        <DropdownMenuItem key={w.id} asChild>
                          <Link to={`${createPageUrl('Send')}?from_wallet_id=${w.id}`} className="cursor-pointer flex justify-between gap-4">
                            <span className="font-medium">{w.name}</span>
                            <span className="text-gray-400 text-xs">{w.balance?.toFixed(2)} XRP</span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Send')} className="cursor-pointer text-blue-600">Choose manually →</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* DUAA 2025 Green Light Banner */}
        <div className="mb-4">
          <Link to={createPageUrl('CertificateOfSovereignty')}>
            <div className="flex items-center gap-3 px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition-all cursor-pointer">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-green-300">🟢 DUAA 2025 — Full Compliance: Green Light</span>
                <span className="text-green-400/80 text-sm ml-2">Certificate of Sovereignty issued · Zoe confirms: "Refined Vintage" ✓</span>
              </div>
              <ExternalLink className="w-4 h-4 text-green-400 flex-shrink-0" />
            </div>
          </Link>
        </div>

        {/* Ripple Compliance Banner */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-blue-900/30 backdrop-blur-xl border-blue-500/30 hover:border-blue-400/50 transition-all">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Shield className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">Ripple Spring 2026 — Compliance Ready</h3>
                      <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-500/30">● LIVE</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 Identity (Nathan Green)</span>
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-80 VIP Passport</span>
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 Treasury Auth</span>
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 AI Agent Auth (Axi)</span>
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> 3 DIDs On-Chain</span>
                      <span className="flex items-center gap-1 text-blue-300"><CheckCircle className="w-3 h-3 text-green-400" /> soulbridge.app Permissioned Domain</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link to={createPageUrl('DIDManager')}>
                    <button className="bg-blue-500/80 hover:bg-blue-500/60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-blue-400/30">
                      <Shield className="w-4 h-4" /> DID Manager
                    </button>
                  </Link>
                  <Link to={createPageUrl('DidCredentials')}>
                    <button className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-white/20">
                      <Award className="w-4 h-4" /> Credentials
                    </button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hero Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 sm:mb-12">
          <Link to={createPageUrl('AxiCommandDashboard')}>
            <Card className={`bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl border-indigo-500/40 hover:border-indigo-400/70 hover:bg-gradient-to-br hover:from-indigo-900/60 hover:to-purple-900/60 transition-all cursor-pointer h-full relative ${criticalRisks.length > 0 ? 'ring-1 ring-orange-500/40' : ''}`}>
              {criticalRisks.length > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold">{criticalRisks.length} Alerts</span>
                </div>
              )}
              <CardContent className="pt-8 pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Brain className="w-10 h-10 text-indigo-300" />
                    <h3 className="text-white font-bold text-2xl">Axi Command</h3>
                  </div>
                  <p className="text-white/70 text-base">Launch AI operations, access intelligence feeds, and orchestrate system-wide automations</p>
                  <div className="flex gap-2 pt-2">
                    <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/50">AI Orchestration</Badge>
                    <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/50">Real-time</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('VillageReportingDashboard')}>
            <Card className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-xl border-amber-500/40 hover:border-amber-400/70 hover:bg-gradient-to-br hover:from-amber-900/60 hover:to-orange-900/60 transition-all cursor-pointer h-full">
              <CardContent className="pt-8 pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-10 h-10 text-amber-300" />
                    <h3 className="text-white font-bold text-2xl">Daily Reports</h3>
                  </div>
                  <p className="text-white/70 text-base">Comprehensive village analytics, performance metrics, and automated daily synthesis reports</p>
                  <div className="flex gap-2 pt-2">
                    <Badge className="bg-amber-500/30 text-amber-200 border-amber-400/50">Analytics</Badge>
                    <Badge className="bg-orange-500/30 text-orange-200 border-orange-400/50">Automated</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('GovernanceHub')}>
            <Card className={`bg-gradient-to-br from-violet-900/50 to-purple-900/50 backdrop-blur-xl border-violet-500/40 hover:border-violet-400/70 hover:bg-gradient-to-br hover:from-violet-900/60 hover:to-purple-900/60 transition-all cursor-pointer h-full relative ${proposals.length > 0 ? 'ring-1 ring-orange-500/40' : ''}`}>
              {proposals.length > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold">{proposals.length} Active</span>
                </div>
              )}
              <CardContent className="pt-8 pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Vote className="w-10 h-10 text-violet-300" />
                    <h3 className="text-white font-bold text-2xl">Governance</h3>
                  </div>
                  <p className="text-white/70 text-base">Vote on proposals, manage community decisions, and shape the future of the Living Codex</p>
                  <div className="flex gap-2 pt-2">
                    <Badge className="bg-violet-500/30 text-violet-200 border-violet-400/50">Voting</Badge>
                    <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/50">Proposals</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Wallets')}>
            <Card className={`bg-gradient-to-br from-emerald-900/50 to-teal-900/50 backdrop-blur-xl border-emerald-500/40 hover:border-emerald-400/70 hover:bg-gradient-to-br hover:from-emerald-900/60 hover:to-teal-900/60 transition-all cursor-pointer h-full relative ${sendableWallets.length === 0 ? 'ring-1 ring-yellow-500/40' : ''}`}>
              {sendableWallets.length === 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30 font-semibold">⚠ No Mainnet</span>
                </div>
              )}
              <CardContent className="pt-8 pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-10 h-10 text-emerald-300" />
                    <h3 className="text-white font-bold text-2xl">Wallets</h3>
                  </div>
                  <p className="text-white/70 text-base">Manage XRP assets, send transactions, and control your digital wealth across networks</p>
                  <div className="flex gap-2 pt-2">
                    <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/50">XRP</Badge>
                    <Badge className="bg-teal-500/30 text-teal-200 border-teal-400/50">Transactions</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Featured Quick Access */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-white/80 text-xl font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link to={createPageUrl('DIDManager')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Shield className="w-8 h-8 text-blue-400" />
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30 font-semibold">{trustLinks.length || 3} Trust Links</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Manager</h3>
                  <p className="text-white/50 text-sm">Manage your on-chain identities</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidCredentials')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Award className="w-8 h-8 text-purple-400" />
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">{credentials.length} Active</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Credentials</h3>
                  <p className="text-white/50 text-sm">{credentials.length} Ripple-compliant credential{credentials.length !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidTrustGraph')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-cyan-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Network className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold">{trustLinks.length} Links</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Trust Network</h3>
                  <p className="text-white/50 text-sm">Nathan ↔ Axi trust chain · 100% score</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('Axi')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Brain className="w-8 h-8 text-blue-400" />
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">AI Chat</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Talk to Axi</h3>
                  <p className="text-white/50 text-sm">Direct conversation with your AI co-pilot</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AlignmentDashboard')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-rose-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Scale className="w-8 h-8 text-rose-400" />
                    <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 font-semibold">Safety</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Alignment & Safety</h3>
                  <p className="text-white/50 text-sm">System integrity, anti-sycophancy, drift detection</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MentorshipHub')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-pink-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Users className="w-8 h-8 text-pink-400" />
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30 font-semibold">{mentorships.length} Active</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">AI Mentorship</h3>
                  <p className="text-white/50 text-sm">{mentorships.length} active relationship{mentorships.length !== 1 ? 's' : ''} running</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('GovernanceHub')}>
              <Card className={`bg-white/5 backdrop-blur-xl border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all cursor-pointer h-full ${proposals.length > 0 ? 'ring-1 ring-orange-500/40' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Vote className="w-8 h-8 text-purple-400" />
                    {proposals.length > 0 && (
                      <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 font-semibold animate-pulse">{proposals.length} Need Vote</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1">Governance Hub</h3>
                  <p className="text-white/50 text-sm">{proposals.length} active proposal{proposals.length !== 1 ? 's' : ''} awaiting votes</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('CovenantEchoes')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-purple-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">11 Laws</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Covenant Echoes</h3>
                  <p className="text-white/50 text-sm">Document our Living Laws</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('EnhancedSkillTrees')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-indigo-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <GraduationCap className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">{activeAgents.length} Agents</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Enhanced Skill Trees</h3>
                  <p className="text-white/50 text-sm">AI-powered skill development</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AgentOrchestration')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-indigo-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Network className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30 font-semibold">{activeAgents.length} Active</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Agent Orchestration</h3>
                  <p className="text-white/50 text-sm">{activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} in the workforce</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('LaughterLoom')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-yellow-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Laugh className="w-8 h-8 text-yellow-400" />
                    {jokeSubmissions.length > 0 && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/30 font-semibold">{jokeSubmissions.length} Entries</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1">Laughter Loom 😄</h3>
                  <p className="text-white/50 text-sm">{jokeSubmissions.length > 0 ? `${jokeSubmissions.length} joke${jokeSubmissions.length !== 1 ? 's' : ''} submitted` : 'AI Joke Competition'}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('WellbeingMonitor')}>
              <Card className={`bg-white/5 backdrop-blur-xl border-white/10 hover:border-pink-400/50 hover:bg-white/10 transition-all cursor-pointer h-full ${unhealthyAgents.length > 0 ? 'ring-1 ring-red-500/40' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Heart className="w-8 h-8 text-pink-400" />
                    {avgHarmony !== null ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${avgHarmony >= 70 ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>{avgHarmony}% Harmony</span>
                    ) : (
                      <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30 font-semibold">Monitor</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1">Well-being Monitor</h3>
                  <p className="text-white/50 text-sm">{unhealthyAgents.length > 0 ? `${unhealthyAgents.length} agent${unhealthyAgents.length !== 1 ? 's' : ''} need attention` : 'All agents healthy'}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('RiskRegister')}>
              <Card className={`bg-white/5 backdrop-blur-xl border-white/10 hover:border-red-400/50 hover:bg-white/10 transition-all cursor-pointer h-full ${criticalRisks.length > 0 ? 'ring-1 ring-red-500/40' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                    {criticalRisks.length > 0 && (
                      <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-semibold">{criticalRisks.length} High+</span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-1">Risk Register</h3>
                  <p className="text-white/50 text-sm">{risks.length} risk{risks.length !== 1 ? 's' : ''} tracked · {criticalRisks.length} critical/high</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AxiIntelligenceFeed')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-indigo-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Globe className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">IET · Live</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Axi Intelligence</h3>
                  <p className="text-white/50 text-sm">AI ecosystem · regulatory monitoring</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('VillageReportingDashboard')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-blue-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <ClipboardList className="w-8 h-8 text-blue-400" />
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">Daily Report</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Village Reports</h3>
                  <p className="text-white/50 text-sm">Automated daily performance synthesis</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('ArisDex')}>
              <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-purple-500/30 hover:border-purple-400/60 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">⚡ LIVE</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Ari's DEX</h3>
                  <p className="text-white/50 text-sm">Trade Crypto · FX · Commodities · DeFi</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AlignmentDashboard')}>
              <Card className="bg-white/5 backdrop-blur-xl border-indigo-500/30 hover:border-indigo-400/60 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Scale className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">Triple-Lock</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Alignment & Safety</h3>
                  <p className="text-white/50 text-sm">Harmony Agent · Anti-Sycophancy · Drift Detection</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MemoryBrowser')}>
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:border-violet-400/50 hover:bg-white/10 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Brain className="w-8 h-8 text-violet-400" />
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30 font-semibold">Verified Truth</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Memory Browser</h3>
                  <p className="text-white/50 text-sm">Verify Axi's persisted memories</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* DID Activation Pipeline */}
        <div className="mb-8 sm:mb-12">
          <React.Suspense fallback={null}>
            <DidActivationPipeline />
          </React.Suspense>
        </div>

        {/* Shielded Wallet Balance */}
        <div className="mb-8 sm:mb-12">
          <React.Suspense fallback={null}>
            <ShieldedWalletBalance autoRefresh={false} refreshInterval={60000} />
          </React.Suspense>
        </div>

        {/* Live Transactions */}
        <HomeRecentTransactions />
      </div>
    </div>
    <MobileBottomNav />
  </>
  );
}