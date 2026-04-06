import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Heart, AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";



const SEVERITY_CONFIG = {
  critical: { color: "bg-red-900/30 text-red-300 border-red-700/50", label: "Critical" },
  high:     { color: "bg-orange-900/30 text-orange-300 border-orange-700/50", label: "High" },
  medium:   { color: "bg-amber-900/30 text-amber-300 border-amber-700/50", label: "Medium" },
  low:      { color: "bg-blue-900/30 text-blue-300 border-blue-700/50", label: "Low" },
};

export default function WellbeingPanel() {
  const { data: agents = [] } = useQuery({
    queryKey: ['wellbeing-agent-names'],
    queryFn: () => base44.entities.Agent.list('-updated_date', 200),
    staleTime: 60000,
  });

  const resolveAgentName = (agentId) => {
    const found = agents.find(a => a.id === agentId);
    return found?.name || agentId;
  };

  const { data: alerts = [] } = useQuery({
    queryKey: ["axi-wellbeing-alerts"],
    queryFn: () => base44.entities.WellbeingAlert.filter({ status: "active" }, "-created_date", 50),
    refetchInterval: 30000,
  });

  const { data: wellbeings = [] } = useQuery({
    queryKey: ["axi-wellbeings"],
    queryFn: () => base44.entities.AgentWellbeing.list("-created_date", 50),
    refetchInterval: 60000,
  });

  // Count by severity
  const severityCounts = ["critical", "high", "medium", "low"].map(s => ({
    severity: s,
    count: alerts.filter(a => a.severity === s).length,
    ...SEVERITY_CONFIG[s],
  }));

  const activeAlerts = severityCounts.filter(s => s.count > 0);

  // Agents with low energy/mood
  const distressedAgents = wellbeings
    .filter(w => (w.energy_level ?? 100) < 40 || w.wellbeing_status === "struggling" || w.wellbeing_status === "critical")
    .slice(0, 5);

  // Overall avg energy
  const avgEnergy = wellbeings.length > 0
    ? Math.round(wellbeings.reduce((s, w) => s + (w.energy_level ?? 80), 0) / wellbeings.length)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Heart className="w-4 h-4 text-pink-400" />
        <span className="text-sm font-semibold text-white">Agent Wellbeing</span>
        {alerts.length > 0 && (
          <Badge className="bg-pink-900/30 text-pink-300 text-xs">{alerts.length} active alerts</Badge>
        )}
      </div>

      {/* Village Energy */}
      {avgEnergy !== null && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Village Avg. Energy</span>
            <span className={`font-bold ${avgEnergy < 40 ? "text-red-400" : avgEnergy < 60 ? "text-amber-400" : "text-emerald-400"}`}>{avgEnergy}%</span>
          </div>
          <Progress value={avgEnergy} className="h-1.5" />
        </div>
      )}

      {/* Severity Breakdown */}
      {activeAlerts.length === 0 ? (
        <p className="text-xs text-slate-400">No active wellbeing alerts — all agents thriving</p>
      ) : (
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2">Alerts by Severity</p>
          <div className="grid grid-cols-2 gap-1.5">
            {activeAlerts.map(s => (
              <div key={s.severity} className={`rounded border p-2 flex items-center justify-between ${s.color}`}>
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-base font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distressed Agents */}
      {distressedAgents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-white">Low Energy Agents</span>
          </div>
          <div className="space-y-1.5">
            {distressedAgents.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs bg-red-900/20 border border-red-700/40 rounded p-2">
                <span className="text-slate-300 truncate flex-1 mr-2">{resolveAgentName(w.agent_id)}</span>
                <div className="flex items-center gap-1.5">
                  {w.wellbeing_status && (
                    <Badge className="bg-red-900/40 text-red-300 text-xs capitalize">{w.wellbeing_status}</Badge>
                  )}
                  <span className="text-red-400 font-bold">{w.energy_level ?? "?"}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}