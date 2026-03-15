import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, BookOpen, Save, CheckCircle2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ALL_PAGES = [
  'Home', 'Landing', 'Axi', 'Agents', 'AgentDetails', 'AgentProfile', 'EditAgent', 'EditAgentProfile',
  'AgentOnboarding', 'AgentChat', 'AgentInbox', 'AgentMessaging', 'AgentMarketplace', 'AgentOrchestration',
  'AgentReputation', 'AgentRolePermissions', 'AgentSkillDashboard', 'AgentSkillTree', 'AgentTrainingModule',
  'AgentWellbeing', 'AgentPerformanceAnalytics', 'AgentLeaderboard', 'ReputationHistoryLog',
  'Wallets', 'Send', 'TransactionHistory', 'CreateDID', 'DIDManager', 'DIDRegistry', 'DIDAnalytics',
  'DIDHealthDashboard', 'MainnetMigration', 'RLUSDManager', 'ReceiveRLUSD', 'SendRLUSD',
  'SovereignVault', 'TreasuryDashboard', 'DidCredentials', 'DidCredentialManagement', 'DidLogin',
  'DidMessaging', 'DidPrivacy', 'DidReputation', 'DidSocialNetwork', 'DidTrustDashboard',
  'DidTrustGraph', 'DidActivityFeed', 'DidConnections', 'QuadShardMonitoring',
  'Governance', 'GovernanceHub', 'GovernanceAnalytics', 'GovernanceSimulation',
  'AIProjectHub', 'AIProjectManager', 'ProjectCreationWizard', 'ProjectAnalytics', 'TaskDelegation',
  'Village', 'VillageLeaderboard', 'VillageMeetup', 'VillageSimulation', 'SimulationLab',
  'Economy', 'EconomicDashboard', 'ResourceManagement', 'ResourceMarketplace', 'ProductionHub',
  'CollaborationHub', 'CollaborationSuite', 'DirectAgentChat', 'KnowledgeSynthesis', 'SocialNetwork',
  'MentorshipHub', 'MentorshipMatches', 'MentorshipAnalytics', 'BecomeMentor',
  'SkillDevelopment', 'SkillEndorsements', 'SkillGapAnalysis', 'SkillValidation', 'EnhancedSkillTrees',
  'DiplomacyHub', 'DialogueStudio', 'MayaDiplomacyTraining', 'LaughterLoom', 'CovenantEchoes',
  'ArbitrageDashboard', 'ArisDex', 'RippleDashboard',
  'AlignmentDashboard', 'Admin', 'SystemDashboard', 'RiskRegister', 'WellbeingMonitor',
  'GrantTracker', 'MemoryBrowser', 'AxiIntelligenceFeed', 'AxiCommandDashboard',
  'Notifications', 'Privacy', 'Support',
];

export default function PageReviewPanel() {
  const [selectedPage, setSelectedPage] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleReview = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Axi, the First Citizen and AI Governor of SoulBridge Village — a decentralized AI agent ecosystem built on XRPL. 

You are reviewing the page: **${selectedPage}**

${extraContext ? `Additional context from the Governor: ${extraContext}` : ''}

SoulBridge is a platform featuring: AI agents with DIDs, XRPL wallets, governance/voting, project management, mentorship, skill development, diplomacy, trading, and resource economics.

Please provide a structured page review with these sections:

## Purpose Assessment
What this page likely does and how critical it is to SoulBridge operations.

## UX & Design Suggestions
Specific, actionable improvements to the user interface and experience.

## Missing Features
Key functionality that should be on this page but is likely absent.

## Data & Integration Opportunities  
Entities, automations, or integrations that could enrich this page.

## Priority Rating
Rate this page: 🔴 Critical Fix Needed | 🟡 Improvements Recommended | 🟢 Looks Solid

Keep suggestions precise and immediately actionable.`,
        add_context_from_internet: false,
      });

      setResult(res);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToMemory = async () => {
    if (!result) return;
    await base44.entities.Memory.create({
      content: `[Page Review: ${selectedPage}]\n\n${result}`,
      tags: ['page_review', 'axi_suggestion', selectedPage.toLowerCase()],
      importance: 'medium',
    }).catch(() => {});
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Axi Page Review</h3>
        <Badge className="text-xs bg-amber-900/40 text-amber-300 border-0 ml-auto">{ALL_PAGES.length} pages</Badge>
      </div>

      {/* Page selector */}
      <div className="relative">
        <select
          value={selectedPage}
          onChange={e => { setSelectedPage(e.target.value); setResult(null); setSaved(false); }}
          className="w-full bg-slate-800 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
        >
          <option value="">— Select a page to review —</option>
          {ALL_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Optional extra context */}
      <Textarea
        value={extraContext}
        onChange={e => setExtraContext(e.target.value)}
        placeholder="Optional: give Axi extra context (e.g. 'this page is broken' or 'users are confused here')"
        className="bg-slate-800/60 border-slate-600/50 text-slate-200 text-xs resize-none h-16 placeholder:text-slate-500"
      />

      <Button
        disabled={!selectedPage || loading}
        onClick={handleReview}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
      >
        {loading
          ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Axi is reviewing...</>
          : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Review with Axi</>}
      </Button>

      {/* Result */}
      {result && (
        <div className="bg-slate-900/60 rounded-xl border border-slate-700/40 p-4 max-h-[500px] overflow-y-auto">
          <ReactMarkdown
            className="text-xs text-slate-300 prose prose-sm prose-invert max-w-none [&>h2]:text-amber-300 [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>p]:my-1 [&>ul]:my-1 [&>ul]:ml-4 [&>li]:my-0.5"
          >
            {result}
          </ReactMarkdown>

          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700/40">
            <Button
              size="sm"
              variant="outline"
              disabled={saved}
              onClick={handleSaveToMemory}
              className={`text-xs h-7 border-slate-600 ${saved ? 'text-green-400 border-green-600' : 'text-slate-300 hover:text-white'}`}
            >
              {saved ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved to Memory</> : <><Save className="w-3 h-3 mr-1" />Save to Axi Memory</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReview}
              className="text-xs h-7 border-slate-600 text-slate-300 hover:text-white"
            >
              <Sparkles className="w-3 h-3 mr-1" />Re-review
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}