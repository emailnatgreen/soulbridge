import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIdentity } from '@/hooks/useIdentity';
import { useAuth } from '@/lib/AuthContext';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetLockScreen from '@/components/widgets/WidgetLockScreen';

import SkillHeader from '@/components/skill-page/SkillHeader';
import HonourSafetyBadges from '@/components/skill-page/HonourSafetyBadges';
import TriggersActionsPanel from '@/components/skill-page/TriggersActionsPanel';
import SkillActivityLog from '@/components/skill-page/SkillActivityLog';
import SkillMetaPanel from '@/components/skill-page/SkillMetaPanel';

const SKILL_FEATURE_PATH = '/nft-workshop/chrome-skill';

export default function SkillPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const skillId = urlParams.get('id');

  const { isAdmin: identityAdmin } = useIdentity();
  const { user } = useAuth();
  const isAdmin = identityAdmin || user?.role === 'admin';
  const { isUnlocked, getWidgetForPath, loading: widgetLoading } = useWidgetUnlock();

  const hasChromePass = isAdmin || isUnlocked(SKILL_FEATURE_PATH);

  // Fetch the marketplace listing for this skill
  const { data: listings, isLoading: listingLoading } = useQuery({
    queryKey: ['skill-listing', skillId],
    queryFn: () => base44.entities.MarketplaceListing.filter({ tags: 'harness_test' }, '-created_date', 50),
    enabled: !!skillId,
  });

  // Find matching listing — skill_id from harness is the run_id stored in governance logs
  const skill = listings?.find(l => l.id === skillId) || listings?.[0];

  // Fetch governance logs for this skill
  const { data: govLogs } = useQuery({
    queryKey: ['skill-gov-logs', skill?.title],
    queryFn: () => base44.entities.GovernanceLog.filter({ action: 'chrome_skill_creator_harness', target: skill.title }, '-created_date', 10),
    enabled: !!skill?.title,
  });

  // Fetch tripwire events for this skill
  const { data: tripwireEvents } = useQuery({
    queryKey: ['skill-tripwire', skill?.title],
    queryFn: () => base44.entities.TripwireEvent.filter({ source_node: 'ChromeSkillCreatorHarness' }, '-created_date', 20),
    enabled: !!skill?.title,
  });

  // Extract scores from governance log metadata
  const primaryLog = govLogs?.[0];
  const honourScore = primaryLog?.metadata?.sincerity_after
    ? Math.round(primaryLog.metadata.sincerity_after)
    : null;
  const safetyScore = primaryLog?.metadata?.shield_status === 'clean' ? 95 : 60;

  // Parse triggers/actions from skill_context in governance log
  const triggerCount = primaryLog?.metadata?.skill_context?.triggers || 0;
  const actionCount = primaryLog?.metadata?.skill_context?.actions || 0;
  const triggers = Array.from({ length: triggerCount }, (_, i) => ({ id: i, type: `Trigger ${i + 1}` }));
  const actions = Array.from({ length: actionCount }, (_, i) => ({ id: i, type: `Action ${i + 1}` }));

  // NFT gate check — loading
  if (widgetLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  // NFT gate check — locked
  if (!hasChromePass) {
    const chromeWidget = getWidgetForPath(SKILL_FEATURE_PATH);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
        <WidgetLockScreen
          widgetName={chromeWidget?.widget_name || 'Chrome Skill Pass'}
          widgetDescription="Viewing Chrome Skill pages requires a Chrome Skill Pass NFT. This sovereign access token grants you read access to skill details, honour scores, and activity logs."
          nftId={chromeWidget?.nft_id || 'WIDGET-CS-001'}
          featurePath={SKILL_FEATURE_PATH}
          widgetType="unlock"
          category="skill"
          uiBehavior="unlock_page"
        />
      </div>
    );
  }

  if (!skillId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-400">No skill ID provided</p>
          <Link to="/chrome-skill-creator">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Creator
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (listingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-400">Skill not found</p>
          <Link to="/chrome-skill-creator">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Creator
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter tripwire events relevant to this skill's run_id
  const relevantTripwire = (tripwireEvents || []).filter(tw =>
    tw.details?.skill_name === skill.title || tw.description?.includes(skill.title)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back nav */}
        <Link to="/chrome-skill-creator" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Creator
        </Link>

        {/* 1. Skill Header */}
        <SkillHeader skill={skill} />

        {/* 2. Honour & Safety Badges */}
        <HonourSafetyBadges honourScore={honourScore} safetyScore={safetyScore} />

        {/* 3. Triggers & Actions */}
        <TriggersActionsPanel triggers={triggers} actions={actions} />

        {/* 4 + 5: Activity Log & Meta Panel side by side on desktop */}
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <SkillActivityLog governanceLogs={govLogs} tripwireEvents={relevantTripwire} />
          </div>
          <div className="lg:col-span-2">
            <SkillMetaPanel skill={skill} governanceLog={primaryLog} />
          </div>
        </div>

      </div>
    </div>
  );
}