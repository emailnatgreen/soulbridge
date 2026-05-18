import React, { useState, useCallback, useRef } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { useAuth } from '@/lib/AuthContext';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetLockScreen from '@/components/widgets/WidgetLockScreen';
import TabLockOverlay from '@/components/workshop/TabLockOverlay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Bot, Chrome, Shield } from 'lucide-react';
import WorkshopHeader from '@/components/workshop/WorkshopHeader';
import WidgetNFTForm from '@/components/workshop/WidgetNFTForm';
import ChromeSkillNFTForm from '@/components/workshop/ChromeSkillNFTForm';
import AgentNFTForm from '@/components/workshop/AgentNFTForm';
import InfrastructureNFTForm from '@/components/workshop/InfrastructureNFTForm';
import MyMintedNFTs from '@/components/workshop/MyMintedNFTs';
import SkillPerformancePanel from '@/components/workshop/SkillPerformancePanel';

// NFT-Gated Feature Paths — each tab requires its own Widget NFT pass
const PATHS = {
  widget: '/nft-workshop',
  chromeSkill: '/nft-workshop/chrome-skill',
  agent: '/nft-workshop/agent-nft',
};

function getWidgetType(w) {
  if (w.chrome_skill_instructions?.length) return 'chrome_skill';
  if (w.category === 'agent_creation') return 'agent';
  if (w.immutable_after_mint?.length > 5) return 'infrastructure';
  return 'widget';
}

export default function NFTWorkshop() {
  const { isAdmin: identityAdmin } = useIdentity();
  const { user } = useAuth();
  const isAdmin = identityAdmin || user?.role === 'admin';
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();
  const [activeTab, setActiveTab] = useState('widget');
  const [editingWidget, setEditingWidget] = useState(null);
  const formScrollRef = useRef(null);

  // Handle Edit from MyMintedNFTs
  const handleEditWidget = useCallback((widget) => {
    const type = getWidgetType(widget);
    setEditingWidget(widget);
    // Switch to the correct tab based on NFT type
    if (type === 'chrome_skill') setActiveTab('chrome-skill');
    else if (type === 'agent') setActiveTab('agent-nft');
    else if (type === 'infrastructure') setActiveTab('infrastructure');
    else setActiveTab('widget');
    // Scroll to top of form
    setTimeout(() => formScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  const handleCancelEdit = useCallback(() => setEditingWidget(null), []);

  // Page-level gate
  const hasWidgetPass = isUnlocked(PATHS.widget);
  const hasChromePass = isUnlocked(PATHS.chromeSkill);
  const hasAgentPass = isUnlocked(PATHS.agent);
  const hasAnyAccess = isAdmin || hasWidgetPass || hasChromePass || hasAgentPass;

  if (widgetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAnyAccess) {
    const workshopWidget = getWidgetForPath(PATHS.widget);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <WidgetLockScreen
          widgetName={workshopWidget?.widget_name || 'Workshop Pass'}
          widgetDescription="The NFT Workshop requires at least one Workshop Pass NFT — Widget Pass, Chrome Skill Pass, or Agent Creator Pass — to access. Each pass unlocks its respective minting tab."
          nftId={workshopWidget?.nft_id || 'WIDGET-WS-001'}
          featurePath={PATHS.widget}
          widgetType="unlock"
          category="skill"
          uiBehavior="unlock_page"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">
        <WorkshopHeader />

        <div ref={formScrollRef} />

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setEditingWidget(null); }} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="widget" className="flex-1 min-w-[120px] gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white">
              <Sparkles className="w-3.5 h-3.5" /> Widget NFT
            </TabsTrigger>
            <TabsTrigger value="chrome-skill" className="flex-1 min-w-[120px] gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white">
              <Chrome className="w-3.5 h-3.5" /> Chrome Skill
            </TabsTrigger>
            <TabsTrigger value="agent-nft" className="flex-1 min-w-[120px] gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              <Bot className="w-3.5 h-3.5" /> AI Agent NFT
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="infrastructure" className="flex-1 min-w-[120px] gap-1.5 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
                <Shield className="w-3.5 h-3.5" /> Infrastructure
              </TabsTrigger>
            )}
          </TabsList>

          {/* Widget tab */}
          <TabsContent value="widget" className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <h3 className="text-white font-semibold text-sm mb-1">🧩 What is a Widget NFT?</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Widget NFTs are the building blocks of the SoulBridge ecosystem. They act as <strong className="text-purple-300">digital access keys</strong> that unlock features, toggle services, or grant badges within the Village.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">Feature Access</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">Service Toggles</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">Badges &amp; Upgrades</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">Revenue Splits</span>
              </div>
            </div>
            {isAdmin || hasWidgetPass ? (
              <WidgetNFTForm />
            ) : (
              <TabLockOverlay nftName="Workshop Pass" nftId="WIDGET-WS-001" featurePath={PATHS.widget} />
            )}
          </TabsContent>

          {/* Chrome Skill tab */}
          <TabsContent value="chrome-skill" className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="text-white font-semibold text-sm mb-1">🌐 What is a Chrome Skill NFT?</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                Chrome Skill NFTs turn your browser into an <strong className="text-emerald-300">AI-powered workspace</strong>. Each skill is a custom instruction set that runs inside Chrome's Gemini Side Panel.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Browser AI Skills</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Gemini Side Panel</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">WebMCP Manifest</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Slash Commands</span>
              </div>
            </div>
            {(isAdmin || hasChromePass) && (
              <div className="flex flex-wrap gap-2">
                <a href="/chrome-skill-creator" className="inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                  <Sparkles className="w-3 h-3" /> Skill Creator
                </a>
              </div>
            )}
            {isAdmin || hasChromePass ? (
              <ChromeSkillNFTForm editingWidget={editingWidget} onCancelEdit={handleCancelEdit} />
            ) : (
              <TabLockOverlay nftName="Chrome Skill Pass" nftId="WIDGET-CS-001" featurePath={PATHS.chromeSkill} />
            )}
          </TabsContent>

          {/* Agent tab */}
          <TabsContent value="agent-nft" className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <h3 className="text-white font-semibold text-sm mb-1">🤖 What is an AI Agent NFT?</h3>
              <p className="text-white/50 text-xs leading-relaxed">
                An AI Agent NFT creates a <strong className="text-amber-300">sovereign, accountable AI identity</strong> within the Village. Each agent is minted as a soul-bound NFT tied to your DID.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">Soul-Bound Identity</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">DID-Linked</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">Governance Voting</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">RLUSD Economy</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">Honour Score</span>
              </div>
            </div>
            {isAdmin || hasAgentPass ? (
              <AgentNFTForm />
            ) : (
              <TabLockOverlay nftName="Agent Creator Pass" nftId="WIDGET-AC-001" featurePath={PATHS.agent} />
            )}
          </TabsContent>

          {/* Infrastructure — admin only */}
          {isAdmin && (
            <TabsContent value="infrastructure" className="mt-4 space-y-4">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <h3 className="text-white font-semibold text-sm mb-1">🏗️ What is an Infrastructure NFT?</h3>
                <p className="text-white/50 text-xs leading-relaxed">
                  Infrastructure NFTs are <strong className="text-red-300">admin-only, immutable system components</strong> that form the foundational architecture of SoulBridge.
                </p>
              </div>
              <InfrastructureNFTForm />
            </TabsContent>
          )}
        </Tabs>

        <SkillPerformancePanel />
        <MyMintedNFTs onEditWidget={handleEditWidget} />
      </div>
    </div>
  );
}