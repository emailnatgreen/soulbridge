import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Plus, MessageCircle, Users, Shield, BarChart3, Map, BookOpen, Sparkles, GraduationCap, ShoppingCart, Target, Award, FileText, Brain, Factory, Heart, Edit, Network, Lock, ChevronDown, Laugh, Vote, CheckCircle, ExternalLink, ShieldAlert, Zap, Scale, ClipboardList, Globe, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const [error, setError] = React.useState(null);
  usePageSignal();

  React.useEffect(() => {
    window.addEventListener('error', (e) => {
      setError(e.error?.message || 'An error occurred');
    });
  }, []);

  // ─── SoulBridge Nervous System — Step 1: new_user signal ───────
  React.useEffect(() => {
    const fired = sessionStorage.getItem('sb_new_user_signal');
    if (fired) return;
    sessionStorage.setItem('sb_new_user_signal', '1');

    const rawSignal = { signal_type: 'new_user', page_id: 'home', user_action: 'enter' };
    console.log('[SoulBridge] Emitting signal:', rawSignal);

    // Delay dispatch so Layout's event listener is guaranteed to be mounted
    setTimeout(() => {
      base44.functions.invoke('signalProcessor', rawSignal)
        .then(res => {
          console.log('[SoulBridge] Signal processed:', res.data);
          // Just open Axi — AxiChat manages its own conversation
          window.dispatchEvent(new CustomEvent('open-axi'));
        })
        .catch(err => {
          console.error('[SoulBridge] Signal error:', err);
          // Still open Axi even if signal fails
          window.dispatchEvent(new CustomEvent('open-axi'));
        });
    }, 1500);
  }, []);

  if (error) {
    return <div className="min-h-screen bg-white flex items-center justify-center p-4"><div className="text-red-600 max-w-lg"><h2 className="text-xl font-bold mb-2">Error Loading Page</h2><p>{error}</p></div></div>;
  }

  const STALE = 5 * 60 * 1000; // 5 min cache

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['agents-all'],
    queryFn: () => base44.entities.Agent.list(),
    staleTime: STALE,
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['governance-proposals-active'],
    queryFn: () => base44.entities.GovernanceProposal.filter({ status: 'active' }),
    staleTime: STALE,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ['did-credentials-active'],
    queryFn: () => base44.entities.DidCredential.filter({ status: 'active' }),
    staleTime: STALE,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets-home'],
    queryFn: () => base44.entities.Wallet.list(),
    staleTime: STALE,
  });

  const { data: trustLinks = [] } = useQuery({
    queryKey: ['trust-relationships'],
    queryFn: () => base44.entities.TrustRelationship.filter({ status: 'active' }),
    staleTime: STALE,
  });

  const { data: mentorships = [] } = useQuery({
    queryKey: ['mentorships-active'],
    queryFn: () => base44.entities.MentorshipRelationship.filter({ status: 'active' }),
    staleTime: STALE,
  });

  const { data: wellbeings = [] } = useQuery({
    queryKey: ['agent-wellbeing'],
    queryFn: () => base44.entities.AgentWellbeing.list(),
    staleTime: STALE,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks-all'],
    queryFn: () => base44.entities.RiskRegister.list(),
    staleTime: STALE,
  });

  const { data: jokeSubmissions = [] } = useQuery({
    queryKey: ['joke-submissions'],
    queryFn: () => base44.entities.JokeSubmission.list(),
    staleTime: STALE,
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
    <div className="min-h-screen bg-white relative pb-20 md:pb-0">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'none'
        }}
      />
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between">
              <MobileNav />
              <h1 className="text-xl font-semibold text-gray-900">
                SoulBridge
              </h1>
              <NotificationCenter agentId="axi_main_001" />
            </div>
            
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-gray-900 mb-1">
                  SoulBridge <span className="font-semibold">Village</span>
                </h1>
                <p className="text-sm text-blue-600/70">The Living Codex</p>
              </div>
              <div className="flex items-center gap-3">
                <DidAuthStatus />
                <PrivacyQuickToggle />
                <NotificationCenter agentId="axi_main_001" />
                <AskAxiButton
                  label="Ask Axi"
                  context="Nathan is on the SoulBridge Dashboard. Please give him a brief Village morning briefing: treasury balance, any urgent notifications, active governance proposals needing votes, and which agents need your attention today."
                />
                <Link to={createPageUrl('MemoryBrowser')}>
                  <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 gap-2">
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
                  <DropdownMenuContent className="bg-white border-gray-200 min-w-[220px]">
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
            
            {/* Navigation Menu - Desktop Only */}
            <nav className="hidden md:flex flex-wrap gap-2">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-semibold">🏠 Dashboard</Button>
              </Link>
              
              {/* Wallets & Payments */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-green-600 hover:bg-green-100 hover:text-green-700">
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallets <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Wallets')} className="cursor-pointer">Wallets</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('Send')} className="cursor-pointer">Send XRP</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('TransactionHistory')} className="cursor-pointer">Transaction History</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('SendRLUSD')} className="cursor-pointer">Send RLUSD</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('ReceiveRLUSD')} className="cursor-pointer">Receive RLUSD</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('RLUSDManager')} className="cursor-pointer">RLUSD Manager</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('MainnetMigration')} className="cursor-pointer">Mainnet Migration</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* DID System */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700">
                    <Shield className="w-4 h-4 mr-2" />
                    DID <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('DIDManager')} className="cursor-pointer">DID Manager</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('CreateDID')} className="cursor-pointer">Create DID</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DIDRegistry')} className="cursor-pointer">DID Registry</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidMessaging')} className="cursor-pointer">Messages</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidConnections')} className="cursor-pointer">Connections</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidSocialNetwork')} className="cursor-pointer">Social Network</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidActivityFeed')} className="cursor-pointer">Activity Feed</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidCredentials')} className="cursor-pointer">Credentials</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidReputation')} className="cursor-pointer">Reputation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidTrustGraph')} className="cursor-pointer">Trust Graph</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidPrivacy')} className="cursor-pointer">Privacy Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidPrivacyAnalytics')} className="cursor-pointer">Privacy Analytics</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DIDAnalytics')} className="cursor-pointer">DID Analytics</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DidProtectedDemo')} className="cursor-pointer">Protected Demo</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Agents */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-purple-600 hover:bg-purple-100 hover:text-purple-700">
                    <Users className="w-4 h-4 mr-2" />
                    Agents <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Agents')} className="cursor-pointer">All Agents</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('Axi')} className="cursor-pointer">Talk to Axi</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DirectAgentChat')} className="cursor-pointer">Direct Chat</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DeepSeek')} className="cursor-pointer">DeepSeek</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentRolePermissions')} className="cursor-pointer">Role & Permissions</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Governance */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-purple-600 hover:bg-purple-100 hover:text-purple-700">
                    <Shield className="w-4 h-4 mr-2" />
                    Governance <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('GovernanceHub')} className="cursor-pointer">Governance Hub</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('GovernanceSimulation')} className="cursor-pointer">Gov Simulation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('CovenantEchoes')} className="cursor-pointer">Covenant Echoes</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Projects */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 hover:text-blue-700">
                    <Target className="w-4 h-4 mr-2" />
                    Projects <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('AIProjectManager')} className="cursor-pointer">AI Projects</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AIProjectHub')} className="cursor-pointer">Project Hub</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('ProjectTemplates')} className="cursor-pointer">Templates</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('ProjectAnalytics')} className="cursor-pointer">Analytics</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('CollaborationHub')} className="cursor-pointer">Collaboration Hub</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('CollaborationSuite')} className="cursor-pointer">Collaboration Suite</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('TaskDelegation')} className="cursor-pointer">Task Delegation</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Skills & Training */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Skills <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('SkillDevelopment')} className="cursor-pointer">Skill Development</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('SkillValidation')} className="cursor-pointer">Skill Validation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('SkillEndorsements')} className="cursor-pointer">Endorsements</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentSkillTree')} className="cursor-pointer">Skill Trees</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentTrainingModule')} className="cursor-pointer">Training</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('TrainingSimulation')} className="cursor-pointer">Training Simulation</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Economy */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-amber-600 hover:bg-amber-100 hover:text-amber-700">
                    <Wallet className="w-4 h-4 mr-2" />
                    Economy <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Economy')} className="cursor-pointer">Economy</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('TreasuryDashboard')} className="cursor-pointer">Treasury Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('ResourceMarketplace')} className="cursor-pointer">Resource Marketplace</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentMarketplace')} className="cursor-pointer">Agent Marketplace</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('ResourceDynamics')} className="cursor-pointer">Resource Dynamics</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('ProductionHub')} className="cursor-pointer">Production Hub</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Social */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-pink-600 hover:bg-pink-100 hover:text-pink-700">
                    <Users className="w-4 h-4 mr-2" />
                    Social <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('SocialNetwork')} className="cursor-pointer">Social Network</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('SocialCapitalDashboard')} className="cursor-pointer">Social Capital</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('RelationshipNetwork')} className="cursor-pointer">Relationships</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('MentorshipHub')} className="cursor-pointer">Mentorship</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('DialogueStudio')} className="cursor-pointer">Dialogue Studio</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DiplomacyHub')} className="cursor-pointer">Diplomacy</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentReputation')} className="cursor-pointer">Reputation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentWellbeing')} className="cursor-pointer">Wellbeing</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Village & Simulation */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-green-600 hover:bg-green-100 hover:text-green-700">
                    <Map className="w-4 h-4 mr-2" />
                    Village <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Village')} className="cursor-pointer">Village</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('VillageSimulation')} className="cursor-pointer">Village Simulation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('SimulationLab')} className="cursor-pointer">Simulation Lab</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Analytics */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border-gray-200">
                  <DropdownMenuItem asChild><Link to={createPageUrl('SystemDashboard')} className="cursor-pointer">Village Pulse</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentPerformanceAnalytics')} className="cursor-pointer">Agent Performance</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('KnowledgeSynthesis')} className="cursor-pointer">AI Synthesis</Link></DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem asChild><Link to={createPageUrl('AlignmentDashboard')} className="cursor-pointer">⚖ Alignment & Safety</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to={createPageUrl('RippleDashboard')}>
                <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 hover:text-blue-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Ripple Dashboard
                </Button>
              </Link>

              <Link to={createPageUrl('ArbitrageDashboard')}>
                <Button variant="ghost" className="text-amber-600 hover:bg-amber-100 hover:text-amber-700">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Arbitrage Dashboard
                </Button>
              </Link>

              <Link to={createPageUrl('EditLanding')}>
                <Button variant="ghost" className="text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Landing
                </Button>
              </Link>

              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" className="text-red-600 hover:bg-red-100 hover:text-red-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* DUAA 2025 Green Light Banner */}
        <div className="mb-4">
          <Link to={createPageUrl('CertificateOfSovereignty')}>
            <div className="flex items-center gap-3 px-5 py-3 bg-green-50 border border-green-300 rounded-xl hover:bg-green-100 transition-all cursor-pointer">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-green-800">🟢 DUAA 2025 — Full Compliance: Green Light</span>
                <span className="text-green-700 text-sm ml-2">Certificate of Sovereignty issued · Zoe confirms: "Refined Vintage" ✓</span>
              </div>
              <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0" />
            </div>
          </Link>
        </div>

        {/* Ripple Compliance Banner */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-300 hover:border-blue-400 transition-all">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-gray-900 font-bold text-lg">Ripple Spring 2026 — Compliance Ready</h3>
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-300">● LIVE</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> XLS-70 Identity (Nathan Green)</span>
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> XLS-80 VIP Passport</span>
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> XLS-70 Treasury Auth</span>
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> XLS-70 AI Agent Auth (Axi)</span>
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> 3 DIDs On-Chain</span>
                      <span className="flex items-center gap-1 text-blue-600"><CheckCircle className="w-3 h-3 text-green-600" /> soulbridge.app Permissioned Domain</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link to={createPageUrl('DIDManager')}>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                      <Shield className="w-4 h-4" /> DID Manager
                    </button>
                  </Link>
                  <Link to={createPageUrl('DidCredentials')}>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                      <Award className="w-4 h-4" /> Credentials
                    </button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Quick Access */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-gray-900 text-xl font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link to={createPageUrl('DIDManager')}>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 hover:border-blue-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-300 font-semibold">{trustLinks.length || 3} Trust Links</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">DID Manager</h3>
                  <p className="text-gray-600 text-sm">Manage your on-chain identities</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidCredentials')}>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 hover:border-purple-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Award className="w-8 h-8 text-purple-600" />
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-300 font-semibold">{credentials.length} Active</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">DID Credentials</h3>
                  <p className="text-gray-600 text-sm">{credentials.length} Ripple-compliant credential{credentials.length !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidTrustGraph')}>
              <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300 hover:border-cyan-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Network className="w-8 h-8 text-cyan-600" />
                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-300 font-semibold">{trustLinks.length} Links</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">DID Trust Network</h3>
                  <p className="text-gray-600 text-sm">Nathan ↔ Axi trust chain · 100% score</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MentorshipHub')}>
              <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-300 hover:border-pink-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Users className="w-8 h-8 text-pink-600" />
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-300 font-semibold">{mentorships.length} Active</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">AI Mentorship</h3>
                  <p className="text-gray-600 text-sm">{mentorships.length} active relationship{mentorships.length !== 1 ? 's' : ''} running</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('GovernanceHub')}>
              <Card className={`bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 hover:border-purple-400 transition-all cursor-pointer h-full ${proposals.length > 0 ? 'ring-1 ring-purple-300' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Vote className="w-8 h-8 text-purple-600" />
                    {proposals.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-300 font-semibold animate-pulse">{proposals.length} Need Vote</span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Governance Hub</h3>
                  <p className="text-gray-600 text-sm">{proposals.length} active proposal{proposals.length !== 1 ? 's' : ''} awaiting votes</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('CovenantEchoes')}>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 hover:border-purple-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-300 font-semibold">11 Laws</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Covenant Echoes</h3>
                  <p className="text-gray-600 text-sm">Document our Living Laws</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('EnhancedSkillTrees')}>
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 hover:border-indigo-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <GraduationCap className="w-8 h-8 text-indigo-600" />
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-300 font-semibold">{activeAgents.length} Agents</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Enhanced Skill Trees</h3>
                  <p className="text-gray-600 text-sm">AI-powered skill development</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AgentOrchestration')}>
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 hover:border-indigo-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Network className="w-8 h-8 text-indigo-600" />
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-300 font-semibold">{activeAgents.length} Active</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Agent Orchestration</h3>
                  <p className="text-gray-600 text-sm">{activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} in the workforce</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('LaughterLoom')}>
              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 hover:border-yellow-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Laugh className="w-8 h-8 text-yellow-600" />
                    {jokeSubmissions.length > 0 && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-300 font-semibold">{jokeSubmissions.length} Entries</span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Laughter Loom 😄</h3>
                  <p className="text-gray-600 text-sm">{jokeSubmissions.length > 0 ? `${jokeSubmissions.length} joke${jokeSubmissions.length !== 1 ? 's' : ''} submitted` : 'AI Joke Competition'}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('WellbeingMonitor')}>
              <Card className={`bg-gradient-to-br from-pink-50 to-purple-50 border-pink-300 hover:border-pink-400 transition-all cursor-pointer h-full ${unhealthyAgents.length > 0 ? 'ring-1 ring-red-300' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Heart className="w-8 h-8 text-pink-600" />
                    {avgHarmony !== null ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${avgHarmony >= 70 ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>{avgHarmony}% Harmony</span>
                    ) : (
                      <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-300 font-semibold">Monitor</span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Well-being Monitor</h3>
                  <p className="text-gray-600 text-sm">{unhealthyAgents.length > 0 ? `${unhealthyAgents.length} agent${unhealthyAgents.length !== 1 ? 's' : ''} need attention` : 'All agents healthy'}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('RiskRegister')}>
              <Card className={`bg-gradient-to-br from-red-50 to-orange-50 border-red-300 hover:border-red-400 transition-all cursor-pointer h-full ${criticalRisks.length > 0 ? 'ring-1 ring-red-400' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                    {criticalRisks.length > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300 font-semibold">{criticalRisks.length} High+</span>
                    )}
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Risk Register</h3>
                  <p className="text-gray-600 text-sm">{risks.length} risk{risks.length !== 1 ? 's' : ''} tracked · {criticalRisks.length} critical/high</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AxiIntelligenceFeed')}>
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 hover:border-indigo-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Globe className="w-8 h-8 text-indigo-600" />
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-300 font-semibold">IET · Live</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Axi Intelligence</h3>
                  <p className="text-gray-600 text-sm">AI ecosystem · regulatory monitoring</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('VillageReportingDashboard')}>
              <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-300 hover:border-blue-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <ClipboardList className="w-8 h-8 text-blue-600" />
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-300 font-semibold">Daily Report</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Village Reports</h3>
                  <p className="text-gray-600 text-sm">Automated daily performance synthesis</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('ArisDex')}>
              <Card className="bg-gradient-to-br from-[#0d1226] to-[#1a0a2e] border-purple-800 hover:border-purple-500 transition-all cursor-pointer h-full shadow-lg shadow-purple-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                    <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700 font-semibold">⚡ LIVE</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">Ari's DEX</h3>
                  <p className="text-purple-300/70 text-sm">Trade Crypto · FX · Commodities · DeFi</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AlignmentDashboard')}>
              <Card className="bg-gradient-to-br from-indigo-50 to-slate-50 border-indigo-400 hover:border-indigo-500 transition-all cursor-pointer h-full ring-1 ring-indigo-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Scale className="w-8 h-8 text-indigo-600" />
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-300 font-semibold">Triple-Lock</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Alignment & Safety</h3>
                  <p className="text-gray-600 text-sm">Harmony Agent · Anti-Sycophancy · Drift Detection</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MemoryBrowser')}>
              <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 hover:border-violet-400 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Brain className="w-8 h-8 text-violet-600" />
                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-300 font-semibold">Verified Truth</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-1">Memory Browser</h3>
                  <p className="text-gray-600 text-sm">Verify Axi's persisted memories</p>
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