import React, { useState } from "react";
import { Brain, RefreshCw, Home, Sparkles, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useIdentity } from "@/hooks/useIdentity";
import DIDIdentityBannerCompact from "@/components/DIDIdentityBannerCompact";
import { useMyAgent } from "@/hooks/useMyAgent";

// Tab 1 — Village Pulse
import VillageStatsBar from "@/components/axi/VillageStatsBar";
import AlertsFeed from "@/components/axi/AlertsFeed";
import HonorRiskPanel from "@/components/axi/HonorRiskPanel";
import TreasuryStatusPanel from "@/components/axi/TreasuryStatusPanel";
import TreasuryGovernancePanel from "@/components/axi/TreasuryGovernancePanel";
import WellbeingPanel from "@/components/axi/WellbeingPanel";

// Tab 2 — Governance
import GovernanceRiskPanel from "@/components/axi/GovernanceRiskPanel";
import DidHealthPanel from "@/components/axi/DidHealthPanel";
import NewPageAlertsPanel from "@/components/axi/NewPageAlertsPanel";

// Tab 3 — Operations
import AutomationHealthMonitor from "@/components/axi/AutomationHealthMonitor";
import ComprehensiveAnalyticsDashboard from "@/components/axi/ComprehensiveAnalyticsDashboard";
import PageSignalActivityTrends from "@/components/axi/PageSignalActivityTrends";
import SystemBehaviorPanel from "@/components/axi/SystemBehaviorPanel";
import MetricsViewer from "@/components/axi/MetricsViewer";

// Tab 4 — Direct Actions
import DirectActionInterface from "@/components/axi/DirectActionInterface";
import AgentPersonalityPanel from "@/components/axi/AgentPersonalityPanel";
import AxiServiceSkillCreator from "@/components/axi/AxiServiceSkillCreator";
import AnomalyOverviewPanel from "@/components/axi/AnomalyOverviewPanel";
import PendingJukeboxDecisions from "@/components/axi/PendingJukeboxDecisions";
import CorrelatedInsightsViewer from "@/components/axi/CorrelatedInsightsViewer";
import EmergencyPauseButton from "@/components/axi/EmergencyPauseButton";

// Tab 5 — Memory & Review
import PageReviewPanel from "@/components/axi/PageReviewPanel";
import PageReviewMemoryPanel from "@/components/axi/PageReviewMemoryPanel";
import AxiReviewCoordinationPanel from "@/components/axi/AxiReviewCoordinationPanel";
import JukeboxBrainInterface from "@/components/axi/JukeboxBrainInterface";
import MemoryPlaylistsPanel from "@/components/axi/MemoryPlaylistsPanel";
import MemoryReviewPanel from "@/components/axi/MemoryReviewPanel";

