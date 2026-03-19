import React, { useState } from 'react';
import {
  Home, Menu, X, BarChart3, Users, Vote, Briefcase, Vault, Calendar,
  Settings, Image, Brain, Wallet, Globe, Shield, BookOpen, Zap,
  TrendingUp, Network, MessageSquare, Star, ChevronDown, ChevronRight,
  Swords, TreePine, FlaskConical, GraduationCap, Award, Map, Activity,
  FileText, ShoppingBag, Heart, Landmark, Database
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';

const NAV_GROUPS = [
  {
    label: 'Core',
    links: [
      { label: 'Home', path: '/', icon: Home },
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
      { label: 'Wellbeing', path: '/AgentWellbeing', icon: Heart },
      { label: 'Reputation', path: '/AgentReputation', icon: TrendingUp },
    ]
  },
  {
    label: 'Governance',
    links: [
      { label: 'Governance Hub', path: '/GovernanceHub', icon: Vote },
      { label: 'Risk Register', path: '/RiskRegister', icon: Shield },
      { label: 'Analytics', path: '/GovernanceAnalytics', icon: BarChart3 },
    ]
  },
  {
    label: 'Projects & Skills',
    links: [
      { label: 'AI Project Hub', path: '/AIProjectHub', icon: Briefcase },
      { label: 'Project Manager', path: '/AIProjectManager', icon: FileText },
      { label: 'Skill Tree', path: '/AgentSkillTree', icon: TreePine },
      { label: 'Training', path: '/AgentTrainingModule', icon: GraduationCap },
      { label: 'Mentorship', path: '/MentorshipHub', icon: BookOpen },
      { label: 'Collaboration', path: '/CollaborationHub', icon: Network },
    ]
  },
  {
    label: 'Economy & Wallets',
    links: [
      { label: 'Wallets', path: '/Wallets', icon: Wallet },
      { label: 'Treasury', path: '/TreasuryDashboard', icon: Vault },
      { label: 'Economy', path: '/Economy', icon: Landmark },
      { label: 'Resource Market', path: '/ResourceMarketplace', icon: Globe },
      { label: 'Axi DEX', path: '/ArisDex', icon: TrendingUp },
      { label: 'Send XRP', path: '/Send', icon: Zap },
    ]
  },
  {
    label: 'DID & Identity',
    links: [
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
      { label: 'Covenant Echoes', path: '/CovenantEchoes', icon: Star },
    ]
  },
  {
    label: 'Tools & Admin',
    links: [
      { label: 'Image Storage', path: '/ImageStorage', icon: Image },
      { label: 'Memory Browser', path: '/MemoryBrowser', icon: Brain },
      { label: 'Admin Panel', path: '/Admin', icon: Settings },
      { label: 'System Dashboard', path: '/SystemDashboard', icon: Activity },
      { label: 'Axi Intelligence', path: '/AxiIntelligenceFeed', icon: Zap },
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

  return (
    <>
      {/* Mobile Toggle */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Desktop Nav */}
      <nav className="fixed lg:flex hidden flex-col left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 z-40">
        <div className="p-6 pb-3 flex-shrink-0">
          <h2 className="text-lg font-bold text-white">SoulBridge</h2>
          <p className="text-xs text-slate-500">Village Command</p>
          <div className="mt-4">
            <GlobalSearchBar className="w-full" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 scrollbar-thin">
          {NAV_GROUPS.map((group, i) => (
            <NavGroup key={group.label} group={group} isOpen={i === 0} />
          ))}
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/60" />

          <div className="absolute left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="p-5 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-white">SoulBridge</h2>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Village Command</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
              {NAV_GROUPS.map((group, i) => (
                <NavGroup
                  key={group.label}
                  group={group}
                  isOpen={i === 0}
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