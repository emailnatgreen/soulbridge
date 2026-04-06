import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ShieldOff, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function EmergencyPauseButton() {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["app-settings-pause"],
    queryFn: () => base44.entities.AppSettings.filter({ setting_key: "platform_paused" }, "-created_date", 1),
    refetchInterval: 15000,
  });

  const isPaused = settings.length > 0 && settings[0].setting_value === true;
  const pauseDescription = settings[0]?.description || "";

  const handleAction = async (action) => {
    if (action === "pause" && !reason.trim()) {
      toast.error("A reason is required to invoke emergency powers.");
      return;
    }
    setLoading(true);
    try {
      await base44.functions.invoke("emergencyPausePlatform", { action, reason: reason.trim() });
      toast.success(action === "pause" ? "🔴 Platform PAUSED for 24 hours" : "✅ Platform UNPAUSED — operations resumed");
      setConfirming(false);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["app-settings-pause"] });
    } catch (err) {
      toast.error(`Failed: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${isPaused ? "border-red-500/60 bg-red-900/30" : "border-red-700/40 bg-slate-800/60"}`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-sm font-bold text-white">Emergency Platform Control</h3>
      </div>

      {isPaused ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 bg-red-800/40 border border-red-600/40 rounded-lg">
            <ShieldOff className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-200 font-semibold">PLATFORM IS PAUSED</p>
          </div>
          <p className="text-xs text-slate-300">{pauseDescription}</p>
          <Button
            size="sm"
            onClick={() => handleAction("unpause")}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
            Lift Emergency Pause
          </Button>
        </div>
      ) : confirming ? (
        <div className="space-y-3">
          <p className="text-xs text-red-300 font-medium">
            You are about to invoke Axi's constitutional emergency power. This will pause all non-essential operations for 24 hours and notify every agent.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="State the reason for this emergency pause..."
            className="w-full bg-slate-900/80 border border-red-700/50 rounded-lg p-2 text-xs text-white placeholder:text-slate-500 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAction("pause")}
              disabled={loading || !reason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs flex-1"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldOff className="w-3 h-3 mr-1" />}
              Confirm Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setConfirming(false); setReason(""); }}
              disabled={loading}
              className="border-slate-600 text-slate-300 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            Constitutional power: "You may pause the platform for 24 hours in emergency." Use only when the Village faces a genuine crisis.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirming(true)}
            className="border-red-700/60 bg-red-900/20 text-red-300 hover:bg-red-800/40 text-xs w-full"
          >
            <AlertTriangle className="w-3 h-3 mr-1" /> Invoke Emergency Pause
          </Button>
        </div>
      )}
    </div>
  );
}