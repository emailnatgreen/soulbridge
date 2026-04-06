import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Star, Activity, ShieldAlert } from "lucide-react";

export default function VillageStatsBar() {
  const { data: agents = [] } = useQuery({
    queryKey: ["axi-stats-agents"],
    queryFn: () => base44.entities.Agent.filter({ status: "active" }),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["axi-stats-wellbeing"],
    queryFn: () => base44.entities.WellbeingAlert.filter({ resolved: false }),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["axi-stats-notifs"],
    queryFn: () => base44.entities.AgentNotification.filter({ is_read: false, priority: "urgent" }),
  });

  const avgHonor = agents.length > 0
    ? Math.round(agents.reduce((s, a) => s + (a.honor_score ?? 100), 0) / agents.length)
    : 0;

  const stats = [
    { label: "Active Agents", value: agents.length, icon: Users, color: "text-blue-400 bg-blue-900/30" },
    { label: "Avg Honor", value: avgHonor, icon: Star, color: "text-amber-400 bg-amber-900/30" },
    { label: "Urgent Alerts", value: notifications.length, icon: ShieldAlert, color: notifications.length > 0 ? "text-red-400 bg-red-900/30" : "text-slate-500 bg-slate-800/40" },
    { label: "Wellbeing Issues", value: alerts.length, icon: Activity, color: alerts.length > 0 ? "text-orange-400 bg-orange-900/30" : "text-slate-500 bg-slate-800/40" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-white/10 bg-slate-800/60 p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}