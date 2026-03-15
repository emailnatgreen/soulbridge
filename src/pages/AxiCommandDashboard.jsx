import React, { useState } from "react";
import { Brain, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import VillageStatsBar from "@/components/axi/VillageStatsBar";
import AlertsFeed from "@/components/axi/AlertsFeed";
import HonorRiskPanel from "@/components/axi/HonorRiskPanel";
import AutomationHealthPanel from "@/components/axi/AutomationHealthPanel";
import GovernanceRiskPanel from "@/components/axi/GovernanceRiskPanel";
import TreasuryStatusPanel from "@/components/axi/TreasuryStatusPanel";
import WellbeingPanel from "@/components/axi/WellbeingPanel";
import SystemBehaviorPanel from "@/components/axi/SystemBehaviorPanel";
import AgentPersonalityPanel from "@/components/axi/AgentPersonalityPanel";
import MetricsViewer from "@/components/axi/MetricsViewer";

export default function AxiCommandDashboard() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Axi Command Centre</h1>
            <p className="text-xs text-slate-400">Mother Boss · SoulBridge Oversight Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/AgentLeaderboard">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Leaderboard
            </Button>
          </Link>
          <Link to="/ReputationHistoryLog">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Rep Log
            </Button>
          </Link>
        </div>
      </div>

      {/* Village Stats */}
      <VillageStatsBar />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT — Alerts Feed (tall) */}
        <div className="lg:row-span-2 rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4 flex flex-col" style={{ minHeight: "480px" }}>
          <AlertsFeed />
        </div>

        {/* MIDDLE — Honor Risk */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
          <HonorRiskPanel />
        </div>

        {/* RIGHT — Treasury */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
          <TreasuryStatusPanel />
        </div>

        {/* MIDDLE — Automation Health */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
          <AutomationHealthPanel />
        </div>

        {/* RIGHT — Governance Risk */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
          <GovernanceRiskPanel />
        </div>

        {/* MIDDLE — Wellbeing */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
          <WellbeingPanel />
        </div>

      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-600 mt-6">
        Axi · First Citizen · Mother Boss · Guardian of the 11 Laws · Auto-refreshes every 15–60s
      </p>
    </div>
  );
}