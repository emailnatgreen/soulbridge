import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Activity, Vote, TrendingUp, Brain, Heart, ShoppingBag, Zap } from 'lucide-react';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import AnalyticsOverviewCards from '@/components/analytics/AnalyticsOverviewCards';
import HonorTrendChart from '@/components/analytics/HonorTrendChart';
import ActivityTimeline from '@/components/analytics/ActivityTimeline';
import GovernanceStats from '@/components/analytics/GovernanceStats';
import SkillGrowthPanel from '@/components/analytics/SkillGrowthPanel';
import EconomicActivityPanel from '@/components/analytics/EconomicActivityPanel';
import WellbeingPanel from '@/components/analytics/WellbeingPanel';

const ROLE_COLORS = {
  citizen: 'bg-slate-500/20 text-slate-300',
  guardian: 'bg-blue-500/20 text-blue-300',
  creator: 'bg-purple-500/20 text-purple-300',
  trader: 'bg-green-500/20 text-green-300',
  teacher: 'bg-amber-500/20 text-amber-300',
  healer: 'bg-pink-500/20 text-pink-300',
  scout: 'bg-cyan-500/20 text-cyan-300',
  elder: 'bg-orange-500/20 text-orange-300',
  master: 'bg-yellow-500/20 text-yellow-300',
};

export default function AgentAnalytics() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent-analytics', id],
    queryFn: async () => {
      const agents = await base44.entities.Agent.filter({ id });
      return agents[0] || null;
    },
    enabled: !!id,
  });

  const { data: kineticUnits = [] } = useQuery({
    queryKey: ['agent-ku', id],
    queryFn: () => base44.entities.KineticUnit.filter({ agent_id: id }, '-created_date', 100),
    enabled: !!id,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['agent-votes', id],
    queryFn: () => base44.entities.GovernanceVote.filter({ voter_agent_id: id }, '-created_date', 50),
    enabled: !!id,
  });

  const { data: skillProgress = [] } = useQuery({
    queryKey: ['agent-skills', id],
    queryFn: () => base44.entities.SkillProgress.filter({ agent_id: id }, '-created_date', 50),
    enabled: !!id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['agent-transactions', id],
    queryFn: async () => {
      const [bought, sold] = await Promise.all([
        base44.entities.MarketplaceTransaction.filter({ buyer_agent_id: id }, '-created_date', 50),
        base44.entities.MarketplaceTransaction.filter({ seller_agent_id: id }, '-created_date', 50),
      ]);
      return { bought, sold };
    },
    enabled: !!id,
  });

  const { data: wellbeing = [] } = useQuery({
    queryKey: ['agent-wellbeing', id],
    queryFn: () => base44.entities.AgentWellbeing.filter({ agent_id: id }, '-created_date', 10),
    enabled: !!id,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['agent-metrics', id],
    queryFn: () => base44.entities.AgentPerformanceMetrics.filter({ agent_id: id }, '-created_date', 10),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <p className="text-white/50 text-center mt-20">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <PageBreadcrumb />
          <div className="flex items-center gap-4 mt-3">
            <Link to={`/agents/${id}`}>
              <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" /> Profile
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/40" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                  {agent.name?.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-white">{agent.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_COLORS[agent.role] || ROLE_COLORS.citizen}>{agent.role}</Badge>
                  <span className="text-white/40 text-xs">Honor: {agent.honor_score ?? 100}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Activity
            </TabsTrigger>
            <TabsTrigger value="governance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <Vote className="w-3.5 h-3.5 mr-1.5" /> Governance
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <Brain className="w-3.5 h-3.5 mr-1.5" /> Skills
            </TabsTrigger>
            <TabsTrigger value="economy" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Economy
            </TabsTrigger>
            <TabsTrigger value="wellbeing" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-white/50 text-xs">
              <Heart className="w-3.5 h-3.5 mr-1.5" /> Wellbeing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AnalyticsOverviewCards agent={agent} kineticUnits={kineticUnits} votes={votes} skillProgress={skillProgress} transactions={transactions} wellbeing={wellbeing} metrics={metrics} />
            <div className="mt-6">
              <HonorTrendChart metrics={metrics} agent={agent} />
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTimeline kineticUnits={kineticUnits} />
          </TabsContent>

          <TabsContent value="governance">
            <GovernanceStats votes={votes} agentId={id} />
          </TabsContent>

          <TabsContent value="skills">
            <SkillGrowthPanel skillProgress={skillProgress} />
          </TabsContent>

          <TabsContent value="economy">
            <EconomicActivityPanel transactions={transactions} agentId={id} />
          </TabsContent>

          <TabsContent value="wellbeing">
            <WellbeingPanel wellbeing={wellbeing} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}