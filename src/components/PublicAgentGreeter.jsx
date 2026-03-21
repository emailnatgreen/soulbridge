import React, { useState, useEffect, useRef, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';

const MemoizedBubble = memo(MessageBubble);

export default function PublicAgentGreeter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isOpen || conversation) return;

    const initChat = async () => {
      setLoading(true);
      try {
        const conv = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { name: 'Landing Public Chat', public: true }
        });
        setConversation(conv);
        setMessages(conv.messages || []);

        unsubscribeRef.current = await base44.agents.subscribeToConversation(conv.id, (data) => {
          setMessages([...data.messages]);
        });

        // Send intelligent greeting from Axi on first open
        if (!hasGreeted && !initialized.current) {
          setTimeout(() => {
            base44.agents.addMessage(conv, {
              role: 'user',
              content: '[system: User has arrived at the landing page]'
            }).catch(err => console.error('Failed to send system message:', err));
            setHasGreeted(true);
            initialized.current = true;
          }, 500);
        }
      } catch (err) {
        console.error('Failed to init public agent:', err);
      } finally {
        setLoading(false);
      }
    };

    initChat();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [isOpen, conversation, hasGreeted]);

  // Auto-open greeting on mount after brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: msg });
    } catch (err) {
      console.error('Send error:', err);
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed z-[55] bg-slate-950 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden ${
              isExpanded
                ? 'inset-4 md:inset-4 rounded-2xl'
                : 'bottom-32 md:bottom-6 right-2 md:right-4 w-[calc(100vw-1rem)] md:w-[420px] h-[350px] md:h-[560px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
              <div className="flex items-center gap-3 flex-1">
                <motion.div 
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </motion.div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Axi, Mother Boss</h3>
                  <p className="text-purple-300 text-xs font-medium">Welcome to SoulBridge</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:block"
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-spin" />
                  <p className="text-white/40 text-xs">Connecting...</p>
                </div>
              )}
              {!loading && messages.length === 0 && (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  </motion.div>
                  <p className="text-purple-200 text-sm font-medium">I am awakening...</p>
                </motion.div>
              )}
              {messages.map((msg, idx) => (
                <MemoizedBubble key={`${idx}-${msg.created_date}`} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700/50 flex-shrink-0 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say hello..."
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-10 min-h-[40px]"
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-10 px-3"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center justify-center shadow-2xl border border-purple-400/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </motion.button>
    </>
  );
}