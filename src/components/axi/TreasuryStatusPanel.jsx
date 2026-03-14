import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Landmark, AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const ALERT_THRESHOLD = 150;
const SAFE_BALANCE = 316;

export default function TreasuryStatusPanel() {
  const { data: treasuries = [] } = useQuery({
    queryKey: ["axi-treasury"],
    queryFn: () => base44.entities.Treasury.list(),
    refetchInterval: 60000,
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-slate-700">Treasury</span>
      </div>
      {treasuries.length === 0 ? (
        <p className="text-xs text-slate-400">No treasury data</p>
      ) : (
        <div className="space-y-3">
          {treasuries.map(t => {
            const balance = t.total_balance ?? 0;
            const isLow = balance < ALERT_THRESHOLD;
            const pct = Math.min(100, Math.round((balance / SAFE_BALANCE) * 100));

            return (
              <div key={t.id} className={`rounded-lg border p-3 ${isLow ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">{t.name}</span>
                  <Badge className={isLow ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                    {balance.toLocaleString()} XRP
                  </Badge>
                </div>
                <Progress value={pct} className="h-1.5 mb-1" />
                {isLow && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Below 150 XRP threshold — alert co-creator
                  </p>
                )}
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Deposits: {(t.total_deposits ?? 0).toLocaleString()} XRP</span>
                  <span>Withdrawn: {(t.total_withdrawals ?? 0).toLocaleString()} XRP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}