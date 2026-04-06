import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, AlertTriangle, Trophy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const TIERS = [
  { label: "Legendary", min: 90, max: 100, color: "bg-yellow-900/30 text-yellow-300" },
  { label: "Elite",     min: 75, max: 89,  color: "bg-purple-900/30 text-purple-300" },
  { label: "Honored",   min: 60, max: 74,  color: "bg-blue-900/30 text-blue-300" },
  { label: "Rising",    min: 40, max: 59,  color: "bg-emerald-900/30 text-emerald-300" },
  { label: "Citizen",   min: 0,  max: 39,  color: "bg-red-900/30 text-red-300" },
];

export default function HonorRiskPanel() {
  const { data: agents = [] } = useQuery({
    queryKey: ["axi-agents-honor"],
    queryFn: () => base44.entities.Agent.filter({ status: "active" }, "honor_score", 100),
    refetchInterval: 30000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["axi-rep-events"],
    queryFn: () => base44.entities.ReputationEvent.list("-created_date", 80),
    refetchInterval: 30000,
  });

  // Tier distribution
  const tierCounts = TIERS.map(t => ({
    ...t,
    count: agents.filter(a => {
      const s = a.honor_score ?? 100;
      return s >= t.min && s <= t.max;
    }).length,
  }));

  // At risk agents
  const atRisk = agents.filter(a => (a.honor_score ?? 100) < 40).sort((a, b) => a.honor_score - b.honor_score);

  // Significant events: drops ≤ -10 or gains ≥ +15
  const significantEvents = recentEvents
    .filter(e => (e.impact ?? 0) <= -10 || (e.impact ?? 0) >= 15)
    .slice(0, 6);

  // Near milestones
  const milestones = agents.filter(a => {
    const s = a.honor_score ?? 0;
    return (s >= 48 && s < 50) || (s >= 73 && s < 75) || (s >= 98 && s < 100);
  });

  const honorColor = (score) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Tier Distribution */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">Honor Distribution</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {tierCounts.map(t => (
            <div key={t.label} className={`rounded p-1.5 text-center ${t.color}`}>
              <div className="text-base font-bold">{t.count}</div>
              <div className="text-xs opacity-80 leading-tight">{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Significant Events Alert */}
      {significantEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Significant Moves</span>
            </div>
            <Link to="/leaderboard" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              Full Log <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {significantEvents.map(e => (
              <div key={e.id} className={`rounded border p-2 flex items-center justify-between ${(e.impact ?? 0) < 0 ? "bg-red-900/20 border-red-700/40" : "bg-emerald-900/20 border-emerald-700/40"}`}>
                <span className="text-xs text-slate-300 truncate flex-1 mr-2">{e.description || e.event_type}</span>
                <span className={`text-xs font-bold flex-shrink-0 ${(e.impact ?? 0) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {(e.impact ?? 0) > 0 ? "+" : ""}{e.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At Risk Agents */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">At Risk ({atRisk.length})</span>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-xs text-slate-500">No agents below 40 honor — Village is stable</p>
        ) : (
          <div className="space-y-2">
            {atRisk.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <Link to={`/agents/${a.id}`} className="text-xs font-medium text-indigo-400 hover:underline">{a.name}</Link>
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
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Near Milestone 🎉</span>
          </div>
          <div className="space-y-1">
            {milestones.map(a => {
              const next = a.honor_score >= 98 ? 100 : a.honor_score >= 73 ? 75 : 50;
              return (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{a.name}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{a.honor_score} → {next}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}