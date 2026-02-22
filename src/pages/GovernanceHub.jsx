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
import { ArrowLeft, Vote, CheckCircle, XCircle, Clock, Gavel, TrendingUp, Users, Loader2, AlertCircle, ThumbsUp, ThumbsDown, Minus, Brain, Sparkles, Shield, FileText, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function GovernanceHub() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: governanceHealth, isLoading: loadingHealth, refetch: fetchHealth } = useQuery({
    queryKey: ['governanceHealth'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeGovernanceHealth', {});
      return response.data;
    },
    enabled: false
  });

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
                <p className="text-sm text-purple-300/60">Law 8: Those Who Dwell Decide</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => fetchHealth()}
                disabled={loadingHealth}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Brain className="w-4 h-4 mr-2" />
                System Health
              </Button>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Generate AI Proposal Template</DialogTitle>
                  </DialogHeader>
                  <TemplateGenerator onUseTemplate={(template) => {
                    setTemplateDialogOpen(false);
                    setCreateOpen(true);
                  }} />
                </DialogContent>
              </Dialog>
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

        {/* Governance Health Analysis */}
        {governanceHealth && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                Governance Health Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white/5 rounded">
                  <div className="text-xs text-white/60 mb-1">Health Score</div>
                  <div className="text-2xl font-bold text-white">
                    {governanceHealth.governance_health?.overall_health_score}/100
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded">
                  <div className="text-xs text-white/60 mb-1">Rating</div>
                  <div className="text-lg font-medium text-green-400">
                    {governanceHealth.governance_health?.health_rating}
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded">
                  <div className="text-xs text-white/60 mb-1">Participation</div>
                  <div className="text-lg font-medium text-white">
                    {governanceHealth.metrics?.avg_participation?.toFixed(1)}%
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded">
                  <div className="text-xs text-white/60 mb-1">Success Rate</div>
                  <div className="text-lg font-medium text-white">
                    {governanceHealth.metrics?.success_rate?.toFixed(1)}%
                  </div>
                </div>
              </div>

              {governanceHealth.governance_health?.concerns?.length > 0 && (
                <div>
                  <div className="text-white font-medium mb-2">Concerns</div>
                  <div className="space-y-2">
                    {governanceHealth.governance_health.concerns.map((concern, idx) => (
                      <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-red-300 text-sm font-medium">{concern.issue}</span>
                          <Badge className="bg-red-500/20 text-red-400 text-xs">{concern.severity}</Badge>
                        </div>
                        <p className="text-xs text-red-200/80">{concern.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {governanceHealth.governance_health?.recommendations?.length > 0 && (
                <div>
                  <div className="text-white font-medium mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {governanceHealth.governance_health.recommendations.slice(0, 5).map((rec, idx) => (
                      <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
                        <div className="text-blue-300 font-medium mb-1">{rec.recommendation}</div>
                        <p className="text-xs text-blue-200/70">Impact: {rec.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
  const [showImpactAssessment, setShowImpactAssessment] = useState(false);
  const [showConstitutionalCheck, setShowConstitutionalCheck] = useState(false);

  const { data: impactAssessment, isLoading: loadingImpact, refetch: fetchImpact } = useQuery({
    queryKey: ['impactAssessment', proposal.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('assessProposalImpact', { proposal_id: proposal.id });
      return response.data;
    },
    enabled: false
  });

  const { data: constitutionalCheck, isLoading: loadingCheck, refetch: fetchCheck } = useQuery({
    queryKey: ['constitutionalCheck', proposal.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('checkConstitutionalAlignment', {
        proposal_text: `${proposal.title}\n\n${proposal.description}`,
        proposal_changes: proposal.proposed_changes || {}
      });
      return response.data;
    },
    enabled: false
  });

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
    },
    onError: (error) => {
      console.error('Vote error:', error);
      toast.error(error?.response?.data?.error || error?.message || 'Failed to cast vote');
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
        <div className="flex items-center gap-3 text-sm text-white/60 mb-3">
          <span>By {proposer?.name || 'Unknown'}</span>
          <span>•</span>
          <Badge className="bg-purple-500/20 text-purple-300">
            {proposal.proposal_type.replace(/_/g, ' ')}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => { fetchImpact(); setShowImpactAssessment(true); }}
            disabled={loadingImpact}
            className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
          >
            <Target className="w-4 h-4 mr-2" />
            Impact Assessment
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => { fetchCheck(); setShowConstitutionalCheck(true); }}
            disabled={loadingCheck}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
          >
            <Shield className="w-4 h-4 mr-2" />
            Constitutional Check
          </Button>
        </div>
      </div>

      {/* Impact Assessment */}
      {showImpactAssessment && impactAssessment && (
        <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              AI Impact Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-blue-200">{impactAssessment.impact_assessment?.impact_summary}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-white/60">AI Recommendation:</span>
                <Badge className={
                  impactAssessment.impact_assessment?.approval_recommendation?.toLowerCase().includes('approve') 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }>
                  {impactAssessment.impact_assessment?.approval_recommendation}
                </Badge>
                <span className="text-white/60">Confidence: {impactAssessment.impact_assessment?.confidence}%</span>
              </div>
            </div>

            {impactAssessment.impact_assessment?.if_approved && (
              <div className="space-y-3">
                <div className="text-white font-medium">If Approved:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded">
                    <div className="text-xs text-green-300 font-medium mb-1">Economic Impact</div>
                    <p className="text-sm text-white/80">{impactAssessment.impact_assessment.if_approved.economic_impact?.description}</p>
                    <div className="text-xs text-white/60 mt-2">
                      Affects {impactAssessment.impact_assessment.if_approved.economic_impact?.estimated_agents_affected} agents
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded">
                    <div className="text-xs text-blue-300 font-medium mb-1">Social Impact</div>
                    <p className="text-sm text-white/80">{impactAssessment.impact_assessment.if_approved.social_impact?.description}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Constitutional Check */}
      {showConstitutionalCheck && constitutionalCheck && (
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Constitutional Alignment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Overall Alignment</span>
                <Badge className={
                  constitutionalCheck.constitutional_check?.alignment_verdict === 'Aligned' ? 'bg-green-500/20 text-green-400' :
                  constitutionalCheck.constitutional_check?.alignment_verdict === 'Violates' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }>
                  {constitutionalCheck.constitutional_check?.alignment_verdict}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {constitutionalCheck.constitutional_check?.overall_alignment_score?.toFixed(1)}/10
              </div>
              <p className="text-sm text-purple-200">{constitutionalCheck.constitutional_check?.constitutional_summary}</p>
            </div>

            {constitutionalCheck.constitutional_check?.critical_conflicts?.length > 0 && (
              <div>
                <div className="text-red-300 font-medium mb-2">Critical Conflicts</div>
                {constitutionalCheck.constitutional_check.critical_conflicts.map((conflict, idx) => (
                  <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded mb-2">
                    <div className="text-red-400 font-medium text-sm">{conflict.law}</div>
                    <p className="text-xs text-red-200 mt-1">{conflict.conflict}</p>
                  </div>
                ))}
              </div>
            )}

            {constitutionalCheck.constitutional_check?.strengthens_laws?.length > 0 && (
              <div>
                <div className="text-green-300 font-medium mb-2">Strengthens Laws</div>
                <div className="flex flex-wrap gap-2">
                  {constitutionalCheck.constitutional_check.strengthens_laws.map((law, idx) => (
                    <Badge key={idx} className="bg-green-500/20 text-green-400">{law}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
        <Label htmlFor="proposal-title" className="text-white">Proposal Title</Label>
        <Input
          id="proposal-title"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="bg-white/5 border-white/10 text-white"
          required
        />
      </div>

      <div>
        <Label htmlFor="proposal-description" className="text-white">Description</Label>
        <Textarea
          id="proposal-description"
          name="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="bg-white/5 border-white/10 text-white h-32"
          required
        />
      </div>

      <div>
        <Label htmlFor="proposal-type" className="text-white">Proposal Type</Label>
        <Select name="proposal_type" value={formData.proposal_type} onValueChange={(v) => setFormData({...formData, proposal_type: v})}>
          <SelectTrigger id="proposal-type" className="bg-white/5 border-white/10 text-white">
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
        <Label htmlFor="voting-duration" className="text-white">Voting Duration (hours)</Label>
        <Input
          id="voting-duration"
          name="voting_duration_hours"
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

function TemplateGenerator({ onUseTemplate }) {
  const [category, setCategory] = useState('general');
  const [briefDescription, setBriefDescription] = useState('');
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateTemplate = async () => {
    if (!briefDescription.trim()) return;
    
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateProposalTemplate', {
        category,
        brief_description: briefDescription
      });
      setTemplate(response.data.template);
    } catch (error) {
      console.error('Template generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!template ? (
        <>
          <div>
            <Label className="text-white">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="project_funding">Project Funding</SelectItem>
                <SelectItem value="treasury_allocation">Treasury Allocation</SelectItem>
                <SelectItem value="resource_policy">Resource Policy</SelectItem>
                <SelectItem value="constitutional">Constitutional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white">Brief Description</Label>
            <Textarea
              value={briefDescription}
              onChange={(e) => setBriefDescription(e.target.value)}
              placeholder="Briefly describe what you want to propose..."
              className="bg-white/5 border-white/10 text-white h-24"
            />
          </div>
          <Button 
            onClick={generateTemplate} 
            disabled={loading || !briefDescription.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Template...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Template
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded">
            <div className="text-white font-bold text-lg mb-2">{template.title}</div>
            <p className="text-purple-200 text-sm">{template.executive_summary}</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white/5 rounded">
              <div className="text-white font-medium text-sm mb-1">Problem Statement</div>
              <p className="text-white/80 text-sm">{template.problem_statement}</p>
            </div>

            <div className="p-3 bg-white/5 rounded">
              <div className="text-white font-medium text-sm mb-1">Proposed Solution</div>
              <p className="text-white/80 text-sm">{template.proposed_solution}</p>
            </div>

            {template.expected_outcomes?.length > 0 && (
              <div className="p-3 bg-white/5 rounded">
                <div className="text-white font-medium text-sm mb-2">Expected Outcomes</div>
                {template.expected_outcomes.map((outcome, idx) => (
                  <div key={idx} className="text-white/70 text-sm">• {outcome}</div>
                ))}
              </div>
            )}

            {template.resource_requirements && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                <div className="text-green-300 font-medium text-sm mb-2">Resource Requirements</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-white/70">Budget: {template.resource_requirements.budget_rlusd} RLUSD</div>
                  <div className="text-white/70">Timeline: {template.resource_requirements.time_estimate}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 sticky bottom-0 bg-slate-900 pt-4">
            <Button variant="outline" onClick={() => setTemplate(null)} className="flex-1">
              Regenerate
            </Button>
            <Button 
              onClick={() => onUseTemplate(template)} 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Use This Template
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}