import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Sparkles, Wallet, Activity, MessageSquare, Info } from 'lucide-react';
import AgentMessaging from '../components/AgentMessaging';

export default function AgentDetailsPage() {
  const agentId = new URLSearchParams(window.location.search).get('id');

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.get(agentId),
    enabled: !!agentId,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', agent?.wallet_id],
    queryFn: () => base44.entities.Wallet.get(agent.wallet_id),
    enabled: !!agent?.wallet_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Agent not found</div>
      </div>
    );
  }

  const statusConfig = {
    active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Sparkles },
    dormant: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Activity },
    suspended: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Activity }
  };

  const config = statusConfig[agent.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const getHonorColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Agents')}>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold text-2xl">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-light tracking-tight text-white">
                    {agent.name}
                  </h1>
                  <p className="text-sm text-purple-300/60">{agent.role}</p>
                </div>
              </div>
            </div>
            <Badge className={`${config.color} border`}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {agent.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="info" className="data-[state=active]:bg-purple-500/20">
              <Info className="w-4 h-4 mr-2" />
              Information
            </TabsTrigger>
            <TabsTrigger value="messaging" className="data-[state=active]:bg-blue-500/20">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messaging
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Purpose</p>
                    <p className="text-white/90">{agent.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Personality</p>
                    <p className="text-white/90">{agent.personality || 'Helpful and curious'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Role</p>
                    <p className="text-white/90 capitalize">{agent.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Honor Score</p>
                    <p className={`text-3xl font-light ${getHonorColor(agent.honor_score || 100)}`}>
                      {agent.honor_score || 100}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Info */}
              {wallet && (
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-400" />
                      Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-white/40 mb-1">Classic Address (DID)</p>
                      <code className="text-xs text-purple-300 bg-white/5 px-2 py-1 rounded break-all">
                        {wallet.classic_address}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Network</p>
                      <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                        {wallet.network}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-white/40 mb-1">Balance</p>
                      <p className="text-2xl font-light text-white">{wallet.balance || 0} XRP</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-white/40 mb-1">Total Transactions</p>
                    <p className="text-2xl font-light text-white">{agent.total_transactions || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Warnings</p>
                    <p className="text-2xl font-light text-white">{agent.warnings?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Can Create Agents</p>
                    <p className="text-sm text-white/80">{agent.permissions?.can_create_agents ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Can Vote</p>
                    <p className="text-sm text-white/80">{agent.permissions?.can_vote ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging">
            <AgentMessaging currentAgent={agent} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}