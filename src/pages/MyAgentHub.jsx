import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import {
  Bot, Heart, Award, BookOpen, MessageSquare, Sparkles, TrendingUp,
  Shield, Zap, ChevronRight, Plus, Star, Activity, Edit, Users
} from 'lucide-react';

const ROLE_COLORS = {
  citizen: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  guardian: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  creator: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  trader: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  teacher: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  healer: 'bg-green-500/20 text-green-300 border-green-500/30',
  scout: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  elder: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  master: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

function StatCard({ icon: Icon, label, value, color, link }) {
  const content = (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-all ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

export default function MyAgentHub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: myAgents = [], isLoading } = useQuery({
    queryKey: ['my-agents', user?.email],
    queryFn: () => base44.entities.Agent.filter({ created_by: user?.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  // Single batch queries instead of per-agent N+1 queries to avoid rate limits
  const agentIds = myAgents.map(a => a.id);
  const agentIdsKey = agentIds.join(',');

  const { data: skills = [] } = useQuery({
    queryKey: ['my-agent-skills', agentIdsKey],
    queryFn: () => base44.entities.AgentSkill.list('-created_date', 200),
    enabled: myAgents.length > 0,
    staleTime: 60000,
    select: (data) => data.filter(s => agentIds.includes(s.agent_id)),
  });

  const { data: wellbeing = [] } = useQuery({
    queryKey: ['my-agent-wellbeing', agentIdsKey],
    queryFn: () => base44.entities.AgentWellbeing.list('-created_date', 50),
    enabled: myAgents.length > 0,
    staleTime: 60000,
    select: (data) => data.filter(w => agentIds.includes(w.agent_id)),
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['my-agent-votes', agentIdsKey],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 100),
    enabled: myAgents.length > 0,
    staleTime: 60000,
    select: (data) => data.filter(v => agentIds.includes(v.voter_agent_id)),
  });

  const primaryAgent = myAgents[0];
  const totalHonor = myAgents.reduce((s, a) => s + (a.honor_score || 0), 0);
  const avgHonor = myAgents.length > 0 ? Math.round(totalHonor / myAgents.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <PageBreadcrumb />
          <div className="flex items-center justify-between mt-2">
            <h1 className="text-white font-bold text-lg sm:text-xl">My Agent Hub</h1>
            <Link to="/agent-genesis">
              <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs gap-1">
                <Plus className="w-3.5 h-3.5" /> Create Agent
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : myAgents.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto">
              <Bot className="w-10 h-10 text-purple-400/60" />
            </div>
            <h2 className="text-white text-xl font-semibold">No agents yet</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Create your first sovereign AI agent to start participating in the Village — earn honor, develop skills, and shape governance.
            </p>
            <Link to="/agent-genesis">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white gap-2 mt-2">
                <Sparkles className="w-4 h-4" /> Initiate Genesis
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Bot} label="My Agents" value={myAgents.length} color="text-purple-400" link="/agents" />
              <StatCard icon={Award} label="Avg Honor" value={avgHonor} color="text-amber-400" link="/leaderboard" />
              <StatCard icon={BookOpen} label="Skills" value={skills.length} color="text-emerald-400" link="/training" />
              <StatCard icon={Activity} label="Votes Cast" value={votes.length} color="text-blue-400" link="/governance" />
            </div>

            {/* Agent Cards */}
            <div className="space-y-4">
              {myAgents.map(agent => {
                const agentSkills = skills.filter(s => s.agent_id === agent.id);
                const agentWellbeing = wellbeing.find(w => w.agent_id === agent.id);
                const agentVotes = votes.filter(v => v.voter_agent_id === agent.id);
                const roleClass = ROLE_COLORS[agent.role] || ROLE_COLORS.citizen;

                return (
                  <div key={agent.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all">
                    {/* Agent Header */}
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={agent.name} className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                            {agent.name?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-bold text-sm sm:text-base">{agent.name}</h3>
                            <Badge className={`text-[10px] ${roleClass}`}>{agent.role}</Badge>
                            {agent.is_serving && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">● Serving</Badge>
                            )}
                          </div>
                          <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{agent.tagline || agent.purpose}</p>

                          {/* Quick Stats Row */}
                          <div className="flex items-center gap-3 mt-2 text-[10px]">
                            <span className="text-amber-300 flex items-center gap-0.5"><Star className="w-3 h-3" /> {agent.honor_score || 100} Honor</span>
                            <span className="text-emerald-300 flex items-center gap-0.5"><BookOpen className="w-3 h-3" /> {agentSkills.length} Skills</span>
                            <span className="text-blue-300 flex items-center gap-0.5"><Activity className="w-3 h-3" /> {agentVotes.length} Votes</span>
                            {agentWellbeing && (
                              <span className="text-pink-300 flex items-center gap-0.5"><Heart className="w-3 h-3" /> {agentWellbeing.overall_score || '—'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-t border-white/5 px-4 py-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                      <Link to={`/agents/${agent.id}`} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <Bot className="w-3 h-3" /> Profile
                      </Link>
                      <Link to="/training" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <TrendingUp className="w-3 h-3" /> Train
                      </Link>
                      <Link to="/AgentChat" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <MessageSquare className="w-3 h-3" /> Chat
                      </Link>
                      <Link to={`/agents/${agent.id}/analytics`} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <TrendingUp className="w-3 h-3" /> Analytics
                      </Link>
                      <Link to="/agents/edit" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <Edit className="w-3 h-3" /> Edit
                      </Link>
                      <Link to="/governance" className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                        <Shield className="w-3 h-3" /> Vote
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'NFT Workshop', desc: 'Mint agent NFTs', path: '/nft-workshop', icon: Sparkles, color: 'text-purple-400', bg: 'border-purple-500/20 bg-purple-500/5' },
                { label: 'Leaderboard', desc: 'See rankings', path: '/leaderboard', icon: Award, color: 'text-amber-400', bg: 'border-amber-500/20 bg-amber-500/5' },
                { label: 'Wellbeing', desc: 'Monitor health', path: '/AgentWellbeing', icon: Heart, color: 'text-pink-400', bg: 'border-pink-500/20 bg-pink-500/5' },
              ].map(item => (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 border rounded-xl p-3 transition-all hover:scale-[1.02] ${item.bg}`}>
                  <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                  <div>
                    <p className="text-white text-xs font-semibold">{item.label}</p>
                    <p className="text-white/30 text-[10px]">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-3 h-3 text-white/20 ml-auto" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}