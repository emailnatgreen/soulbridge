import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Vote, Clock, AlertTriangle, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

const typeColors = {
  project_funding:      "bg-blue-900/30 text-blue-300",
  role_adjustment:      "bg-purple-900/30 text-purple-300",
  treasury_allocation:  "bg-amber-900/30 text-amber-300",
  law_amendment:        "bg-red-900/30 text-red-300",
  agent_discipline:     "bg-orange-900/30 text-orange-300",
  resource_policy:      "bg-teal-900/30 text-teal-300",
  general:              "bg-slate-800/50 text-slate-300",
};

export default function GovernanceRiskPanel() {
  const { data: proposals = [] } = useQuery({
    queryKey: ["axi-proposals"],
    queryFn: () => base44.entities.GovernanceProposal.filter({ status: "active" }, "-created_date", 10),
    refetchInterval: 30000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["axi-agents-gov"],
    queryFn: () => base44.entities.Agent.filter({ status: "active" }, "-created_date", 100),
    refetchInterval: 60000,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["axi-votes-recent"],
    queryFn: () => base44.entities.GovernanceVote.list("-created_date", 200),
    refetchInterval: 30000,
  });

  const totalEligible = agents.length;

  const getParticipationRate = (p) => {
    const cast = p.total_votes_cast ?? 0;
    if (totalEligible === 0) return 0;
    return Math.min(100, Math.round((cast / totalEligible) * 100));
  };

  const getApprovalRate = (p) => {
    const total = (p.votes_for ?? 0) + (p.votes_against ?? 0);
    if (total === 0) return null;
    return Math.round(((p.votes_for ?? 0) / total) * 100);
  };

  const isExpiringSoon = (p) => {
    if (!p.voting_period_end) return false;
    const diff = new Date(p.voting_period_end) - new Date();
    return diff > 0 && diff < 1000 * 60 * 60 * 24;
  };

  // Dormant voters: agents who haven't voted on any active proposal
  const activeProposalIds = proposals.map(p => p.id);
  const voterIds = new Set(votes.filter(v => activeProposalIds.includes(v.proposal_id)).map(v => v.voter_agent_id));
  const dormantCount = agents.filter(a => !voterIds.has(a.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Active Proposals ({proposals.length})</span>
        </div>
        {dormantCount > 0 && proposals.length > 0 && (
          <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1 text-xs">
            <UserX className="w-3 h-3" /> {dormantCount} dormant
          </Badge>
        )}
      </div>

      {proposals.length === 0 ? (
        <p className="text-xs text-slate-400">No active governance proposals</p>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => {
            const participation = getParticipationRate(p);
            const approval = getApprovalRate(p);
            const expiring = isExpiringSoon(p);
            const quorumRisk = participation < 30;
            const thresholdRisk = approval !== null && approval < (p.pass_threshold ?? 60);

            return (
              <div key={p.id} className={`rounded-lg border p-3 ${expiring || quorumRisk ? "border-amber-700/50 bg-amber-900/20" : "border-slate-700/50 bg-slate-800/40"}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-slate-200 line-clamp-2 flex-1">{p.title}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    {expiring && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" /> Soon
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${typeColors[p.proposal_type] || typeColors.general}`}>
                    {(p.proposal_type || "general").replace(/_/g, " ")}
                  </Badge>
                  {p.voting_period_end && (
                    <span className="text-xs text-slate-400">
                      ends {formatDistanceToNow(new Date(p.voting_period_end), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Participation ({p.total_votes_cast ?? 0}/{totalEligible})</span>
                    <span className={quorumRisk ? "text-red-600 font-semibold" : "text-slate-600"}>{participation}%</span>
                  </div>
                  <Progress value={participation} className="h-1" />
                  {approval !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Approval (need {p.pass_threshold ?? 60}%)</span>
                      <span className={`font-semibold ${thresholdRisk ? "text-red-600" : "text-emerald-600"}`}>{approval}%</span>
                    </div>
                  )}
                  {(quorumRisk || thresholdRisk) && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      {quorumRisk ? "Low participation — quorum at risk" : "Approval below threshold"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}