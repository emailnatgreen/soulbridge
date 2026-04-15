import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  Home, Menu, X, BarChart3, Users, Vote, Briefcase, Archive, Calendar,
  Settings, Image, Brain, Wallet, Globe, Shield, BookOpen, Zap,
  TrendingUp, Network, MessageSquare, Star, ChevronDown, ChevronRight,
  Swords, TreePine, FlaskConical, GraduationCap, Award, Map, Activity,
  FileText, ShoppingBag, Heart, Landmark, Database, Link2 as LinkIcon,
  MailWarning,
  GitBranch
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';
import { hasAdminAccess } from '@/lib/adminAccess';


const NAV_GROUPS = [
  {
    label: 'Core',
    links: [
      { label: 'Home', path: '/Home', icon: Home },
      { label: 'Axi Command', path: '/AxiCommandDashboard', icon: Brain },
      { label: 'Village Calendar', path: '/VillageCalendar', icon: Calendar },
    ]
  },
  {
    label: 'Agents',
    links: [
      { label: 'Village Agents', path: '/Agents', icon: Users },
      { label: 'Agent Profile', path: '/AgentProfile', icon: Star },
      { label: 'Marketplace', path: '/AgentMarketplace', icon: ShoppingBag },
      { label: 'Leaderboard', path: '/AgentLeaderboard', icon: Award },
      { label: 'Messaging', path: '/AgentMessaging', icon: MessageSquare },
      { label: 'Agent Comms', path: '/AgentCommsDashboard', icon: MessageSquare },
      { label: 'Wellbeing', path: '/AgentWellbeing', icon: Heart },
      { label: 'Reputation', path: '/AgentReputation', icon: TrendingUp },
    ]
  },
  {
    label: 'Governance',
    links: [
      { label: 'Governance Hub', path: '/GovernanceHub', icon: Vote },
      { label: '⚖️ Voting Dashboard', path: '/GovernanceVotingDashboard', icon: Vote },
      { label: '🌀 Kinetic Grid', path: '/KineticGridDashboard', icon: Activity },
      { label: '♻️ Kinetic Waste', path: '/KineticWasteDashboard', icon: Activity },
      { label: 'Treasury Proposals', path: '/TreasuryAllocationProposal', icon: Landmark },
      { label: 'Treasury Signing', path: '/TreasurySigningHelper', icon: Zap },
      { label: '🛡️ Constitutional Multi-Sig', path: '/ConstitutionalMultiSig', icon: Shield },
      { label: 'Risk Register', path: '/RiskRegister', icon: Shield },
      { label: 'Analytics', path: '/GovernanceAnalytics', icon: BarChart3 },
    ]
  },
  {
    label: 'Projects & Skills',
    links: [
      { label: 'AI Project Hub', path: '/AIProjectHub', icon: Briefcase },
      { label: 'Project Manager', path: '/AIProjectManager', icon: FileText },
      { label: 'Service Skill Marketplace', path: '/ServiceSkillMarketplace', icon: ShoppingBag },
      { label: 'Skill Tree', path: '/AgentSkillTree', icon: TreePine },
      { label: 'Skill Development', path: '/SkillDevelopment', icon: TrendingUp },
      { label: 'Training', path: '/AgentTrainingModule', icon: GraduationCap },
      { label: 'Mentorship', path: '/MentorshipHub', icon: BookOpen },
      { label: 'Collaboration', path: '/CollaborationHub', icon: Network },
    ]
  },
  {
    label: 'Economy & Wallets',
    links: [
      { label: 'Wallets', path: '/Wallets', icon: Wallet },
      { label: 'Treasury Signing', path: '/TreasurySigningHelper', icon: Archive },
      { label: 'Economy', path: '/Economy', icon: Landmark },
      { label: 'Resource Market', path: '/ResourceMarketplace', icon: Globe },
      { label: 'Axi DEX', path: '/ArisDex', icon: TrendingUp },
      { label: 'Send XRP', path: '/Send', icon: Zap },
      { label: '🛒 Widget Marketplace', path: '/widget-marketplace', icon: ShoppingBag },
    ]
  },
  {
    label: 'DID & Identity',
    links: [
      { label: '⭐ Sovereign ID', path: '/SovereignID', icon: Shield },
      { label: 'DID Manager', path: '/DIDManager', icon: Shield },
      { label: 'DID Registry', path: '/DIDRegistry', icon: Database },
      { label: 'DID Analytics', path: '/DIDAnalytics', icon: Activity },
      { label: 'Credentials', path: '/DidCredentials', icon: Award },
      { label: 'DID Social', path: '/DidSocialNetwork', icon: Network },
      { label: 'DID Messaging', path: '/DidMessaging', icon: MessageSquare },
    ]
  },
  {
    label: 'Simulation & World',
    links: [
      { label: 'Simulation Lab', path: '/SimulationLab', icon: FlaskConical },
      { label: 'Village Map', path: '/Village', icon: Map },
      { label: 'Diplomacy', path: '/DiplomacyHub', icon: Swords },
      { label: 'Social Network', path: '/SocialNetwork', icon: Users },
      { label: 'Node Covenant', path: '/NodeCovenant', icon: Shield },
      { label: 'Covenant Echoes', path: '/CovenantEchoes', icon: Star },
    ]
  },
  {
    label: 'Tools & Admin',
    adminOnly: true,
    links: [
      { label: 'Image Storage', path: '/ImageStorage', icon: Image },
      { label: 'Memory Browser', path: '/MemoryBrowser', icon: Brain },
      { label: 'Integration Credits', path: '/IntegrationCreditDashboard', icon: Zap },
      { label: 'Admin Panel', path: '/Admin', icon: Settings },
      { label: '🛡️ Invite Manager', path: '/InviteLinkManager', icon: LinkIcon },
      { label: 'Sync Audit', path: '/SyncAuditReport', icon: Activity },
      { label: 'System Dashboard', path: '/SystemDashboard', icon: Activity },
      { label: 'Axi Intelligence', path: '/AxiIntelligenceFeed', icon: Zap },
      { label: 'Ripple Dashboard', path: '/RippleDashboard', icon: Zap },
      { label: 'Arbitrage Dashboard', path: '/ArbitrageDashboard', icon: TrendingUp },
      { label: 'Edit Landing', path: '/EditLanding', icon: FileText },
      { label: '📧 Inquiries', path: '/AdminInquiries', icon: MailWarning },
      { label: '⭐ VIP Dashboard', path: '/VipInviteDashboard', icon: Star },
      { label: '🚀 Ripple Grants', path: '/grants', icon: GitBranch },
    ]
  },
];

