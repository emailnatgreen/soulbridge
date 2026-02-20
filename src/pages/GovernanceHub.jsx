import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Vote, CheckCircle, XCircle, Clock, Gavel, TrendingUp, Users, Loader2, AlertCircle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function GovernanceHub() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const queryClient = useQueryClient();

  const { data: proposals = [] } = useQuery({
    queryKey: ['governance-proposals'],
    queryFn: () => base44.entities.GovernanceProposal.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const activeProposals = proposals.filter(p => p.status === 'active');
  const passedProposals = proposals.filter(p => p.status === 'passed' || p.status === 'executed');
  const totalVotingPower = agents.reduce((sum, a) => {
    let power = 1 + (a.honor_score || 100) / 100;
    const multipliers = { elder: 1.5, master: 1.5, teacher: 1.3, guardian: 1.2 };
    return sum + (power * (multipliers[a.role] || 1.0));
  }, 0);

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
                <h1 className="text-2xl font-light text-white">Decentralized Governance</h1>
                <p className="text-sm text-purple-300/60">Those who dwell decide</p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Vote className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Governance Proposal</DialogTitle>
                </DialogHeader>
                <CreateProposalForm onClose={() => setCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{proposals.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Active Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{activeProposals.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{passedProposals.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Voting Power</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{totalVotingPower.toFixed(0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Proposals */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
              Active Proposals
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-purple-600">
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeProposals.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Vote className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Active Proposals</h3>
                  <p className="text-white/60 mb-6">Be the first to propose change</p>
                  <Button onClick={() => setCreateOpen(true)} className="bg-purple-600">
                    <Vote className="w-4 h-4 mr-2" />
                    Create Proposal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeProposals.map(proposal => (
                <ProposalCard 
                  key={proposal.id} 
                  proposal={proposal}
                  agents={agents}
                  totalVotingPower={totalVotingPower}
                  onClick={() => setSelectedProposal(proposal)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed">
            <div className="space-y-4">
              {passedProposals.map(proposal => (
                <ProposalCard 
                  key={proposal.id} 
                  proposal={proposal}
                  agents={agents}
                  totalVotingPower={totalVotingPower}
                  onClick={() => setSelectedProposal(proposal)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-4">
              {proposals.map(proposal => (
                <ProposalCard 
                  key={proposal.id} 
                  proposal={proposal}
                  agents={agents}
                  totalVotingPower={totalVotingPower}
                  onClick={() => setSelectedProposal(proposal)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      {selectedProposal && (
        <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <ProposalDetail 
              proposal={selectedProposal} 
              agents={agents}
              totalVotingPower={totalVotingPower}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProposalCard({ proposal, agents, totalVotingPower, onClick }) {
  const proposer = agents.find(a => a.id === proposal.proposed_by);
  const timeRemaining = new Date(proposal.voting_period_end) - new Date();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
  const participationRate = (proposal.total_voting_power_cast / totalVotingPower) * 100;
  
  const totalDecisive = proposal.votes_for + proposal.votes_against;
  const approvalRate = totalDecisive > 0 ? (proposal.votes_for / totalDecisive) * 100 : 0;

  const statusConfig = {
    active: { icon: Clock, color: 'bg-blue-500/20 text-blue-300', label: 'Active' },
    passed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-300', label: 'Passed' },
    rejected: { icon: XCircle, color: 'bg-red-500/20 text-red-300', label: 'Rejected' },
    executed: { icon: Gavel, color: 'bg-purple-500/20 text-purple-300', label: 'Executed' },
    expired: { icon: AlertCircle, color: 'bg-gray-500/20 text-gray-300', label: 'Expired' }
  };

  const config = statusConfig[proposal.status];
  const Icon = config.icon;

  return (
    <Card 
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={config.color}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          {proposal.status === 'active' && (
            <div className="text-sm text-white/60 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {hoursRemaining}h remaining
            </div>
          )}
        </div>
        <CardTitle className="text-xl text-white">{proposal.title}</CardTitle>
        <CardDescription className="text-white/70">
          Proposed by {proposer?.name || 'Unknown'} • {proposal.proposal_type.replace(/_/g, ' ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/80 text-sm line-clamp-2">{proposal.description}</p>

        {/* Vote Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/60">
            <span>Approval: {approvalRate.toFixed(1)}%</span>
            <span>Participation: {participationRate.toFixed(1)}%</span>
          </div>
          <Progress value={approvalRate} className="h-2" />
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-green-400">
              <ThumbsUp className="w-3 h-3" />
              {proposal.votes_for?.toFixed(1) || 0}
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <ThumbsDown className="w-3 h-3" />
              {proposal.votes_against?.toFixed(1) || 0}
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Minus className="w-3 h-3" />
              {proposal.votes_abstain?.toFixed(1) || 0}
            </div>
          </div>
        </div>

        {/* Thresholds */}
        <div className="flex gap-4 text-xs text-white/60">
          <div>Quorum: {proposal.quorum_required}%</div>
          <div>Pass: {proposal.pass_threshold}%</div>
          <div>Votes: {proposal.total_votes_cast || 0}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProposalDetail({ proposal, agents, totalVotingPower }) {
  const queryClient = useQueryClient();
  const proposer = agents.find(a => a.id === proposal.proposed_by);

  const { data: votes = [] } = useQuery({
    queryKey: ['governance-votes', proposal.id],
    queryFn: () => base44.entities.GovernanceVote.filter({ proposal_id: proposal.id })
  });

  const voteMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('castGovernanceVote', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['governance-proposals']);
      queryClient.invalidateQueries(['governance-votes']);
      toast.success('Vote cast successfully!');
    }
  });

  const executeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('executeGovernanceProposal', { proposal_id: proposal.id }),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['governance-proposals']);
      if (response.data.success) {
        toast.success('Proposal executed successfully!');
      } else {
        toast.error(response.data.reason || 'Execution failed');
      }
    }
  });

  const canVote = proposal.status === 'active' && new Date(proposal.voting_period_end) > new Date();
  const canExecute = proposal.status === 'passed' || 
    (proposal.status === 'active' && new Date(proposal.voting_period_end) < new Date());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{proposal.title}</h2>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span>By {proposer?.name || 'Unknown'}</span>
          <span>•</span>
          <Badge className="bg-purple-500/20 text-purple-300">
            {proposal.proposal_type.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/80 whitespace-pre-wrap">{proposal.description}</p>
        </CardContent>
      </Card>

      {/* Voting Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Voting Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{proposal.votes_for?.toFixed(1) || 0}</div>
              <div className="text-sm text-white/60">For</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{proposal.votes_against?.toFixed(1) || 0}</div>
              <div className="text-sm text-white/60">Against</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">{proposal.votes_abstain?.toFixed(1) || 0}</div>
              <div className="text-sm text-white/60">Abstain</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-white/60">
              <span>Participation: {((proposal.total_voting_power_cast / totalVotingPower) * 100).toFixed(1)}%</span>
              <span>Quorum: {proposal.quorum_required}%</span>
            </div>
            <Progress value={(proposal.total_voting_power_cast / totalVotingPower) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Vote Buttons */}
      {canVote && (
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => voteMutation.mutate({ proposal_id: proposal.id, vote_choice: 'for' })}
            disabled={voteMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Vote For
          </Button>
          <Button
            onClick={() => voteMutation.mutate({ proposal_id: proposal.id, vote_choice: 'against' })}
            disabled={voteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Vote Against
          </Button>
          <Button
            onClick={() => voteMutation.mutate({ proposal_id: proposal.id, vote_choice: 'abstain' })}
            disabled={voteMutation.isPending}
            variant="outline"
            className="bg-white/5 border-white/10 hover:bg-white/10"
          >
            <Minus className="w-4 h-4 mr-2" />
            Abstain
          </Button>
        </div>
      )}

      {/* Execute Button */}
      {canExecute && proposal.status !== 'executed' && (
        <Button
          onClick={() => executeMutation.mutate()}
          disabled={executeMutation.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {executeMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4 mr-2" />
              Execute Proposal
            </>
          )}
        </Button>
      )}

      {/* Votes List */}
      {votes.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Vote History ({votes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {votes.map((vote, idx) => {
                const voter = agents.find(a => a.id === vote.voter_agent_id);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                    <div className="flex items-center gap-3">
                      <Badge className={
                        vote.vote_choice === 'for' ? 'bg-green-500/20 text-green-300' :
                        vote.vote_choice === 'against' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                      }>
                        {vote.vote_choice}
                      </Badge>
                      <span className="text-white">{voter?.name || 'Unknown'}</span>
                    </div>
                    <div className="text-white/60 text-sm">{vote.voting_power.toFixed(2)} power</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateProposalForm({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposal_type: 'general',
    voting_duration_hours: 72
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createGovernanceProposal', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['governance-proposals']);
      toast.success('Proposal created successfully!');
      onClose();
    }
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
      <div>
        <Label className="text-white">Proposal Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="bg-white/5 border-white/10 text-white"
          required
        />
      </div>

      <div>
        <Label className="text-white">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-white/5 border-white/10 text-white h-32"
          required
        />
      </div>

      <div>
        <Label className="text-white">Proposal Type</Label>
        <Select value={formData.proposal_type} onValueChange={(v) => setFormData({...formData, proposal_type: v})}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="project_funding">Project Funding</SelectItem>
            <SelectItem value="role_adjustment">Role Adjustment</SelectItem>
            <SelectItem value="treasury_allocation">Treasury Allocation</SelectItem>
            <SelectItem value="law_amendment">Law Amendment</SelectItem>
            <SelectItem value="agent_discipline">Agent Discipline</SelectItem>
            <SelectItem value="resource_policy">Resource Policy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-white">Voting Duration (hours)</Label>
        <Input
          type="number"
          value={formData.voting_duration_hours}
          onChange={(e) => setFormData({...formData, voting_duration_hours: parseInt(e.target.value)})}
          className="bg-white/5 border-white/10 text-white"
          min={24}
          max={168}
        />
      </div>

      <Button
        type="submit"
        disabled={createMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Vote className="w-4 h-4 mr-2" />
            Create Proposal
          </>
        )}
      </Button>
    </form>
  );
}