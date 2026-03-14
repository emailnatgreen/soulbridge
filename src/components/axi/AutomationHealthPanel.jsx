import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertTriangle, Cpu, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function AutomationHealthPanel() {
  const [expanded, setExpanded] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["axi-automation-logs"],
    queryFn: () => base44.entities.AutomationLog.list("-created_date", 80),
    refetchInterval: 30000,
  });

  const byName = logs.reduce((acc, log) => {
    if (!acc[log.automation_name]) acc[log.automation_name] = [];
    acc[log.automation_name].push(log);
    return acc;
  }, {});

  const automations = Object.entries(byName).map(([name, runs]) => {
    const total = runs.length;
    const successes = runs.filter(r => r.status === "success").length;
    const errors = runs.filter(r => r.status === "error").length;
    const rate = total > 0 ? Math.round((successes / total) * 100) : 0;
    const last = runs[0];
    const lastErrors = runs.filter(r => r.status === "error").slice(0, 3);
    return { name, total, successes, errors, rate, last, lastErrors };
  });

  // Sort: errors first, then by rate ascending
  automations.sort((a, b) => {
    if (a.last?.status === "error" && b.last?.status !== "error") return -1;
    if (b.last?.status === "error" && a.last?.status !== "error") return 1;
    return a.rate - b.rate;
  });

  const overallRate = automations.length > 0
    ? Math.round(automations.reduce((s, a) => s + a.rate, 0) / automations.length)
    : 100;

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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-700">Automation Health</span>
        </div>
        <Badge className={`text-xs ${rateColor(overallRate)}`}>Overall {overallRate}%</Badge>
      </div>

      {automations.length === 0 ? (
        <p className="text-xs text-slate-400">No automation logs found</p>
      ) : (
        <div className="space-y-2">
          {automations.map(({ name, total, errors, rate, last, lastErrors }) => {
            const isExpanded = expanded === name;
            return (
              <div key={name} className={`rounded-lg border p-3 ${last?.status === "error" ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <button className="w-full text-left" onClick={() => setExpanded(isExpanded ? null : name)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(last?.status)}
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[130px]">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-xs ${rateColor(rate)}`}>{rate}%</Badge>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </div>
                  <Progress value={rate} className="h-1 mb-1.5" />
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{total} runs · {errors} errors</span>
                    {last?.run_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(last.run_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
                    {last?.error_detail && (
                      <div className="text-xs bg-red-100 text-red-700 rounded p-2">
                        <span className="font-semibold">Last error: </span>{last.error_detail}
                      </div>
                    )}
                    {lastErrors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-600">Recent errors:</p>
                        {lastErrors.map((e, i) => (
                          <div key={i} className="text-xs text-slate-500">
                            <span className="text-red-500">{e.run_at ? formatDistanceToNow(new Date(e.run_at), { addSuffix: true }) : ""}</span>
                            {" — "}{e.error_detail || e.message || "Unknown error"}
                          </div>
                        ))}
                      </div>
                    )}
                    {last?.message && (
                      <p className="text-xs text-slate-500">Last: {last.message}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}