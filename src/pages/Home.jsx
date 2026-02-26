import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Plus, MessageCircle, Users, Shield, BarChart3, Map, BookOpen, Sparkles, GraduationCap, ShoppingCart, Target, Award, FileText, Brain, Factory, Heart, Edit, Network, Lock, ChevronDown, Laugh, Vote, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TransactionList from '../components/TransactionList';
import NotificationCenter from '../components/NotificationCenter';
import PrivacyQuickToggle from '../components/PrivacyQuickToggle';
import MobileNav from '../components/MobileNav';
import MobileBottomNav from '../components/MobileBottomNav';
import DidAuthStatus from '../components/DidAuthStatus';
import ShieldedWalletBalance from '../components/ShieldedWalletBalance';

export default function Home() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 50),
  });

  const stats = {
    total: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative pb-20 md:pb-0">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url(https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjk5N2E0MzE0ZWY4ODE5MTgzZmNiMWQ0ZDE1MmFjYmI6ZmlsZV8wMDAwMDAwMDI0MmM3MjQzOWRlNTkzY2NkYmJlNDhiZCIsInRzIjoiMjA1MDQiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc1NjZjNDYzYWVjODQxN2VjYjNkMDkwYzUzNTY1M2M0YmU2ZDI2MDBmYTdhNjJiMmNlNmY0OWRhNTAzZGEwZmMiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9)'
        }}
      />
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between">
              <MobileNav />
              <h1 className="text-xl font-semibold text-white">
                SoulBridge
              </h1>
              <NotificationCenter agentId="axi_main_001" />
            </div>
            
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                  SoulBridge <span className="font-semibold">Village</span>
                </h1>
                <p className="text-sm text-purple-300/60">Experimental AI Agent Research Platform</p>
              </div>
              <div className="flex items-center gap-3">
                <DidAuthStatus />
                <PrivacyQuickToggle />
                <NotificationCenter agentId="axi_main_001" />
                <Link to={createPageUrl('Send')}>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Send XRP
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Navigation Menu - Desktop Only */}
            <nav className="hidden md:flex flex-wrap gap-2">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-white hover:bg-white/10">Dashboard</Button>
              </Link>
              
              {/* Wallets & Payments */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300">
                    <Wallet className="w-4 h-4 mr-2" />
                    Wallets <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                    <Shield className="w-4 h-4 mr-2" />
                    DID <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-300">
                    <Users className="w-4 h-4 mr-2" />
                    Agents <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Agents')} className="cursor-pointer">All Agents</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('Axi')} className="cursor-pointer">Talk to Axi</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DirectAgentChat')} className="cursor-pointer">Direct Chat</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('DeepSeek')} className="cursor-pointer">DeepSeek</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Governance */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-300">
                    <Shield className="w-4 h-4 mr-2" />
                    Governance <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
                  <DropdownMenuItem asChild><Link to={createPageUrl('GovernanceHub')} className="cursor-pointer">Governance Hub</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('GovernanceSimulation')} className="cursor-pointer">Gov Simulation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('CovenantEchoes')} className="cursor-pointer">Covenant Echoes</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Projects */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-blue-300/80 hover:bg-blue-500/10 hover:text-blue-300">
                    <Target className="w-4 h-4 mr-2" />
                    Projects <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Skills <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300">
                    <Wallet className="w-4 h-4 mr-2" />
                    Economy <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-pink-300/80 hover:bg-pink-500/10 hover:text-pink-300">
                    <Users className="w-4 h-4 mr-2" />
                    Social <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
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
                  <Button variant="ghost" className="text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300">
                    <Map className="w-4 h-4 mr-2" />
                    Village <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
                  <DropdownMenuItem asChild><Link to={createPageUrl('Village')} className="cursor-pointer">Village</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('VillageSimulation')} className="cursor-pointer">Village Simulation</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('SimulationLab')} className="cursor-pointer">Simulation Lab</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Analytics */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-900 border-white/10">
                  <DropdownMenuItem asChild><Link to={createPageUrl('SystemDashboard')} className="cursor-pointer">Village Pulse</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('AgentPerformanceAnalytics')} className="cursor-pointer">Agent Performance</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('KnowledgeSynthesis')} className="cursor-pointer">AI Synthesis</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to={createPageUrl('EditLanding')}>
                <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Landing
                </Button>
              </Link>

              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" className="text-red-300/80 hover:bg-red-500/10 hover:text-red-300">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Ripple Compliance Banner */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 border-indigo-500/40 hover:border-indigo-400/60 transition-all">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Shield className="w-7 h-7 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">Ripple Spring 2026 — Compliance Ready</h3>
                      <span className="bg-green-500/20 text-green-300 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-500/30">● LIVE</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 Identity (Nathan Green)</span>
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-80 VIP Passport</span>
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 Treasury Auth</span>
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> XLS-70 AI Agent Auth (Axi)</span>
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> 3 DIDs On-Chain</span>
                      <span className="flex items-center gap-1 text-indigo-300"><CheckCircle className="w-3 h-3 text-green-400" /> soulbridge.app Permissioned Domain</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link to={createPageUrl('DIDManager')}>
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                      <Shield className="w-4 h-4" /> DID Manager
                    </button>
                  </Link>
                  <Link to={createPageUrl('DidCredentials')}>
                    <button className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2">
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
          <h2 className="text-white text-xl font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <Link to={createPageUrl('DIDManager')}>
              <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border-indigo-500/30 hover:border-indigo-400/60 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Shield className="w-8 h-8 text-indigo-400" />
                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-500/30 font-semibold">3 DIDs</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Manager</h3>
                  <p className="text-white/60 text-sm">Manage your on-chain identities</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidCredentials')}>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-400/60 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Award className="w-8 h-8 text-purple-400" />
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">XLS-70/80</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Credentials</h3>
                  <p className="text-white/60 text-sm">4 active Ripple-compliant credentials</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('DidTrustGraph')}>
              <Card className="bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border-cyan-500/30 hover:border-cyan-400/60 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <Network className="w-8 h-8 text-cyan-400" />
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold">Trust Graph</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">DID Trust Network</h3>
                  <p className="text-white/60 text-sm">Nathan ↔ Axi trust chain</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('MentorshipHub')}>
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Users className="w-8 h-8 text-pink-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">AI Mentorship</h3>
                  <p className="text-white/60 text-sm">Never alone, always growing together</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('GovernanceHub')}>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Vote className="w-8 h-8 text-purple-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Governance Hub</h3>
                  <p className="text-white/60 text-sm">Decentralized decision-making</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('CovenantEchoes')}>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Sparkles className="w-8 h-8 text-purple-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Covenant Echoes</h3>
                  <p className="text-white/60 text-sm">Document our Living Laws</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('EnhancedSkillTrees')}>
              <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <GraduationCap className="w-8 h-8 text-indigo-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Enhanced Skill Trees</h3>
                  <p className="text-white/60 text-sm">AI-powered skill development</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('AgentOrchestration')}>
              <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Network className="w-8 h-8 text-indigo-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Agent Orchestration</h3>
                  <p className="text-white/60 text-sm">Coordinate agent workforce</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('LaughterLoom')}>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Laugh className="w-8 h-8 text-yellow-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Laughter Loom 😄</h3>
                  <p className="text-white/60 text-sm">AI Joke Competition</p>
                </CardContent>
              </Card>
            </Link>

            <Link to={createPageUrl('WellbeingMonitor')}>
              <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all cursor-pointer h-full">
                <CardContent className="pt-6">
                  <Heart className="w-8 h-8 text-pink-400 mb-3" />
                  <h3 className="text-white font-semibold mb-1">Well-being Monitor</h3>
                  <p className="text-white/60 text-sm">Nurturing every soul</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Shielded Wallet Balance */}
        <div className="mb-8 sm:mb-12">
          <ShieldedWalletBalance autoRefresh={true} refreshInterval={30000} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-300/80">Total Volume</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">
                {stats.total.toFixed(2)} <span className="text-lg text-purple-300/60">XRP</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-300/80">Completed</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.completed}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-yellow-300/80">Pending</CardTitle>
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Activity className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={transactions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
    <MobileBottomNav />
  </>
  );
}