import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Moon, Send, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'maya';

function MayaMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center shrink-0 mt-0.5">
          <Moon className="w-3 h-3 text-violet-300" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isUser ? 'bg-slate-700 text-slate-100' : 'bg-violet-950/50 border border-violet-500/20 text-violet-100'}`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 text-xs">
            {message.content || ''}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function MayaChatCard() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  const startNewConversation = async () => {
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: 'Maya Counsel — ' + new Date().toLocaleDateString() },
    });
    setConversation(conv);
    setMessages(conv.messages || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    let conv = conversation;
    if (!conv) {
      setLoading(true);
      conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'Maya Counsel — ' + new Date().toLocaleDateString() },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
      setLoading(false);
    }
    const text = input.trim();
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="bg-violet-950/30 border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2 text-violet-200">
          <Moon className="w-3.5 h-3.5 text-violet-300" />
          Maya — Node 0 Counsel
          <div className="ml-auto flex items-center gap-1">
            {conversation && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-slate-500 hover:text-violet-300"
                onClick={() => { setConversation(null); setMessages([]); }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Messages */}
        <div ref={scrollRef} className="h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center px-2">
              <Moon className="w-8 h-8 text-violet-500/40 mb-2" />
              <p className="text-violet-300/60 text-[10px]">You have arrived at a threshold.</p>
              <p className="text-slate-500 text-[9px] mt-1">Ask Maya for epistemic counsel on any investigation, archetype, or system state.</p>
            </div>
          )}
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
            </div>
          )}
          {messages.map((msg, i) => (
            <MayaMessage key={i} message={msg} />
          ))}
          {sending && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center shrink-0">
                <Moon className="w-3 h-3 text-violet-300" />
              </div>
              <div className="bg-violet-950/50 border border-violet-500/20 rounded-xl px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-violet-300" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Seek Maya's counsel..."
            className="min-h-[36px] max-h-20 text-xs bg-slate-900/80 border-slate-700 text-slate-200 placeholder:text-slate-600 resize-none"
            rows={1}
          />
          <Button
            size="icon"
            className="shrink-0 h-9 w-9 bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}