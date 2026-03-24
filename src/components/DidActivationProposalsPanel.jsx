import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Fingerprint, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DidActivationProposalsPanel() {
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteChoice, setVoteChoice] = useState('for');

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  // Fetch pending DID activation proposals
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['didActivationProposals'],
    queryFn: async () => {
      const result = await base44.entities.GovernanceProposal.filter({
        proposal_type: 'general',
        status: 'active'
      });
      // Filter to only activate_did proposals
      return result.filter(p => p.action_data?.action_type === 'activate_did');
    }
  });

  // Fetch votes for proposals
  const { data: allVotes = [] } = useQuery({
    queryKey: ['governanceVotes'],
    queryFn: () => base44.entities.GovernanceVote.list()
  });

  // Cast vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ proposal_id, vote_choice, rationale }) =>
      base44.functions.invoke('castGovernanceVote', {
        proposal_id,
        vote_choice,
        rationale: rationale || `Quad vote: ${vote_choice}`
      }),
    onSuccess: () => {
      toast.success('Vote cast successfully');
      setVoteDialogOpen(false);
      setVoteChoice('for');
      setSelectedProposal(null);
      queryClient.invalidateQueries(['didActivationProposals']);
      queryClient.invalidateQueries(['governanceVotes']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cast vote');
    }
  });

  const handleVote = (proposal) => {
    setSelectedProposal(proposal);
    setVoteDialogOpen(true);
  };

  const submitVote = () => {
    if (selectedProposal) {
      voteMutation.mutate({
        proposal_id: selectedProposal.id,
        vote_choice: voteChoice,
        rationale: `DID Activation for: ${selectedProposal.action_data?.classic_address || 'Unknown'}`
      });
    }
  };

  const getProposalVotes = (proposalId) => {
    return allVotes.filter(v => v.proposal_id === proposalId);
  };

  const calculateVotePercentage = (proposalId, choice) => {
    const votes = getProposalVotes(proposalId);
    const totalPower = votes.reduce((sum, v) => sum + (v.voting_power || 1), 0);
    const choicePower = votes
      .filter(v => v.vote_choice === choice)
      .reduce((sum, v) => sum + (v.voting_power || 1), 0);
    
    return totalPower > 0 ? Math.round((choicePower / totalPower) * 100) : 0;
  };

  const hasUserVoted = (proposalId) => {
    return getProposalVotes(proposalId).some(v => v.voter_agent_id === currentUser?.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Pending DID Activations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">Loading proposals...</div>
        </CardContent>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Pending DID Activations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No pending DID activation proposals
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5" />
          Pending DID Activations ({proposals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposals.map((proposal) => {
          const votes = getProposalVotes(proposal.id);
          const forPercentage = calculateVotePercentage(proposal.id, 'for');
          const againstPercentage = calculateVotePercentage(proposal.id, 'against');
          const userVoted = hasUserVoted(proposal.id);

          return (
            <div key={proposal.id} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition">
              {/* Proposal Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{proposal.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {proposal.description}
                  </p>
                </div>
                <Badge className="bg-blue-600">Active</Badge>
              </div>

              {/* DID Info — masked for security */}
              {proposal.action_data?.classic_address && (
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <div className="text-gray-600">
                    <span className="font-medium">DID:</span> did:xrpl:{proposal.action_data.classic_address.slice(0, 6)}•••{proposal.action_data.classic_address.slice(-4)}
                  </div>
                </div>
              )}

              {/* Vote Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Voting Progress</span>
                  <span className="text-gray-600">
                    {votes.length} votes cast
                  </span>
                </div>
                
                {/* For Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-green-700">
                      <CheckCircle className="w-3 h-3 inline mr-1" />
                      For: {forPercentage}%
                    </span>
                  </div>
                  <Progress value={forPercentage} className="h-2" />
                </div>

                {/* Against Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-red-700">
                      <XCircle className="w-3 h-3 inline mr-1" />
                      Against: {againstPercentage}%
                    </span>
                  </div>
                  <Progress value={againstPercentage} className="h-2" />
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-gray-600 border-t pt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {proposal.voting_period_end ? 
                    `Closes: ${new Date(proposal.voting_period_end).toLocaleDateString()}`
                    : 'Active'
                  }
                </div>
                {proposal.proposed_by && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Community member
                  </div>
                )}
              </div>

              {/* Vote Button */}
              <Button
                size="sm"
                onClick={() => handleVote(proposal)}
                disabled={userVoted}
                className="w-full"
                variant={userVoted ? 'outline' : 'default'}
              >
                {userVoted ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-2" />
                    You voted
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-3 h-3 mr-2" />
                    Cast Vote
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              Vote on DID activation proposal
            </DialogDescription>
          </DialogHeader>

          {selectedProposal && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {selectedProposal.title}
                </div>
                <div className="text-xs text-gray-600">
                  did:xrpl:{selectedProposal.action_data?.classic_address ? `${selectedProposal.action_data.classic_address.slice(0, 6)}•••${selectedProposal.action_data.classic_address.slice(-4)}` : 'Unknown'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Your Vote
                </label>
                <Select value={voteChoice} onValueChange={setVoteChoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        For (Approve)
                      </span>
                    </SelectItem>
                    <SelectItem value="against">
                      <span className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Against (Reject)
                      </span>
                    </SelectItem>
                    <SelectItem value="abstain">
                      <span>Abstain</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">Effect:</p>
                <p className="text-xs">
                  {voteChoice === 'for' 
                    ? 'If approved, the DID will be automatically activated on XRPL.'
                    : voteChoice === 'against'
                    ? 'Your vote will be recorded against activation.'
                    : 'Your vote will not be counted toward either side.'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setVoteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitVote}
                  disabled={voteMutation.isPending}
                  className="flex-1"
                >
                  {voteMutation.isPending ? 'Submitting...' : 'Cast Vote'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}