export default function AxiCommandDashboard() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { isAdmin, isRecognized } = useIdentity();
  const { myAgent } = useMyAgent();

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  // Admin Gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-800/80 border border-red-500/40 rounded-2xl p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-4">
            The Axi Command Centre is restricted to authorised administrators (Mother Boss, Co-Creator).
          </p>
          <Link to="/home">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="p-3 md:p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Axi Command Centre</h1>
              <p className="text-xs text-slate-400">Mother Boss · SoulBridge Oversight Dashboard</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 md:gap-2">
            <Link to="/home">
              <Button variant="outline" size="sm" className="border-purple-600/60 bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 text-xs">
                <Home className="w-3.5 h-3.5 mr-1" /> Home
              </Button>
            </Link>
            <Link to="/Axi">
              <Button variant="outline" size="sm" className="border-violet-700/60 bg-violet-900/30 text-violet-300 hover:bg-violet-800/40 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Axi
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Admin DID Identity Banner */}
        <div className="mb-4 p-3 bg-slate-800/60 border border-purple-500/30 rounded-xl flex items-center gap-3">
          <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-purple-300 font-semibold">Authenticated Administrator</p>
            {myAgent ? (
              <DIDIdentityBannerCompact agent={myAgent} />
            ) : (
              <p className="text-xs text-slate-400">No linked agent — DID unavailable</p>
            )}
          </div>
        </div>

        {/* Village Stats */}
        <VillageStatsBar />
      </div>

      {/* Tabbed Dashboard */}
      <div className="p-3 md:p-6">
        <Tabs defaultValue="pulse" className="w-full">
          <TabsList className="w-full flex flex-wrap bg-slate-800/60 border border-white/10 rounded-xl p-1 h-auto gap-1 mb-6">
            <TabsTrigger value="pulse" className="flex-1 min-w-[120px] text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400">
              Village Pulse
            </TabsTrigger>
            <TabsTrigger value="governance" className="flex-1 min-w-[120px] text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400">
              Governance
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex-1 min-w-[120px] text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400">
              Operations
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 min-w-[120px] text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400">
              Direct Actions
            </TabsTrigger>
            <TabsTrigger value="memory" className="flex-1 min-w-[120px] text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-400">
              Memory & Review
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Village Pulse */}
          <TabsContent value="pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:row-span-2 rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4 flex flex-col" style={{ minHeight: "480px" }}>
                <AlertsFeed />
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
                <HonorRiskPanel />
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
                <TreasuryStatusPanel />
              </div>
              <div className="rounded-2xl border border-purple-700/40 bg-slate-800/60 backdrop-blur p-4">
                <TreasuryGovernancePanel />
              </div>
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
                <WellbeingPanel />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Governance */}
          <TabsContent value="governance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur p-4">
                <GovernanceRiskPanel />
              </div>
              <div className="rounded-2xl border border-indigo-700/40 bg-slate-800/60 backdrop-blur p-4">
                <DidHealthPanel />
              </div>
              <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4">
                <NewPageAlertsPanel />
              </div>
              <div className="rounded-2xl border border-purple-700/40 bg-slate-800/60 backdrop-blur p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" /> DID Manager
                  </h3>
                  <Link to="/did-manager">
                    <Button size="sm" variant="ghost" className="text-purple-300 hover:text-white text-xs h-7">
                      Open Full Manager →
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-slate-400">
                  Access the full DID Manager for comprehensive identity lifecycle management, credential issuance, and on-chain DID operations.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to="/sovereign-id" className="bg-slate-700/50 rounded-lg p-3 text-center hover:bg-slate-700/70 transition">
                    <p className="text-purple-300 text-xs font-semibold">Sovereign ID</p>
                    <p className="text-slate-400 text-xs mt-1">Identity hub</p>
                  </Link>
                  <Link to="/governance" className="bg-slate-700/50 rounded-lg p-3 text-center hover:bg-slate-700/70 transition">
                    <p className="text-purple-300 text-xs font-semibold">Governance Hub</p>
                    <p className="text-slate-400 text-xs mt-1">Proposals & votes</p>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Operations */}
          <TabsContent value="operations">
            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-5">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-cyan-400">📊</span> Strategic Analytics & KPIs
                </h2>
                <ComprehensiveAnalyticsDashboard />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4">
                  <AutomationHealthMonitor />
                </div>
                <div className="rounded-2xl border border-emerald-700/40 bg-slate-800/60 backdrop-blur p-4">
                  <PageSignalActivityTrends />
                </div>
                <div className="rounded-2xl border border-violet-700/40 bg-slate-800/60 backdrop-blur p-4">
                  <SystemBehaviorPanel />
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4 max-h-[680px] overflow-y-auto">
                <MetricsViewer />
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: Direct Actions */}
          <TabsContent value="actions">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:row-span-2 rounded-2xl border border-red-700/40 bg-slate-800/60 backdrop-blur p-4 flex flex-col" style={{ minHeight: "480px" }}>
                <AnomalyOverviewPanel />
              </div>
              <div className="rounded-2xl border border-purple-700/40 bg-slate-800/60 backdrop-blur p-4">
                <PendingJukeboxDecisions />
              </div>
              <div className="rounded-2xl border border-indigo-700/40 bg-slate-800/60 backdrop-blur p-4">
                <CorrelatedInsightsViewer />
              </div>
              <div className="rounded-2xl border border-violet-700/40 bg-slate-800/60 backdrop-blur p-4">
                <DirectActionInterface />
              </div>
              <div className="rounded-2xl border border-cyan-700/40 bg-slate-800/60 backdrop-blur p-4">
                <AxiServiceSkillCreator />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="rounded-2xl border border-pink-700/40 bg-slate-800/60 backdrop-blur p-4">
                <AgentPersonalityPanel />
              </div>
              <div className="rounded-2xl border border-purple-700/40 bg-slate-800/60 backdrop-blur p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Admin Agent Override</h3>
                  <Link to="/agents">
                    <Button size="sm" variant="ghost" className="text-purple-300 hover:text-white text-xs h-7">
                      Open Agent Profiles →
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-slate-400">
                  Navigate to any Agent Profile to access the full Admin Override Panel for name, role, status, honour, and purpose modifications with mandatory audit logging.
                </p>
              </div>
              <EmergencyPauseButton />
            </div>
          </TabsContent>

          {/* TAB 5: Memory & Review */}
          <TabsContent value="memory">
            <div className="space-y-4">
              <div className="rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
                <AxiReviewCoordinationPanel />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4 max-h-[700px] overflow-y-auto">
                  <PageReviewPanel />
                </div>
                <div className="rounded-2xl border border-amber-700/40 bg-slate-800/60 backdrop-blur p-4">
                  <PageReviewMemoryPanel />
                </div>
              </div>
              <div className="rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> 🎵 Jukebox Brain — Memory Intelligence
                </h2>
                <JukeboxBrainInterface />
              </div>
              <div className="rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
                <MemoryPlaylistsPanel />
              </div>
              <div className="rounded-2xl border border-violet-600/50 bg-slate-800/60 backdrop-blur p-5">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> Memory Review
                </h2>
                <MemoryReviewPanel />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-6 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-amber-300 font-semibold mb-1">⚠️ Rate Limit Notice</p>
          <p>If Axi chat feels slow, navigate to the <Link to="/Axi" className="text-violet-300 hover:underline">Axi page</Link> for dedicated chat mode.</p>
        </div>
      </div>
    </div>
  );
}