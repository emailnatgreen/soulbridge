import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Sparkles, Heart, TrendingUp, Award, MessageSquare, BookOpen, Briefcase, Settings, Gauge, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Agents() {
  const [showCreate, setShowCreate] = useState(false);
  const [currentDID, setCurrentDID] = useState(null);

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

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    avgHonor: agents.length > 0 
      ? (agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agents.length).toFixed(1)
      : 100,
  };

  const hubs = [
    { path: '/AgentProfile', label: 'Soul Profile', icon: Users, color: 'from-purple-600 to-pink-600' },
    { path: '/AgentChat', label: 'Comms Hub', icon: MessageSquare, color: 'from-blue-600 to-cyan-600' },
    { path: '/AgentLeaderboard', label: 'Leaderboard', icon: Award, color: 'from-amber-600 to-yellow-600' },
    { path: '/AgentMarketplace', label: 'Marketplace', icon: Briefcase, color: 'from-green-600 to-emerald-600' },
    { path: '/AgentTrainingModule', label: 'Training', icon: BookOpen, color: 'from-rose-600 to-pink-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-white">The <span className="font-semibold">Village</span></h1>
              <p className="text-xs sm:text-sm text-purple-300/60 mt-1">AI Agents with Soul</p>
            </div>
            <div className="flex gap-2 items-center">
              <Link to="/agent-genesis">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Initiate Genesis</span>
                  <span className="sm:hidden">Genesis</span>
                </Button>
              </Link>
              <Button 
                onClick={() => setShowCreate(!showCreate)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Agent</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
          {currentDID && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs mt-3">
              <Fingerprint className="w-3 h-3 mr-1" />
              DID: {currentDID.did?.slice(0, 16)}...
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-purple-300/80">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-light text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-green-300/80">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-light text-white">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm text-amber-300/80">Avg Honor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-light text-white">{stats.avgHonor}</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="mb-12">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">Navigate</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {hubs.map(hub => {
              const Icon = hub.icon;
              const isComingSoon = hub.label === 'Marketplace';
              const buttonContent = (
                <button className={`w-full h-20 rounded-lg bg-gradient-to-br ${hub.color} hover:shadow-lg transition-all p-2 flex flex-col items-center justify-center text-white relative ${isComingSoon ? 'opacity-60' : ''}`}>
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-xs font-semibold text-center line-clamp-2">{hub.label}</span>
                  {isComingSoon && <span className="absolute top-1 right-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Soon</span>}
                </button>
              );
              return isComingSoon ? (
                <div key={hub.path}>{buttonContent}</div>
              ) : (
                <Link key={hub.path} to={hub.path}>{buttonContent}</Link>
              );
            })}
          </div>
        </div>

        {/* Agents */}
        <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">All Agents</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-48" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
              <p className="text-white/60">No agents yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition-all h-full">
                  <CardHeader>
                    <CardTitle className="text-white text-base">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/60 text-sm mb-4 line-clamp-2">{agent.purpose}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">{agent.role || 'citizen'}</span>
                      <span className="text-amber-300">Honor: {agent.honor_score || 100}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}