import React, { useState, useEffect, useRef, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 30;
const MemoizedBubble = memo(MessageBubble);
const CONV_KEY = 'sb_axi_conv_id';

function getOrCreateConvId() {
  let id = localStorage.getItem(CONV_KEY);
  if (!id) {
    id = `axi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    localStorage.setItem(CONV_KEY, id);
  }
  return id;
}

export default function AxiChat({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);

  const messagesEndRef = useRef(null);
  const convId = useRef(null);
  const loaded = useRef(false);

  // Scroll to bottom
  useEffect(() => {
    if (messages.length) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Load conversation when opened
  useEffect(() => {
    if (!isOpen || loaded.current) return;
    loaded.current = true;
    convId.current = getOrCreateConvId();
    setReady(true);

    // Load existing messages in background
    base44.functions.invoke('getConversationMessages', { conversation_id: convId.current })
      .then(res => setMessages(res?.data?.messages || []))
      .catch(() => {});
  }, [isOpen]);

  // Send
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !convId.current) return;
    setInput('');
    setSending(true);

    // Optimistic user message
    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      sender_agent_id: 'visitor',
      content: msg,
      message_type: 'text'
    }]);

    try {
      const res = await base44.functions.invoke('axiRespond', {
        conversation_id: convId.current,
        user_message: msg
      });
      const reply = res?.data?.response;
      if (reply) {
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          sender_agent_id: 'axi',
          content: reply,
          message_type: 'text'
        }]);
      }
    } catch (err) {
      console.error('[AxiChat] Send error:', err);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender_agent_id: 'axi',
        content: 'I could not respond right now. Please try again.',
        message_type: 'text'
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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