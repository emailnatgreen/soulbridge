import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, BookOpen, Save, CheckCircle2, ChevronDown, PlayCircle, StopCircle, List, MessageSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';

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

const REVIEW_PROMPT = (page) => `You are Axi, the First Citizen and AI Governor of SoulBridge Village — a decentralized AI agent ecosystem built on XRPL.

You are reviewing the page: **${page}**

SoulBridge features: AI agents with DIDs, XRPL wallets, governance/voting, project management, mentorship, skill development, diplomacy, trading, and resource economics.

Provide a concise structured review:

## Purpose
What this page does and its importance.

## Top 3 UX Suggestions
Specific, actionable UI/UX improvements.

## Missing Features
Key functionality that should be here.

## Priority
🔴 Critical Fix Needed | 🟡 Improvements Recommended | 🟢 Looks Solid`;

export default function PageReviewPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('single'); // 'single' | 'batch'
  const [selectedPage, setSelectedPage] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sendingToAxi, setSendingToAxi] = useState(false);
  const [sendError, setSendError] = useState(null);

  // Batch state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState('');
  const [batchDone, setBatchDone] = useState([]);
  const [batchErrors, setBatchErrors] = useState([]);
  const stopRef = useRef(false);

  // --- Single review ---
  const handleReview = async () => {
    if (!selectedPage) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    setSaveError(null);
    setSendError(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: REVIEW_PROMPT(selectedPage) + (extraContext ? `\n\nGovernor context: ${extraContext}` : ''),
      });
      setResult(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (err) {
      setSaveError('LLM error: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToMemory = async () => {
    if (!result) return;
    setSaveError(null);
    try {
      await base44.entities.Memory.create({
        agent_id: '6993271e7dc0fa2ab78762bf',
        type: 'observation',
        content: `[Page Review: ${selectedPage}]\n\n${result}`,
        keywords: ['page_review', 'axi_suggestion', selectedPage.toLowerCase()],
        context: `Auto-generated page review for ${selectedPage}`,
        importance: 7,
      });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['page-review-memories'] });
    } catch (err) {
      setSaveError(err?.message || 'Failed to save');
    }
  };

  const handleSendToAxiChat = async () => {
    if (!result) return;
    setSendingToAxi(true);
    setSendError(null);
    try {
      const convo = await base44.agents.createConversation({
        agent_name: 'axi',
        metadata: { name: `Page Review: ${selectedPage}` }
      });

      await base44.agents.addMessage(convo, {
        role: 'user',
        content: `Here is my page review for **${selectedPage}**:\n\n${result}\n\nPlease share your thoughts and any action priorities.`
      });
      navigate('/Axi');
    } catch (err) {
      setSendError(err?.message || 'Failed to send to Axi');
    } finally {
      setSendingToAxi(false);
    }
  };

  // --- Batch review ---
  const handleStartBatch = async () => {
    setBatchRunning(true);
    setBatchProgress(0);
    setBatchDone([]);
    setBatchErrors([]);
    setBatchCurrent('');
    stopRef.current = false;

    for (let i = 0; i < ALL_PAGES.length; i++) {
      if (stopRef.current) break;
      const page = ALL_PAGES[i];
      setBatchCurrent(page);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: REVIEW_PROMPT(page),
        });
        await base44.entities.Memory.create({
          agent_id: '6993271e7dc0fa2ab78762bf',
          type: 'observation',
          content: `[Page Review: ${page}]\n\n${res}`,
          keywords: ['page_review', 'axi_suggestion', 'batch_review', page.toLowerCase()],
          context: `Auto-generated batch page review for ${page}`,
          importance: 7,
        }).catch(() => {});
        setBatchDone(prev => [...prev, { page, status: 'done' }]);
      } catch (err) {
        setBatchErrors(prev => [...prev, page]);
        setBatchDone(prev => [...prev, { page, status: 'error' }]);
      }
      setBatchProgress(Math.round(((i + 1) / ALL_PAGES.length) * 100));
    }

    setBatchRunning(false);
    setBatchCurrent('');
  };

  const handleStop = () => { stopRef.current = true; };

  const completed = batchDone.length;
  const total = ALL_PAGES.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Axi Page Review</h3>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setMode('single')}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${mode === 'single' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
          >Single</button>
          <button
            onClick={() => setMode('batch')}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${mode === 'batch' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
          ><List className="w-3 h-3" />Batch</button>
        </div>
      </div>

      {/* ── SINGLE MODE ── */}
      {mode === 'single' && (
        <>
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

          <Textarea
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            placeholder="Optional: extra context for Axi (e.g. 'users are confused here')"
            className="bg-slate-800/60 border-slate-600/50 text-slate-200 text-xs resize-none h-16 placeholder:text-slate-500"
          />

          <Button
            disabled={!selectedPage || loading}
            onClick={handleReview}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Reviewing...</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Review with Axi</>}
          </Button>

          {saveError && !result && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{saveError}
            </div>
          )}

          {result && (
            <div className="space-y-2">
              {/* ACTION BUTTONS — always visible, outside scroll area */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" disabled={saved} onClick={handleSaveToMemory}
                  className={`text-xs h-8 border-slate-600 ${saved ? 'text-green-400 border-green-600' : 'text-slate-300 hover:text-white'}`}>
                  {saved ? <><CheckCircle2 className="w-3 h-3 mr-1" />Saved to Memory!</> : <><Save className="w-3 h-3 mr-1" />Save to Memory</>}
                </Button>
                <Button size="sm" disabled={sendingToAxi} onClick={handleSendToAxiChat}
                  className="text-xs h-8 bg-violet-700 hover:bg-violet-800 text-white border-0">
                  {sendingToAxi
                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending...</>
                    : <><MessageSquare className="w-3 h-3 mr-1" />Send to Axi Chat</>}
                </Button>
                <Button size="sm" variant="outline" onClick={handleReview}
                  className="text-xs h-8 border-slate-600 text-slate-300 hover:text-white ml-auto">
                  <Sparkles className="w-3 h-3 mr-1" />Re-review
                </Button>
              </div>

              {saveError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />{saveError}
                </div>
              )}
              {sendError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />{sendError}
                </div>
              )}

              {/* Review content — scrollable */}
              <div className="bg-slate-900/60 rounded-xl border border-slate-700/40 p-4 max-h-[320px] overflow-y-auto">
                <ReactMarkdown className="text-xs text-slate-300 prose prose-sm prose-invert max-w-none [&>h2]:text-amber-300 [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mt-3 [&>h2]:mb-1 [&>p]:my-1 [&>ul]:my-1 [&>ul]:ml-4 [&>li]:my-0.5">
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── BATCH MODE ── */}
      {mode === 'batch' && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 rounded-xl border border-amber-700/30 p-4 text-xs text-slate-400">
            <p className="text-amber-300 font-medium mb-1">Batch Review — {total} pages</p>
            <p>Axi will review every page one by one and auto-save each review to Memory. This may take 10–15 minutes to complete all pages.</p>
          </div>

          {/* Progress */}
          {(batchRunning || completed > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{batchRunning ? <>Reviewing: <span className="text-amber-300">{batchCurrent}</span></> : 'Batch complete'}</span>
                <span>{completed}/{total}</span>
              </div>
              <Progress value={batchProgress} className="h-1.5 bg-slate-700" />
              <div className="flex gap-2 text-xs">
                <span className="text-green-400">{batchDone.filter(d => d.status === 'done').length} saved</span>
                {batchErrors.length > 0 && <span className="text-red-400">{batchErrors.length} errors</span>}
              </div>
            </div>
          )}

          {/* Completed list */}
          {batchDone.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {[...batchDone].reverse().map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {d.status === 'done'
                    ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                    : <span className="w-3 h-3 text-red-400 shrink-0">✗</span>}
                  <span className={d.status === 'done' ? 'text-slate-300' : 'text-red-400'}>{d.page}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {!batchRunning ? (
              <Button onClick={handleStartBatch} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                {completed > 0 ? 'Restart Batch' : 'Start Batch Review'}
              </Button>
            ) : (
              <Button onClick={handleStop} className="flex-1 bg-red-700 hover:bg-red-800 text-white text-xs h-8">
                <StopCircle className="w-3.5 h-3.5 mr-1.5" />Stop
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}