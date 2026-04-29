import React, { useState } from 'react';
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
// Page-level:   /nft-workshop              → Workshop Pass (WIDGET-WS-001)
// Chrome tab:   /nft-workshop/chrome-skill  → Chrome Skill Pass (WIDGET-CS-001)
// Agent tab:    /nft-workshop/agent-nft     → Agent Creator Pass (WIDGET-AC-001)
// Village page: /agents/village             → Village Access Pass (WIDGET-VIL-001)
const PATHS = {
  widget: '/nft-workshop',
  chromeSkill: '/nft-workshop/chrome-skill',
  agent: '/nft-workshop/agent-nft',
};

export default function NFTWorkshop() {
  const { isAdmin: identityAdmin } = useIdentity();
  const { user } = useAuth();
  const isAdmin = identityAdmin || user?.role === 'admin';
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();
  const [activeTab, setActiveTab] = useState('widget');

  // Page-level gate: must own at least ONE of the three passes (or be admin)
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {/* Widget tab — gated by Workshop Pass */}
          <TabsContent value="widget" className="mt-4">
            {isAdmin || hasWidgetPass ? (
              <WidgetNFTForm />
            ) : (
              <TabLockOverlay nftName="Workshop Pass" nftId="WIDGET-WS-001" featurePath={PATHS.widget} />
            )}
          </TabsContent>

          {/* Chrome Skill tab — gated by Chrome Skill Pass */}
          <TabsContent value="chrome-skill" className="mt-4">
            {isAdmin || hasChromePass ? (
              <ChromeSkillNFTForm />
            ) : (
              <TabLockOverlay nftName="Chrome Skill Pass" nftId="WIDGET-CS-001" featurePath={PATHS.chromeSkill} />
            )}
          </TabsContent>

          {/* Agent tab — gated by Agent Creator Pass */}
          <TabsContent value="agent-nft" className="mt-4">
            {isAdmin || hasAgentPass ? (
              <AgentNFTForm />
            ) : (
              <TabLockOverlay nftName="Agent Creator Pass" nftId="WIDGET-AC-001" featurePath={PATHS.agent} />
            )}
          </TabsContent>

          {/* Infrastructure — admin only */}
          {isAdmin && (
            <TabsContent value="infrastructure" className="mt-4">
              <InfrastructureNFTForm />
            </TabsContent>
          )}
        </Tabs>

        <SkillPerformancePanel />
        <MyMintedNFTs />
      </div>
    </div>
  );
}