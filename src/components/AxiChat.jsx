import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, UserPlus, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MessageBubble from '@/components/MessageBubble';
import AgentPicker from '@/components/axi/AgentPicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useDIDSignal } from '@/hooks/useDIDSignal';
import { useAgentRoom } from '@/hooks/useAgentRoom';

const PAGE_SIZE = 30;
const CONTEXT_MESSAGE_LIMIT = 8;

function buildAgentContextBrief(messages, activeAgents, invitedAgent) {
  const recentMessages = messages
    .filter((message) => message?.content)
    .slice(-CONTEXT_MESSAGE_LIMIT)
    .map((message) => {
      const label = message.role === 'user'
        ? 'User'
        : message.metadata?.sourceAgentId
          ? activeAgents.find((agent) => agent.id === message.metadata.sourceAgentId)?.name || 'Agent'
          : 'Axi';

      return `${label}: ${message.content}`;
    });

  const activeAgentList = activeAgents.length > 0
    ? activeAgents.map((agent) => `${agent.name} (${agent.role})`).join(', ')
    : 'None';

  return [
    `Conversation briefing for ${invitedAgent.name} (${invitedAgent.role}).`,
    `Already active agents in this chat: ${activeAgentList}.`,
    'Recent conversation context:',
    ...recentMessages
  ].join('\n');
}
const MemoizedBubble = memo(MessageBubble);
const PERSONAL_CONVERSATION_KEY = 'axi_personal_conversation_id';
const PERSONAL_CONVERSATION_META_NAME = 'Personal Conversation with Axi';

