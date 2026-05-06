import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Save, Users, Bot, User, Sparkles, MessageSquare, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_COLORS = {
  'Axi': 'bg-violet-600', 'Truth Weaver': 'bg-blue-600', 'Lore Node': 'bg-emerald-600',
  'Code Node': 'bg-orange-600', 'Ripple Architect': 'bg-indigo-600',
  'Epoch Architect': 'bg-slate-600', 'Market Weaver': 'bg-pink-600', 'Alignment Agent': 'bg-yellow-600',
  'Maya': 'bg-rose-600', 'Zoe': 'bg-teal-600', 'Law Guardian': 'bg-red-600',
};

const FALLBACK_COLORS = ['bg-purple-600', 'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-fuchsia-600'];

function getAgentColor(name) {
  if (AGENT_COLORS[name]) return AGENT_COLORS[name];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export default function StaticChatPanel({ selectedAgents = [], agents = [], onSaveBundle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [respondingAgents, setRespondingAgents] = useState([]);
  const [showSaveBar, setShowSaveBar] = useState(false);
  const [bundleTitle, setBundleTitle] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationRef = useRef(null);
  const unsubRef = useRef(null);

  const isGroup = selectedAgents.length > 1;

  // Init conversation when agents change
  useEffect(() => {
    if (selectedAgents.length === 0) {
      conversationRef.current = null;
      setMessages([]);
      return;
    }
    initConversation();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [selectedAgents.map(a => a.id).join(',')]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, respondingAgents]);

  // Auto-focus input when agent selected
  useEffect(() => {
    if (selectedAgents.length > 0 && !loading) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [selectedAgents, loading]);

  const initConversation = async () => {
    setLoading(true);
    if (unsubRef.current) unsubRef.current();

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

    conversationRef.current = conv;
    setMessages(conv.messages || []);

    unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });

    setLoading(false);
  };

  // Build group context string so each agent knows who else is in the chat
  const buildGroupContext = useCallback((userText) => {
    if (!isGroup) return userText;
    const participantList = selectedAgents.map(a => `${a.name} (${a.role || 'citizen'})`).join(', ');
    const recentContext = messages.slice(-6).map(m => {
      if (m.role === 'user') return `Nathan: ${m.content}`;
      return `${m._agentName || 'Agent'}: ${(m.content || '').slice(0, 200)}`;
    }).join('\n');

    return `[GROUP CHAT — Participants: ${participantList}]\n[Recent messages]\n${recentContext}\n[New message from Nathan]\n${userText}`;
  }, [isGroup, selectedAgents, messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !conversationRef.current || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Add user message (visible via subscription)
    await base44.agents.addMessage(conversationRef.current, { role: 'user', content: text });

    const groupText = buildGroupContext(text);

    // Fire all agent requests in parallel, show typing per agent
    setRespondingAgents(selectedAgents.map(a => a.name));

    const results = await Promise.allSettled(
      selectedAgents.map(agent =>
        base44.functions.invoke('generateAgentResponse', {
          conversation_id: conversationRef.current.id,
          agent_name: agent.name,
          agent_id: agent.id,
          user_message: groupText,
          is_group: isGroup,
          group_participants: selectedAgents.map(a => a.name),
        }).then(res => {
          // Remove this agent from responding list as soon as done
          setRespondingAgents(prev => prev.filter(n => n !== agent.name));
          return { agent, reply: res?.data?.response };
        }).catch(err => {
          setRespondingAgents(prev => prev.filter(n => n !== agent.name));
          throw err;
        })
      )
    );

    // Add each agent's reply as a visible message in the conversation
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value?.reply) {
        const { agent, reply } = result.value;
        // Store with agent name prefix so we can attribute it
        const prefixedReply = `**${agent.name}:** ${reply}`;
        await base44.agents.addMessage(conversationRef.current, {
          role: 'assistant',
          content: prefixedReply,
        });
      }
    }

    setRespondingAgents([]);
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, sending, selectedAgents, isGroup, buildGroupContext]);

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
      conversation_id: conversationRef.current?.id,
      summary: messages.slice(-3).map(m => (m.content || '').slice(0, 60)).join(' | '),
    });
    setBundleTitle('');
    setShowSaveBar(false);
  };

  // Parse agent name from message content (we prefix with **AgentName:** )
  const getMessageAgent = (msg) => {
    if (msg.role === 'user') return null;
    const content = msg.content || '';
    // Match **AgentName:** prefix
    const boldMatch = content.match(/^\*\*(.+?):\*\*/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
      const matched = selectedAgents.find(a => a.name === name) || agents.find(a => a.name === name);
      if (matched) return matched;
    }
    // Fallback: check if content starts with agent name
    for (const agent of selectedAgents) {
      if (content.startsWith(agent.name + ':') || content.startsWith(`**${agent.name}**`)) {
        return agent;
      }
    }
    return selectedAgents[0];
  };

  // Strip the agent name prefix from displayed content
  const getDisplayContent = (msg) => {
    if (msg.role === 'user') return msg.content;
    const content = msg.content || '';
    // Remove **AgentName:** prefix
    const stripped = content.replace(/^\*\*(.+?):\*\*\s*/, '');
    return stripped;
  };

  // Empty state
  if (selectedAgents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm px-6">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-9 h-9 text-purple-400/60" />
          </div>
          <h2 className="text-white text-lg font-medium mb-2">Start a Conversation</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-4">
            Select one agent for a 1:1 chat, or pick multiple for a group debate where each agent responds in character.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-white/30">
            <span className="flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> 1:1 Chat</span>
            <span className="text-white/10">|</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Group Debate</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-black/10 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex -space-x-2">
            {selectedAgents.slice(0, 4).map(a => (
              <div key={a.id} className="relative">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt={a.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-950" />
                ) : (
                  <div className={`w-8 h-8 rounded-full ${getAgentColor(a.name)} flex items-center justify-center ring-2 ring-slate-950`}>
                    <span className="text-white text-[10px] font-bold">{a.name[0]}</span>
                  </div>
                )}
              </div>
            ))}
            {selectedAgents.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-slate-950">
                <span className="text-white/60 text-[10px]">+{selectedAgents.length - 4}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {isGroup ? 'Group Debate' : selectedAgents[0]?.name}
            </p>
            <p className="text-white/30 text-[10px] truncate">
              {isGroup
                ? selectedAgents.map(a => a.name).join(' · ')
                : (selectedAgents[0]?.purpose || selectedAgents[0]?.role || 'Agent')
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge className="bg-green-500/15 text-green-300 border-green-500/20 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse inline-block" />
            Live
          </Badge>
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSaveBar(!showSaveBar)}
              className="text-white/40 hover:text-emerald-300 h-7 w-7 p-0"
              title="Save conversation"
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Save Bar */}
      {showSaveBar && messages.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 bg-emerald-500/5 flex items-center gap-2 flex-shrink-0">
          <input
            value={bundleTitle}
            onChange={e => setBundleTitle(e.target.value)}
            placeholder="Name this conversation..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            onKeyDown={e => e.key === 'Enter' && handleSaveBundle()}
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

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-white/30 text-xs">Connecting to {selectedAgents[0]?.name}...</p>
              </div>
            </div>
          ) : messages.length === 0 && respondingAgents.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Zap className="w-8 h-8 text-purple-400/30 mx-auto mb-3" />
                <p className="text-white/50 text-sm mb-1">Ready to chat</p>
                <p className="text-white/25 text-xs">
                  {isGroup
                    ? `Ask ${selectedAgents.map(a => a.name).join(' & ')} anything`
                    : `Send a message to ${selectedAgents[0]?.name}`
                  }
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const agent = getMessageAgent(msg);
              const displayContent = getDisplayContent(msg);

              return (
                <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!isUser && (
                    <div className="flex-shrink-0 mt-1">
                      {agent?.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent?.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className={`w-7 h-7 rounded-full ${getAgentColor(agent?.name)} flex items-center justify-center`}>
                          <span className="text-white text-[10px] font-bold">{agent?.name?.[0] || '?'}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isUser
                      ? 'bg-purple-600/80 text-white rounded-br-md'
                      : 'bg-white/[0.07] border border-white/[0.06] text-white/90 rounded-bl-md'
                  }`}>
                    {!isUser && agent && (
                      <p className={`text-[10px] font-semibold mb-1 ${
                        getAgentColor(agent.name).replace('bg-', 'text-').replace('-600', '-300')
                      }`}>{agent.name}</p>
                    )}
                    {isUser ? (
                      <p className="leading-relaxed">{displayContent}</p>
                    ) : (
                      <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_code]:text-purple-300 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-black/30 [&_pre]:rounded-lg [&_pre]:p-3">
                        {displayContent}
                      </ReactMarkdown>
                    )}
                  </div>
                  {isUser && (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-white/50" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          {/* Typing indicators for each responding agent */}
          {respondingAgents.map(name => (
            <div key={name} className="flex justify-start gap-2">
              <div className={`w-7 h-7 rounded-full ${getAgentColor(name)} flex items-center justify-center`}>
                <span className="text-white text-[10px] font-bold">{name[0]}</span>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">{name}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-white/10 bg-black/10 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGroup ? 'Ask the group...' : `Message ${selectedAgents[0]?.name}...`}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-colors min-h-[42px] max-h-[120px]"
            disabled={sending || loading}
            rows={1}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending || loading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white disabled:opacity-30 h-[42px] w-[42px] flex-shrink-0 rounded-xl"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-white/15 mt-1.5 text-center">
          {isGroup ? 'All agents respond in parallel' : 'Press Enter to send · Shift+Enter for new line'}
        </p>
      </div>
    </div>
  );
}