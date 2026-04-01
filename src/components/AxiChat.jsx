import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, ChevronUp, UserPlus, Brain } from 'lucide-react';
import SaveToMemoryPanel from '@/components/axi/SaveToMemoryPanel';
import AgentPicker from '@/components/axi/AgentPicker';
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
  const [allMessages, setAllMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [activeAgents, setActiveAgents] = useState([]);
  const [agentConvoId, setAgentConvoId] = useState(null);
  const [userAgentId, setUserAgentId] = useState(null);
  const [localSpeakerAgentId, setLocalSpeakerAgentId] = useState(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showMemorySave] = useState(false); // removed - use MemoryBrowser page instead

  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const initialized = useRef(false);

  // Fetch user and assign agent ID on mount
  useEffect(() => {
    const hasToken = !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
    if (!isAuthenticated && !hasToken) return;

    const assignUserAgent = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const agentId = user.role === 'admin' ? 'admin-agent' : 'user-agent';
          setUserAgentId(agentId);
        }
      } catch (_) {
        setUserAgentId('user-agent');
      }
    };
    assignUserAgent();
  }, [isAuthenticated]);

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

    const handlePrefilledOpen = async (event) => {
      const { message, conversationId, agentId, agentName, agentRole } = event.detail || {};
      if (message) {
        setInput(message);
        if (onMessageCleared) onMessageCleared();
      }
      if (agentId) {
        setLocalSpeakerAgentId(agentId);
      }
      if (!conversationId) {
        setIsOpen(true);
        return;
      }
      try {
         if (unsubscribeRef.current) unsubscribeRef.current();

         const convo = await base44.agents.getConversation(conversationId);
         setConversation(convo);
         const all = convo.messages || [];
         setAllMessages(all);
         setMessages(all.slice(-PAGE_SIZE));
         setPage(1);

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
           setActiveAgents(agentId && agentId !== 'axi' ? [{ id: agentId, name: agentName, role: agentRole }] : []);
         }

         unsubscribeRef.current = base44.agents.subscribeToConversation(conversationId, (data) => {
           const all = [...data.messages];
           setAllMessages(all);
           setPage(prev => {
             setMessages(all.slice(-PAGE_SIZE * prev));
             return prev;
           });
         });
         setIsOpen(true);
       } catch (err) {
         
         setInitError(true);
       }
    };

    const handleAgentChat = async (event) => {
       try {
         const { conversationId, agentId, agentName, agentRole } = event.detail;

         if (unsubscribeRef.current) unsubscribeRef.current();

         const convo = await base44.agents.getConversation(conversationId);
         setConversation(convo);
         const all = convo.messages || [];
         setAllMessages(all);
         setMessages(all.slice(-PAGE_SIZE));
         setPage(1);
         
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
           setActiveAgents(agentId && agentId !== 'axi' ? [{ id: agentId, name: agentName, role: agentRole }] : []);
         }
         
         unsubscribeRef.current = base44.agents.subscribeToConversation(conversationId, (data) => {
           const all = [...data.messages];
           setAllMessages(all);
           setPage(prev => {
             setMessages(all.slice(-PAGE_SIZE * prev));
             return prev;
           });
         });
         setIsOpen(true);
       } catch (err) {
         
         setInitError(true);
       }
     };

    window.addEventListener('open-axi', handleOpenAxi);
    window.addEventListener('open-axi-with-agent', handleAgentChat);
    window.addEventListener('open-axi-with-message', handlePrefilledOpen);
    return () => {
      window.removeEventListener('open-axi', handleOpenAxi);
      window.removeEventListener('open-axi-with-agent', handleAgentChat);
      window.removeEventListener('open-axi-with-message', handlePrefilledOpen);
    };
  }, [isOpen, conversation, onMessageCleared, setIsOpen]);



  useEffect(() => {
    const hasToken = !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
    if ((!isAuthenticated && !hasToken) || !isOpen) return;
    if (conversation && !initError) return; // already connected
    if (initError && !retryKey) return; // wait for manual retry

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
        let convoId;

        // Step 1: Find or create the conversation — only need the ID, not the full messages
        const conversations = await retryWithBackoff(() => base44.agents.listConversations({ agent_name: 'axi' }));
        const unified = conversations.filter(c => c.metadata?.unified_axi_chat === true);
        const existing = unified.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
        
        let convo;
        if (existing) {
          convoId = existing.id;
          // Don't call getConversation — it loads ALL 6000+ messages.
          // We'll get recent messages from the subscription instead.
          convo = existing;
        } else {
          convo = await retryWithBackoff(() => base44.agents.createConversation({
            agent_name: 'axi',
            metadata: { name: 'Unified Conversation with Axi', unified_axi_chat: true }
          }));
          convoId = convo.id;
        }
        setConversation(convo);
        
        // Step 2: Show empty state immediately, let subscription fill in messages
        setMessages([]);
        setAllMessages([]);
        
        // Step 3: Load AgentConversation participants (lightweight)
        const initAgentConvo = async () => {
          try {
            const all = await retryWithBackoff(() => base44.entities.AgentConversation.list('-created_date', 50));
            const existingAC = all?.filter(ac => ac.metadata?.conversation_id === convoId);

            if (existingAC && existingAC.length > 0) {
              const agentConvo = existingAC[0];
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
              const newConvo = await retryWithBackoff(() => base44.entities.AgentConversation.create({
                title: convo.metadata?.name || 'Agent Conversation',
                conversation_type: 'group',
                participant_agent_ids: [],
                metadata: { conversation_id: convoId }
              }));
              setAgentConvoId(newConvo.id);
              setActiveAgents([]);
            }
          } catch (err) {
            setActiveAgents([]);
          }
        };

        await initAgentConvo();

        // Step 4: Subscribe — this gives us messages without calling getConversation
        if (unsubscribeRef.current) unsubscribeRef.current();
        let firstSnapshot = true;
        unsubscribeRef.current = base44.agents.subscribeToConversation(convoId, (data) => {
          const allMsgs = data.messages || [];
          if (firstSnapshot) {
            // First snapshot: only show last PAGE_SIZE messages
            firstSnapshot = false;
            setAllMessages(allMsgs);
            setMessages(allMsgs.slice(-PAGE_SIZE));
            setPage(1);
          } else {
            // Subsequent updates: only update if length changed (new message)
            setAllMessages(prev => {
              if (prev.length === allMsgs.length) return prev; // no change, skip re-render
              setMessages(allMsgs.slice(-PAGE_SIZE));
              return allMsgs;
            });
          }
        });

      } catch (err) {
        console.error('[AxiChat] Init failed:', err);
        setInitError(true);
        setConversation(null);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [isAuthenticated, isOpen, retryKey, conversation, initError]);

  // Handle speaker agent when chat opens
  useEffect(() => {
    if (prefilledMessage) {
      setInput(prefilledMessage);
      if (onMessageCleared) onMessageCleared();
    }
    if (speakerAgentId) {
      setLocalSpeakerAgentId(speakerAgentId);
    }
  }, [prefilledMessage, speakerAgentId, onMessageCleared]);

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
  }, [setIsOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversation || sending) return;
    const msg = input.trim();
    setInput('');
    if (onMessageCleared) onMessageCleared();
    setSending(true);
    try {
      // Send to Axi (the base agent conversation handles this)
      await base44.agents.addMessage(conversation, { 
        role: 'user', 
        content: msg
      });
      setLocalSpeakerAgentId(null);

      // Also trigger each active agent to respond
      if (activeAgents.length > 0) {
        activeAgents.forEach(agent => {
          base44.functions.invoke('generateAgentResponse', {
            conversation_id: conversation.id,
            user_message: msg,
            agent_id: agent.id,
            agent_name: agent.name
          }).catch(() => {});
        });
      }
    } catch (err) {
      setInput(msg);
    } finally {
      setSending(false);
    }
  }, [input, conversation, sending, onMessageCleared, localSpeakerAgentId, activeAgents]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };





  const handleAddAgent = useCallback(async (agent) => {
    try {
      // Update AgentConversation participant list
      if (agentConvoId) {
        const current = await base44.entities.AgentConversation.filter({ id: agentConvoId }, '', 1);
        const existing = current?.[0]?.participant_agent_ids || [];
        if (!existing.includes(agent.id)) {
          await base44.entities.AgentConversation.update(agentConvoId, {
            participant_agent_ids: [...existing, agent.id]
          });
        }
      }

      setActiveAgents(prev => prev.find(a => a.id === agent.id) ? prev : [...prev, agent]);
      setShowAgentPicker(false);

      // Notify the conversation
      if (conversation) {
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: `[System: ${agent.name} (${agent.role}) has joined this conversation.]`
        });
      }
    } catch (err) {
    }
  }, [agentConvoId, conversation]);

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
              <img
                src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
                alt="SoulBridge"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <Button variant="ghost" size="icon" onClick={() => navigate('/MemoryBrowser')} className="text-white/50 hover:text-violet-300 hover:bg-white/10 h-8 w-8" title="Open Memory Browser">
                <Brain className="w-3.5 h-3.5" />
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
                <Button size="sm" onClick={() => { setInitError(false); setConversation(null); setRetryKey(k => k + 1); }} className="bg-purple-700 hover:bg-purple-600 text-white text-xs">
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
            {allMessages.length > messages.length && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    setMessages(allMessages.slice(-PAGE_SIZE * nextPage));
                  }}
                  className="text-purple-300/60 hover:text-purple-200 gap-1 text-xs"
                >
                  <ChevronUp className="w-3 h-3" />
                  Load earlier ({allMessages.length - messages.length} more)
                </Button>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MemoizedBubble key={`${idx}-${msg.created_date}`} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-slate-700/50 flex-shrink-0 space-y-2 relative">

            {showAgentPicker && (
              <AgentPicker
                activeAgentIds={activeAgents.map(a => a.id)}
                onAdd={handleAddAgent}
                onClose={() => setShowAgentPicker(false)}
              />
            )}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAgentPicker(p => !p)}
                className={`h-12 w-10 flex-shrink-0 border ${showAgentPicker ? 'border-purple-500 text-purple-300 bg-purple-500/10' : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'}`}
                title="Add agent to chat"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
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
                disabled={!input.trim() || sending || !conversation}
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