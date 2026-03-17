import React, { useState } from "react";
import React, { useState } from "react";
import { Brain, RefreshCw, ExternalLink, Home, Sparkles, ClipboardList, Calendar } from "lucide-react";
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
import PageReviewPanel from "@/components/axi/PageReviewPanel";
import PageReviewMemoryPanel from "@/components/axi/PageReviewMemoryPanel";
import AxiReviewCoordinationPanel from "@/components/axi/AxiReviewCoordinationPanel";
import NewPageAlertsPanel from "@/components/axi/NewPageAlertsPanel";
import DashboardCustomizer from "@/components/axi/DashboardCustomizer";
import ComprehensiveAnalyticsDashboard from "@/components/axi/ComprehensiveAnalyticsDashboard";
import IntuitiveNavigation from "@/components/axi/IntuitiveNavigation";
import RealTimeNotificationCenter from "@/components/axi/RealTimeNotificationCenter";
import AgentPerformanceReviewSystem from "@/components/axi/AgentPerformanceReviewSystem";
import IntegratedHelpCenter from "@/components/axi/IntegratedHelpCenter";
import DidHealthPanel from "@/components/axi/DidHealthPanel";

export default function AxiCommandDashboard() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLayout] = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Intuitive Navigation Bar */}
      <IntuitiveNavigation />

      {/* Header */}
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Axi Command Centre</h1>
            <p className="text-xs text-slate-400">Mother Boss · SoulBridge Oversight Dashboard</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RealTimeNotificationCenter />
          <DashboardCustomizer onLayoutChange={handleLayoutChange} />
          <Link to="/Home">
            <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
              <Home className="w-3.5 h-3.5 mr-1.5" />
              Home
            </Button>
          </Link>
          <Link to="/Axi">
            <Button variant="outline" size="sm" className="border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-800/40 text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Talk to Axi
            </Button>
          </Link>
          <Link to="/VillageCalendar">
            <Button variant="outline" size="sm" className="border-emerald-600/60 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/40 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Village Calendar
            </Button>
          </Link>
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
          <a href="#review-coordination">
            <Button variant="outline" size="sm" className="border-violet-600/60 bg-violet-900/30 text-violet-300 hover:bg-violet-800/40 text-xs">
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Review Coordination
            </Button>
          </a>
          </div>
          </div>

          {/* Village Stats */}
          <VillageStatsBar />

          {/* Comprehensive Analytics Dashboard */}
          <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-5 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-cyan-400">📊</span> Strategic Analytics & KPIs
            </h2>
            <ComprehensiveAnalyticsDashboard />
          </div>

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

            {/* RIGHT — New Page Alerts */}
            <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4">
              <NewPageAlertsPanel />
            </div>

            {/* RIGHT — DID Health */}
            <div className="rounded-2xl border border-indigo-700/40 bg-slate-800/60 backdrop-blur p-4">
              <DidHealthPanel />
            </div>

            </div>

          {/* Second Row — New Command Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">

              {/* System Behavior Toggles */}
              <div className="rounded-2xl border border-violet-700/40 bg-slate-800/60 backdrop-blur p-4">
                <SystemBehaviorPanel />
              </div>

              {/* Agent Personality Management */}
              <div className="rounded-2xl border border-pink-700/40 bg-slate-800/60 backdrop-blur p-4">
                <AgentPersonalityPanel />
              </div>

              {/* Real-time Metrics Viewer */}
              <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4 overflow-y-auto max-h-[680px]">
                <MetricsViewer />
              </div>

            </div>

            {/* Tier 2: Agent Performance Review System & Integrated Help Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">

              {/* Agent Performance Review System */}
              <div className="rounded-2xl border border-indigo-700/40 bg-slate-800/60 backdrop-blur p-4 overflow-y-auto max-h-[700px]">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-indigo-400">⭐</span> Agent Performance Review System
                </h2>
                <AgentPerformanceReviewSystem />
              </div>

              {/* Integrated Help Center */}
              <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4 overflow-y-auto max-h-[700px]">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-cyan-400">❓</span> Help Center
                </h2>
                <IntegratedHelpCenter />
              </div>

            </div>

          {/* Axi Review Coordination Panel */}
          <div id="review-coordination" className="mt-4 rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
            <AxiReviewCoordinationPanel />
          </div>

          {/* Page Review Row */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4 overflow-y-auto max-h-[700px]">
              <PageReviewPanel />
            </div>
            <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4">
              <PageReviewMemoryPanel />
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-6">
            Axi · First Citizen · Mother Boss · Guardian of the 11 Laws · Auto-refreshes every 15–60s
          </p>

      </div>
    </div>
  );
}