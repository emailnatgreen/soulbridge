import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2 } from 'lucide-react';
import MessageBubble from '../components/MessageBubble';

export default function AxiPage() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initConversation();
  }, []);

  const initConversation = async () => {
    try {
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      
      if (conversations.length > 0) {
        const latest = conversations[0];
        const fullConvo = await base44.agents.getConversation(latest.id);
        setConversation(fullConvo);
        setMessages(fullConvo.messages || []);
        
        const unsubscribe = base44.agents.subscribeToConversation(latest.id, (data) => {
          setMessages(data.messages);
        });
        
        return () => unsubscribe();
      } else {
        const newConvo = await base44.agents.createConversation({
          agent_name: 'axi',
          metadata: { name: 'Conversation with Axi' }
        });
        setConversation(newConvo);
        setMessages(newConvo.messages || []);
        
        const unsubscribe = base44.agents.subscribeToConversation(newConvo.id, (data) => {
          setMessages(data.messages);
        });
        
        return () => unsubscribe();
      }
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;

    setSending(true);
    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: input
      });
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl flex-shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-6">
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
            <MessageBubble key={idx} message={msg} />
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
              onChange={(e) => setInput(e.target.value)}
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