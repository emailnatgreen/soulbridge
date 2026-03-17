import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Sparkles, Send, Loader2, Maximize2, Minimize2, UserPlus, ChevronUp, RefreshCw, Trash2 } from 'lucide-react';
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
  const [agentConvoId, setAgentConvoId] = useState(null);

  // DIAGNOSTIC 1: Trace state origin
  console.log('[State Origin] setActiveAgents type:', typeof setActiveAgents);
  console.log('[State Origin] activeAgents type:', typeof activeAgents, 'length:', activeAgents.length);
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
        
        // Load or create AgentConversation and store its ID
        const initAgentConvo = async () => {
          try {
            // Query by conversation metadata to find linked AgentConversation
            const existing = await base44.entities.AgentConversation.filter(
              { metadata: { conversation_id: convo.id } },
              '',
              1
            );

            if (existing?.length > 0) {
              const agentConvo = existing[0];
              setAgentConvoId(agentConvo.id);
              if (agentConvo.participant_agent_ids?.length > 0) {
                const agents = await Promise.all(
                  agentConvo.participant_agent_ids.map(id => 
                    base44.entities.Agent.filter({ id }, '', 1).then(arr => arr?.[0])
                  )
                );
                setActiveAgents(agents.filter(Boolean));
              }
            } else {
              // Create new AgentConversation with metadata link
              const newConvo = await base44.entities.AgentConversation.create({
                title: convo.metadata?.name || 'Agent Conversation',
                conversation_type: 'group',
                participant_agent_ids: [],
                metadata: { conversation_id: convo.id }
              });
              setAgentConvoId(newConvo.id);
              setActiveAgents([]);
            }
          } catch (err) {
            console.error('Failed to init agent conversation:', err);
            setActiveAgents([]);
          }
        };

        await initAgentConvo();

        // Subscribe to real-time agent conversation updates
        // Use a stable reference to convo.id to avoid stale closure issues
        const currentConvoId = convo.id;
        const unsubscribeAgents = base44.entities.AgentConversation.subscribe((event) => {
          // Refresh agents whenever ANY AgentConversation changes
          // (in case metadata isn't properly set or comparison fails)
          initAgentConvo();
        });

        if (unsubscribeRef.current) unsubscribeRef.current();
        unsubscribeRef.current = base44.agents.subscribeToConversation(convo.id, (data) => {
          console.log('[Subscription:Agent] Fired at', new Date().toISOString(), '- messages:', data.messages?.length);
          setMessages([...data.messages]);
        });

        // Also subscribe to AgentConversation entity changes to auto-sync active agents
        const unsubscribeAgentConvo = base44.entities.AgentConversation.subscribe((event) => {
          console.log('[Subscription:AgentConversation] Event fired:', {
            type: event.type,
            eventId: event.id,
            agentConvoId: currentConvoId,
            match: event.id === currentConvoId,
            participants: event.data?.participant_agent_ids,
            timestamp: new Date().toISOString()
          });
          
          if (event.id === currentConvoId && event.data?.participant_agent_ids) {
            console.log('[Subscription:AgentConversation] Syncing activeAgents from subscription:', {
              participants: event.data.participant_agent_ids,
              timestamp: new Date().toISOString()
            });
            // Fetch fresh agent objects when participants change
            Promise.all(
              event.data.participant_agent_ids.map(id => 
                base44.entities.Agent.filter({ id }, '', 1).then(arr => arr?.[0])
              )
            ).then(agents => {
              const validAgents = agents.filter(Boolean);
              console.log('[Subscription:AgentConversation] Loaded agents:', validAgents.map(a => a.name));
              console.log('[Subscription:AgentConversation] About to call setActiveAgents with:', {
                count: validAgents.length,
                agents: validAgents.map(a => ({ id: a.id, name: a.name }))
              });
              
              // DIAGNOSTIC 2 & 3: Check reference identity before setState
              console.log('[Identity Check] New data:', validAgents);
              console.log('[Identity Check] Current activeAgents:', activeAgents);
              console.log('[Identity Check] Same reference?', activeAgents === validAgents);
              console.log('[Identity Check] Length match?', activeAgents.length === validAgents.length);
              
              setActiveAgents(validAgents);
              console.log('[Subscription:AgentConversation] setState called, next render will show new value');
            }).catch(err => {
              console.error('[Subscription:AgentConversation] Error loading agents:', err);
            });
          }
        });

        return () => {
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeAgentConvo();
        };

        // Cleanup both subscriptions on unmount
        return () => {
          if (unsubscribeRef.current) unsubscribeRef.current();
          unsubscribeAgents();
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

  const handleClose = useCallback(() => {
    setIsOpen(false);
    initialized.current = false;
  }, []);

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
    const traceId = `TRACE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${traceId}] ========== PHASE 0: INIT ==========`);
    console.log(`[${traceId}] Agent: ${agent.name} (${agent.id})`);
    console.log(`[${traceId}] Target ConversationId: ${agentConvoId}`);
    
    if (!agentConvoId) {
      throw new Error('Agent conversation not initialized');
    }

    try {
      // PHASE 1: Fetch current state
      console.log(`[${traceId}] PHASE 1: Fetching current AgentConversation...`);
      const current = await base44.entities.AgentConversation.filter({ id: agentConvoId }, '', 1);
      if (!current?.length) {
        throw new Error('Agent conversation record not found');
      }
      console.log(`[${traceId}] PHASE 1 SUCCESS: Found record`, { id: current[0].id, participants: current[0].participant_agent_ids });

      const agentConvo = current[0];
      const participants = agentConvo.participant_agent_ids || [];
      console.log(`[${traceId}] Current participants:`, participants);

      if (participants.includes(agent.id)) {
        console.log(`[${traceId}] Agent already in list, exiting`);
        setShowAddAgent(false);
        return;
      }

      // PHASE 2: Build new participant list
      console.log(`[${traceId}] PHASE 2: Building updated participant list...`);
      const updatedParticipants = [...participants, agent.id];
      console.log(`[${traceId}] Updated participants array:`, updatedParticipants);

      // PHASE 3: Execute update
      console.log(`[${traceId}] PHASE 3: Executing .update() call...`);
      const result = await base44.entities.AgentConversation.update(agentConvoId, {
        participant_agent_ids: updatedParticipants
      });
      console.log(`[${traceId}] PHASE 3 RESULT:`, {
        returned_id: result?.id,
        returned_participants: result?.participant_agent_ids,
        agent_in_list: result?.participant_agent_ids?.includes(agent.id),
        full_result: JSON.stringify(result)
      });

      if (!result?.participant_agent_ids?.includes(agent.id)) {
        throw new Error('Agent not in updated list after .update()');
      }

      // PHASE 4: Immediate state update
      console.log(`[${traceId}] PHASE 4: Updating UI state immediately...`);
      console.log(`[${traceId}] Current activeAgents before setState:`, activeAgents);
      setActiveAgents(prev => {
        const newState = [...prev, agent];
        console.log(`[${traceId}] PHASE 4 setState callback: prev=${JSON.stringify(prev)}, new=${JSON.stringify(newState)}`);
        return newState;
      });

      // PHASE 5: Re-query from database
      console.log(`[${traceId}] PHASE 5: Re-querying fresh data from database...`);
      const fresh = await base44.entities.AgentConversation.filter({ id: agentConvoId }, '', 1);
      console.log(`[${traceId}] PHASE 5 RE-QUERY RESULT:`, {
        found: fresh?.length > 0,
        participants: fresh?.[0]?.participant_agent_ids,
        matches_updated: JSON.stringify(fresh?.[0]?.participant_agent_ids) === JSON.stringify(updatedParticipants)
      });

      if (fresh?.[0]?.participant_agent_ids) {
        // PHASE 6: Load full Agent objects
        console.log(`[${traceId}] PHASE 6: Loading full Agent objects for participants...`);
        console.log(`[${traceId}] Participant IDs to load:`, fresh[0].participant_agent_ids);
        const loadedAgents = await Promise.all(
          fresh[0].participant_agent_ids.map(async (id) => {
            console.log(`[${traceId}] Fetching agent ${id}...`);
            const result = await base44.entities.Agent.filter({ id }, '', 1);
            const agent = result?.[0];
            console.log(`[${traceId}] Fetched agent ${id}:`, { name: agent?.name, found: !!agent });
            return agent;
          })
        );
        const validAgents = loadedAgents.filter(Boolean);
        console.log(`[${traceId}] PHASE 6 COMPLETE: Loaded ${validAgents.length}/${loadedAgents.length} agents`);
        
        console.log(`[${traceId}] PHASE 6: Setting activeAgents to loaded list...`);
        console.log(`[${traceId}] About to setState with:`, validAgents.map(a => ({ id: a.id, name: a.name })));
        
        // DIAGNOSTIC 2 & 3: Check reference identity (Phase 6)
        console.log(`[${traceId}] [Identity Check] New validAgents:`, validAgents);
        console.log(`[${traceId}] [Identity Check] Current activeAgents:`, activeAgents);
        console.log(`[${traceId}] [Identity Check] Same ref?`, activeAgents === validAgents);
        
        setActiveAgents(validAgents);
        console.log(`[${traceId}] setState called, check if state updated in next render`);
      }

      // PHASE 7: Post system message
      console.log(`[${traceId}] PHASE 7: Posting system message to conversation...`);
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: `[System: ${agent.name} (${agent.role}) has joined this conversation.]`
      });
      console.log(`[${traceId}] PHASE 7 SUCCESS: Message posted`);

      console.log(`[${traceId}] PHASE 8: Closing modal`);
      setShowAddAgent(false);
      console.log(`[${traceId}] ========== ALL PHASES COMPLETE ==========`);
    } catch (err) {
      console.error(`[${traceId}] ERROR THROWN:`, err);
      console.error(`[${traceId}] Stack:`, err?.stack);
      throw err;
    }
  }, [agentConvoId, conversation, activeAgents]);

  // Diagnostic: Log activeAgents on every render
  useEffect(() => {
    console.log('[AxiChat:Render] activeAgents updated:', {
      count: activeAgents.length,
      agents: activeAgents.map(a => ({ id: a.id, name: a.name })),
      timestamp: new Date().toISOString()
    });
  }, [activeAgents]);

  // DIAGNOSTIC 5: Check memo wrapping
  useEffect(() => {
    console.log('[Memo Check] AxiChat.displayName:', AxiChat.displayName);
    console.log('[Memo Check] Is wrapped in memo?', AxiChat.displayName?.includes('memo'));
  }, []);

  const handleRemoveAgent = useCallback(async (agentId) => {
    if (!agentConvoId) return;

    try {
      const current = await base44.entities.AgentConversation.filter({ id: agentConvoId }, '', 1);
      if (!current?.length) return;

      const updatedParticipants = (current[0].participant_agent_ids || []).filter(id => id !== agentId);

      await base44.entities.AgentConversation.update(agentConvoId, {
        participant_agent_ids: updatedParticipants
      });

      setActiveAgents(prev => prev.filter(a => a.id !== agentId));

      const removedAgent = activeAgents.find(a => a.id === agentId);
      if (removedAgent) {
        await base44.agents.addMessage(conversation, {
          role: 'user',
          content: `[System: ${removedAgent.name} has left this conversation.]`
        });
      }
    } catch (err) {
      console.error('[AxiChat] Error removing agent:', err);
    }
  }, [agentConvoId, activeAgents, conversation]);

  return (
    <>
      {/* Floating trigger button — always visible when chat is closed */}
      {!isOpen && !isPublicPage && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl flex items-center justify-center text-white transition-all hover:scale-110"
          title="Talk to Axi"
        >
          <Sparkles className="w-6 h-6" />
        </motion.button>
      )}
      
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
                <h3 className="font-semibold text-white text-sm">Axi</h3>
                {(() => {
                  console.log('[Header:JSX] Rendering header, activeAgents:', {
                    length: activeAgents.length,
                    agents: activeAgents.map(a => ({ id: a.id, name: a.name }))
                  });
                  console.log('[Header:JSX] Condition activeAgents.length > 0:', activeAgents.length > 0);
                  return null;
                })()}
                {activeAgents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 max-h-12 overflow-y-auto">
                    {(() => {
                      console.log('[Badges:Render] About to render badges for:', activeAgents.map(a => a.name));
                      return activeAgents.map(agent => (
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
                      ));
                    })()}
                  </div>
                )}
                {activeAgents.length === 0 && (
                  <p className="text-xs text-purple-300/60">The First Citizen</p>
                )}
              </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddAgent(true)}
                title="Invite agent to chat"
                className="text-white/50 hover:text-purple-400 hover:bg-white/10 h-8 w-8 md:block hidden"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 hidden md:block">
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleClose} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Add Agent Button for Mobile - moved to bottom */}
          {!isExpanded && (
            <div className="md:hidden px-4 py-1 border-t border-slate-700/50">
              <Button
                onClick={() => setShowAddAgent(true)}
                size="sm"
                className="w-full text-xs bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add Agent
              </Button>
            </div>
          )}

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
    </>
  );
});

export default AxiChat;