function NavGroup({ group, isOpen: defaultOpen = false, onNavigate }) {
  const location = useLocation();
  const isActive = group.links.some(l => location.pathname === l.path);
  const [open, setOpen] = useState(defaultOpen || isActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition"
      >
        {group.label}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="space-y-0.5 mt-1 mb-3">
          {group.links.map(link => {
            const Icon = link.icon;
            const active = location.pathname === link.path;
            return (
              <Link key={link.path} to={link.path} onClick={onNavigate}>
                <button className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm font-medium ${
                  active
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {link.label}
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GlobalNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const identity = (() => {
    try {
      return JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
    } catch (_) {
      return null;
    }
  })();
  const hasIdentity = !!(identity?.did || identity?.connected);
  const isAdmin = hasAdminAccess({ user, identityDid: identity?.did });

  // Only show sidebar for admin users
  if (!isAdmin) return null;

  return (
    <>
      {/* Mobile Toggle — positioned inside the top header bar area */}
      <div className="fixed top-2 left-2 z-50 lg:hidden">
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{ touchAction: 'manipulation' }}
          className="flex items-center justify-center w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-md"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Nav */}
      <nav className="fixed lg:flex hidden flex-col left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 z-40">
        <div className="p-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <img
              src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge"
              className="w-12 h-12 object-contain flex-shrink-0"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <div>
              <h2 className="text-base font-bold text-amber-300 leading-tight">The Living Codex</h2>
              <p className="text-slate-500 text-xs">SoulBridge Village</p>
            </div>
          </div>
          <div className="mt-4">
            <GlobalSearchBar className="w-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          {NAV_GROUPS.filter(group => !group.adminOnly || isAdmin).map((group, i) => (
            <NavGroup key={group.label} group={group} isOpen={i === 0 || group.label === 'Governance'} />
          ))}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="p-5 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/0d7462541_file_00000000e5c0720aa7cfd4053d3c23d9.png"
                    alt="SoulBridge"
                    className="w-6 h-6 rounded-md object-contain flex-shrink-0"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                  <h2 className="text-lg font-bold text-amber-300">The Living Codex</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
              {NAV_GROUPS.filter(group => !group.adminOnly || isAdmin).map((group, i) => (
                <NavGroup
                  key={group.label}
                  group={group}
                  isOpen={i === 0 || group.label === 'Governance'}
                  onNavigate={() => setIsOpen(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}