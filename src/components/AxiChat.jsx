import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 30;
const MemoizedBubble = memo(MessageBubble);

function isRecognizedUser() {
  if (localStorage.getItem('base44_access_token') || localStorage.getItem('token')) return true;
  try {
    const id = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null');
    if (id?.did || id?.connected) return true;
  } catch (_) {}
  return false;
}

function hasPlatformToken() {
  return !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
}

export default function AxiChat({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error

  const messagesEndRef = useRef(null);
  const unsubRef = useRef(null);
  const initAttempted = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Init conversation when chat opens
  useEffect(() => {
    if (!isOpen || !isRecognizedUser()) return;
    if (convo) return;
    if (initAttempted.current && status === 'error') return;

    const init = async () => {
      setStatus('loading');
      initAttempted.current = true;

      try {
        if (hasPlatformToken()) {
          // Platform-authenticated user: use agent SDK
          const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
          const unified = conversations
            .filter(c => c.metadata?.unified_axi_chat === true)
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

          let conversation;
          if (unified.length > 0) {
            conversation = unified[0];
          } else {
            conversation = await base44.agents.createConversation({
              agent_name: 'axi',
              metadata: { name: 'Unified Conversation with Axi', unified_axi_chat: true }
            });
          }

          setConvo(conversation);
          setStatus('ready');

          if (unsubRef.current) unsubRef.current();
          unsubRef.current = base44.agents.subscribeToConversation(conversation.id, (data) => {
            const msgs = data.messages || [];
            setMessages(msgs.slice(-PAGE_SIZE));
          });
        } else {
          // DID-only user: use direct backend function (no agent SDK)
          const convId = localStorage.getItem('sb_axi_did_conv') || `did-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          localStorage.setItem('sb_axi_did_conv', convId);
          setConvo({ id: convId, _didMode: true });
          setStatus('ready');

          // Load existing messages
          try {
            const res = await base44.functions.invoke('getConversationMessages', { conversation_id: convId });
            setMessages(res?.data?.messages || []);
          } catch (_) {}
        }
      } catch (err) {
        console.error('[AxiChat] Init failed:', err);
        setStatus('error');
      }
    };

    init();

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [isOpen, convo, status]);

  // Handle retry
  const handleRetry = useCallback(() => {
    initAttempted.current = false;
    setConvo(null);
    setStatus('idle');
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || !convo || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    try {
      if (convo._didMode) {
        // DID-only mode: use axiRespond directly
        setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender_agent_id: 'visitor', content: msg, message_type: 'text' }]);
        const res = await base44.functions.invoke('axiRespond', {
          conversation_id: convo.id,
          user_message: msg
        });
        const axiReply = res?.data?.response;
        if (axiReply) {
          setMessages(prev => [...prev, { id: `axi-${Date.now()}`, sender_agent_id: 'axi', content: axiReply, message_type: 'text' }]);
        }
      } else {
        await base44.agents.addMessage(convo, { role: 'user', content: msg });
      }
    } catch (err) {
      console.error('[AxiChat] Send failed:', err);
      setInput(msg);
    } finally {
      setSending(false);
    }
  }, [input, convo, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Listen for external open events
  useEffect(() => {
    const handleOpen = (e) => {
      setIsOpen(true);
      if (e.detail?.message) setInput(e.detail.message);
    };
    window.addEventListener('open-axi', handleOpen);
    window.addEventListener('open-axi-with-agent', handleOpen);
    window.addEventListener('open-axi-with-message', handleOpen);
    return () => {
      window.removeEventListener('open-axi', handleOpen);
      window.removeEventListener('open-axi-with-agent', handleOpen);
      window.removeEventListener('open-axi-with-message', handleOpen);
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
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(e => !e)} className="text-white/40 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:flex">
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {status === 'loading' && (
              <div className="text-center py-12">
                <Loader2 className="w-7 h-7 text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="text-white/40 text-sm">Connecting to Axi...</p>
              </div>
            )}
            {status === 'error' && (
              <div className="text-center py-10">
                <p className="text-red-400 text-sm mb-3">Could not connect to Axi.</p>
                <Button size="sm" onClick={handleRetry} className="bg-purple-700 hover:bg-purple-600 text-white text-xs">
                  Retry
                </Button>
              </div>
            )}
            {status === 'ready' && messages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-40" />
                <p className="text-white/40 text-sm">Say something to Axi...</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MemoizedBubble key={`${idx}-${msg.created_date || idx}`} message={msg} />
            ))}
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
                disabled={sending || status !== 'ready'}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending || status !== 'ready'}
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