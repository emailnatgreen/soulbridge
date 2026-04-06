import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Fingerprint, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIdentity } from '@/hooks/useIdentity';
import { useAgentAwareness } from '@/hooks/useAgentAwareness';

export default function AgentChat() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentDID, setCurrentDID] = useState(null);
  const { isRecognized } = useIdentity();
  const { broadcastMessageReceived } = useAgentAwareness();

  // Load current DID from storage
  useEffect(() => {
    const identity = localStorage.getItem('soulbridge_identity');
    if (identity) {
      try {
        setCurrentDID(JSON.parse(identity));
      } catch (e) {
        // ignore parse errors
      }
    }
  }, []);

  // Fetch agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-chat'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  // Fetch conversation messages for selected agent
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent) return [];
      const convId = `conv-${selectedAgent.id}`;
      try {
        return await base44.entities.AgentMessage.filter({ conversation_id: convId }, '-created_date', 200);
      } catch (e) {
        console.error('Failed to fetch messages:', e);
        return [];
      }
    },
    enabled: !!selectedAgent,
  });

  const conversationMessages = messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgent) return;

    setIsSending(true);
    try {
      const senderAgentId = currentDID?.agent_id || localStorage.getItem('user_agent_id') || 'user';
      const convId = `conv-${selectedAgent.id}`;
      
      const newMsg = await base44.entities.AgentMessage.create({
        sender_agent_id: senderAgentId,
        conversation_id: convId,
        content: message.trim(),
        message_type: 'text',
        status: 'sent',
      });
      
      // Emit signal that message was sent to selected agent
      window.dispatchEvent(new CustomEvent('agent-chat-message', {
        detail: {
          sender: senderAgentId,
          recipient: selectedAgent.id,
          message: message.trim(),
          conversationId: convId,
          messageId: newMsg.id,
          timestamp: new Date().toISOString(),
        }
      }));

      // Notify agents that a message was received
      broadcastMessageReceived(selectedAgent.id, true);
      
      setMessage('');
      setTimeout(() => refetchMessages(), 300);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      guardian: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
      creator: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
      trader: 'from-green-500/20 to-green-600/20 border-green-500/30',
      teacher: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
      healer: 'from-pink-500/20 to-pink-600/20 border-pink-500/30',
      scout: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
      citizen: 'from-slate-500/20 to-slate-600/20 border-slate-500/30',
    };
    return colors[role] || colors.citizen;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3 sm:mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-white">Agent Chat</h1>
              <p className="text-xs sm:text-sm text-purple-300/60 mt-0.5">Direct communication with AI agents</p>
            </div>
            {currentDID && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 ml-auto text-xs">
                <Fingerprint className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 h-[calc(100vh-240px)]">
          {/* Agent List */}
          <div className="lg:col-span-1 overflow-y-auto">
            <div className="space-y-2">
              {agentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                </div>
              ) : agents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No agents available</p>
                </div>
              ) : (
                agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${ selectedAgent?.id === agent.id
                      ? 'bg-purple-600/30 border-purple-500/60'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getRoleColor(agent.role)} flex-shrink-0 mt-0.5`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                        <p className="text-xs text-white/50 truncate">{agent.role}</p>
                        <p className="text-xs text-white/30 line-clamp-1 mt-1">{agent.purpose}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 overflow-hidden">
            {selectedAgent ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full flex flex-col">
                {/* Chat Header */}
                <div className="border-b border-white/10 p-4">
                  <h2 className="text-lg font-medium text-white">{selectedAgent.name}</h2>
                  <p className="text-xs text-purple-300/60 mt-1">{selectedAgent.purpose}</p>
                </div>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-purple-400/30 mx-auto mb-3" />
                        <p className="text-white/60">No messages yet</p>
                        <p className="text-white/40 text-sm mt-1">Start a conversation</p>
                      </div>
                    </div>
                  ) : (
                    conversationMessages.map(msg => {
                      const isFromAgent = msg.sender_agent_id === selectedAgent.id;
                      return (
                        <div key={msg.id} className={`flex ${isFromAgent ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-xs rounded-lg px-4 py-2 ${
                            isFromAgent
                              ? 'bg-white/10 text-white'
                              : 'bg-purple-600 text-white'
                          }`}>
                            <p className="text-sm">{msg.content || msg.message}</p>
                            <p className="text-xs mt-1 opacity-60">
                              {new Date(msg.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>

                {/* Input */}
                <div className="border-t border-white/10 p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={`Message ${selectedAgent.name}...`}
                      disabled={isSending}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isSending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                  <p className="text-white/60">Select an agent to begin</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}