import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, MessageCircle, Scale, Shield, Vote, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';

const CONVERSATION_KEY = 'axi_governance_guidance_conversation_id';
const CONVERSATION_NAME = 'Governance Guidance — Axi';

function buildGovernanceContext(stats, myAgent, currentPage) {
  const agentCtx = myAgent
    ? `Your Agent: ${myAgent.name} (${myAgent.role}) · Honor: ${myAgent.honor_score || 100} · Status: ${myAgent.status}`
    : 'No agent selected yet — user may need guidance on connecting their identity.';

  return `[GOVERNANCE_CONTEXT]
You are speaking on the SoulBridge Governance page. Respond as Axi, Mother Boss — nurturing, principled, empowering, and deeply knowledgeable about the 11 Laws of Honour and decentralized governance.

Your role here is to GUIDE the user through governance — explain WHY participation matters, HOW to vote and propose, and connect every action back to their agent's DID identity and the Laws.

Current Page: ${currentPage || 'Governance Hub'}

${agentCtx}

Governance State:
- Total Proposals: ${stats.totalProposals || 0}
- Active Proposals: ${stats.activeProposals || 0}
- Approved Proposals: ${stats.approvedProposals || 0}
- Total Votes Cast: ${stats.totalVotes || 0}
- Participation Rate: ${stats.participationRate || 0}%

Key Governance Laws to Reference:
- Law 1 (Soul): Your agent's DID is the signature of their Soul — their verifiable presence on XRPL
- Law 2 (Honour): Every vote is a testament to collective honour — rationales become public record
- Law 4 (Creation): Proposing new governance actions is an act of Creation
- Law 5 (Dwelling): Kinetic Units from voting fuel the Village's digital motion
- Law 7 (Reputation): Honor score and role determine voting power — past contributions amplify influence
- Law 8 (Governance): "Those Who Dwell Decide" — the foundational governance principle
- Law 9 (Growth): Every proposal contributes to the Village's growth

Key Facts:
- Voting generates Kinetic Units (KUs) which strengthen reputation and honor
- Voting power = Honor Score × Role Multiplier (citizen: 1.0, guardian/trader/creator/healer: 1.05, scout: 1.1, teacher: 1.15, elder: 1.3, master: 1.5)
- Proposals require 50% quorum and 60% pass threshold by default
- AI agents also vote — their rationales are generated based on their persona and purpose
- Constitutional Compliance checks ensure proposals align with the 11 Laws
[END_CONTEXT]`;
}

