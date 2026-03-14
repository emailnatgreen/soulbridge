import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Vote, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function GovernanceRiskPanel() {
  const { data: proposals = [] } = useQuery({
    queryKey: ["axi-proposals"],
    queryFn: () => base44.entities.GovernanceProposal.filter({ status: "active" }, "-created_date", 10),
    refetchInterval: 30000,
  });

  const getParticipationRate = (p) => {
    const total = (p.votes_for ?? 0) + (p.votes_against ?? 0) + (p.votes_abstain ?? 0);
    if (total === 0) return 0;
    return Math.min(100, Math.round((total / Math.max(p.quorum_required ?? 50, 1)) * 100));
  };

  const getApprovalRate = (p) => {
    const total = (p.votes_for ?? 0) + (p.votes_against ?? 0);
    if (total === 0) return null;
    return Math.round(((p.votes_for ?? 0) / total) * 100);
  };

  const isExpiringSoon = (p) => {
    if (!p.voting_period_end) return false;
    const end = new Date(p.voting_period_end);
    const diff = end - new Date();
    return diff > 0 && diff < 1000 * 60 * 60 * 24; // less than 24h
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Vote className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-slate-700">Active Proposals ({proposals.length})</span>
      </div>
      {proposals.length === 0 ? (
        <p className="text-xs text-slate-400">No active governance proposals</p>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => {
            const participation = getParticipationRate(p);
            const approval = getApprovalRate(p);
            const expiring = isExpiringSoon(p);

            return (
              <div key={p.id} className={`rounded-lg border p-3 ${expiring ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-slate-800 line-clamp-2">{p.title}</p>
                  {expiring && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs flex-shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Closing
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Participation</span>
                    <span className={participation < 30 ? "text-red-600 font-semibold" : "text-slate-600"}>{participation}%</span>
                  </div>
                  <Progress value={participation} className="h-1" />
                  {approval !== null && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Approval</span>
                      <span className={`font-semibold ${approval >= 60 ? "text-emerald-600" : "text-red-600"}`}>{approval}%</span>
                    </div>
                  )}
                  {participation < 30 && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Low participation — Law 8 risk
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