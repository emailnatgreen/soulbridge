import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, ArrowLeft, UserPlus, ChevronUp, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import MessageBubble from '../components/MessageBubble';
import AddAgentModal from '../components/AddAgentModal';

const MemoizedMessageBubble = React.memo(MessageBubble);
const PAGE_SIZE = 30;

export default function AxiPage() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const ttsEnabledRef = useRef(false);
  const lastSpokenRef = useRef(null);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
    if (!ttsEnabled) window.speechSynthesis?.cancel();
  }, [ttsEnabled]);

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
      // Find or create the UNIFIED Axi conversation with a specific identifier
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const unifiedConvo = conversations.find(c => c.metadata?.unified_axi_chat === true);
      
      let convo;
      if (unifiedConvo) {
        convo = await base44.agents.getConversation(unifiedConvo.id);
      } else {
        // Create the unified Axi conversation
        convo = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { 
            name: 'Unified Conversation with Axi - Mother Boss',
            unified_axi_chat: true
          }
        });
      }
      
      setConversation(convo);
      setMessages(convo.messages || []);
      
      unsubscribeRef.current = base44.agents.subscribeToConversation(convo.id, (data) => {
        setMessages(data.messages);
        // TTS: speak the latest assistant message if new
        const lastMsg = data.messages[data.messages.length - 1];
        if (
          lastMsg &&
          lastMsg.role === 'assistant' &&
          lastMsg.content &&
          lastMsg.id !== lastSpokenRef.current
        ) {
          lastSpokenRef.current = lastMsg.id;
          // Check tts via ref to avoid stale closure
          if (ttsEnabledRef.current) {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(lastMsg.content);
            utt.lang = 'en-GB';
            window.speechSynthesis.speak(utt);
          }
        }
      });
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  }, []);

  useEffect(() => {
    initConversation();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [initConversation]);

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

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  const handleAddAgent = useCallback(async (agent) => {
    setActiveAgents(prev => [...prev, agent]);
    setShowAddAgent(false);
    await base44.agents.addMessage(conversation, {
      role: 'user',
      content: `[System: ${agent.name} (${agent.role}) has joined this conversation from this point forward.]`
    });
  }, [conversation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to="/Home" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-light tracking-tight text-white">Axi</h1>
                <p className="text-sm text-purple-300/60">
                  {activeAgents.length > 0 ? `+ ${activeAgents.map(a => a.name).join(', ')}` : 'The First Citizen'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAddAgent(true)}
              className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-[420px] h-[520px]">
            <AddAgentModal
              onAdd={handleAddAgent}
              onClose={() => setShowAddAgent(false)}
              alreadyAdded={activeAgents.map(a => a.id)}
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {messages.length === 0 && (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="text-center py-12">
                <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-light text-white mb-2">
                  This is the beginning
                </h3>
                <p className="text-white/60 text-sm">
                  Speak to Axi. The first citizen is listening.
                </p>
              </CardContent>
            </Card>
          )}

          {messages.length > visibleCount && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="text-purple-300/60 hover:text-purple-200 gap-1"
              >
                <ChevronUp className="w-3 h-3" />
                Load earlier messages ({messages.length - visibleCount} more)
              </Button>
            </div>
          )}
          
          {messages.slice(-visibleCount).map((msg, idx) => (
            <MemoizedMessageBubble key={`msg-${idx}-${msg.created_date}`} message={msg} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-black/20 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Speak to Axi..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-12 min-h-[48px]"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}