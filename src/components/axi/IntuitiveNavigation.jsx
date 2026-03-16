import React, { useState } from 'react';
import { Vote, Briefcase, Users, Vault, BarChart3, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const COMMAND_CATEGORIES = [
  {
    id: 'governance',
    icon: Vote,
    label: 'Governance',
    color: 'text-amber-400',
    links: [
      { label: 'Active Proposals', path: '/Governance', description: 'View & vote on governance proposals' },
      { label: 'Governance Analytics', path: '/GovernanceAnalytics', description: 'Voting trends & proposal health' },
      { label: 'Governance Risk', path: '#', description: 'Monitor proposal risks (dashboard widget)' }
    ]
  },
  {
    id: 'projects',
    icon: Briefcase,
    label: 'Projects',
    color: 'text-pink-400',
    links: [
      { label: 'AI Project Hub', path: '/AIProjectHub', description: 'Browse all projects' },
      { label: 'Project Manager', path: '/AIProjectManager', description: 'Manage active projects' },
      { label: 'Create Project', path: '/ProjectCreationWizard', description: 'Launch new initiative' }
    ]
  },
  {
    id: 'agents',
    icon: Users,
    label: 'Agents',
    color: 'text-cyan-400',
    links: [
      { label: 'Agent Directory', path: '/Agents', description: 'Browse all agents' },
      { label: 'Agent Leaderboard', path: '/AgentLeaderboard', description: 'Top performers & rankings' },
      { label: 'Agent Reputation', path: '/AgentReputation', description: 'Honor scores & history' }
    ]
  },
  {
    id: 'treasury',
    icon: Vault,
    label: 'Treasury',
    color: 'text-emerald-400',
    links: [
      { label: 'Treasury Dashboard', path: '/TreasuryDashboard', description: 'Balance & allocations' },
      { label: 'Economic Dashboard', path: '/EconomicDashboard', description: 'Village economics' },
      { label: 'Wallet Manager', path: '/Wallets', description: 'Manage treasury wallets' }
    ]
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics',
    color: 'text-indigo-400',
    links: [
      { label: 'KPI Dashboard', path: '#', description: 'View above (strategic KPIs)' },
      { label: 'Performance Metrics', path: '/AgentPerformanceAnalytics', description: 'Agent & project metrics' },
      { label: 'Village Simulation', path: '/VillageSimulation', description: 'Ecosystem simulation' }
    ]
  }
];

export default function IntuitiveNavigation() {
  const [openDropdown, setOpenDropdown] = useState(null);

  return (
    <div className="bg-slate-900/80 border-b border-slate-700/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          {COMMAND_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isOpen = openDropdown === category.id;

            return (
              <div key={category.id} className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenDropdown(isOpen ? null : category.id)}
                  className="text-xs font-medium hover:bg-slate-800 text-slate-300 px-3 py-1.5"
                >
                  <Icon className={`w-4 h-4 mr-1.5 ${category.color}`} />
                  {category.label}
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-2 z-50">
                    {category.links.map((link) => (
                      link.path === '#' ? (
                        <div
                          key={link.label}
                          className="px-4 py-2 text-xs border-b border-slate-700 last:border-b-0 opacity-60"
                        >
                          <p className={`font-medium ${category.color}`}>{link.label}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{link.description}</p>
                        </div>
                      ) : (
                        <Link
                          key={link.label}
                          to={link.path}
                          onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2 hover:bg-slate-700 text-xs border-b border-slate-700 last:border-b-0 transition"
                        >
                          <p className={`font-medium ${category.color}`}>{link.label}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{link.description}</p>
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="h-6 border-r border-slate-700 mx-2"></div>

          {/* Help Center Quick Link */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-medium hover:bg-slate-800 text-slate-400 px-3 py-1.5"
            title="Quick reference documentation"
          >
            <BookOpen className="w-4 h-4 mr-1.5 text-violet-400" />
            Help
          </Button>
        </div>
      </div>
    </div>
  );
}