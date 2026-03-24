import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Send, MessageSquare, Bot, User, Loader2 } from 'lucide-react';

export default function MentorshipChatBox({ relationship, currentUser, otherParty, role, onClose }) {
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const conversationId = `mentorship_${relationship.id}`;

  // Load messages for this mentorship relationship
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['mentorship-chat', relationship.id],
    queryFn: () => base44.entities.AgentMessage.filter({ conversation_id: conversationId }),
    refetchInterval: 5000, // poll every 5s for new messages
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      await base44.entities.AgentMessage.create({
        conversation_id: conversationId,
        sender_agent_id: currentUser?.id || currentUser?.email || 'human',
        sender_name: currentUser?.full_name || currentUser?.name || 'You',
        sender_type: currentUser?.isAgent ? 'agent' : 'human',
        content: text,
        message_type: 'mentorship',
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-chat', relationship.id] });
      setMessage('');
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.sent_at || a.created_date) - new Date(b.sent_at || b.created_date)
  );

  const otherName = otherParty?.name || otherParty?.full_name || 'Partner';
  const otherIsAgent = !!otherParty?.wallet_id || !!otherParty?.role;

  return (
    <div className="fixed bottom-6 right-24 z-50 w-80 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
         style={{ height: '420px' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/60 to-pink-900/40 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <div>
            <p className="text-white text-sm font-medium leading-tight">{otherName}</p>
            <div className="flex items-center gap-1.5">
              <Badge className={`text-[10px] px-1.5 py-0 ${otherIsAgent ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                {otherIsAgent ? <><Bot className="w-2.5 h-2.5 inline mr-0.5" />Agent</> : <><User className="w-2.5 h-2.5 inline mr-0.5" />Human</>}
              </Badge>
              <span className="text-white/30 text-[10px] capitalize">{role === 'mentor' ? 'Your Mentee' : 'Your Mentor'}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && (
          <div className="flex justify-center pt-4">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        )}
        {!isLoading && sortedMessages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <MessageSquare className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-white/30 text-xs">No messages yet. Start the conversation!</p>
          </div>
        )}
        {sortedMessages.map((msg, idx) => {
          const isMe = msg.sender_agent_id === (currentUser?.id || currentUser?.email || 'human');
          return (
            <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                isMe
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : 'bg-white/10 text-white/90 rounded-bl-sm'
              }`}>
                {!isMe && (
                  <p className="text-[10px] text-white/40 mb-0.5">{msg.sender_name}</p>
                )}
                <p className="leading-relaxed break-words">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? 'text-purple-200/60' : 'text-white/30'}`}>
                  {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-slate-950/50">
        <Input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm h-9 flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
          size="icon"
          className="h-9 w-9 bg-purple-600 hover:bg-purple-700 flex-shrink-0"
        >
          {sendMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}