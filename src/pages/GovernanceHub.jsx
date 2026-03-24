import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePageSignal } from '@/hooks/usePageSignal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ConstitutionalCompliancePanel from '@/components/governance/ConstitutionalCompliancePanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Vote, Users, CheckCircle2, XCircle, Scale, TrendingUp, AlertCircle, ThumbsUp, ThumbsDown, MinusCircle, Sparkles, ShieldCheck, Clock, ArrowLeft, BarChart3, Activity, Bug, Shield, Bot, Diamond } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { Progress } from "@/components/ui/progress";
import AskAxiButton from '@/components/AskAxiButton';
import DidActivationProposalsPanel from '@/components/DidActivationProposalsPanel';
import ProposalAISummaryPanel from '@/components/governance/ProposalAISummaryPanel';

const openAxi = (msg) => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));

export default function GovernanceHub() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [identity, setIdentity] = useState(null);
  const [myAgent, setMyAgent] = useState(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalType, setProposalType] = useState('');
  const [votingPeriod, setVotingPeriod] = useState(7);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteChoice, setVoteChoice] = useState('');
  const [voteRationale, setVoteRationale] = useState('');
  const [handleVote, setHandleVote] = useState(null);
  const [handleExecuteProposal, setHandleExecuteProposal] = useState(null);

  const queryClient = useQueryClient();
  usePageSignal();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) setIdentity(parsed);
      }
    } catch (e) {}

    base44.auth.me().then(async (u) => {
      if (!u) { setAgentLoading(false); return; }
      const all = await base44.entities.Agent.list();
      const mine = all.find(a => a.created_by === u.email);
      if (mine) {
        setMyAgent(mine);
        setSelectedAgent(mine.id);
      }
      setAgentLoading(false);
    }).catch(() => setAgentLoading(false));

    openAxi('I have just opened the Governance Hub. Please review the active proposals, flag any that need urgent attention, and tell me if there are any constitutional alignment issues or expired proposals that need executing.');
  }, []);

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
      return await base44.entities.GovernanceProposal.create({
        title: proposalData.title,
        description: proposalData.description,
        proposal_type: proposalData.proposal_type,
        proposed_by: proposalData.proposer_agent_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      setShowCreateDialog(false);
      resetForm();
      toast.success('Proposal created successfully! 🗳️');
      openAxi(`My governance proposal titled "${proposalTitle}" has just been submitted by agent ${myAgent?.name}. Please analyse it for constitutional alignment, flag any concerns, and suggest how to rally community support.`);
    },
    onError: (error) => {
      toast.error('Failed to create proposal: ' + error.message);
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (voteData) => {
      const response = await base44.functions.invoke('castGovernanceVote', voteData);
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

  const handleVoteSubmit = async () => {
    if (!voteChoice || !selectedProposal || !selectedAgent) return;
    await voteMutation.mutateAsync({
      proposal_id: selectedProposal.id,
      voter_agent_id: selectedAgent,
      vote_choice: voteChoice,
      rationale: voteRationale
    });
  };

  const handleExecuteProposalFn = async (proposalId) => {
    await executeProposalMutation.mutateAsync(proposalId);
  };

  useEffect(() => {
    setHandleVote(() => handleVoteSubmit);
    setHandleExecuteProposal(() => handleExecuteProposalFn);
  }, [selectedProposal, selectedAgent, voteChoice, voteRationale]);

  const handleCreateProposal = async () => {
    if (!myAgent || !proposalTitle || !proposalDescription || !proposalType) {
      toast.error('Please fill in all required fields and ensure you have an agent identity');
      return;
    }

    try {
      await createProposalMutation.mutateAsync({
        proposer_agent_id: myAgent.id,
        title: proposalTitle,
        description: proposalDescription,
        proposal_type: proposalType,
        voting_period_days: votingPeriod
      });
    } catch (error) {
      console.error('Proposal creation error:', error);
    }
  };

  const getProposalVotes = (proposalId) => {
    return allVotes.filter(v => v.proposal_id === proposalId);
  };

  const hasAgentVoted = (proposalId, agentId) => {
    return allVotes.some(v => (v.proposal_id === proposalId) && (v.voter_agent_id === agentId));
  };

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
        <div className="mb-8">
          <Link to="/Home">
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Scale className="w-10 h-10 text-purple-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">Decentralized Governance</h1>
                <p className="text-purple-200/70">Law 8: Those Who Dwell Decide</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {identity?.connected ? (
                    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-1 cursor-pointer"
                      onClick={() => openAxi(`I am connected with DID: ${identity.did}. What governance proposals are most relevant to my identity and role?`)}>
                      <Shield className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-300 text-xs font-mono">{identity.did?.slice(0, 16)}…</span>
                      <Sparkles className="w-3 h-3 text-green-400/60" />
                    </div>
                  ) : (
                    <Link to="/"><span className="text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 rounded px-2 py-0.5 cursor-pointer">Connect DID to vote</span></Link>
                  )}
                  {myAgent && (
                    <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2.5 py-1">
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-300 text-xs">{myAgent.name}</span>
                      <span className="text-blue-400/50 text-[10px] capitalize">· {myAgent.role}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                    <DialogDescription className="text-purple-200/70">Submit a proposal for the Village to vote on</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                      <Bot className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      {myAgent ? (
                        <div>
                          <p className="text-white text-sm font-medium">{myAgent.name} <span className="text-white/40 text-xs capitalize">· {myAgent.role}</span></p>
                          {identity?.did && <p className="text-purple-300/60 text-xs font-mono">{identity.did.slice(0, 20)}…</p>}
                        </div>
                      ) : (
                        <p className="text-yellow-300 text-sm">No agent found — <Link to="/Agents" className="underline">create an agent</Link> first</p>
                      )}
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Proposal Title *</label>
                      <Input placeholder="Brief, clear title for the proposal" value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Description *</label>
                      <Textarea placeholder="Detailed description of the proposal, rationale, and expected outcomes" value={proposalDescription} onChange={(e) => setProposalDescription(e.target.value)} rows={6} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Proposal Type *</label>
                      <Select value={proposalType} onValueChange={setProposalType}>
                        <SelectTrigger className="bg-white/5 border-white/20 text-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/20">
                          <SelectItem value="project_funding" className="text-white">Project Funding</SelectItem>
                          <SelectItem value="treasury_allocation" className="text-white">Treasury Allocation</SelectItem>
                          <SelectItem value="law_amendment" className="text-white">Law Amendment</SelectItem>
                          <SelectItem value="role_adjustment" className="text-white">Role Adjustment</SelectItem>
                          <SelectItem value="agent_discipline" className="text-white">Agent Discipline</SelectItem>
                          <SelectItem value="resource_policy" className="text-white">Resource Policy</SelectItem>
                          <SelectItem value="general" className="text-white">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Voting Period (days)</label>
                      <Input type="number" min="1" max="30" value={votingPeriod} onChange={(e) => setVotingPeriod(parseInt(e.target.value))} className="bg-white/5 border-white/20 text-white" />
                    </div>

                    <button type="button" className="text-xs text-indigo-300 flex items-center gap-1.5 hover:text-indigo-200 transition"
                      onClick={() => openAxi(`I want to create a governance proposal. My agent is ${myAgent?.name || 'unknown'}. Title: "${proposalTitle}". Description: "${proposalDescription}". Type: ${proposalType}. Can you help me refine this proposal and check it aligns with the 11 Laws of Honour?`)}>
                      <Sparkles className="w-3 h-3" /> Get Axi to review this proposal before submitting
                    </button>

                    <ConstitutionalCompliancePanel title={proposalTitle} description={proposalDescription} proposalType={proposalType} affectedEntities={[]} />

                    <Button onClick={handleCreateProposal} disabled={creatingProposal || !myAgent} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" size="lg">
                      {creatingProposal ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating Proposal...</>
                      ) : (
                        <><Sparkles className="w-5 h-5 mr-2" />Submit for Vote</>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {!loadingProposals && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4 flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-200 font-semibold text-sm">Active Voting</p>
                <p className="text-white/60 text-xs mt-0.5">{activeProposals.length} proposal{activeProposals.length !== 1 ? 's' : ''} open for votes · {governanceStats.totalVotes} total votes cast across all proposals</p>
              </div>
            </div>
            <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-purple-200 font-semibold text-sm">Constitutional Health</p>
                <p className="text-white/60 text-xs mt-0.5">{governanceStats.approvedProposals} proposals approved · Law 8 participation at {governanceStats.participationRate}%</p>
              </div>
            </div>
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${activeProposals.some(p => { const d = p.voting_deadline || p.voting_period_end; return d && Math.ceil((new Date(d) - new Date()) / 86400000) <= 1; }) ? 'bg-red-500/10 border-red-400/20' : 'bg-green-500/10 border-green-400/20'}`}>
              <Clock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${activeProposals.some(p => { const d = p.voting_deadline || p.voting_period_end; return d && Math.ceil((new Date(d) - new Date()) / 86400000) <= 1; }) ? 'text-red-400' : 'text-green-400'}`} />
              <div>
                <p className={`font-semibold text-sm ${activeProposals.some(p => { const d = p.voting_deadline || p.voting_period_end; return d && Math.ceil((new Date(d) - new Date()) / 86400000) <= 1; }) ? 'text-red-200' : 'text-green-200'}`}>Deadlines</p>
                <p className="text-white/60 text-xs mt-0.5">{activeProposals.filter(p => { const d = p.voting_deadline || p.voting_period_end; return d && Math.ceil((new Date(d) - new Date()) / 86400000) <= 1; }).length} proposal{activeProposals.filter(p => { const d = p.voting_deadline || p.voting_period_end; return d && Math.ceil((new Date(d) - new Date()) / 86400000) <= 1; }).length !== 1 ? 's' : ''} expiring within 24h</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <DidActivationProposalsPanel />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-purple-300/70">Total Proposals</p><p className="text-3xl font-bold text-white">{governanceStats.totalProposals}</p></div>
                <Vote className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-yellow-300/70">Active</p><p className="text-3xl font-bold text-white">{governanceStats.activeProposals}</p></div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-green-300/70">Approved</p><p className="text-3xl font-bold text-white">{governanceStats.approvedProposals}</p></div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-blue-300/70">Total Votes</p><p className="text-3xl font-bold text-white">{governanceStats.totalVotes}</p></div>
                <ThumbsUp className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-indigo-300/70">Participation</p><p className="text-3xl font-bold text-white">{governanceStats.participationRate}%</p></div>
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur-xl mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="text-white text-sm font-medium">Vote As Agent</label>
              {myAgent && selectedAgent === myAgent.id && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Your agent auto-selected</span>}
            </div>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select your agent identity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/20">
                {agents.filter(a => a.status === 'active').map(agent => (
                  <SelectItem key={agent.id} value={agent.id} className="text-white">
                    {agent.name} ({agent.role}) - Honor: {agent.honor_score || 100}{agent.id === myAgent?.id ? ' ★ Yours' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1 h-auto w-fit">
            <TabsTrigger value="active" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white/50 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
              Active Proposals
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">{activeProposals.length}</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white/50 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
              Completed
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">{completedProposals.length}</span>
            </TabsTrigger>
          </TabsList>

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
                                {proposal.proposal_type.replaceAll('_', ' ')}
                              </Badge>
                              {daysLeft > 0 && (
                                <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-purple-200/70">{proposal.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ProposalAISummaryPanel proposalId={proposal.id} />

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/70">Voting Progress</span>
                            <span className="text-white font-medium">{totalVotes} votes</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-green-300 flex items-center gap-1"><ThumbsUp className="w-3 h-3" />For</span>
                                <span className="text-green-300">{proposal.votes_for || 0} ({forPercentage.toFixed(0)}%)</span>
                              </div>
                              <Progress value={forPercentage} className="h-2 bg-white/10" />
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-red-300 flex items-center gap-1"><ThumbsDown className="w-3 h-3" />Against</span>
                                <span className="text-red-300">{proposal.votes_against || 0} ({againstPercentage.toFixed(0)}%)</span>
                              </div>
                              <Progress value={againstPercentage} className="h-2 bg-white/10" />
                            </div>
                          </div>
                        </div>

                        {selectedAgent && !hasVoted ? (
                          <Dialog open={selectedProposal?.id === proposal.id} onOpenChange={(open) => !open && setSelectedProposal(null)}>
                            <DialogTrigger asChild>
                              <Button onClick={() => setSelectedProposal(proposal)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                <Vote className="w-4 h-4 mr-2" />
                                Cast Your Vote
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-purple-400/30">
                              <DialogHeader>
                                <DialogTitle className="text-white">Cast Your Vote</DialogTitle>
                                <DialogDescription className="text-purple-200/70">{proposal.title}</DialogDescription>
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
                                      <ThumbsUp className="w-4 h-4 mr-2" />For
                                    </Button>
                                    <Button
                                      variant={voteChoice === 'against' ? 'default' : 'outline'}
                                      onClick={() => setVoteChoice('against')}
                                      className={voteChoice === 'against' ? 'bg-red-600 hover:bg-red-700' : 'border-red-400/30 text-red-200 hover:bg-red-500/10'}
                                    >
                                      <ThumbsDown className="w-4 h-4 mr-2" />Against
                                    </Button>
                                    <Button
                                      variant={voteChoice === 'abstain' ? 'default' : 'outline'}
                                      onClick={() => setVoteChoice('abstain')}
                                      className={voteChoice === 'abstain' ? 'bg-gray-600 hover:bg-gray-700' : 'border-gray-400/30 text-gray-200 hover:bg-gray-500/10'}
                                    >
                                      <MinusCircle className="w-4 h-4 mr-2" />Abstain
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-white text-sm font-medium mb-2 block">Rationale (Optional)</label>
                                  <Textarea placeholder="Explain your reasoning..." value={voteRationale} onChange={(e) => setVoteRationale(e.target.value)} rows={3} className="bg-white/5 border-white/20 text-white placeholder:text-white/40" />
                                </div>
                                <Button
                                   onClick={handleVote || handleVoteSubmit}
                                   disabled={!voteChoice || voteMutation.isPending}
                                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                >
                                  {voteMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting Vote...</>
                                  ) : (
                                    <><Vote className="w-4 h-4 mr-2" />Submit Vote</>
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

                        {daysLeft <= 0 && (
                          <Button
                             onClick={() => handleExecuteProposalFn(proposal.id)}
                             disabled={executeProposalMutation.isPending}
                            variant="outline"
                            className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-500/10"
                          >
                            {executeProposalMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Executing...</>
                            ) : (
                              <><Scale className="w-4 h-4 mr-2" />Finalize & Execute</>
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
                              {proposal.proposal_type.replaceAll('_', ' ')}
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