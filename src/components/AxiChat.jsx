import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, UserPlus, ChevronUp, RefreshCw } from 'lucide-react';
import MessageBubble from '@/components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';
import AddAgentModal from '@/components/AddAgentModal';

const PAGE_SIZE = 30;
const MemoizedBubble = memo(MessageBubble);

const AxiChat = memo(function AxiChat({ isOpen, setIsOpen }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const initialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    const handleOpenAxi = () => {
      if (!isOpen) setIsOpen(true);
    };

    const handleAgentChat = async (event) => {
      try {
        const { conversationId, agentId, agentName, agentRole } = event.detail;
        setConversation(null);
        setMessages([]);
        setActiveAgents([{ id: agentId, name: agentName, role: agentRole }]);
        if (unsubscribeRef.current) unsubscribeRef.current();
        
        const convo = await base44.agents.getConversation(conversationId);
        setConversation(convo);
        setMessages(convo.messages || []);
        unsubscribeRef.current = base44.agents.subscribeToConversation(conversationId, (data) => {
          setMessages([...data.messages]);
        });
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to load agent conversation:', err);
        setInitError(true);
      }
    };

    window.addEventListener('open-axi', handleOpenAxi);
    window.addEventListener('open-axi-with-agent', handleAgentChat);
    return () => {
      window.removeEventListener('open-axi', handleOpenAxi);
      window.removeEventListener('open-axi-with-agent', handleAgentChat);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || initialized.current) return;
    initialized.current = true;

    const init = async () => {
      setLoading(true);
      setInitError(false);
      try {
        const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
        const unified = conversations.filter(c => c.metadata?.unified_axi_chat === true);
        const existing = unified.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
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
          setMessages([...data.messages]);
        });
      } catch (err) {
        console.error('Axi init error:', err);
        setInitError(true);
        initialized.current = false;
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [isOpen, retryKey]);

  const handleSend = useCallback(async () => {
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
  }, [input, conversation, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAddAgent = useCallback(async (agent) => {
    if (!conversation) return;
    setActiveAgents(prev => [...prev, agent]);
    setShowAddAgent(false);
    // Post a system message announcing the agent has joined
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: `[System: ${agent.name} (${agent.role}) has joined this conversation from this point forward.]`
    });
  }, [conversation]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className={`fixed z-[55] bg-slate-950 backdrop-blur-xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden ${
            isExpanded ? 'inset-4 top-12 rounded-2xl' : 'top-12 right-4 w-[440px] h-[580px] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Axi</h3>
                <p className="text-xs text-purple-300/60">
                  {activeAgents.length > 0
                    ? `+ ${activeAgents.map(a => a.name).join(', ')}`
                    : 'The First Citizen'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddAgent(true)}
                title="Invite agent to chat"
                className="text-white/50 hover:text-purple-400 hover:bg-white/10 h-8 w-8"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Add Agent Modal (overlay inside chat) */}
          {showAddAgent && (
            <AddAgentModal
              onAdd={handleAddAgent}
              onClose={() => setShowAddAgent(false)}
              alreadyAdded={activeAgents.map(a => a.id)}
            />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-3 animate-spin" />
                <p className="text-white/40 text-sm">Connecting to Axi...</p>
              </div>
            )}
            {initError && !loading && (
              <div className="text-center py-10">
                <p className="text-red-400 text-sm mb-3">Could not connect to Axi.</p>
                <Button size="sm" onClick={() => setRetryKey(k => k + 1)} className="bg-purple-700 hover:bg-purple-600 text-white text-xs">
                  Retry
                </Button>
              </div>
            )}
            {!loading && !initError && messages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3 opacity-40" />
                <p className="text-white/40 text-sm">Speak to Axi. She is listening.</p>
              </div>
            )}
            {messages.length > visibleCount && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="text-purple-300/60 hover:text-purple-200 gap-1 text-xs"
                >
                  <ChevronUp className="w-3 h-3" />
                  Load earlier ({messages.length - visibleCount} more)
                </Button>
              </div>
            )}
            {messages.slice(-visibleCount).map((msg, idx) => (
              <MemoizedBubble key={`${idx}-${msg.created_date}`} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-700/50 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Speak to Axi..."
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-12 min-h-[48px]"
                disabled={sending}
                autoFocus
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
  );
});

export default AxiChat;