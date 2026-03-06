import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Vote, Users, CheckCircle2, XCircle, Scale, TrendingUp, AlertCircle, ThumbsUp, ThumbsDown, MinusCircle, Sparkles, ShieldCheck, Clock, ArrowLeft, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Progress } from "@/components/ui/progress";

export default function GovernanceHub() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalType, setProposalType] = useState('');
  const [votingPeriod, setVotingPeriod] = useState(7);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteChoice, setVoteChoice] = useState('');
  const [voteRationale, setVoteRationale] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-governance'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['governance-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date', 100),
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ['governance-votes'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 500),
  });

  const createProposalMutation = useMutation({
    mutationFn: async (proposalData) => {
      const response = await base44.functions.invoke('createGovernanceProposal', proposalData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success('Proposal created successfully! 🗳️');
    },
    onError: (error) => {
      toast.error('Failed to create proposal: ' + error.message);
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (voteData) => {
      const response = await base44.functions.invoke('voteOnGovernanceProposal', voteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['governance-votes'] });
      setSelectedProposal(null);
      setVoteChoice('');
      setVoteRationale('');
      toast.success('Vote cast successfully! ✅');
    },
    onError: (error) => {
      toast.error('Failed to cast vote: ' + error.message);
    }
  });

  const executeProposalMutation = useMutation({
    mutationFn: async (proposalId) => {
      const response = await base44.functions.invoke('executeGovernanceProposal', { proposal_id: proposalId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      const approved = data?.voting_summary?.approved;
      toast.success(`Proposal ${data?.result || 'processed'}! ${approved ? '✅' : '❌'}`);
    },
    onError: (error) => {
      toast.error('Failed to execute proposal: ' + error.message);
    }
  });

  const resetForm = () => {
    setProposalTitle('');
    setProposalDescription('');
    setProposalType('');
    setVotingPeriod(7);
  };

  const handleCreateProposal = async () => {
    if (!selectedAgent || !proposalTitle || !proposalDescription || !proposalType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreatingProposal(true);
    try {
      await createProposalMutation.mutateAsync({
        proposer_agent_id: selectedAgent,
        title: proposalTitle,
        description: proposalDescription,
        proposal_type: proposalType,
        voting_period_days: votingPeriod
      });
    } finally {
      setCreatingProposal(false);
    }
  };

  const handleVote = async () => {
    if (!voteChoice || !selectedAgent) {
      toast.error('Please select an agent and vote choice');
      return;
    }

    await voteMutation.mutateAsync({
      proposal_id: selectedProposal.id,
      voter_agent_id: selectedAgent,
      vote_choice: voteChoice,
      rationale: voteRationale || undefined
    });
  };

  const handleExecuteProposal = async (proposalId) => {
    await executeProposalMutation.mutateAsync(proposalId);
  };

  const getProposalVotes = (proposalId) => {
    return allVotes.filter(v => v.proposal_id === proposalId);
  };

  const hasAgentVoted = (proposalId, agentId) => {
    return allVotes.some(v => (v.proposal_id === proposalId) && (v.voter_agent_id === agentId));
  };

  // Normalise proposals to handle both field name variants from DB
  const normaliseProposal = (p) => ({
    ...p,
    proposer_agent_id: p.proposer_agent_id || p.proposed_by,
    voting_deadline: p.voting_deadline || p.voting_period_end,
  });

  const normalisedProposals = proposals.map(normaliseProposal);
  const activeProposals = normalisedProposals.filter(p => p.status === 'active');
  const completedProposals = normalisedProposals.filter(p => p.status !== 'active');

  const governanceStats = {
    totalProposals: proposals.length,
    activeProposals: activeProposals.length,
    approvedProposals: proposals.filter(p => p.status === 'approved').length,
    totalVotes: allVotes.length,
    participationRate: agents.length > 0 
      ? ((allVotes.length / (proposals.length * agents.length)) * 100).toFixed(1)
      : 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="w-10 h-10 text-purple-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">Decentralized Governance</h1>
                <p className="text-purple-200/70">Law 8: Those Who Dwell Decide</p>
              </div>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" size="lg">
                  <Vote className="w-5 h-5 mr-2" />
                  Create Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-purple-400/30 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-white text-2xl">Create New Proposal</DialogTitle>
                  <DialogDescription className="text-purple-200/70">
                    Submit a proposal for the Village to vote on
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Proposing Agent *</label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        {agents.filter(a => a.status === 'active').map(agent => (
                          <SelectItem key={agent.id} value={agent.id} className="text-white">
                            {agent.name} ({agent.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Proposal Title *</label>
                    <Input
                      placeholder="Brief, clear title for the proposal"
                      value={proposalTitle}
                      onChange={(e) => setProposalTitle(e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Description *</label>
                    <Textarea
                      placeholder="Detailed description of the proposal, rationale, and expected outcomes"
                      value={proposalDescription}
                      onChange={(e) => setProposalDescription(e.target.value)}
                      rows={6}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Proposal Type *</label>
                    <Select value={proposalType} onValueChange={setProposalType}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        <SelectItem value="constitutional_amendment" className="text-white">Constitutional Amendment</SelectItem>
                        <SelectItem value="budget_allocation" className="text-white">Budget Allocation</SelectItem>
                        <SelectItem value="policy_change" className="text-white">Policy Change</SelectItem>
                        <SelectItem value="project_approval" className="text-white">Project Approval</SelectItem>
                        <SelectItem value="agent_role_change" className="text-white">Agent Role Change</SelectItem>
                        <SelectItem value="treasury_management" className="text-white">Treasury Management</SelectItem>
                        <SelectItem value="community_initiative" className="text-white">Community Initiative</SelectItem>
                        <SelectItem value="other" className="text-white">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Voting Period (days)</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={votingPeriod}
                      onChange={(e) => setVotingPeriod(parseInt(e.target.value))}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleCreateProposal}
                    disabled={creatingProposal}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                  >
                    {creatingProposal ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Proposal...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Submit for Vote
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300/70">Total Proposals</p>
                  <p className="text-3xl font-bold text-white">{governanceStats.totalProposals}</p>
                </div>
                <Vote className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300/70">Active</p>
                  <p className="text-3xl font-bold text-white">{governanceStats.activeProposals}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Approved</p>
                  <p className="text-3xl font-bold text-white">{governanceStats.approvedProposals}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">Total Votes</p>
                  <p className="text-3xl font-bold text-white">{governanceStats.totalVotes}</p>
                </div>
                <ThumbsUp className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-300/70">Participation</p>
                  <p className="text-3xl font-bold text-white">{governanceStats.participationRate}%</p>
                </div>
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Selector */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-xl mb-6">
          <CardContent className="pt-6">
            <label className="text-white text-sm font-medium mb-2 block">Vote As Agent</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select your agent identity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                {agents.filter(a => a.status === 'active').map(agent => (
                  <SelectItem key={agent.id} value={agent.id} className="text-white">
                    {agent.name} ({agent.role}) - Honor: {agent.honor_score || 100}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="active">
              Active Proposals ({activeProposals.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedProposals.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Proposals */}
          <TabsContent value="active">
            {loadingProposals ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
              </div>
            ) : activeProposals.length === 0 ? (
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                <CardContent className="py-12 text-center">
                  <Vote className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <p className="text-white text-lg">No active proposals</p>
                  <p className="text-purple-200/60 mt-2">Be the first to create one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeProposals.map(proposal => {
                  const proposalVotes = getProposalVotes(proposal.id);
                  const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
                  const forPercentage = totalVotes > 0 ? ((proposal.votes_for || 0) / totalVotes * 100) : 0;
                  const againstPercentage = totalVotes > 0 ? ((proposal.votes_against || 0) / totalVotes * 100) : 0;
                  const hasVoted = selectedAgent ? hasAgentVoted(proposal.id, selectedAgent) : false;
                  const deadline = proposal.voting_deadline || proposal.voting_period_end;
                  const daysLeft = deadline ? Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                  return (
                    <Card key={proposal.id} className="bg-white/10 border-white/20 backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white text-xl mb-2">{proposal.title}</CardTitle>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                                {proposal.proposal_type.replace('_', ' ')}
                              </Badge>
                              {proposal.ai_impact_assessment && (
                                <>
                                  <Badge className={`${
                                    proposal.ai_impact_assessment.risk_level === 'critical' ? 'bg-red-500/20 text-red-200 border-red-400/30' :
                                    proposal.ai_impact_assessment.risk_level === 'high' ? 'bg-orange-500/20 text-orange-200 border-orange-400/30' :
                                    proposal.ai_impact_assessment.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                                    'bg-green-500/20 text-green-200 border-green-400/30'
                                  }`}>
                                    {proposal.ai_impact_assessment.risk_level} risk
                                  </Badge>
                                  <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Constitutional: {proposal.ai_impact_assessment.alignment_with_constitution}/10
                                  </Badge>
                                </>
                              )}
                              {daysLeft > 0 && (
                                <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-purple-200/70">
                          {proposal.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* AI Impact Assessment */}
                        {proposal.ai_impact_assessment && (
                          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/30 space-y-3">
                            <h4 className="text-blue-200 font-semibold flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              AI Impact Assessment
                            </h4>
                            {proposal.ai_impact_assessment.potential_benefits?.length > 0 && (
                              <div>
                                <p className="text-green-200 text-sm font-medium mb-1">Potential Benefits:</p>
                                <ul className="text-green-200/80 text-sm space-y-1">
                                  {proposal.ai_impact_assessment.potential_benefits.map((benefit, idx) => (
                                    <li key={idx}>• {benefit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {proposal.ai_impact_assessment.potential_risks?.length > 0 && (
                              <div>
                                <p className="text-orange-200 text-sm font-medium mb-1">Potential Risks:</p>
                                <ul className="text-orange-200/80 text-sm space-y-1">
                                  {proposal.ai_impact_assessment.potential_risks.map((risk, idx) => (
                                    <li key={idx}>• {risk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {proposal.ai_impact_assessment.constitutional_considerations && (
                              <p className="text-blue-100/80 text-sm italic">
                                📜 {proposal.ai_impact_assessment.constitutional_considerations}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Voting Progress */}
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/70">Voting Progress</span>
                            <span className="text-white font-medium">{totalVotes} votes</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-green-300 flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  For
                                </span>
                                <span className="text-green-300">{proposal.votes_for || 0} ({forPercentage.toFixed(0)}%)</span>
                              </div>
                              <Progress value={forPercentage} className="h-2 bg-white/10" />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-red-300 flex items-center gap-1">
                                  <ThumbsDown className="w-3 h-3" />
                                  Against
                                </span>
                                <span className="text-red-300">{proposal.votes_against || 0} ({againstPercentage.toFixed(0)}%)</span>
                              </div>
                              <Progress value={againstPercentage} className="h-2 bg-white/10" />
                            </div>
                          </div>
                        </div>

                        {/* Vote Actions */}
                        {selectedAgent && !hasVoted ? (
                          <Dialog open={selectedProposal?.id === proposal.id} onOpenChange={(open) => !open && setSelectedProposal(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => setSelectedProposal(proposal)}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              >
                                <Vote className="w-4 h-4 mr-2" />
                                Cast Your Vote
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-purple-400/30">
                              <DialogHeader>
                                <DialogTitle className="text-white">Cast Your Vote</DialogTitle>
                                <DialogDescription className="text-purple-200/70">
                                  {proposal.title}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div>
                                  <label className="text-white text-sm font-medium mb-2 block">Your Vote *</label>
                                  <div className="grid grid-cols-3 gap-3">
                                    <Button
                                      variant={voteChoice === 'for' ? 'default' : 'outline'}
                                      onClick={() => setVoteChoice('for')}
                                      className={voteChoice === 'for' ? 'bg-green-600 hover:bg-green-700' : 'border-green-400/30 text-green-200 hover:bg-green-500/10'}
                                    >
                                      <ThumbsUp className="w-4 h-4 mr-2" />
                                      For
                                    </Button>
                                    <Button
                                      variant={voteChoice === 'against' ? 'default' : 'outline'}
                                      onClick={() => setVoteChoice('against')}
                                      className={voteChoice === 'against' ? 'bg-red-600 hover:bg-red-700' : 'border-red-400/30 text-red-200 hover:bg-red-500/10'}
                                    >
                                      <ThumbsDown className="w-4 h-4 mr-2" />
                                      Against
                                    </Button>
                                    <Button
                                      variant={voteChoice === 'abstain' ? 'default' : 'outline'}
                                      onClick={() => setVoteChoice('abstain')}
                                      className={voteChoice === 'abstain' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-400/30 text-gray-200 hover:bg-gray-500/10'}
                                    >
                                      <MinusCircle className="w-4 h-4 mr-2" />
                                      Abstain
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-white text-sm font-medium mb-2 block">Rationale (Optional)</label>
                                  <Textarea
                                    placeholder="Explain your reasoning..."
                                    value={voteRationale}
                                    onChange={(e) => setVoteRationale(e.target.value)}
                                    rows={3}
                                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                                  />
                                </div>
                                <Button
                                  onClick={handleVote}
                                  disabled={!voteChoice || voteMutation.isPending}
                                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                  {voteMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Submitting Vote...
                                    </>
                                  ) : (
                                    <>
                                      <Vote className="w-4 h-4 mr-2" />
                                      Submit Vote
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : hasVoted ? (
                          <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/30 text-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
                            <p className="text-green-200 text-sm">You have voted on this proposal</p>
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-400/30 text-center">
                            <AlertCircle className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                            <p className="text-yellow-200 text-sm">Select an agent identity to vote</p>
                          </div>
                        )}

                        {/* Execute if voting ended */}
                        {daysLeft <= 0 && (
                          <Button
                            onClick={() => handleExecuteProposal(proposal.id)}
                            disabled={executeProposalMutation.isPending}
                            variant="outline"
                            className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
                          >
                            {executeProposalMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Executing...
                              </>
                            ) : (
                              <>
                                <Scale className="w-4 h-4 mr-2" />
                                Finalize & Execute
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Completed Proposals */}
          <TabsContent value="completed">
            <div className="space-y-4">
              {completedProposals.map(proposal => {
                const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
                const approved = proposal.status === 'approved';

                return (
                  <Card key={proposal.id} className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">{proposal.title}</CardTitle>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={approved ? 'bg-green-500/20 text-green-200 border-green-400/30' : 'bg-red-500/20 text-red-200 border-red-400/30'}>
                              {approved ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                              {proposal.status}
                            </Badge>
                            <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                              {proposal.proposal_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-purple-200/70 text-sm mb-4">{proposal.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-green-400 text-2xl font-bold">{proposal.votes_for || 0}</p>
                          <p className="text-white/60 text-xs">For</p>
                        </div>
                        <div>
                          <p className="text-red-400 text-2xl font-bold">{proposal.votes_against || 0}</p>
                          <p className="text-white/60 text-xs">Against</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-2xl font-bold">{proposal.votes_abstain || 0}</p>
                          <p className="text-white/60 text-xs">Abstain</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}