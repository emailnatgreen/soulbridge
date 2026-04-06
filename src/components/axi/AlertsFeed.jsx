import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertTriangle, TrendingDown, Cpu, Shield, Heart, Vote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const typeIcon = {
  honor_change: TrendingDown,
  system: Cpu,
  governance_proposal: Vote,
  governance_vote_result: Vote,
  role_change: Shield,
  wellbeing: Heart,
  default: Bell,
};

const priorityColor = {
  urgent: "bg-red-900/30 text-red-300 border-red-700/50",
  high: "bg-orange-900/30 text-orange-300 border-orange-700/50",
  normal: "bg-blue-900/30 text-blue-300 border-blue-700/50",
  low: "bg-slate-800/50 text-slate-300 border-slate-700/50",
};

export default function AlertsFeed() {
  const { data: notifications = [] } = useQuery({
    queryKey: ["axi-alerts"],
    queryFn: () => base44.entities.AgentNotification.filter({ is_read: false }, "-created_date", 30),
    refetchInterval: 15000,
  });

  const urgent = notifications.filter(n => n.priority === "urgent" || n.priority === "high");
  const rest = notifications.filter(n => n.priority !== "urgent" && n.priority !== "high");
  const sorted = [...urgent, ...rest];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm text-white">Live Alerts</span>
        </div>
        {urgent.length > 0 && (
          <Badge className="bg-red-500 text-white text-xs px-2">{urgent.length} urgent</Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">All clear — no unread alerts</div>
        ) : (
          <div className="space-y-2">
            {sorted.map(n => {
              const Icon = typeIcon[n.notification_type] || typeIcon.default;
              return (
                <div key={n.id} className={`rounded-lg border p-3 ${priorityColor[n.priority] || priorityColor.normal}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{n.title || n.notification_type}</p>
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{n.priority}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}