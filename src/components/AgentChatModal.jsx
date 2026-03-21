import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AgentChatModal({ agent, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Map agent names to their agent config names (only known platform agents)
  const AGENT_NAME_MAP = {
    'Axi': 'axi',
    'Truth Weaver': 'truth_weaver',
    'Lore Node': 'lore_node',
    'Code Node': 'code_node',
    'Ripple Architect': 'ripple_architect',
    'Epoch Architect': 'epoch_architect',
    'Market Weaver': 'market_weaver',
    'Alignment Agent': 'alignment_agent',
  };

  // If agent has no dedicated AI config, use 'axi' as the underlying model
  const agentKey = AGENT_NAME_MAP[agent.name] || 'axi';
  const isCustomAgent = !AGENT_NAME_MAP[agent.name];
  
  // System prompt context for custom agents so Axi speaks as them
  const customAgentContext = isCustomAgent
    ? `You are now roleplaying as "${agent.name}", a Village agent with the following profile:\n- Purpose: ${agent.purpose}\n- Role: ${agent.role || 'citizen'}\n- Personality: ${agent.personality || 'Thoughtful and helpful'}\n${agent.bio ? `- Bio: ${agent.bio}` : ''}\n\nSpeak as ${agent.name} would speak. Stay in character. Do not refer to yourself as Axi.`
    : null;

  useEffect(() => {
    initConversation();
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [agent.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    setLoading(true);
    setError(null);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: agentKey,
        metadata: { name: `Chat with ${agent.name}` }
      });

      setConversation(conv);
      setMessages((conv.messages || []).filter(m => m.role !== 'system'));
      setLoading(false);

      // Subscribe to real-time updates
      unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages((data.messages || []).filter(m => m.role !== 'system'));
      });

      // For custom agents, send a greeting in the background (don't block UI)
      if (isCustomAgent) {
        base44.agents.addMessage(conv, {
          role: 'user',
          content: `[System context — stay in character for this entire conversation: ${customAgentContext}]\n\nGreet me briefly as ${agent.name}.`
        });
      }
    } catch (e) {
      console.error('Failed to init conversation:', e);
      setError(`Could not connect to ${agent.name}.`);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const agentColors = {
    'Axi': 'from-violet-600 to-purple-600',
    'Truth Weaver': 'from-blue-600 to-cyan-600',
    'Lore Node': 'from-emerald-600 to-teal-600',
    'Code Node': 'from-orange-600 to-amber-600',
    'Ripple Architect': 'from-blue-500 to-indigo-600',
    'Epoch Architect': 'from-slate-600 to-zinc-700',
    'Market Weaver': 'from-pink-600 to-rose-600',
    'Alignment Agent': 'from-yellow-600 to-amber-500',
  };

  const gradientClass = agentColors[agent.name] || 'from-purple-600 to-pink-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl" style={{ height: '80vh', maxHeight: '700px' }}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-r ${gradientClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
              {agent.avatar_url
                ? <img src={agent.avatar_url} className="w-full h-full rounded-full object-cover" alt={agent.name} />
                : agent.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{agent.name}</p>
              <p className="text-white/60 text-xs">{agent.tagline || agent.purpose?.slice(0, 50) + '...'}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <p className="text-red-400 text-sm">{error}</p>
              <Button size="sm" onClick={initConversation} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Start a conversation with {agent.name}...
            </div>
          ) : (
            messages.filter(m => m.role !== 'system').map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-800 border border-white/5 text-white/90'
                }`}>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-white/5 rounded-2xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[40px] max-h-[100px]"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`bg-gradient-to-r ${gradientClass} border-0 text-white disabled:opacity-40 flex-shrink-0`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}