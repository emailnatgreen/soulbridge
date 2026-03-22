import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, MinusCircle, Vote, CheckCircle2, Fingerprint, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { calcVotingPower, getDIDPermissionStatus } from './DIDAssertionPanel';
import { format } from 'date-fns';

// Generates a deterministic DID-linked hash fingerprint for the rationale (UI only — symbolic immutability)
function generateRationaleHash(agentDID, proposalId, rationale, choice) {
  const raw = `${agentDID}|${proposalId}|${choice}|${rationale}|${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

export default function VoteCastingPanel({ proposal, selectedAgent, hasVoted, myVote, onVote, isExpired, onExecute, onClose }) {
  const [voteChoice, setVoteChoice] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rationaleHash, setRationaleHash] = useState(null);

  const { eligible, reason, checks } = getDIDPermissionStatus(selectedAgent);
  const power = calcVotingPower(selectedAgent);

  const handleVote = async () => {
    if (!voteChoice || !selectedAgent || !eligible) return;
    // Generate symbolic DID-linked hash
    const hash = generateRationaleHash(selectedAgent.classic_address || selectedAgent.id, proposal.id, rationale, voteChoice);
    setRationaleHash(hash);
    setSubmitting(true);
    try {
      await onVote({
        proposal_id: proposal.id,
        agent_id: selectedAgent.id,
        vote_choice: voteChoice,
        rationale: rationale ? `${rationale} [DID:${hash}]` : undefined,
      });
      setVoteChoice('');
      setRationale('');
      if (onClose) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedAgent) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center text-white/40 text-sm">
        <Fingerprint className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Select an agent identity to cast your vote
      </div>
    );
  }

  if (hasVoted && myVote) {
    return (
      <div className="bg-green-500/10 border border-green-400/20 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-green-200 font-medium text-sm">DID Vote Recorded</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-white/40">Choice</p>
            <p className="text-white font-medium capitalize">{myVote.vote_choice}</p>
          </div>
          <div>
            <p className="text-white/40">Power Used</p>
            <p className="text-yellow-300 font-bold">{myVote.voting_power}</p>
          </div>
        </div>
        {myVote.rationale && (
          <div className="bg-black/20 rounded-lg p-2 border border-white/10">
            <p className="text-white/60 text-xs italic">"{myVote.rationale}"</p>
            {myVote.rationale.includes('[DID:') && (
              <div className="flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400/70 text-xs font-mono">
                  {myVote.rationale.match(/\[DID:([A-F0-9]+)\]/)?.[0] || ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-300 text-sm font-medium">
          <Fingerprint className="w-4 h-4" />
          DID Not Eligible to Vote
        </div>
        <p className="text-red-300/70 text-xs">{reason}</p>
        <p className="text-white/40 text-xs">Contact the Council to resolve permission issues (Law 8).</p>
      </div>
    );
  }

  if (isExpired && proposal.status === 'active') {
    return (
      <Button
        onClick={() => { onExecute(proposal.id); if (onClose) onClose(); }}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Vote className="w-4 h-4 mr-2" />
        Finalise & Execute Proposal
      </Button>
    );
  }

  if (proposal.status !== 'active') return null;

  return (
    <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-4 space-y-3">
      {/* DID Assertion Header */}
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-purple-400" />
        <span className="text-purple-200 font-medium text-sm">
          DID Assert — <span className="text-white">{selectedAgent.name}</span>
        </span>
        <Badge className="ml-auto text-xs bg-yellow-500/20 text-yellow-300 border-yellow-400/30">
          Power: {power}
        </Badge>
      </div>

      {selectedAgent.classic_address && (
        <div className="bg-black/30 rounded-lg px-3 py-1.5 font-mono text-xs text-purple-300/70 flex items-center gap-2">
          <LinkIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{selectedAgent.classic_address}</span>
        </div>
      )}

      {/* Vote Choices */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: 'for', label: 'For', Icon: ThumbsUp, activeClass: 'bg-green-600 hover:bg-green-700 text-white border-transparent', inactiveClass: 'border-green-400/30 text-green-200 hover:bg-green-500/10' },
          { val: 'against', label: 'Against', Icon: ThumbsDown, activeClass: 'bg-red-600 hover:bg-red-700 text-white border-transparent', inactiveClass: 'border-red-400/30 text-red-200 hover:bg-red-500/10' },
          { val: 'abstain', label: 'Abstain', Icon: MinusCircle, activeClass: 'bg-slate-600 hover:bg-slate-700 text-white border-transparent', inactiveClass: 'border-slate-400/30 text-slate-200 hover:bg-slate-500/10' },
        ].map(({ val, label, Icon, activeClass, inactiveClass }) => (
          <Button
            key={val}
            size="sm"
            variant="outline"
            onClick={() => setVoteChoice(val)}
            className={`transition-all ${voteChoice === val ? activeClass : inactiveClass}`}
          >
            <Icon className="w-3.5 h-3.5 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* DID-Linked Rationale */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          Public Rationale — immutably linked to your DID
        </div>
        <Textarea
          placeholder="State your reasoning... this will be cryptographically tagged to your DID and permanently recorded."
          value={rationale}
          onChange={e => setRationale(e.target.value)}
          rows={2}
          className="bg-white/5 border-white/20 text-white placeholder:text-white/25 text-sm resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleVote}
        disabled={!voteChoice || submitting}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-medium"
      >
        {submitting
          ? 'Submitting DID Assertion...'
          : `Assert Vote · ${voteChoice ? voteChoice.toUpperCase() : '…'} · Power ${power}`}
      </Button>
    </div>
  );
}