import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  Home, Menu, X, BarChart3, Users, Vote, Briefcase, Calendar,
  Settings, Image, Brain, Wallet, Shield, BookOpen, Zap,
  TrendingUp, TrendingDown, MessageSquare, Star, ChevronDown, ChevronRight,
  TreePine, FlaskConical, GraduationCap, Award, Map, Activity,
  FileText, ShoppingBag, Heart, Landmark, Link2 as LinkIcon,
  MailWarning, GitBranch
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';
import { hasAdminAccess } from '@/lib/adminAccess';


const NAV_GROUPS = [
  {
    label: 'Core',
    links: [
      { label: 'Home', path: '/home', icon: Home },
      { label: 'Dashboard', path: '/dashboard', icon: BarChart3 },
      { label: 'Axi Command', path: '/AxiCommandDashboard', icon: Brain },
      { label: 'Village Calendar', path: '/VillageCalendar', icon: Calendar },
    ]
  },
  {
    label: 'Agents',
    links: [
      { label: 'My Agent Hub', path: '/my-agents', icon: Star },
      { label: 'Village Agents', path: '/agents', icon: Users },
      { label: 'Agent Genesis', path: '/agent-genesis', icon: Star },
      { label: 'Agent Chat', path: '/AgentChat', icon: MessageSquare },
      { label: 'Leaderboard', path: '/leaderboard', icon: Award },
      { label: 'Skill Development', path: '/training', icon: GraduationCap },
      { label: 'Wellbeing', path: '/AgentWellbeing', icon: Heart },
    ]
  },
  {
    label: 'Governance',
    links: [
      { label: 'Governance Hub', path: '/GovernanceHub', icon: Vote },
      { label: 'Voting Dashboard', path: '/GovernanceVotingDashboard', icon: Vote },
      { label: 'Kinetic Grid', path: '/KineticGridDashboard', icon: Activity },
      { label: 'Kinetic Waste', path: '/KineticWasteDashboard', icon: TrendingDown },
      { label: 'Treasury Proposals', path: '/TreasuryAllocationProposal', icon: Landmark },
      { label: 'Treasury Signing', path: '/TreasurySigningHelper', icon: Zap },
      { label: 'Constitutional Multi-Sig', path: '/ConstitutionalMultiSig', icon: Shield },
    ]
  },
  {
    label: 'Projects & Skills',
    links: [
      { label: 'AI Project Hub', path: '/AIProjectHub', icon: Briefcase },
      { label: 'Project Manager', path: '/AIProjectManager', icon: FileText },
      { label: 'Marketplace', path: '/ServiceSkillMarketplace', icon: ShoppingBag },
      { label: 'Skill Tree', path: '/AgentSkillTree', icon: TreePine },
      { label: 'Mentorship', path: '/MentorshipHub', icon: BookOpen },
    ]
  },
  {
    label: 'Economy & Wallets',
    links: [
      { label: 'Wallets', path: '/Wallets', icon: Wallet },
      { label: 'Send XRP', path: '/Send', icon: Zap },
      { label: 'Seed Acorn', path: '/seed-golden-acorn', icon: Wallet },
      { label: 'Economy', path: '/Economy', icon: Landmark },
      { label: 'ETH RLUSD Treasury', path: '/eth-treasury', icon: Shield },
      { label: 'Widget Marketplace', path: '/widget-marketplace', icon: ShoppingBag },
      { label: 'Storefront', path: '/storefront', icon: ShoppingBag },
    ]
  },
  {
    label: 'DID & Identity',
    links: [
      { label: 'Sovereign ID', path: '/SovereignID', icon: Shield },
      { label: 'DID Manager', path: '/DIDManager', icon: Shield },
      { label: 'Credentials', path: '/DidCredentials', icon: Award },
    ]
  },
  {
    label: 'World & Simulation',
    links: [
      { label: 'Node Covenant', path: '/NodeCovenant', icon: Shield },
      { label: 'Simulation Lab', path: '/SimulationLab', icon: FlaskConical },
      { label: 'Village Map', path: '/Village', icon: Map },
    ]
  },
  {
    label: 'Admin Tools',
    adminOnly: true,
    links: [
      { label: 'Axi Intelligence', path: '/AxiIntelligenceFeed', icon: Zap },
      { label: 'Memory Browser', path: '/MemoryBrowser', icon: Brain },
      { label: 'Integration Credits', path: '/IntegrationCreditDashboard', icon: Zap },
      { label: 'Invite Manager', path: '/InviteLinkManager', icon: LinkIcon },
      { label: 'VIP Dashboard', path: '/VipInviteDashboard', icon: Star },
      { label: 'Inquiries', path: '/AdminInquiries', icon: MailWarning },
      { label: 'Ripple Grants', path: '/grants', icon: GitBranch },
      { label: 'Image Storage', path: '/ImageStorage', icon: Image },
      { label: 'Service Definitions', path: '/service-definitions', icon: Settings },
      { label: 'Usage Logs', path: '/service-usage-logs', icon: Activity },
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
      {/* Mobile Toggle — must sit above ALL fixed/sticky headers */}
      <div className="fixed top-1.5 left-1.5 z-[60] lg:hidden">
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="flex items-center justify-center w-10 h-10 bg-slate-800/95 hover:bg-slate-700 active:bg-slate-600 text-white border border-slate-600 rounded-lg shadow-lg backdrop-blur-sm"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
        <div className="fixed inset-0 z-[55] lg:hidden">
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