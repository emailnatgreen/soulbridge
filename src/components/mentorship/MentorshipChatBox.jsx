import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Send, MessageSquare, Bot, User, Loader2, Sparkles, Minimize2, Maximize2 } from 'lucide-react';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
};

export default function MentorshipChatBox({ relationship, currentUser, otherParty, role, onClose }) {
  const [message, setMessage] = useState('');
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const conversationId = `mentorship_${relationship.id}`;
  const myId = currentUser?.id || currentUser?.email || 'me';

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mentorship-chat', relationship.id],
    queryFn: () => base44.entities.AgentMessage.filter({ conversation_id: conversationId }),
    refetchInterval: 5000,
  });

  const sorted = [...messages].sort((a, b) =>
    new Date(a.sent_at || a.created_date) - new Date(b.sent_at || b.created_date)
  );

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length, minimized]);

  const sendMutation = useMutation({
    mutationFn: (text) => base44.entities.AgentMessage.create({
      conversation_id: conversationId,
      sender_agent_id: myId,
      sender_name: currentUser?.full_name || currentUser?.name || 'You',
      sender_type: 'human',
      content: text,
      message_type: 'mentorship',
      sent_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-chat', relationship.id] });
      setMessage('');
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const otherName = otherParty?.name || otherParty?.full_name || 'Partner';
  const otherIsAgent = !!otherParty?.wallet_id || !!otherParty?.role;
  const unreadCount = 0; // future feature

  return (
    <div
      className="fixed bottom-6 right-24 z-50 w-80 bg-slate-950 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all"
      style={{ height: minimized ? '52px' : '440px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-900/70 to-pink-900/40 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {otherParty?.avatar_url ? (
            <img src={otherParty.avatar_url} alt={otherName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/50 to-pink-500/50 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">{otherName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-xs font-medium leading-tight truncate">{otherName}</p>
            <div className="flex items-center gap-1">
              {otherIsAgent
                ? <Badge className="text-[9px] px-1 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30"><Bot className="w-2 h-2 inline mr-0.5" />Agent</Badge>
                : <Badge className="text-[9px] px-1 py-0 bg-green-500/20 text-green-300 border-green-500/30"><User className="w-2 h-2 inline mr-0.5" />Human</Badge>
              }
              <span className="text-white/30 text-[9px] capitalize">{role === 'mentor' ? 'Mentee' : 'Mentor'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => openAxi(`I'm chatting with my ${role === 'mentor' ? 'mentee' : 'mentor'} ${otherName}. Can you suggest what topics to discuss in our next mentorship session?`)}
            className="p-1 text-purple-300/60 hover:text-purple-300 transition rounded"
            title="Ask Axi for session ideas"
          >
            <Sparkles className="w-3 h-3" />
          </button>
          <button onClick={() => setMinimized(m => !m)} className="p-1 text-white/40 hover:text-white transition rounded">
            {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {isLoading && (
              <div className="flex justify-center pt-6">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              </div>
            )}
            {!isLoading && sorted.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <MessageSquare className="w-7 h-7 text-white/15 mx-auto" />
                <p className="text-white/30 text-xs">No messages yet. Start the conversation!</p>
                <button
                  onClick={() => openAxi(`Help me write a first message to start my mentorship conversation with ${otherName}`)}
                  className="text-[10px] text-purple-300/60 hover:text-purple-300 flex items-center gap-1 mx-auto transition"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Ask Axi for an opener
                </button>
              </div>
            )}
            {sorted.map((msg, idx) => {
              const isMe = msg.sender_agent_id === myId;
              return (
                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                    isMe ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white/10 text-white/90 rounded-bl-sm'
                  }`}>
                    {!isMe && <p className="text-[9px] text-white/40 mb-0.5">{msg.sender_name}</p>}
                    <p className="leading-relaxed break-words">{msg.content}</p>
                    <p className={`text-[9px] mt-1 ${isMe ? 'text-purple-200/50' : 'text-white/25'}`}>
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-white/10 bg-black/20 flex-shrink-0">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-xs h-8 flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              size="icon"
              className="h-8 w-8 bg-purple-600 hover:bg-purple-700 flex-shrink-0"
            >
              {sendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}