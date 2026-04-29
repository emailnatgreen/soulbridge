import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Award, MessageSquare, BookOpen, Activity, Users, Fingerprint, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import VillagePulseHero from '@/components/agents/VillagePulseHero';
import AgentCard from '@/components/agents/AgentCard';

const HUBS = [
  { path: '/my-agents', label: 'My Hub', icon: Sparkles, color: 'from-purple-600 to-pink-600' },
  { path: '/AgentChat', label: 'Comms', icon: MessageSquare, color: 'from-blue-600 to-cyan-600' },
  { path: '/leaderboard', label: 'Leaderboard', icon: Award, color: 'from-amber-600 to-yellow-600' },
  { path: '/training', label: 'Training', icon: BookOpen, color: 'from-rose-600 to-pink-600' },
  { path: '/mentorship', label: 'Mentorship', icon: Users, color: 'from-indigo-600 to-violet-600' },
];

const ROLE_FILTERS = ['all', 'citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];

export default function Agents() {
  const [currentDID, setCurrentDID] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    try {
      const identity = localStorage.getItem('soulbridge_identity');
      if (identity) setCurrentDID(JSON.parse(identity));
    } catch (e) {
      console.error('DID parse error:', e);
    }
  }, []);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: walletsMap = {} } = useQuery({
    queryKey: ['agent-wallets-map'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list(undefined, 500);
      const map = {};
      wallets.forEach(w => {
        if (w.owner_id) map[w.owner_id] = w;
      });
      return map;
    },
    staleTime: 30000,
  });

  // Filter agents
  const filtered = agents.filter(a => {
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return `${a.name} ${a.purpose} ${a.tagline} ${(a.specializations || []).join(' ')}`.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Breadcrumb nav */}
          <div className="flex items-center gap-2 mb-3">
            <PageBreadcrumb />
            {currentDID && (
              <>
                <span className="flex-1" />
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs">
                  <Fingerprint className="w-3 h-3 mr-1" />
                  DID: {currentDID.did?.slice(0, 16)}...
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div></div>
            <Link to="/agent-genesis">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Initiate Genesis</span>
                <span className="sm:hidden">Genesis</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Village Pulse Hero */}
        <VillagePulseHero agents={agents} wallets={walletsMap} />

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {HUBS.map(hub => {
            const Icon = hub.icon;
            const content = (
              <button className={`w-full h-16 rounded-xl bg-gradient-to-br ${hub.color} hover:shadow-lg hover:shadow-purple-500/10 transition-all p-3 flex items-center gap-3 text-white relative ${hub.comingSoon ? 'opacity-50' : ''}`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium">{hub.label}</span>
                {hub.comingSoon && <span className="absolute top-1.5 right-1.5 text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full">Soon</span>}
              </button>
            );
            return hub.comingSoon ? (
              <div key={hub.path}>{content}</div>
            ) : (
              <Link key={hub.path} to={hub.path}>{content}</Link>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name, purpose, or skills..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {ROLE_FILTERS.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                  roleFilter === role
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Agent count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/40 text-xs">{filtered.length} agent{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Agent Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-52" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              {searchQuery || roleFilter !== 'all' ? 'No agents match your filters' : 'No agents yet — initiate Genesis to create your first'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                walletData={walletsMap[agent.wallet_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}