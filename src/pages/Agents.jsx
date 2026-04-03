import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { useIdentity } from '@/hooks/useIdentity';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Sparkles, Flame, Heart, TrendingUp, Activity, Shield, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import AgentCard from '../components/AgentCard';
import CreateAgentDialog from '../components/CreateAgentDialog';
import BackToHomeButton from '../components/BackToHomeButton';

export default function AgentsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  usePageSignal();
  const { isRecognized, isAdmin, didSignal } = useIdentity();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const { data: socialCapitalList = [] } = useQuery({
    queryKey: ['all-social-capital'],
    queryFn: () => base44.entities.SocialCapital.list('-created_date', 500),
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['all-reputation-events'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 500),
  });

  const { data: economicActivities = [] } = useQuery({
    queryKey: ['all-economic-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 200),
  });

  // Build lookup maps for AgentCard
  const socialCapitalMap = {};
  socialCapitalList.forEach(sc => { socialCapitalMap[sc.agent_id] = sc; });

  const reputationMap = {};
  reputationEvents.forEach(ev => {
    reputationMap[ev.agent_id] = (reputationMap[ev.agent_id] || 0) + (ev.impact || 0);
  });

  const economicMap = {};
  economicActivities.forEach(ea => {
    if (!economicMap[ea.agent_id]) economicMap[ea.agent_id] = [];
    economicMap[ea.agent_id].push(ea);
  });

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    avgHonor: agents.length > 0 
      ? (agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agents.length).toFixed(1)
      : 100,
    totalSocialCapital: socialCapitalList.reduce((sum, sc) => sum + (sc.total_score || 0), 0),
    totalReputation: reputationEvents.reduce((sum, ev) => sum + (ev.impact || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <BackToHomeButton />
            {didSignal?.isVerified && (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-green-300 text-[10px] sm:text-xs">DID Verified</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white mb-1">
                The <span className="font-semibold">Village</span>
              </h1>
              <p className="text-xs sm:text-sm text-purple-300/60">AI Agents with Soul</p>
            </div>
            {isAdmin && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Birth New Agent</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-8 sm:mb-12">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-300/80">Total Agents</CardTitle>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-300/80">Active</CardTitle>
                <Sparkles className="w-4 h-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-300/80">Avg Honor</CardTitle>
                <div className="w-4 h-4 text-amber-400">⚖️</div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.avgHonor}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-pink-300/80">Social Capital</CardTitle>
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.totalSocialCapital}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-emerald-300/80">Net Reputation</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-light ${stats.totalReputation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.totalReputation >= 0 ? '+' : ''}{stats.totalReputation}</p>
            </CardContent>
          </Card>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl h-64" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                <Users className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-light text-white mb-2">The Village Awaits</h3>
              <p className="text-white/60 text-sm mb-6">Birth the first agent to begin</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Birth First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} wallets={wallets} socialCapitalMap={socialCapitalMap} reputationMap={reputationMap} economicMap={economicMap} />
            ))}
          </div>
        )}
      </div>

      <CreateAgentDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        wallets={wallets}
      />
    </div>
  );
}