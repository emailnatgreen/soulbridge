import React, { useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/MessageBubble';
import LondonClock from '@/components/LondonClock';
import { useRef, useEffect, useCallback } from 'react';

export default function Layout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const initConversation = useCallback(async () => {
    try {
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const existing = conversations.find(c => c.metadata?.unified_axi_chat === true);
      let convo;
      if (existing) {
        convo = await base44.agents.getConversation(existing.id);
      } else {
        convo = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { name: 'Unified Conversation with Axi', unified_axi_chat: true }
        });
      }
      setConversation(convo);
      setMessages(convo.messages || []);
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = base44.agents.subscribeToConversation(convo.id, (data) => {
        setMessages(data.messages);
      });
    } catch (error) {
      console.error('Failed to init Axi conversation:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !conversation) initConversation();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [isOpen, conversation, initConversation]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversation || sending) return;
    const msg = input;
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: msg });
    } catch (error) {
      console.error('Failed to send:', error);
      setInput(msg);
    } finally {
      setSending(false);
    }
  }, [input, conversation, sending]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="relative">
      {/* Global Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <LondonClock />
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="sm"
          className={`gap-2 transition-all ${isOpen 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Talk to Axi</span>
        </Button>
      </div>

      {/* Page Content - offset for top bar */}
      <div className="pt-10">
        {children}
      </div>

      <Toaster />

      {/* Axi Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            className={`fixed z-[55] bg-slate-950/98 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col ${
              isExpanded
                ? 'inset-4 top-12 rounded-2xl'
                : 'top-12 right-4 w-[440px] h-[580px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Axi</h3>
                  <p className="text-xs text-purple-300/60">The First Citizen</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-40" />
                  <p className="text-white/40 text-sm">Speak to Axi. She is listening.</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <MessageBubble key={`${idx}-${msg.created_date}`} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Speak to Axi..."
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-12 min-h-[48px]"
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 px-4"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}