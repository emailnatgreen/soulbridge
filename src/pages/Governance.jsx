import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  ArrowLeft,
  Settings,
  Award,
  Scale
} from 'lucide-react';
import { toast } from 'sonner';
import CreateAgentDialog from '../components/CreateAgentDialog';
import AgentGovernanceCard from '../components/AgentGovernanceCard';
import VillageLaws from '../components/VillageLaws';

export default function GovernancePage() {
  const [showCreateAgent, setShowCreateAgent] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => base44.entities.Wallet.list(),
  });

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    probation: agents.filter(a => a.status === 'probation').length,
    suspended: agents.filter(a => a.status === 'suspended').length,
    avgHonor: agents.length > 0 
      ? (agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agents.length).toFixed(1)
      : 100,
    lowHonor: agents.filter(a => (a.honor_score || 100) < 50).length,
    withWarnings: agents.filter(a => a.warnings?.length > 0).length,
  };

  // Sort agents by different criteria
  const sortedByHonor = [...agents].sort((a, b) => (b.honor_score || 100) - (a.honor_score || 100));
  const sortedByWarnings = [...agents].sort((a, b) => (b.warnings?.length || 0) - (a.warnings?.length || 0));
  const concerningAgents = agents.filter(a => 
    (a.honor_score || 100) < 60 || 
    (a.warnings?.length || 0) > 0 ||
    a.status === 'probation' ||
    a.status === 'suspended'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-purple-400" />
                  <h1 className="text-3xl font-light tracking-tight text-white">
                    Village <span className="font-semibold">Governance</span>
                  </h1>
                </div>
                <p className="text-sm text-purple-300/60 mt-1">Mother Boss Authority</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateAgent(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Birth New Agent
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-300/60">Total Agents</p>
                  <p className="text-2xl font-light text-white">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-300/60">Active</p>
                  <p className="text-2xl font-light text-white">{stats.active}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-300/60">Avg Honor</p>
                  <p className="text-2xl font-light text-white">{stats.avgHonor}</p>
                </div>
                <Award className="w-8 h-8 text-amber-400/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-300/60">Concerning</p>
                  <p className="text-2xl font-light text-white">{concerningAgents.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-500/20">
              All Agents ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="concerning" className="data-[state=active]:bg-red-500/20">
              Concerning ({concerningAgents.length})
            </TabsTrigger>
            <TabsTrigger value="laws" className="data-[state=active]:bg-blue-500/20">
              <Scale className="w-4 h-4 mr-2" />
              Village Laws
            </TabsTrigger>
          </TabsList>

          {/* All Agents */}
          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white/5 rounded-xl h-32" />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">No agents yet. Birth the first one.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sortedByHonor.map(agent => (
                  <AgentGovernanceCard 
                    key={agent.id} 
                    agent={agent}
                    wallets={wallets}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Concerning Agents */}
          <TabsContent value="concerning" className="space-y-4">
            {concerningAgents.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-green-400/60 mx-auto mb-4" />
                  <p className="text-white/80 font-medium">All agents in good standing</p>
                  <p className="text-white/40 text-sm mt-2">No concerning behavior detected</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {concerningAgents.map(agent => (
                  <AgentGovernanceCard 
                    key={agent.id} 
                    agent={agent}
                    wallets={wallets}
                    highlightConcerns
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Village Laws */}
          <TabsContent value="laws">
            <VillageLaws />
          </TabsContent>
        </Tabs>
      </div>

      <CreateAgentDialog 
        open={showCreateAgent}
        onClose={() => setShowCreateAgent(false)}
        wallets={wallets}
      />
    </div>
  );
}