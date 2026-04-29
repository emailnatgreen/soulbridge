import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function QuorumProgressCard({ proposal, totalAgents }) {
  const quorumRequired = proposal.quorum_required || 50;
  const passThreshold = proposal.pass_threshold || 60;
  const totalVotesCast = proposal.total_votes_cast || 0;

  // Quorum = % of agents that have voted
  const quorumPct = totalAgents > 0 ? Math.min(100, (totalVotesCast / totalAgents) * 100) : 0;
  const quorumMet = quorumPct >= quorumRequired;

  // Pass threshold = % of "for" votes out of total voting power
  const totalPower = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
  const forPct = totalPower > 0 ? ((proposal.votes_for || 0) / totalPower) * 100 : 0;
  const wouldPass = forPct >= passThreshold;

  return (
    <div className="space-y-2.5 py-2">
      {/* Quorum */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-[10px] flex items-center gap-1">
            <Users className="w-3 h-3" /> Quorum ({quorumRequired}% needed)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/60 text-[10px]">{quorumPct.toFixed(0)}%</span>
            {quorumMet ? (
              <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0">
                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Met
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{Math.ceil(totalAgents * quorumRequired / 100 - totalVotesCast)} more
              </Badge>
            )}
          </div>
        </div>
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${quorumMet ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, quorumPct)}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/30"
            style={{ left: `${quorumRequired}%` }}
          />
        </div>
      </div>

      {/* Pass threshold */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/40 text-[10px]">Approval ({passThreshold}% to pass)</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white/60 text-[10px]">{forPct.toFixed(0)}% for</span>
            {totalPower > 0 && (
              wouldPass ? (
                <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0">Passing</Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0">Failing</Badge>
              )
            )}
          </div>
        </div>
        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${wouldPass ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, forPct)}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/30"
            style={{ left: `${passThreshold}%` }}
          />
        </div>
      </div>
    </div>
  );
}