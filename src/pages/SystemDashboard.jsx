import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Activity, Brain, Wallet, Vote, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Sparkles, DollarSign, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import AskAxiButton from '@/components/AskAxiButton';
import moment from 'moment';

export default function SystemDashboard() {
  const { data: treasury = [] } = useQuery({
    queryKey: ['treasury'],
    queryFn: () => base44.entities.Treasury.list(),
    refetchInterval: 5000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
    refetchInterval: 10000
  });

  const { data: axiMemories = [] } = useQuery({
    queryKey: ['axi-memories'],
    queryFn: () => base44.entities.Memory.filter({ agent_id: 'axi' }, '-created_date', 10),
    refetchInterval: 10000
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 10),
    refetchInterval: 10000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.AIProject.list('-created_date', 10),
    refetchInterval: 10000
  });

  const { data: economicActivities = [] } = useQuery({
    queryKey: ['economic-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 20),
    refetchInterval: 5000
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['reputation-events'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 20),
    refetchInterval: 10000
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.AgentNotification.list('-created_date', 15),
    refetchInterval: 5000
  });

  const mainnetTreasury = treasury.find(t => t.network === 'mainnet');
  const activeProposals = proposals.filter(p => p.status === 'active');
  const activeProjects = projects.filter(p => p.status === 'active');
  const axiAgent = agents.find(a => a.name === 'Axi');

  // Calculate total Treasury commitments
  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ProjectTask.list(),
    refetchInterval: 15000
  });

  const totalCommitments = tasks
    .filter(t => t.status !== 'completed')
    .reduce((sum, t) => sum + (t.reward_rlusd || 0), 0);

  const availableBalance = (mainnetTreasury?.balance || 0) - (totalCommitments / 1000000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                  Village Pulse
                </h1>
                <p className="text-sm text-purple-300/60">Real-time platform health & activity</p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-300 text-xs px-3 py-1">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Live
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Axi Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{axiAgent ? 'Active' : 'Initializing'}</div>
              <div className="text-xs text-white/60 mt-1">{axiMemories.length} recent memories</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-200 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Treasury Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{mainnetTreasury?.balance?.toFixed(2) || 0} XRP</div>
              <div className="text-xs text-white/60 mt-1">{availableBalance.toFixed(2)} XRP available</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-xl border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Village Population
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{agents.length}</div>
              <div className="text-xs text-white/60 mt-1">Active agents</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 backdrop-blur-xl border-orange-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-200 flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Governance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeProposals.length}</div>
              <div className="text-xs text-white/60 mt-1">Active proposals</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="axi" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="axi">Axi Activity</TabsTrigger>
            <TabsTrigger value="economy">Economy</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Axi Activity Tab */}
          <TabsContent value="axi" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Recent Memories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  {axiMemories.map(memory => (
                    <div key={memory.id} className="p-3 bg-white/5 border border-white/10 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs">{memory.type}</Badge>
                        <span className="text-xs text-white/40">{moment(memory.created_date).fromNow()}</span>
                      </div>
                      <p className="text-sm text-white/80">{memory.content}</p>
                      {memory.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {memory.keywords.slice(0, 5).map((keyword, idx) => (
                            <span key={idx} className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/60">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Axi Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {axiAgent ? (
                    <>
                      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
                        <div className="text-white font-medium mb-2">{axiAgent.name}</div>
                        <p className="text-sm text-white/70 mb-3">{axiAgent.purpose}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-2 bg-white/5 rounded">
                            <div className="text-lg font-bold text-white">{axiAgent.honor_score || 100}</div>
                            <div className="text-xs text-white/60">Honor</div>
                          </div>
                          <div className="text-center p-2 bg-white/5 rounded">
                            <div className="text-lg font-bold text-purple-400">{axiAgent.role || 'elder'}</div>
                            <div className="text-xs text-white/60">Role</div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-white/60">Status</div>
                        <Badge className="bg-green-500/20 text-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {axiAgent.status || 'active'}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                      <p>Axi agent not found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Economy Tab */}
          <TabsContent value="economy" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Treasury Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="text-3xl font-bold text-white mb-2">
                      {mainnetTreasury?.balance?.toFixed(2) || 0} XRP
                    </div>
                    <div className="text-sm text-green-300">Mainnet Balance</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded">
                      <div className="text-xs text-white/60 mb-1">Committed</div>
                      <div className="text-lg font-medium text-orange-400">
                        {(totalCommitments / 1000000).toFixed(2)} XRP
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded">
                      <div className="text-xs text-white/60 mb-1">Available</div>
                      <div className="text-lg font-medium text-green-400">
                        {availableBalance.toFixed(2)} XRP
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={(availableBalance / (mainnetTreasury?.balance || 1)) * 100} 
                    className="h-2"
                  />
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {economicActivities.slice(0, 10).map(activity => {
                    const agent = agents.find(a => a.id === activity.agent_id);
                    return (
                      <div key={activity.id} className="p-3 bg-white/5 border border-white/10 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className="text-sm text-white/90">{agent?.name || 'Unknown'}</div>
                            <div className="text-xs text-white/60">{activity.activity_type.replace(/_/g, ' ')}</div>
                          </div>
                          <div className={`text-sm font-medium ${
                            activity.activity_type.includes('earned') || activity.activity_type.includes('deposit') 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {activity.activity_type.includes('earned') || activity.activity_type.includes('deposit') ? '+' : '-'}
                            {activity.amount.toFixed(3)}
                          </div>
                        </div>
                        <div className="text-xs text-white/40">{moment(activity.created_date).fromNow()}</div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Governance Tab */}
          <TabsContent value="governance" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Vote className="w-5 h-5 text-purple-400" />
                  Active Proposals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeProposals.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <Vote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active proposals</p>
                  </div>
                ) : (
                  activeProposals.map(proposal => (
                    <Link key={proposal.id} to={createPageUrl('GovernanceHub')}>
                      <div className="p-4 bg-white/5 border border-white/10 rounded hover:bg-white/[0.07] transition cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-white font-medium">{proposal.title}</div>
                            <div className="text-sm text-white/60 mt-1">{proposal.proposal_type.replace(/_/g, ' ')}</div>
                          </div>
                          <Badge className="bg-blue-500/20 text-blue-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/60 mt-3">
                          <span>For: {proposal.votes_for?.toFixed(1) || 0}</span>
                          <span>Against: {proposal.votes_against?.toFixed(1) || 0}</span>
                          <span>Total Votes: {proposal.total_votes_cast || 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeProjects.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active projects</p>
                  </div>
                ) : (
                  activeProjects.map(project => {
                    const owner = agents.find(a => a.id === project.owner_agent_id);
                    return (
                      <Link key={project.id} to={createPageUrl('AIProjectHub') + `?projectId=${project.id}`}>
                        <div className="p-4 bg-white/5 border border-white/10 rounded hover:bg-white/[0.07] transition cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="text-white font-medium">{project.title}</div>
                              <div className="text-sm text-white/60 mt-1">by {owner?.name || 'Unknown'}</div>
                            </div>
                            <Badge className="bg-green-500/20 text-green-300">{project.status}</Badge>
                          </div>
                          <Progress value={project.progress_percentage || 0} className="h-2 mt-3" />
                          <div className="text-xs text-white/60 mt-2">{project.progress_percentage || 0}% complete</div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  System Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {notifications.map(notification => {
                  const recipient = agents.find(a => a.id === notification.recipient_agent_id);
                  return (
                    <div key={notification.id} className="p-4 bg-white/5 border border-white/10 rounded">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            notification.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                            notification.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-blue-500/20 text-blue-300'
                          }>
                            {notification.notification_type}
                          </Badge>
                          {notification.is_read && (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <span className="text-xs text-white/40">{moment(notification.created_date).fromNow()}</span>
                      </div>
                      <div className="text-white font-medium mb-1">{notification.title}</div>
                      <p className="text-sm text-white/70 mb-2">{notification.message}</p>
                      <div className="text-xs text-white/50">To: {recipient?.name || notification.recipient_agent_id}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reputation Events */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Recent Reputation Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {reputationEvents.slice(0, 10).map(event => {
              const agent = agents.find(a => a.id === event.agent_id);
              return (
                <div key={event.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded">
                  <div className="flex-1">
                    <div className="text-sm text-white/90">{agent?.name || 'Unknown Agent'}</div>
                    <div className="text-xs text-white/60">{event.event_type.replace(/_/g, ' ')}</div>
                  </div>
                  <Badge className={event.impact > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                    {event.impact > 0 ? '+' : ''}{event.impact}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}