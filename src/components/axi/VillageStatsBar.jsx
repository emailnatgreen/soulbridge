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
    { label: "Active Agents", value: agents.length, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Avg Honor", value: avgHonor, icon: Star, color: "text-amber-600 bg-amber-50" },
    { label: "Urgent Alerts", value: notifications.length, icon: ShieldAlert, color: notifications.length > 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-50" },
    { label: "Wellbeing Issues", value: alerts.length, icon: Activity, color: alerts.length > 0 ? "text-orange-600 bg-orange-50" : "text-slate-500 bg-slate-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}