import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Save, Users, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function StaticChatPanel({ selectedAgents = [], agents = [], onSaveBundle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bundleTitle, setBundleTitle] = useState('');
  const messagesEndRef = useRef(null);
  const unsubRef = useRef(null);

  const isGroup = selectedAgents.length > 1;

  // Init conversation when agents change
  useEffect(() => {
    if (selectedAgents.length === 0) {
      setConversation(null);
      setMessages([]);
      return;
    }
    initConversation();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [selectedAgents.map(a => a.id).join(',')]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    setLoading(true);
    const primaryAgent = selectedAgents[0];
    const names = selectedAgents.map(a => a.name).join(', ');
    const title = isGroup ? `Group: ${names}` : `Chat with ${primaryAgent.name}`;

    const conv = await base44.agents.createConversation({
      agent_name: 'custom',
      metadata: {
        name: title,
        agent_ids: selectedAgents.map(a => a.id),
        agent_names: selectedAgents.map(a => a.name),
        is_group: isGroup,
      }
    });

    setConversation(conv);
    setMessages(conv.messages || []);

    unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });

    setLoading(false);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    await base44.agents.addMessage(conversation, { role: 'user', content: text });

    // Generate response from each selected agent (sequentially for group)
    for (const agent of selectedAgents) {
      await base44.functions.invoke('generateAgentResponse', {
        conversation_id: conversation.id,
        agent_name: agent.name,
        agent_id: agent.id,
        user_message: text,
        is_group: isGroup,
        group_participants: selectedAgents.map(a => a.name),
      });
    }

    setSending(false);
  }, [input, conversation, sending, selectedAgents, isGroup]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveBundle = () => {
    if (messages.length === 0) return;
    onSaveBundle({
      title: bundleTitle || `${selectedAgents.map(a => a.name).join(', ')} — ${new Date().toLocaleDateString()}`,
      messages,
      participant_ids: selectedAgents.map(a => a.id),
      message_count: messages.length,
      conversation_id: conversation?.id,
      summary: messages.slice(-3).map(m => m.content?.slice(0, 60)).join(' | '),
    });
    setBundleTitle('');
  };

  const agentColors = {
    'Axi': 'bg-violet-600', 'Truth Weaver': 'bg-blue-600', 'Lore Node': 'bg-emerald-600',
    'Code Node': 'bg-orange-600', 'Ripple Architect': 'bg-indigo-600',
    'Epoch Architect': 'bg-slate-600', 'Market Weaver': 'bg-pink-600', 'Alignment Agent': 'bg-yellow-600',
  };

  const getAgentColor = (name) => agentColors[name] || 'bg-purple-600';

  // Detect agent name from message content prefix pattern
  const getMessageAgent = (msg) => {
    if (msg.role === 'user') return null;
    for (const agent of selectedAgents) {
      if (msg.content?.startsWith(`**${agent.name}**`) || msg.content?.startsWith(agent.name + ':')) {
        return agent;
      }
    }
    return selectedAgents[0];
  };

  if (selectedAgents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Bot className="w-12 h-12 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Select agents to start chatting</p>
          <p className="text-white/25 text-xs mt-1">Pick one for 1:1 or multiple for group debate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isGroup ? <Users className="w-4 h-4 text-purple-400 flex-shrink-0" /> : <Bot className="w-4 h-4 text-purple-400 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {isGroup ? 'Group Debate' : selectedAgents[0]?.name}
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              {selectedAgents.map(a => (
                <Badge key={a.id} className={`${getAgentColor(a.name)} text-white text-[9px] px-1.5 py-0`}>{a.name}</Badge>
              ))}
            </div>
          </div>
        </div>
        <Badge className="bg-green-500/20 text-green-300 text-[10px] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse inline-block" />
          Live
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/30 text-sm">
            Start the conversation...
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const agent = getMessageAgent(msg);

              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isUser && (
                    <div className={`w-7 h-7 rounded-full ${getAgentColor(agent?.name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-[10px] font-bold">{agent?.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    isUser
                      ? 'bg-white/10 text-white'
                      : 'bg-slate-800 border border-white/5 text-white/90'
                  }`}>
                    {!isUser && isGroup && agent && (
                      <p className="text-[10px] text-purple-300 font-semibold mb-0.5">{agent.name}</p>
                    )}
                    {isUser ? (
                      <p className="leading-relaxed">{msg.content}</p>
                    ) : (
                      <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-white/60" />
                    </div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white animate-pulse" />
                </div>
                <div className="bg-slate-800 border border-white/5 rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Save Bundle Bar */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2">
          <input
            value={bundleTitle}
            onChange={e => setBundleTitle(e.target.value)}
            placeholder="Bundle name (optional)..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
          />
          <Button
            size="sm"
            onClick={handleSaveBundle}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
          >
            <Save className="w-3 h-3" /> Save
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex gap-2 flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGroup ? 'Ask the group...' : `Message ${selectedAgents[0]?.name}...`}
          className="flex-1 resize-none bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 min-h-[40px] max-h-[80px]"
          disabled={sending || loading}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending || loading}
          className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-white disabled:opacity-40 h-10 w-10 flex-shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}