import React, { useState } from "react";
import { Brain, RefreshCw, ExternalLink, Home, Sparkles, ClipboardList, Calendar, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import VillageStatsBar from "@/components/axi/VillageStatsBar";
import AlertsFeed from "@/components/axi/AlertsFeed";
import HonorRiskPanel from "@/components/axi/HonorRiskPanel";
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
import MemoryReviewPanel from "@/components/axi/MemoryReviewPanel";
import JukeboxBrainInterface from "@/components/axi/JukeboxBrainInterface";
import MemoryPlaylistsPanel from "@/components/axi/MemoryPlaylistsPanel";
import AnomalyOverviewPanel from "@/components/axi/AnomalyOverviewPanel";
import PendingJukeboxDecisions from "@/components/axi/PendingJukeboxDecisions";
import CorrelatedInsightsViewer from "@/components/axi/CorrelatedInsightsViewer";
import PageSignalActivityTrends from "@/components/axi/PageSignalActivityTrends";
import AutomationHealthMonitor from "@/components/axi/AutomationHealthMonitor";
import DirectActionInterface from "@/components/axi/DirectActionInterface";
import AutomationTerminal from "@/components/axi/AutomationTerminal";

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
          <Link to="/MemoryBrowser">
            <Button variant="outline" size="sm" className="border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-800/40 text-xs">
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Memory Browser
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

          {/* JUKEBOX BRAIN NERVE CENTER — Core Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* LEFT — Active Anomalies (tall) */}
            <div className="lg:row-span-2 rounded-2xl border border-red-700/40 bg-slate-800/60 backdrop-blur p-4 flex flex-col" style={{ minHeight: "480px" }}>
              <AnomalyOverviewPanel />
            </div>

            {/* MIDDLE — Pending Decisions */}
            <div className="rounded-2xl border border-purple-700/40 bg-slate-800/60 backdrop-blur p-4">
              <PendingJukeboxDecisions />
            </div>

            {/* RIGHT — Automation Health */}
            <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4">
              <AutomationHealthMonitor />
            </div>

            {/* MIDDLE — Page Signal Trends */}
            <div className="rounded-2xl border border-emerald-700/40 bg-slate-800/60 backdrop-blur p-4">
              <PageSignalActivityTrends />
            </div>

            {/* RIGHT — Correlated Insights */}
            <div className="rounded-2xl border border-indigo-700/40 bg-slate-800/60 backdrop-blur p-4">
              <CorrelatedInsightsViewer />
            </div>
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

            {/* MIDDLE — Direct Action Interface */}
            <div className="rounded-2xl border border-violet-700/40 bg-slate-800/60 backdrop-blur p-4">
              <DirectActionInterface />
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

          {/* Jukebox Brain Interface — Primary Memory Control Panel */}
          <div className="mt-4 rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> 🎵 Jukebox Brain — Memory Intelligence Control
            </h2>
            <JukeboxBrainInterface />
          </div>

          {/* Memory Playlists Panel */}
          <div className="mt-4 rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
            <MemoryPlaylistsPanel />
          </div>

          {/* Memory Review Panel */}
          <div className="mt-4 rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> Memory Review
            </h2>
            <MemoryReviewPanel />
          </div>

          {/* Memory Browser Quick Access */}
          <div className="mt-4 rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-400" /> Memory Verification
              </h2>
              <Link to="/MemoryBrowser">
                <Button size="sm" className="bg-violet-700 hover:bg-violet-600 text-white text-xs gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Open Memory Browser
                </Button>
              </Link>
            </div>
            <p className="text-slate-400 text-sm">
              Use the Memory Browser to independently verify what Axi has actually persisted. Agent self-reported saves should always be cross-checked here — the database is the only source of truth.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-violet-300 text-xs font-semibold">Verified Truth</p>
                <p className="text-slate-400 text-xs mt-1">Only records here are real</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-amber-300 text-xs font-semibold">Agent Saves</p>
                <p className="text-slate-400 text-xs mt-1">Self-reports can hallucinate</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-green-300 text-xs font-semibold">Send to Axi</p>
                <p className="text-slate-400 text-xs mt-1">Discuss any memory directly</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 mt-6 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
            <p className="text-amber-300 font-semibold mb-1">⚠️ Rate Limit Notice</p>
            <p>If Axi chat feels slow, navigate to the <Link to="/Axi" className="text-violet-300 hover:underline">Axi page</Link> for dedicated chat mode.</p>
          </div>

      </div>
    </div>
  );
}