export default function AxiChat({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [didAuthError, setDidAuthError] = useState(null);
  const didSignal = useDIDSignal();
  const { allAgents, activeAgents, addAgent, removeAgent, findAgentByName, buildRoomContext } = useAgentRoom();

  const messagesEndRef = useRef(null);
  const convoRef = useRef(null);
  const unsubRef = useRef(null);
  const pendingMessageRef = useRef('');
  const processedSummonsRef = useRef(new Set());

  // activeAgents persistence handled by useAgentRoom

  // Scroll to bottom
  useEffect(() => {
    if (messages.length) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Init or reconnect when opened
  useEffect(() => {
    if (!isOpen) return;

    const init = async () => {
      // Try agent SDK first and reconnect to the user's saved personal conversation
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
        const savedConversationId = localStorage.getItem(PERSONAL_CONVERSATION_KEY);

        const isPersonalConversation = (conversation) => (
          conversation?.metadata?.unified_axi_chat === true ||
          conversation?.metadata?.personal_axi_chat === true ||
          conversation?.metadata?.name === PERSONAL_CONVERSATION_META_NAME
        );

        let conversation = null;
        if (savedConversationId) {
          conversation = conversations.find(c => c.id === savedConversationId && isPersonalConversation(c)) || null;
        }

        if (!conversation) {
          const personal = conversations
            .filter(isPersonalConversation)
            .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
          conversation = personal[0] || null;
        }

        if (!conversation) {
          conversation = await base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: PERSONAL_CONVERSATION_META_NAME, unified_axi_chat: true, personal_axi_chat: true }
          });
        }

        localStorage.setItem(PERSONAL_CONVERSATION_KEY, conversation.id);
        convoRef.current = conversation;
        setMode('agent');
        setReady(true);
        setMessages((conversation.messages || []).slice(-PAGE_SIZE));

        if (unsubRef.current) unsubRef.current();
        unsubRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
          setMessages((data.messages || []).slice(-PAGE_SIZE));
        });
        return;
      } catch (err) {
        console.warn('[AxiChat] Agent SDK unavailable, falling back to direct mode:', err?.message);
      }

      // Fallback: direct axiRespond mode (for DID-only / unauthenticated users)
      const convId = localStorage.getItem('sb_axi_did_conv') || `did-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('sb_axi_did_conv', convId);
      convoRef.current = { id: convId };
      setMode('direct');
      setReady(true);

      // Load existing messages
      try {
        const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convId });
        setMessages(res?.data?.messages || []);
      } catch (_) {}
    };

    init();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [isOpen]);

  // Send message
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !convoRef.current) return;
    setInput('');
    setSending(true);

    try {
      if (mode === 'agent') {
        // Agent SDK mode: keep Axi active and also invite extra agents to respond
        pendingMessageRef.current = '';
        const invitedAgents = activeAgents;
        const enrichedMessage = buildRoomContext(msg);

        await base44.agents.addMessage(convoRef.current, { role: 'user', content: enrichedMessage });
        for (const agent of invitedAgents) {
          const response = await base44.functions.invoke('generateAgentResponse', {
            conversation_id: convoRef.current.id,
            user_message: msg,
            agent_id: agent.id,
            agent_name: agent.name
          });

          const agentReply = response?.data?.response;
          if (agentReply) {
            setMessages((prev) => [...prev, {
              id: `agent-${agent.id}-${Date.now()}`,
              role: 'assistant',
              sender_agent_id: agent.id,
              metadata: { sourceAgentId: agent.id },
              content: agentReply,
              message_type: 'text'
            }]);
          }
        }
      } else {
        // Direct mode fallback
        pendingMessageRef.current = '';
        setMessages(prev => [...prev, {
          id: `u-${Date.now()}`, sender_agent_id: 'visitor',
          content: msg, message_type: 'text'
        }]);
        const res = await base44.functions.invoke('axiRespond', {
          conversation_id: convoRef.current.id,
          user_message: msg
        });
        const reply = res?.data?.response;
        if (reply) {
          setMessages(prev => [...prev, {
            id: `a-${Date.now()}`, sender_agent_id: 'axi',
            content: reply, message_type: 'text'
          }]);
        }
      }
    } catch (err) {
      console.error('[AxiChat] Send error:', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Axi could not respond right now.';
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, sender_agent_id: 'axi',
        content: errorMessage,
        message_type: 'text'
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddAgent = useCallback(async (agent, options = {}) => {
    const added = addAgent(agent);
    if (!added) {
      setShowAgentPicker(false);
      return;
    }
    setShowAgentPicker(false);

    if (options.skipIntro) {
      return;
    }

    const joinMessage = {
      id: `sys-${Date.now()}`,
      role: 'assistant',
      sender_agent_id: 'axi',
      content: `${agent.name} (${agent.role}) joined this conversation.`,
      message_type: 'system'
    };

    setMessages((prev) => [...prev, joinMessage]);

    // Context Assembly: build compact briefing for the summoned agent
    const contextBrief = buildAgentContextBrief(messages, activeAgents, agent);
    const introPrompt = `${contextBrief}\n\n[AUTO_JOIN_RESPONSE_REQUIRED]\nAxi has invited ${agent.name} (${agent.role}) into this conversation. Introduce yourself briefly, acknowledge the current participants, and respond naturally to the latest message.`;

    const response = await base44.functions.invoke('generateAgentResponse', {
      conversation_id: convoRef.current.id,
      user_message: introPrompt,
      agent_id: agent.id,
      agent_name: agent.name,
      includeContext: true // Enable Context Assembly Engine
    });

    const agentReply = response?.data?.response;
    if (agentReply) {
      setMessages((prev) => [...prev, {
        id: `agent-${agent.id}-${Date.now()}`,
        role: 'assistant',
        sender_agent_id: agent.id,
        metadata: { sourceAgentId: agent.id },
        content: agentReply,
        message_type: 'text'
      }]);
    }
  }, [activeAgents, addAgent]);

  const handleRemoveAgent = (agentId) => removeAgent(agentId);

  useEffect(() => {
    const summonAgentFromMessage = async () => {
      const latestMessage = messages[messages.length - 1];
      if (!latestMessage?.content || latestMessage.role === 'user') return;
      if (!latestMessage.content.includes('🔔 SUMMONING')) return;

      const messageKey = latestMessage.id || `${latestMessage.content}-${messages.length}`;
      if (processedSummonsRef.current.has(messageKey)) return;

      const lines = latestMessage.content.split('\n').map((line) => line.trim()).filter(Boolean);
      const summonLine = lines.find((line) => line.includes('🔔 SUMMONING'));
      if (!summonLine) return;

      const summonedName = summonLine.replace('🔔 SUMMONING', '').trim();
      if (!summonedName) return;

      const matchedAgent = findAgentByName(summonedName);

      processedSummonsRef.current.add(messageKey);

      if (!matchedAgent) return;
      await handleAddAgent(matchedAgent, { skipIntro: false });
    };

    summonAgentFromMessage();
  }, [messages, activeAgents, handleAddAgent]);

  // External open events
  useEffect(() => {
    const h = (e) => {
      setIsOpen(true);
      if (typeof e.detail?.message === 'string' && e.detail.message.trim()) {
        pendingMessageRef.current = e.detail.message;
        setInput((current) => current.trim() ? current : e.detail.message);
      }
    };
    window.addEventListener('open-axi', h);
    window.addEventListener('open-axi-with-agent', h);
    window.addEventListener('open-axi-with-message', h);
    return () => {
      window.removeEventListener('open-axi', h);
      window.removeEventListener('open-axi-with-agent', h);
      window.removeEventListener('open-axi-with-message', h);
    };
  }, [setIsOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className={`fixed z-[55] bg-slate-950 border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden rounded-2xl ${
            isExpanded
              ? 'inset-4'
              : 'bottom-32 md:bottom-6 right-2 md:right-4 w-[calc(100vw-1rem)] md:w-[420px] h-[360px] md:h-[560px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Talk to Axi</h3>
                <p className="text-xs text-purple-300/60">Village AI Guide</p>
                {activeAgents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {activeAgents.map((agent) => (
                      <Badge key={agent.id} className="bg-white/10 text-white border-white/10 pr-1">
                        <span>{agent.name}</span>
                        <button
                          onClick={() => handleRemoveAgent(agent.id)}
                          className="ml-1 rounded-full p-0.5 hover:bg-white/10"
                          aria-label={`Remove ${agent.name}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowAgentPicker((value) => !value)}
                className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10"
                title="Add agent"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
              {didSignal?.loading && (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" title="Verifying DID..." />
              )}
              {!didSignal?.loading && !didSignal?.isVerified && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => didSignal.refresh()} 
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 w-8"
                  title="Retry DID verification"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(e => !e)} className="text-white/40 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:flex">
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {showAgentPicker && (
            <div className="px-3 pt-3 flex-shrink-0">
              <AgentPicker
                activeAgentIds={activeAgents.map((agent) => agent.id)}
                onAdd={handleAddAgent}
                onClose={() => setShowAgentPicker(false)}
              />
            </div>
          )}

          {/* DID Authorization Error Alert */}
          {didAuthError && (
            <div className="mx-3 mt-2 p-3 rounded-lg bg-red-900/30 border border-red-500/30 flex gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{didAuthError}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!ready && (
              <div className="text-center py-12">
                <Loader2 className="w-7 h-7 text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="text-white/40 text-sm">Connecting to Axi...</p>
              </div>
            )}
            {ready && messages.length === 0 && !sending && (
              <div className="text-center py-12">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-40" />
                <p className="text-white/40 text-sm">Say something to Axi...</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MemoizedBubble key={msg.id || idx} message={msg} />
            ))}
            {sending && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl px-3 py-2">
                  <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700/50 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak to Axi..."
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-11 min-h-[44px]"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-11 px-4 flex-shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}