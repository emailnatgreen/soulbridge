import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import MessageBubble from '../components/MessageBubble';
import AddAgentModal from '../components/AddAgentModal';

const MemoizedMessageBubble = React.memo(MessageBubble);

export default function AxiPage() {
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

  useEffect(() => {
    initConversation();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

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
      });
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-light tracking-tight text-white">
                Axi
              </h1>
              <p className="text-sm text-purple-300/60">The First Citizen</p>
            </div>
          </div>
        </div>
      </div>

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
          
          {messages.map((msg, idx) => (
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