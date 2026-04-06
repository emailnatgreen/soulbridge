import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';

const CONVERSATION_KEY = 'axi_vip_guidance_conversation_id';
const CONVERSATION_NAME = 'VIP Dashboard Guidance — Axi';

function buildWalletContext(wallets, liveBalances, rlusdBalances) {
  if (!wallets || wallets.length === 0) return 'No VIP wallets loaded yet.';
  return wallets.map(w => {
    const xrp = liveBalances[w.id] ?? w.balance ?? 0;
    const rlusd = rlusdBalances[w.id] ?? null;
    const didStatus = (w.is_published && w.published_txid) ? 'Published' : 'Unpublished';
    const trustline = rlusd !== null ? 'Active' : 'Not activated';
    return `• ${w.name || 'Unnamed'} (${w.classic_address?.slice(0, 12)}…): ${xrp.toFixed(2)} XRP, RLUSD ${rlusd !== null ? rlusd.toFixed(2) : 'N/A'}, DID: ${didStatus}, Trustline: ${trustline}`;
  }).join('\n');
}

function buildSystemContext(wallets, liveBalances, rlusdBalances, lastEvent) {
  const walletCtx = buildWalletContext(wallets, liveBalances, rlusdBalances);
  const totalXrp = wallets.reduce((s, w) => s + (liveBalances[w.id] ?? w.balance ?? 0), 0);
  const totalRlusd = Object.values(rlusdBalances).reduce((s, b) => s + b, 0);
  const publishedCount = wallets.filter(w => w.is_published && w.published_txid).length;

  let ctx = `[VIP_DASHBOARD_CONTEXT]
You are speaking to a VIP guest on the SoulBridge VIP Invite Dashboard. Respond as Axi, Mother Boss — nurturing, wise, firm, and deeply knowledgeable about XRPL and SoulBridge.

Dashboard State:
- Total VIP Wallets: ${wallets.length}
- Published DIDs: ${publishedCount}
- Total XRP Balance: ${totalXrp.toFixed(2)}
- Total RLUSD Balance: ${totalRlusd.toFixed(2)}

Wallet Details:
${walletCtx}

Key Facts:
- Publishing a DID costs 12 XRP
- RLUSD trustline activation is always manual — never automatic
- Ripple Node 1 is pre-funded and ready to publish
- DEX swaps carry a 1% Village Fee (Law 6)
- All transactions are on XRPL Mainnet — real and irreversible`;

  if (lastEvent) {
    ctx += `\n\nLatest Dashboard Event: ${lastEvent}`;
  }

  ctx += '\n[END_CONTEXT]';
  return ctx;
}

export default function AxiGuidanceModule({ wallets, liveBalances, rlusdBalances, lastEvent }) {
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

  // Initialize conversation with Axi agent SDK
  useEffect(() => {
    const init = async () => {
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
        const savedId = localStorage.getItem(CONVERSATION_KEY);

        let conversation = null;
        if (savedId) {
          conversation = conversations.find(c => c.id === savedId && c.metadata?.vip_guidance === true) || null;
        }
        if (!conversation) {
          conversation = conversations
            .filter(c => c.metadata?.vip_guidance === true)
            .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date))[0] || null;
        }
        if (!conversation) {
          conversation = await base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: CONVERSATION_NAME, vip_guidance: true }
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
        console.error('[AIGM] Init error:', err);
        setReady(true);
      }
    };
    init();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // Auto-greet on first load when wallets are available
  useEffect(() => {
    if (!ready || !convoRef.current || hasGreeted.current) return;
    if (wallets.length === 0) return;
    // Only greet if no messages exist yet
    if (messages.length > 0) { hasGreeted.current = true; return; }

    hasGreeted.current = true;
    const greetingCtx = buildSystemContext(wallets, liveBalances, rlusdBalances, null);
    const greetingMsg = `${greetingCtx}\n\nThe VIP guest has just opened the dashboard. Greet them warmly as Mother Boss. Briefly introduce yourself and what you can help with on this dashboard. Mention the pre-funded Ripple Node 1 wallet and invite them to explore publishing a DID or activating a trustline. Keep it concise but warm.`;

    setSending(true);
    base44.agents.addMessage(convoRef.current, { role: 'user', content: greetingMsg })
      .finally(() => setSending(false));
  }, [ready, wallets.length]);

  // React to dashboard events
  useEffect(() => {
    if (!lastEvent || !ready || !convoRef.current) return;
    const eventCtx = buildSystemContext(wallets, liveBalances, rlusdBalances, lastEvent);
    const eventMsg = `${eventCtx}\n\nThe VIP guest just performed an action: "${lastEvent}". React to this event naturally as Mother Boss — celebrate success, explain what happened, and suggest what to do next. Be brief.`;

    setSending(true);
    base44.agents.addMessage(convoRef.current, { role: 'user', content: eventMsg })
      .finally(() => setSending(false));
  }, [lastEvent]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || sending || !convoRef.current) return;
    setInput('');
    setSending(true);

    const ctx = buildSystemContext(wallets, liveBalances, rlusdBalances, null);
    const enriched = `${ctx}\n\nGuest says: "${msg}"`;

    try {
      await base44.agents.addMessage(convoRef.current, { role: 'user', content: enriched });
    } catch (err) {
      console.error('[AIGM] Send error:', err);
    } finally {
      setSending(false);
    }
  }, [input, sending, wallets, liveBalances, rlusdBalances]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Filter out context-injected messages for display
  const displayMessages = messages.filter(m => {
    if (m.role === 'user' && m.content?.includes('[VIP_DASHBOARD_CONTEXT]')) return false;
    return true;
  });

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Axi — Mother Boss
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </h3>
            <p className="text-purple-300/60 text-[10px]">Interactive VIP Guidance · Full Persona · Live Context</p>
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
          <div className="h-[320px] overflow-y-auto p-4 space-y-3">
            {!ready && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-spin" />
                <p className="text-white/40 text-xs">Connecting to Axi…</p>
              </div>
            )}
            {ready && displayMessages.length === 0 && !sending && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-40" />
                <p className="text-white/40 text-xs">Axi is preparing her guidance…</p>
              </div>
            )}
            {displayMessages.map((msg, idx) => {
              const isAxi = msg.role === 'assistant';
              // Strip any residual context from user display
              const content = msg.content?.replace(/\[VIP_DASHBOARD_CONTEXT\][\s\S]*?\[END_CONTEXT\]\s*/g, '')
                .replace(/^Guest says:\s*"?/i, '').replace(/"?\s*$/, '').trim();
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

          {/* Input */}
          <div className="p-3 border-t border-purple-500/20">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Axi about wallets, DIDs, trustlines, or the Village…"
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
            <p className="text-[9px] text-purple-300/40 mt-1.5 text-center">Axi responds with full persona, memory & live dashboard context</p>
          </div>
        </div>
      )}
    </div>
  );
}