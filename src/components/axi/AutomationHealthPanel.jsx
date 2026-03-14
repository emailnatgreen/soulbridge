import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertTriangle, Cpu, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function AutomationHealthPanel() {
  const { data: logs = [] } = useQuery({
    queryKey: ["axi-automation-logs"],
    queryFn: () => base44.entities.AutomationLog.list("-created_date", 40),
    refetchInterval: 30000,
  });

  // Group by automation_name
  const byName = logs.reduce((acc, log) => {
    if (!acc[log.automation_name]) acc[log.automation_name] = [];
    acc[log.automation_name].push(log);
    return acc;
  }, {});

  const automations = Object.entries(byName).map(([name, runs]) => {
    const total = runs.length;
    const successes = runs.filter(r => r.status === "success").length;
    const rate = total > 0 ? Math.round((successes / total) * 100) : 0;
    const last = runs[0];
    return { name, total, rate, last };
  });

  const statusIcon = (status) => {
    if (status === "success") return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === "error") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  };

  const rateColor = (rate) => {
    if (rate >= 90) return "bg-emerald-100 text-emerald-700";
    if (rate >= 70) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-slate-700">Automation Health</span>
      </div>
      {automations.length === 0 ? (
        <p className="text-xs text-slate-400">No automation logs found</p>
      ) : (
        <div className="space-y-3">
          {automations.map(({ name, total, rate, last }) => (
            <div key={name} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {statusIcon(last?.status)}
                  <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">{name}</span>
                </div>
                <Badge className={`text-xs ${rateColor(rate)}`}>{rate}%</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{total} runs</span>
                {last?.run_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(last.run_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {last?.status === "error" && last?.error_detail && (
                <p className="text-xs text-red-600 mt-1 line-clamp-2">{last.error_detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}