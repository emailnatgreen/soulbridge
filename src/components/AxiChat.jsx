import React, { useState, useEffect, useRef, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, UserPlus } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import AgentPicker from '@/components/axi/AgentPicker';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 30;
const MemoizedBubble = memo(MessageBubble);
const PERSONAL_CONVERSATION_KEY = 'axi_personal_conversation_id';

export default function AxiChat({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState(null); // 'agent' | 'direct'
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);

  const messagesEndRef = useRef(null);
  const convoRef = useRef(null);
  const unsubRef = useRef(null);
  const initDone = useRef(false);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Init when opened
  useEffect(() => {
    if (!isOpen || initDone.current) return;
    initDone.current = true;

    const init = async () => {
      // Try agent SDK first and reconnect to the user's saved personal conversation
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
        const savedConversationId = localStorage.getItem(PERSONAL_CONVERSATION_KEY);

        let conversation = null;
        if (savedConversationId) {
          conversation = conversations.find(c => c.id === savedConversationId) || null;
        }

        if (!conversation) {
          const personal = conversations
            .filter(c => c.metadata?.unified_axi_chat === true || c.metadata?.personal_axi_chat === true)
            .sort((a, b) => new Date(a.updated_date || a.created_date) - new Date(b.updated_date || b.created_date));
          conversation = personal[personal.length - 1] || null;
        }

        if (!conversation) {
          conversation = await base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: 'Personal Conversation with Axi', unified_axi_chat: true, personal_axi_chat: true }
          });
        }

        localStorage.setItem(PERSONAL_CONVERSATION_KEY, conversation.id);
        convoRef.current = conversation;
        setMode('agent');
        setReady(true);

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
        // Agent SDK mode: full compliance history preserved
        await base44.agents.addMessage(convoRef.current, { role: 'user', content: msg });

        const invitedAgents = activeAgents;
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

  const handleAddAgent = async (agent) => {
    setActiveAgents((prev) => [...prev, agent]);
    setShowAgentPicker(false);

    const joinMessage = {
      id: `sys-${Date.now()}`,
      role: 'assistant',
      sender_agent_id: 'axi',
      metadata: { sourceAgentId: agent.id },
      content: `${agent.name} (${agent.role}) joined this conversation.`,
      message_type: 'text'
    };

    setMessages((prev) => [...prev, joinMessage]);

    const introPrompt = `Axi has invited ${agent.name} (${agent.role}) into this conversation. Introduce yourself briefly to the user and acknowledge that you are joining from this point forward.`;

    if (mode === 'agent' && convoRef.current) {
      await base44.agents.addMessage(convoRef.current, {
        role: 'user',
        content: `[System: ${agent.name} (${agent.role}) has joined this conversation from this point forward.]`
      });

      const response = await base44.functions.invoke('generateAgentResponse', {
        conversation_id: convoRef.current.id,
        user_message: introPrompt,
        agent_id: agent.id,
        agent_name: agent.name
      });

      const agentReply = response?.data?.response;
      if (agentReply) {
        setMessages((prev) => [...prev, {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          sender_agent_id: agent.id,
          metadata: { sourceAgentId: agent.id },
          content: agentReply,
          message_type: 'text'
        }]);
      }
      return;
    }

    const response = await base44.functions.invoke('generateAgentResponse', {
      conversation_id: convoRef.current.id,
      user_message: introPrompt,
      agent_id: agent.id,
      agent_name: agent.name
    });

    const agentReply = response?.data?.response;
    if (agentReply) {
      setMessages((prev) => [...prev, {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        sender_agent_id: agent.id,
        metadata: { sourceAgentId: agent.id },
        content: agentReply,
        message_type: 'text'
      }]);
    }
  };

  // External open events
  useEffect(() => {
    const h = (e) => { setIsOpen(true); if (e.detail?.message) setInput(e.detail.message); };
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
                <p className="text-xs text-purple-300/60">
                  {activeAgents.length > 0 ? `Village AI Guide + ${activeAgents.map((agent) => agent.name).join(', ')}` : 'Village AI Guide'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setShowAgentPicker((value) => !value)} className="text-white/40 hover:text-white hover:bg-white/10 h-8 w-8">
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
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