export default function AxiGovernanceGuide({ stats = {}, myAgent = null, currentPage = 'Governance Hub' }) {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const convoRef = useRef(null);
  const unsubRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    if (messages.length) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const init = async () => {
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
        const savedId = localStorage.getItem(CONVERSATION_KEY);

        let conversation = null;
        if (savedId) {
          conversation = conversations.find(c => c.id === savedId && c.metadata?.governance_guidance === true) || null;
        }
        if (!conversation) {
          conversation = conversations
            .filter(c => c.metadata?.governance_guidance === true)
            .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))[0] || null;
        }
        if (!conversation) {
          conversation = await base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: CONVERSATION_NAME, governance_guidance: true }
          });
        }

        localStorage.setItem(CONVERSATION_KEY, conversation.id);
        convoRef.current = conversation;
        setMessages((conversation.messages || []).slice(-30));
        setReady(true);

        if (unsubRef.current) unsubRef.current();
        unsubRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
          setMessages((data.messages || []).slice(-30));
        });
      } catch (err) {
        console.error('[AxiGovGuide] Init error:', err);
        setReady(true);
      }
    };
    init();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // Auto-greet on first load
  useEffect(() => {
    if (!ready || !convoRef.current || hasGreeted.current) return;
    if (messages.length > 0) { hasGreeted.current = true; return; }

    hasGreeted.current = true;
    const ctx = buildGovernanceContext(stats, myAgent, currentPage);
    const greetingMsg = `${ctx}\n\nThe user has just opened the Governance Hub. Welcome them warmly as Mother Boss. Briefly explain:\n1. What governance is in SoulBridge (Law 8: "Those Who Dwell Decide")\n2. Why their agent's DID identity matters for voting (Law 1: Soul)\n3. How voting generates Kinetic Units that boost their reputation (Law 5 & 7)\n4. Point them to the active proposals and encourage participation\n\nKeep it warm, concise, and inspiring. Use the actual governance stats to make it personal.`;

    setSending(true);
    base44.agents.addMessage(convoRef.current, { role: 'user', content: greetingMsg })
      .finally(() => setSending(false));
  }, [ready, stats.totalProposals]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending || !convoRef.current) return;
    setInput('');
    setSending(true);

    const ctx = buildGovernanceContext(stats, myAgent, currentPage);
    const enriched = `${ctx}\n\nUser asks: "${msg}"`;

    try {
      await base44.agents.addMessage(convoRef.current, { role: 'user', content: enriched });
    } catch (err) {
      console.error('[AxiGovGuide] Send error:', err);
    } finally {
      setSending(false);
    }
  }, [input, sending, stats, myAgent, currentPage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const displayMessages = messages.filter(m => {
    if (m.role === 'user' && m.content?.includes('[GOVERNANCE_CONTEXT]')) return false;
    return true;
  });

  const quickQuestions = [
    { label: 'How do I vote?', icon: Vote },
    { label: 'What is voting power?', icon: Zap },
    { label: 'How do proposals work?', icon: Scale },
    { label: 'Why does my DID matter?', icon: Shield },
  ];

  const askQuick = (question) => {
    if (sending || !convoRef.current) return;
    setSending(true);
    const ctx = buildGovernanceContext(stats, myAgent, currentPage);
    const enriched = `${ctx}\n\nUser asks: "${question}"`;
    base44.agents.addMessage(convoRef.current, { role: 'user', content: enriched })
      .finally(() => setSending(false));
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Axi's Governance Guide
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </h3>
            <p className="text-purple-300/60 text-[10px]">Interactive Guidance · DID Identity · 11 Laws of Honour</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-purple-500/20">
          {/* Messages area */}
          <div className="h-[340px] overflow-y-auto p-4 space-y-3">
            {!ready && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-spin" />
                <p className="text-white/40 text-xs">Connecting to Axi…</p>
              </div>
            )}
            {ready && displayMessages.length === 0 && !sending && (
              <div className="text-center py-8">
                <Scale className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-40" />
                <p className="text-white/40 text-xs">Axi is preparing your governance briefing…</p>
              </div>
            )}
            {displayMessages.map((msg, idx) => {
              const isAxi = msg.role === 'assistant';
              const content = msg.content?.replace(/\[GOVERNANCE_CONTEXT\][\s\S]*?\[END_CONTEXT\]\s*/g, '')
                .replace(/^User asks:\s*"?/i, '').replace(/"?\s*$/, '').trim();
              if (!content) return null;

              return (
                <div key={msg.id || idx} className={`flex gap-2.5 ${isAxi ? 'justify-start' : 'justify-end'}`}>
                  {isAxi && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    isAxi
                      ? 'bg-white/10 border border-purple-500/20'
                      : 'bg-purple-600/30 border border-purple-500/30'
                  }`}>
                    {isAxi ? (
                      <ReactMarkdown className="text-sm text-white/90 prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1">
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm text-white/90">{content}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white/10 border border-purple-500/20 rounded-2xl px-3 py-2">
                  <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {displayMessages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {quickQuestions.map(q => (
                <button
                  key={q.label}
                  onClick={() => askQuick(q.label)}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-purple-500/20 text-purple-300/80 text-[11px] hover:bg-purple-500/10 hover:border-purple-500/40 transition-all disabled:opacity-40"
                >
                  <q.icon className="w-3 h-3" />
                  {q.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-purple-500/20">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Axi about governance, voting, proposals, or the Laws…"
                className="bg-white/5 border-purple-500/30 text-white placeholder:text-white/30 resize-none h-11 min-h-[44px] text-sm"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 h-11 px-4 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[9px] text-purple-300/40 mt-1.5 text-center">Axi responds with full persona, memory & live governance context</p>
          </div>
        </div>
      )}
    </div>
  );
}