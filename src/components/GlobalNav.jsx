import React, { useState } from 'react';
import { Home, Menu, X, BarChart3, Users, Vote, Briefcase, Vault, Calendar, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import GlobalSearchBar from '@/components/search/GlobalSearchBar';

const NAV_LINKS = [
  { label: 'Home', path: '/Home', icon: Home },
  { label: 'Dashboard', path: '/AxiCommandDashboard', icon: BarChart3 },
  { label: 'Agents', path: '/Agents', icon: Users },
  { label: 'Governance', path: '/Governance', icon: Vote },
  { label: 'Projects', path: '/AIProjectHub', icon: Briefcase },
  { label: 'Treasury', path: '/TreasuryDashboard', icon: Vault },
  { label: 'Calendar', path: '/VillageCalendar', icon: Calendar },
];

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
      <nav className="fixed lg:block hidden left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 p-6 z-40 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">SoulBridge</h2>
          <p className="text-xs text-slate-500">Village Command</p>
        </div>
        <div className="mb-4">
          <GlobalSearchBar className="w-full" />
        </div>

        <div className="space-y-2">
          {NAV_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path}>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition text-sm font-medium">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {link.label}
                </button>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800">
          <Link to="/AgentProfile">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition text-sm font-medium">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </Link>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div onClick={() => setIsOpen(false)} className="absolute inset-0 bg-black/50" />

          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-screen w-56 bg-slate-950 border-r border-slate-800 p-6 overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-lg font-bold text-white">SoulBridge</h2>
              <p className="text-xs text-slate-500">Village Command</p>
            </div>

            <div className="space-y-2">
              {NAV_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Link 
                    key={link.path} 
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                  >
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition text-sm font-medium">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {link.label}
                    </button>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-800">
              <Link to="/AgentProfile" onClick={() => setIsOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition text-sm font-medium">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}