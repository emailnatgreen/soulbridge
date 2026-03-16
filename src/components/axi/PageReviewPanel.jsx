import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, BookOpen, Save, CheckCircle2, ChevronDown, PlayCircle, StopCircle, List, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
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
  'Village', 'VillageLeaderboard', 'VillageMeetup', 'VillageSimulation', 'SimulationLab', 'VillageCalendar',
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
  const [batchStartIndex, setBatchStartIndex] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const stopRef = useRef(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAllReviews = async () => {
    setDeletingAll(true);
    try {
      const memories = await base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 200);
      const reviewMemories = memories.filter(m => m.keywords?.includes('page_review'));
      await Promise.all(reviewMemories.map(m => base44.entities.Memory.delete(m.id)));
      queryClient.invalidateQueries({ queryKey: ['page-review-memories'] });
      setBatchDone([]);
      setBatchErrors([]);
      setBatchProgress(0);
      setBatchStartIndex(0);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingAll(false);
      setConfirmDelete(false);
    }
  };

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
      // Find the unified Axi conversation (same one the Axi page uses)
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const unifiedConvo = conversations.find(c => c.metadata?.unified_axi_chat === true);

      let convo;
      if (unifiedConvo) {
        convo = await base44.agents.getConversation(unifiedConvo.id);
      } else {
        convo = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { name: 'Unified Conversation with Axi - Mother Boss', unified_axi_chat: true }
        });
      }

      await base44.agents.addMessage(convo, {
        role: 'user',
        content: `I have just saved a page review for **${selectedPage}** to your Memory (type: observation, keywords: page_review, axi_suggestion, ${selectedPage.toLowerCase()}). Please retrieve it from your Memory and share your thoughts, action priorities, and any recommended next steps for the Village.\n\nReview summary:\n${result}`
      });
      navigate('/Axi');
    } catch (err) {
      setSendError(err?.message || 'Failed to send to Axi');
    } finally {
      setSendingToAxi(false);
    }
  };

  // --- Batch review ---
  const handleStartBatch = async (startFrom = 0, isResume = false) => {
    setBatchRunning(true);
    if (!isResume) {
      setBatchDone([]);
      setBatchErrors([]);
      setBatchProgress(0);
    }
    setBatchCurrent('');
    stopRef.current = false;

    const end = Math.min(startFrom + batchSize, ALL_PAGES.length);

    for (let i = startFrom; i < end; i++) {
      if (stopRef.current) {
        setBatchStartIndex(i);
        break;
      }
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
      // Small delay between calls to avoid rate limits
      if (i < end - 1) await new Promise(r => setTimeout(r, 500));
    }

    if (!stopRef.current) setBatchStartIndex(end);
    setBatchRunning(false);
    setBatchCurrent('');
    queryClient.invalidateQueries({ queryKey: ['page-review-memories'] });
  };

  const handleStop = () => { stopRef.current = true; };
  const handleContinue = () => handleStartBatch(batchStartIndex, true);
  const handleRestart = () => { setBatchStartIndex(0); handleStartBatch(0, false); };

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
          <div className="bg-slate-900/40 rounded-xl border border-amber-700/30 p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-amber-300 font-medium">Batch Review — {total} pages total</p>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-3 h-3" />Clear All
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-red-400">Sure?</span>
                  <button onClick={handleDeleteAllReviews} disabled={deletingAll} className="text-red-400 hover:text-red-300 font-medium">
                    {deletingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-slate-400 hover:text-white">No</button>
                </div>
              )}
            </div>
            <p>Axi reviews pages in chunks and saves each to Memory. Use Continue to pick up where you left off.</p>
            <div className="flex items-center gap-2 mt-1">
              <label className="text-slate-400">Chunk size:</label>
              <select
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                className="bg-slate-800 border border-slate-600/50 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
              >
                <option value={5}>5 pages</option>
                <option value={10}>10 pages</option>
                <option value={20}>20 pages</option>
                <option value={total}>All ({total})</option>
              </select>
              <span className="text-slate-500">Starting at page {batchStartIndex + 1}</span>
            </div>
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

          <div className="flex gap-2 flex-wrap">
            {!batchRunning ? (
              <>
                {batchStartIndex > 0 && batchStartIndex < total && (
                  <Button onClick={handleContinue} className="flex-1 bg-violet-700 hover:bg-violet-800 text-white text-xs h-8">
                    <PlayCircle className="w-3.5 h-3.5 mr-1.5" />Continue (page {batchStartIndex + 1})
                  </Button>
                )}
                <Button onClick={handleRestart} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs h-8">
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                  {batchStartIndex === 0 ? 'Start Batch Review' : 'Restart from Beginning'}
                </Button>
                {completed > 0 && (
                  <Button
                    disabled={sendingToAxi}
                    onClick={async () => {
                      setSendingToAxi(true);
                      setSendError(null);
                      try {
                        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
                        const unifiedConvo = conversations.find(c => c.metadata?.unified_axi_chat === true);
                        let convo;
                        if (unifiedConvo) {
                          convo = await base44.agents.getConversation(unifiedConvo.id);
                        } else {
                          convo = await base44.agents.createConversation({
                            agent_name: 'axi',
                            metadata: { name: 'Unified Conversation with Axi - Mother Boss', unified_axi_chat: true }
                          });
                        }
                        const donePages = batchDone.filter(d => d.status === 'done').map(d => d.page).join(', ');
                        await base44.agents.addMessage(convo, {
                          role: 'user',
                          content: `I just completed a batch page review. ${batchDone.filter(d => d.status === 'done').length} pages were reviewed and saved to your Memory: ${donePages}. Please retrieve these reviews from your Memory, identify the most critical issues across all pages, and give me a prioritised action plan for improving SoulBridge Village.`
                        });
                        navigate('/Axi');
                      } catch (err) {
                        setSendError(err?.message || 'Failed to send to Axi');
                      } finally {
                        setSendingToAxi(false);
                      }
                    }}
                    className="w-full bg-violet-700 hover:bg-violet-800 text-white text-xs h-8"
                  >
                    {sendingToAxi
                      ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
                      : <><MessageSquare className="w-3.5 h-3.5 mr-1.5" />Send Batch Summary to Axi</>}
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleStop} className="flex-1 bg-red-700 hover:bg-red-800 text-white text-xs h-8">
                <StopCircle className="w-3.5 h-3.5 mr-1.5" />Stop
              </Button>
            )}
          </div>
          {sendError && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />{sendError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}