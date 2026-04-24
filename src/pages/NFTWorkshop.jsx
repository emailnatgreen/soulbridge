import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useIdentity } from '@/hooks/useIdentity';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetLockScreen from '@/components/widgets/WidgetLockScreen';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Bot, Chrome, Shield, Layers } from 'lucide-react';
import WorkshopHeader from '@/components/workshop/WorkshopHeader';
import WidgetNFTForm from '@/components/workshop/WidgetNFTForm';
import ChromeSkillNFTForm from '@/components/workshop/ChromeSkillNFTForm';
import AgentNFTForm from '@/components/workshop/AgentNFTForm';
import InfrastructureNFTForm from '@/components/workshop/InfrastructureNFTForm';
import MyMintedNFTs from '@/components/workshop/MyMintedNFTs';

const WORKSHOP_FEATURE_PATH = '/nft-workshop';

export default function NFTWorkshop() {
  const { isAdmin, isRecognized } = useIdentity();
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();
  const [activeTab, setActiveTab] = useState('widget');

  // Check ownership of the Workshop NFT
  const hasAccess = isAdmin || isUnlocked(WORKSHOP_FEATURE_PATH);
  const workshopWidget = getWidgetForPath(WORKSHOP_FEATURE_PATH);

  if (widgetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <WidgetLockScreen
          widgetName={workshopWidget?.widget_name || 'NFT Workshop Pass'}
          widgetDescription="The NFT Workshop is a sovereign creation environment for minting Widget NFTs, Chrome Skill NFTs, and AI Agent NFTs on the XRPL. Access requires ownership of the Workshop Pass NFT."
          nftId={workshopWidget?.nft_id || 'WIDGET-WORKSHOP-001'}
          featurePath={WORKSHOP_FEATURE_PATH}
          widgetType="unlock"
          category="governance"
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

          <TabsContent value="widget" className="mt-4">
            <WidgetNFTForm />
          </TabsContent>
          <TabsContent value="chrome-skill" className="mt-4">
            <ChromeSkillNFTForm />
          </TabsContent>
          <TabsContent value="agent-nft" className="mt-4">
            <AgentNFTForm />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="infrastructure" className="mt-4">
              <InfrastructureNFTForm />
            </TabsContent>
          )}
        </Tabs>

        <MyMintedNFTs />
      </div>
    </div>
  );
}