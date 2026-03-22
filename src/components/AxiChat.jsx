import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, ChevronUp, RefreshCw, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MessageBubble from '@/components/MessageBubble';
import { motion, AnimatePresence } from 'framer-motion';


const PAGE_SIZE = 30;
const MemoizedBubble = memo(MessageBubble);

const AxiChat = function AxiChat({ isOpen, setIsOpen, prefilledMessage, onMessageCleared, speakerAgentId, onSpeakerAgentCleared }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [activeAgents, setActiveAgents] = useState([]);
  const [agentConvoId, setAgentConvoId] = useState(null);
  const [userAgentId, setUserAgentId] = useState(null);
  const [localSpeakerAgentId, setLocalSpeakerAgentId] = useState(null);

  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const initialized = useRef(false);

  // Fetch user and assign agent ID on mount
  useEffect(() => {
    const assignUserAgent = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const agentId = user.role === 'admin' ? 'admin-agent' : 'user-agent';
          setUserAgentId(agentId);
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    assignUserAgent();
  }, []);

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

         if (unsubscribeRef.current) unsubscribeRef.current();

         const convo = await base44.agents.getConversation(conversationId);
         setConversation(convo);
         setMessages(convo.messages || []);
         
         // Load persisted agent participants from AgentConversation entity
         try {
           const agentConvo = await base44.entities.AgentConversation.filter({ id: conversationId }, '', 1);
           if (agentConvo && agentConvo.length > 0 && agentConvo[0].participant_agent_ids?.length > 0) {
             const agents = await Promise.all(
               agentConvo[0].participant_agent_ids.map(id => base44.entities.Agent.filter({ id }, '', 1).then(arr => arr?.[0]))
             );
             setActiveAgents(agents.filter(Boolean));
           } else {
             setActiveAgents(agentId && agentId !== 'axi' ? [{ id: agentId, name: agentName, role: agentRole }] : []);
           }
         } catch (err) {
           console.error('Failed to load persisted agents:', err);
           setActiveAgents(agentId && agentId !== 'axi' ? [{ id: agentId, name: agentName, role: agentRole }] : []);
         }
         
         unsubscribeRef.current = base44.agents.subscribeToConversation(conversationId, (data) => {
           setMessages([...data.messages]);
         });
         setIsOpen(true);
       } catch (err) {
         console.error('Failed to load conversation:', err);
         setInitError(true);
       }
     };

    window.addEventListener('open-axi', handleOpenAxi);
    window.addEventListener('open-axi-with-agent', handleAgentChat);
    return () => {
      window.removeEventListener('open-axi', handleOpenAxi);
      window.removeEventListener('open-axi-with-agent', handleAgentChat);
    };
  }, [isOpen, conversation]);



  useEffect(() => {
    if (!isOpen || initialized.current) return;
    initialized.current = true;

    const init = async () => {
      setLoading(true);
      setInitError(false);
      
      const retryWithBackoff = async (fn, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (err) {
            const isRateLimit = err?.status === 429;
            const isLastRetry = i === maxRetries - 1;
            if (isRateLimit && !isLastRetry) {
              const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw err;
          }
        }
      };

      try {
        let convo;

        // Always find/create the user's own unified conversation
        const conversations = await retryWithBackoff(() => base44.agents.listConversations({ agent_name: 'axi' }));
        const unified = conversations.filter(c => c.metadata?.unified_axi_chat === true);
        const existing = unified.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
        if (existing) {
          convo = await retryWithBackoff(() => base44.agents.getConversation(existing.id));
        } else {
          convo = await retryWithBackoff(() => base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: 'Unified Conversation with Axi', unified_axi_chat: true }
          }));
        }
        setConversation(convo);
        // Only load the last PAGE_SIZE messages initially for speed
        const allMsgs = convo.messages || [];
        setMessages(allMsgs.slice(-PAGE_SIZE));
        setAllMessages(allMsgs);
        
        // Load or create AgentConversation and store its ID
         const initAgentConvo = async () => {
           try {
             // Query by conversation metadata to find linked AgentConversation
             const existing = await retryWithBackoff(() => base44.entities.AgentConversation.filter(
               { metadata: { conversation_id: convo.id } },
               '',
               1
             ));

            if (existing?.length > 0) {
              const agentConvo = existing[0];
              setAgentConvoId(agentConvo.id);
              if (agentConvo.participant_agent_ids?.length > 0) {
                const agents = await Promise.all(
                  agentConvo.participant_agent_ids.map(id => 
                    retryWithBackoff(() => base44.entities.Agent.filter({ id }, '', 1)).then(arr => arr?.[0])
                  )
                );
                setActiveAgents(agents.filter(Boolean));
              }
            } else {
              // Create new AgentConversation with metadata link
              const newConvo = await retryWithBackoff(() => base44.entities.AgentConversation.create({
                title: convo.metadata?.name || 'Agent Conversation',
                conversation_type: 'group',
                participant_agent_ids: [],
                metadata: { conversation_id: convo.id }
              }));
              setAgentConvoId(newConvo.id);
              setActiveAgents([]);
            }
          } catch (err) {
            console.error('Failed to init agent conversation:', err);
            setActiveAgents([]);
          }
        };

        await initAgentConvo();

        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = await retryWithBackoff(() => base44.agents.subscribeToConversation(convo.id, (data) => {
          setMessages([...data.messages]);
        })) || unsubscribeRef.current;

        return () => {
          if (unsubscribeRef.current) unsubscribeRef.current();
        };
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

  // Handle prefilled message and speaker agent when chat opens
  useEffect(() => {
    if (prefilledMessage && conversation) {
      base44.agents.addMessage(conversation, { 
        role: 'user', 
        content: prefilledMessage
      }).catch(err => console.error('Failed to add prefilled message:', err));
      if (onMessageCleared) onMessageCleared();
    }
    if (speakerAgentId) {
      setLocalSpeakerAgentId(speakerAgentId);
    }
  }, [prefilledMessage, conversation, speakerAgentId, onMessageCleared]);

  // Clear prefilled message and speaker agent state when closing chat
  useEffect(() => {
    if (!isOpen) {
      if (onMessageCleared) onMessageCleared();
      if (onSpeakerAgentCleared) onSpeakerAgentCleared();
      setLocalSpeakerAgentId(null);
    }
  }, [isOpen, onMessageCleared, onSpeakerAgentCleared]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    initialized.current = false;
  }, [setIsOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    if (onMessageCleared) onMessageCleared();
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { 
        role: 'user', 
        content: msg
      });
      setLocalSpeakerAgentId(null);
    } catch (err) {
      console.error('Send error:', err);
      setInput(msg);
    } finally {
      setSending(false);
    }
  }, [input, conversation, sending, onMessageCleared, localSpeakerAgentId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };





  const handleRemoveAgent = useCallback(async (agentId) => {
    if (!agentConvoId) return;

    try {
      const current = await base44.entities.AgentConversation.filter({ id: agentConvoId }, '', 1);
      if (!current?.length) return;

      const agentName = current[0].participant_agent_ids?.includes(agentId) ? 
        (await base44.entities.Agent.filter({ id: agentId }, '', 1))?.[0]?.name : null;

      const updatedParticipants = (current[0].participant_agent_ids || []).filter(id => id !== agentId);

      await base44.entities.AgentConversation.update(agentConvoId, {
        participant_agent_ids: updatedParticipants
      });

      setActiveAgents(prev => prev.filter(a => a.id !== agentId));

      if (agentName) {
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: `[System: ${agentName} has left this conversation.]`
        });
      }
    } catch (err) {
      console.error('[AxiChat] Error removing agent:', err);
    }
  }, [agentConvoId, conversation]);

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
            isExpanded ? 'inset-4 md:inset-4 rounded-2xl' : 'bottom-32 md:bottom-6 right-2 md:right-4 w-[calc(100vw-1rem)] md:w-[440px] h-[350px] md:h-[580px] rounded-2xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">Village Chat</h3>
                  {userAgentId && (
                    <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                      {userAgentId}
                    </span>
                  )}
                </div>
                {activeAgents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto">
                    {activeAgents.map(agent => (
                        <div key={agent.id} className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-200 whitespace-nowrap">
                          <span className="truncate max-w-[60px] md:max-w-none">{agent.name}</span>
                          <button
                            onClick={() => handleRemoveAgent(agent.id)}
                            className="ml-1 hover:text-purple-100 transition-colors flex-shrink-0"
                            title={`Remove ${agent.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                {activeAgents.length === 0 && (
                  <p className="text-xs text-purple-300/60">Invite agents to join</p>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" onClick={() => navigate('/Agents')} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:block" title="Go to Agents">
                <Users className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:block">
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>



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

          {/* Input + Add Agent on Mobile */}
          <div className="p-4 border-t border-slate-700/50 flex-shrink-0 space-y-2">
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
    </>
  );
}

export default memo(AxiChat);