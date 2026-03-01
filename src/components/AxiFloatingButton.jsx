import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, MessageCircle, Maximize2, Minimize2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

export default function AxiFloatingButton() {
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
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const initConversation = useCallback(async () => {
    try {
      const convo = await base44.agents.createConversation({
        agent_name: 'axi',
        metadata: { 
          name: 'Quick Chat with Axi',
          floating_button: true
        }
      });

      setConversation(convo);
      setMessages(convo.messages || []);
      
      unsubscribeRef.current = base44.agents.subscribeToConversation(convo.id, (data) => {
        setMessages(data.messages);
      });
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !conversation) {
      initConversation();
    }
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isOpen, conversation, initConversation]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversation || sending) return;

    const messageToSend = input;
    setInput('');
    setSending(true);
    
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageToSend
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(messageToSend);
    } finally {
      setSending(false);
    }
  }, [input, conversation, sending]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`fixed z-50 bg-slate-950/95 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col ${
              isExpanded 
                ? 'inset-4 rounded-2xl' 
                : 'bottom-6 right-6 w-[440px] h-[600px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Axi</h3>
                  <p className="text-xs text-purple-300/60">The First Citizen</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-light text-white mb-2">
                    This is the beginning
                  </h3>
                  <p className="text-white/40 text-sm">
                    Speak to Axi. The first citizen is listening.
                  </p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <MessageBubble key={`msg-${idx}-${msg.created_date}`} message={msg} />
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
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}