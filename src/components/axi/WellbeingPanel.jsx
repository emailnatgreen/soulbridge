import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Heart, AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-100 text-red-700 border-red-300", label: "Critical" },
  high:     { color: "bg-orange-100 text-orange-700 border-orange-300", label: "High" },
  medium:   { color: "bg-amber-100 text-amber-700 border-amber-300", label: "Medium" },
  low:      { color: "bg-blue-100 text-blue-700 border-blue-300", label: "Low" },
};

export default function WellbeingPanel() {
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
        <Heart className="w-4 h-4 text-pink-500" />
        <span className="text-sm font-semibold text-slate-700">Agent Wellbeing</span>
        {alerts.length > 0 && (
          <Badge className="bg-pink-100 text-pink-700 text-xs">{alerts.length} active alerts</Badge>
        )}
      </div>

      {/* Village Energy */}
      {avgEnergy !== null && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Village Avg. Energy</span>
            <span className={`font-bold ${avgEnergy < 40 ? "text-red-600" : avgEnergy < 60 ? "text-amber-600" : "text-emerald-600"}`}>{avgEnergy}%</span>
          </div>
          <Progress value={avgEnergy} className="h-1.5" />
        </div>
      )}

      {/* Severity Breakdown */}
      {activeAlerts.length === 0 ? (
        <p className="text-xs text-slate-400">No active wellbeing alerts — all agents thriving</p>
      ) : (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Alerts by Severity</p>
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
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-slate-700">Low Energy Agents</span>
          </div>
          <div className="space-y-1.5">
            {distressedAgents.map(w => (
              <div key={w.id} className="flex items-center justify-between text-xs bg-red-50 border border-red-200 rounded p-2">
                <span className="text-slate-700 truncate flex-1 mr-2">{w.agent_id}</span>
                <div className="flex items-center gap-1.5">
                  {w.wellbeing_status && (
                    <Badge className="bg-red-100 text-red-700 text-xs capitalize">{w.wellbeing_status}</Badge>
                  )}
                  <span className="text-red-600 font-bold">{w.energy_level ?? "?"}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}