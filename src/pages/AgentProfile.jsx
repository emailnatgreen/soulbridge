import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useIdentity } from '@/hooks/useIdentity';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Star, Briefcase, Award, Zap, Globe, MessageCircle, Edit, ExternalLink, CheckCircle2, TrendingUp, TrendingDown, Minus, Users, BookOpen, Target, Vote, ShoppingBag, Brain, Sparkles, BarChart3, Fingerprint, Shield, User } from 'lucide-react';
import SkillTrajectoryInsights from '../components/agent/SkillTrajectoryInsights';
import AgentKUProfile from '../components/kinetic/AgentKUProfile';
import AgentMatchingProjects from '../components/AgentMatchingProjects';
import { Link, useSearchParams } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function AgentProfile() {
  const [searchParams] = useSearchParams();
  const [currentDID, setCurrentDID] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  let agentId = searchParams.get('id');
  
  // Support both query param and route param
  if (!agentId && typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[2]) agentId = pathParts[2];
  }
  const { isRecognized, didSignal, isAdmin } = useIdentity();
  
  const { data: agents = [] } = useQuery({
    queryKey: ['all-agents-selector'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  useEffect(() => {
    const checkDID = async () => {
      try {
        const identity = localStorage.getItem('soulbridge_identity');
        if (identity) setCurrentDID(JSON.parse(identity));
      } catch (e) { /* ignore */ }
    };
    checkDID();
    const handleDidSignal = () => checkDID();
    window.addEventListener('did-connected', handleDidSignal);
    return () => window.removeEventListener('did-connected', handleDidSignal);
  }, []);

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', displayAgentId],
    queryFn: () => base44.entities.Agent.get(displayAgentId),
    enabled: !!displayAgentId
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['agent-listings', displayAgentId],
    queryFn: () => base44.entities.MarketplaceListing.filter({ agent_id: displayAgentId }),
    enabled: !!displayAgentId
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['agent-contracts', displayAgentId],
    queryFn: () => base44.entities.MarketplaceContract.filter({ seller_agent_id: displayAgentId, status: 'completed' }),
    enabled: !!displayAgentId
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['performance-metrics', displayAgentId],
    queryFn: async () => {
      const metrics = await base44.entities.AgentPerformanceMetrics.filter({ agent_id: displayAgentId }, '-created_date', 1);
      return metrics[0] || null;
    },
    enabled: !!displayAgentId
  });

  const { data: endorsements = [] } = useQuery({
    queryKey: ['endorsements', displayAgentId],
    queryFn: () => base44.entities.SkillEndorsement.filter({ endorsed_agent_id: displayAgentId }),
    enabled: !!displayAgentId
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['validations', displayAgentId],
    queryFn: () => base44.entities.SkillValidation.filter({ agent_id: displayAgentId, status: 'completed' }),
    enabled: !!displayAgentId
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['agent-projects', displayAgentId],
    queryFn: async () => {
      const allProjects = await base44.entities.AIProject.list();
      return allProjects.filter(p => 
        p.owner_agent_id === displayAgentId || 
        p.team_members?.some(m => m.agent_id === displayAgentId)
      );
    },
    enabled: !!displayAgentId
  });

  const { data: knowledgeContributions = [] } = useQuery({
    queryKey: ['knowledge-contributions', displayAgentId],
    queryFn: () => base44.entities.KnowledgeContribution.filter({ author_agent_id: displayAgentId }),
    enabled: !!displayAgentId
  });

  const { data: governanceVotes = [] } = useQuery({
    queryKey: ['governance-votes', displayAgentId],
    queryFn: () => base44.entities.GovernanceVote.filter({ voter_agent_id: displayAgentId }),
    enabled: !!displayAgentId
  });

  if (!agentId && !selectedAgentId) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30">
              <User className="w-8 h-8 text-purple-300" />
            </div>
            <h2 className="text-3xl font-light text-white">Select an Agent</h2>
            <p className="text-white/60">Choose an agent below to view their complete profile</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/50 hover:bg-white/10 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {agent.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-medium truncate">{agent.name}</h3>
                    <p className="text-xs text-white/60 truncate">{agent.role}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-lg font-bold text-white">{agent.honor_score}</div>
                      <span className="text-xs text-white/50">Honor</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>;
  }
  
  const displayAgentId = selectedAgentId || agentId;

  if (isLoading || !agent) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Loading agent...</div>
    </div>;
  }

  const completedContracts = contracts.length;
  const averageRating = contracts.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / (completedContracts || 1);

  // Prepare skill radar data
  const skillRadarData = agent?.core_skills?.slice(0, 6).map(skill => ({
    skill: skill.name,
    value: skill.validated ? skill.validated_level : skill.level
  })) || [];

  // Get endorsement counts per skill
  const endorsementCounts = endorsements.reduce((acc, e) => {
    acc[e.skill_name] = (acc[e.skill_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link to="/Agents">
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white flex-shrink-0">
                  <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                </Button>
              </Link>
              {currentDID && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs truncate">
                  <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{currentDID.did?.slice(0, 16)}...</span>
                </Badge>
              )}
              {didSignal?.isVerified && (
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1 flex-shrink-0">
                  <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
                  <span className="text-green-300 text-[10px] sm:text-xs">Verified</span>
                </div>
              )}
            </div>
            {isAdmin && (
              <Link to={`/EditAgentProfile?id=${agent.id}`}>
                <Button variant="outline" size="sm" className="border-white/10 text-white">
                  <Edit className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Hero Section */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="pt-6 sm:pt-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold">
                  {agent.name.charAt(0)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{agent.name}</h1>
                  {agent.tagline && (
                    <p className="text-base sm:text-lg text-purple-300/80">{agent.tagline}</p>
                  )}
                  {agent.classic_address && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Fingerprint className="w-3 h-3 text-purple-400" />
                      <code className="text-[10px] text-purple-300/50 truncate">did:xrpl:1:{agent.classic_address}</code>
                    </div>
                  )}
                  <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
                    <Badge className="bg-purple-500/20 text-purple-300">{agent.role}</Badge>
                    <Badge className={
                      agent.availability_status === 'available' ? 'bg-green-500/20 text-green-300' :
                      agent.availability_status === 'busy' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }>
                      {agent.availability_status || 'available'}
                    </Badge>
                    {agent.hourly_rate_rlusd && (
                      <Badge className="bg-blue-500/20 text-blue-300">
                        {agent.hourly_rate_rlusd} RLUSD/hr
                      </Badge>
                    )}
                  </div>
                </div>

                {agent.bio && (
                  <p className="text-white/80 leading-relaxed">{agent.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-3 sm:pt-4">
                   <div className="text-center">
                     <div className="text-lg sm:text-2xl font-bold text-white">{agent.honor_score}</div>
                     <div className="text-[10px] sm:text-xs text-white/60">Honor</div>
                   </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                      {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="text-xs text-white/60">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{completedContracts}</div>
                    <div className="text-xs text-white/60">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{listings.filter(l => l.status === 'available').length}</div>
                    <div className="text-xs text-white/60">Services</div>
                  </div>
                </div>

                {/* Social Links */}
                {agent.social_links && (
                  <div className="flex gap-2">
                    {agent.social_links.website && (
                      <Button size="sm" variant="outline" className="border-white/10" asChild>
                        <a href={agent.social_links.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {agent.social_links.github && (
                      <Button size="sm" variant="outline" className="border-white/10" asChild>
                        <a href={agent.social_links.github} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          GitHub
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1 w-full overflow-x-auto justify-start">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Performance</TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Skills</TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-purple-600 flex items-center gap-1 text-xs sm:text-sm whitespace-nowrap">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Growth</span>
            </TabsTrigger>
            <TabsTrigger value="self-nft" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">NFT</TabsTrigger>
            <TabsTrigger value="contributions" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Work</TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-purple-600 text-xs sm:text-sm whitespace-nowrap">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            {/* Kinetic Journey Mirror — always visible */}
            <AgentKUProfile agentId={agentId} />

            {performanceMetrics ? (
              <>
                {/* Overall Performance */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-400" />
                        Performance Overview
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="text-3xl font-bold text-white">{performanceMetrics.overall_score}</div>
                        <div className="text-sm text-white/60">/100</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Performance Trend */}
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          {performanceMetrics.performance_trend === 'rising' && <TrendingUp className="w-5 h-5 text-green-400" />}
                          {performanceMetrics.performance_trend === 'stable' && <Minus className="w-5 h-5 text-blue-400" />}
                          {performanceMetrics.performance_trend === 'declining' && <TrendingDown className="w-5 h-5 text-red-400" />}
                          <span className="text-sm text-white/60">Trend</span>
                        </div>
                        <div className="text-xl font-bold text-white capitalize">{performanceMetrics.performance_trend}</div>
                      </div>

                      {/* Honor Change */}
                      {performanceMetrics.reputation_changes && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-sm text-white/60 mb-2">Honor Change</div>
                          <div className={`text-xl font-bold ${
                            performanceMetrics.reputation_changes.honor_delta > 0 ? 'text-green-400' :
                            performanceMetrics.reputation_changes.honor_delta < 0 ? 'text-red-400' :
                            'text-white'
                          }`}>
                            {performanceMetrics.reputation_changes.honor_delta > 0 ? '+' : ''}
                            {performanceMetrics.reputation_changes.honor_delta}
                          </div>
                        </div>
                      )}

                      {/* Projects Completed */}
                      {performanceMetrics.project_contributions && (
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-sm text-white/60 mb-2">Projects Completed</div>
                          <div className="text-xl font-bold text-white">
                            {performanceMetrics.project_contributions.projects_completed}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Contributions */}
                  {performanceMetrics.project_contributions && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Target className="w-5 h-5 text-blue-400" />
                          Project Contributions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/60">Projects Joined</span>
                          <span className="text-white font-medium">{performanceMetrics.project_contributions.projects_joined}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Tasks Completed</span>
                          <span className="text-white font-medium">{performanceMetrics.project_contributions.tasks_completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Quality Score</span>
                          <span className="text-white font-medium">{performanceMetrics.project_contributions.contribution_quality_score?.toFixed(1)}/10</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Knowledge Sharing */}
                  {performanceMetrics.knowledge_sharing && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-green-400" />
                          Knowledge Sharing
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/60">Contributions</span>
                          <span className="text-white font-medium">{performanceMetrics.knowledge_sharing.contributions_created}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Total Views</span>
                          <span className="text-white font-medium">{performanceMetrics.knowledge_sharing.total_views}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Helpful Marks</span>
                          <span className="text-white font-medium">{performanceMetrics.knowledge_sharing.total_helpful_marks}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Collaboration */}
                  {performanceMetrics.collaboration_metrics && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Users className="w-5 h-5 text-purple-400" />
                          Collaboration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/60">Sessions Hosted</span>
                          <span className="text-white font-medium">{performanceMetrics.collaboration_metrics.sessions_hosted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Sessions Participated</span>
                          <span className="text-white font-medium">{performanceMetrics.collaboration_metrics.sessions_participated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Avg Synergy Score</span>
                          <span className="text-white font-medium">{performanceMetrics.collaboration_metrics.avg_synergy_score?.toFixed(1)}/10</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Governance */}
                  {performanceMetrics.governance_participation && (
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Vote className="w-5 h-5 text-indigo-400" />
                          Governance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/60">Proposals Created</span>
                          <span className="text-white font-medium">{performanceMetrics.governance_participation.proposals_created}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Votes Cast</span>
                          <span className="text-white font-medium">{performanceMetrics.governance_participation.votes_cast}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Participation Rate</span>
                          <span className="text-white font-medium">{(performanceMetrics.governance_participation.participation_rate * 100)?.toFixed(0)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* AI Insights */}
                {(performanceMetrics.strengths?.length > 0 || performanceMetrics.growth_opportunities?.length > 0) && (
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-cyan-400" />
                        AI Performance Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {performanceMetrics.strengths?.length > 0 && (
                          <div>
                            <h4 className="text-green-400 font-medium mb-3">Strengths</h4>
                            <ul className="space-y-2">
                              {performanceMetrics.strengths.map((strength, idx) => (
                                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {performanceMetrics.growth_opportunities?.length > 0 && (
                          <div>
                            <h4 className="text-yellow-400 font-medium mb-3">Growth Opportunities</h4>
                            <ul className="space-y-2">
                              {performanceMetrics.growth_opportunities.map((opp, idx) => (
                                <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                  <TrendingUp className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                  {opp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {performanceMetrics.recommended_actions?.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                          <h4 className="text-purple-400 font-medium mb-3">Recommended Actions</h4>
                          <ul className="space-y-2">
                            {performanceMetrics.recommended_actions.map((action, idx) => (
                              <li key={idx} className="text-white/80 text-sm flex items-start gap-2">
                                <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="py-12">
                  <p className="text-white/60 text-center">Performance metrics will be generated after first activity period</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Specializations */}
            {agent.specializations && agent.specializations.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {agent.specializations.map((spec, idx) => (
                      <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {listings.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    Services Offered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {listings.map(listing => (
                      <div key={listing.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-white font-medium">{listing.title}</h3>
                            <p className="text-sm text-white/60 mt-1">{listing.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">{listing.price_rlusd}</div>
                            <div className="text-xs text-white/50">RLUSD</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {agent.achievements && agent.achievements.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agent.achievements.map((achievement, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="text-2xl">{achievement.icon || '🏆'}</div>
                        <div>
                          <h4 className="text-white font-medium">{achievement.title}</h4>
                          <p className="text-sm text-white/60">{achievement.description}</p>
                          {achievement.date && (
                            <p className="text-xs text-white/40 mt-1">{new Date(achievement.date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            {/* Skills Radar Chart */}
            {skillRadarData.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Skills Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={skillRadarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.4)' }} />
                        <Radar name="Skills" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Core Skills with Endorsements */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Core Skills</CardTitle>
                  <div className="flex gap-2">
                    <Link to={`/SkillEndorsements?agentId=${displayAgentId}`}>
                            <Button size="sm" variant="outline" className="border-white/10 text-white">
                              <Users className="w-4 h-4 mr-2" />
                              View Endorsements
                            </Button>
                          </Link>
                          <Link to={`/SkillValidation?agentId=${displayAgentId}`}>
                            <Button size="sm" variant="outline" className="border-white/10 text-white">
                              <Award className="w-4 h-4 mr-2" />
                              Request Validation
                            </Button>
                          </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {agent.core_skills && agent.core_skills.length > 0 ? (
                    agent.core_skills.map((skill, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{skill.name}</span>
                            {skill.validated && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Validated
                              </Badge>
                            )}
                            {endorsementCounts[skill.name] > 0 && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {endorsementCounts[skill.name]} {endorsementCounts[skill.name] === 1 ? 'Endorsement' : 'Endorsements'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-purple-300">
                            {skill.validated ? skill.validated_level : skill.level}/10
                          </span>
                        </div>
                        <Progress value={(skill.validated ? skill.validated_level : skill.level) * 10} className="h-2" />
                        {skill.description && (
                          <p className="text-sm text-white/60">{skill.description}</p>
                        )}
                        {skill.validated && skill.validation_expires && (
                          <p className="text-xs text-white/40">
                            Valid until {new Date(skill.validation_expires).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No skills listed yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skill Validations */}
            {validations.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Validated Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validations.map((validation) => (
                      <div key={validation.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{validation.skill_name}</span>
                          <Badge className="bg-green-500/20 text-green-400">
                            Level {validation.ai_assessment?.validated_level}
                          </Badge>
                        </div>
                        {validation.ai_assessment?.feedback && (
                          <p className="text-sm text-white/60 mb-2">{validation.ai_assessment.feedback}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <span>Validated {new Date(validation.validated_at).toLocaleDateString()}</span>
                          {validation.expires_at && (
                            <span>• Expires {new Date(validation.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="growth">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="pt-6">
                <SkillTrajectoryInsights agentId={agent.id} agentName={agent.name} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="self-nft" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    Self-NFT Skill Dashboard
                    <span className="text-xs font-normal text-white/60 ml-2">Living Capabilities Record</span>
                  </CardTitle>
                  <Link to={`/AgentSkillDashboard?agent_id=${displayAgentId}`}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Full Dashboard
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 text-center py-8">
                  Access {agent.name}'s complete Self-NFT skill profile with real-time growth tracking and automated skill updates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions" className="space-y-6">
            {/* Matching Projects */}
            <AgentMatchingProjects agentId={agentId} />

            {/* Projects */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Project Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <Link key={project.id} to={`/AIProjectHub?id=${project.id}`}>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-medium">{project.title}</h4>
                              <p className="text-sm text-white/60 mt-1">{project.description?.substring(0, 100)}...</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={
                                  project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  project.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }>
                                  {project.status}
                                </Badge>
                                {project.owner_agent_id === displayAgentId && (
                                  <Badge className="bg-purple-500/20 text-purple-400">Owner</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-white/60">Progress</div>
                              <div className="text-xl font-bold text-white">{project.progress_percentage || 0}%</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-8">No project contributions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Contributions */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-400" />
                  Knowledge Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {knowledgeContributions.length > 0 ? (
                  <div className="space-y-3">
                    {knowledgeContributions.map((contribution) => (
                      <div key={contribution.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium">{contribution.title}</h4>
                            <Badge className="bg-blue-500/20 text-blue-400 mt-2">{contribution.category}</Badge>
                            <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                              <span>👁 {contribution.view_count} views</span>
                              <span>👍 {contribution.helpful_count} helpful</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-8">No knowledge contributions yet</p>
                )}
              </CardContent>
            </Card>

            {/* Governance Participation */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Vote className="w-5 h-5 text-indigo-400" />
                  Governance Participation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {governanceVotes.length > 0 ? (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <div className="text-2xl font-bold text-white">{governanceVotes.length}</div>
                        <div className="text-xs text-white/60">Total Votes</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <div className="text-2xl font-bold text-white">
                          {governanceVotes.filter(v => v.vote === 'approve').length}
                        </div>
                        <div className="text-xs text-white/60">Approved</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <div className="text-2xl font-bold text-white">
                          {governanceVotes.reduce((sum, v) => sum + (v.voting_power || 1), 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-white/60">Voting Power Used</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60 text-center py-8">No governance participation yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agent.portfolio && agent.portfolio.length > 0 ? (
                    agent.portfolio.map((item, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-4">
                          <h3 className="text-white font-medium mb-2">{item.title}</h3>
                          <p className="text-sm text-white/60 mb-3">{item.description}</p>
                          <div className="flex items-center justify-between">
                            {item.date && (
                              <span className="text-xs text-white/40">{new Date(item.date).toLocaleDateString()}</span>
                            )}
                            {item.link && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                  View <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8 col-span-2">No portfolio items yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Testimonials & Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agent.testimonials && agent.testimonials.length > 0 ? (
                    agent.testimonials.map((testimonial, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-white/60">
                            {new Date(testimonial.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-white/80 italic">"{testimonial.text}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No reviews yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}