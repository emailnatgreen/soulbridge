import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Fingerprint, CheckCircle, Clock, Zap } from 'lucide-react';

export default function DidActivationPipeline() {
  // Fetch all governance proposals with activate_did action_type
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['didActivationPipeline'],
    queryFn: async () => {
      const result = await base44.entities.GovernanceProposal.filter({
        status: 'active'
      });
      return result.filter(p => p.action_data?.action_type === 'activate_did');
    }
  });

  // Fetch all votes
  const { data: allVotes = [] } = useQuery({
    queryKey: ['pipelineVotes'],
    queryFn: () => base44.entities.GovernanceVote.list()
  });

  const getProposalVotes = (proposalId) => {
    return allVotes.filter(v => v.proposal_id === proposalId);
  };

  const calculateVotePercentage = (proposalId) => {
    const votes = getProposalVotes(proposalId);
    const totalFor = votes
      .filter(v => v.vote_choice === 'for')
      .reduce((sum, v) => sum + (v.voting_power || 1), 0);
    const totalAgainst = votes
      .filter(v => v.vote_choice === 'against')
      .reduce((sum, v) => sum + (v.voting_power || 1), 0);
    const total = totalFor + totalAgainst;
    
    return total > 0 ? Math.round((totalFor / total) * 100) : 0;
  };

  const getDaysUntilExecution = (votingPeriodEnd) => {
    if (!votingPeriodEnd) return null;
    const days = Math.ceil((new Date(votingPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <Fingerprint className="w-5 h-5" />
            DID Activation Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">Loading pipeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <Fingerprint className="w-5 h-5" />
            DID Activation Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">No pending activations</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-300">
            <Fingerprint className="w-5 h-5" />
            DID Activation Pipeline ({proposals.length})
          </CardTitle>
          <Badge className="bg-blue-600/50 text-blue-200 border-blue-400/30">
            <Zap className="w-3 h-3 mr-1" />
            Live Governance
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.map((proposal) => {
          const daysLeft = getDaysUntilExecution(proposal.voting_period_end);
          const votePercentage = calculateVotePercentage(proposal.id);
          const votes = getProposalVotes(proposal.id);

          return (
            <div
              key={proposal.id}
              className="border border-blue-400/20 rounded-lg p-3 bg-blue-500/5 hover:bg-blue-500/10 transition"
            >
              {/* Agent Name & Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">
                    {proposal.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    DID: did:xrpl:{proposal.action_data?.classic_address}
                  </p>
                </div>
                {votePercentage >= 60 ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </Badge>
                ) : votePercentage >= 50 ? (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                ) : (
                  <Badge className="bg-gray-500/20 text-gray-300 border-gray-400/30">
                    Voting
                  </Badge>
                )}
              </div>

              {/* Vote Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Voting Progress</span>
                  <span className="text-blue-300 font-medium">
                    {votes.length} votes • {votePercentage}% approved
                  </span>
                </div>
                <Progress value={Math.min(votePercentage, 100)} className="h-1.5" />
              </div>

              {/* Activation Countdown */}
              {daysLeft !== null && (
                <div className="mt-3 pt-3 border-t border-blue-400/10 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Auto-Activation In</span>
                  <span className={`font-medium ${
                    daysLeft <= 3 ? 'text-yellow-300' : 'text-blue-300'
                  }`}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-blue-400/10 bg-blue-500/5 rounded p-3">
          <div className="text-xs text-gray-400">
            <p className="mb-2">
              <span className="text-blue-300 font-medium">{proposals.filter(p => calculateVotePercentage(p.id) >= 60).length}</span> approved • 
              <span className="text-blue-300 font-medium ml-2">{proposals.filter(p => {
                const pct = calculateVotePercentage(p.id);
                return pct < 60 && pct > 0;
              }).length}</span> voting
            </p>
            <p className="text-gray-500 italic">
              DIDs auto-activate on XRPL when voting closes with majority consensus.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}