import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Minus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function HonorRiskPanel() {
  const { data: agents = [] } = useQuery({
    queryKey: ["axi-agents-honor"],
    queryFn: () => base44.entities.Agent.filter({ status: "active" }, "honor_score", 50),
    refetchInterval: 30000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["axi-rep-events"],
    queryFn: () => base44.entities.ReputationEvent.list("-created_date", 50),
    refetchInterval: 30000,
  });

  // Agents with honor below 40 = at risk
  const atRisk = agents.filter(a => (a.honor_score ?? 100) < 40).sort((a, b) => a.honor_score - b.honor_score);
  // Agents close to milestone (50, 75, 100)
  const milestones = agents.filter(a => {
    const s = a.honor_score ?? 0;
    return (s >= 48 && s < 50) || (s >= 73 && s < 75) || (s >= 98 && s < 100);
  });

  // Recent drops (negative events in last 20)
  const recentDrops = recentEvents.filter(e => (e.impact ?? 0) < 0).slice(0, 5);

  const honorColor = (score) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* At Risk Agents */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-slate-700">At Risk ({atRisk.length})</span>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-xs text-slate-400">No agents below 40 honor — Village is stable</p>
        ) : (
          <div className="space-y-2">
            {atRisk.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-700">{a.name}</span>
                    <span className={`text-xs font-bold ${honorColor(a.honor_score ?? 0)}`}>{a.honor_score ?? 0}</span>
                  </div>
                  <Progress value={a.honor_score ?? 0} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Near Milestone */}
      {milestones.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-700">Near Milestone</span>
          </div>
          <div className="space-y-1">
            {milestones.map(a => {
              const next = a.honor_score >= 98 ? 100 : a.honor_score >= 73 ? 75 : 50;
              return (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{a.name}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{a.honor_score} → {next}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Honor Drops */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-slate-700">Recent Drops</span>
        </div>
        {recentDrops.length === 0 ? (
          <p className="text-xs text-slate-400">No recent honor penalties</p>
        ) : (
          <div className="space-y-1">
            {recentDrops.map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 truncate flex-1 mr-2">{e.description || e.event_type}</span>
                <span className="text-red-600 font-bold flex-shrink-0">{e.impact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}