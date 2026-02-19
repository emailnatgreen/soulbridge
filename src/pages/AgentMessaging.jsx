import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Plus, Users, Bell, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AgentMessaging() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [convoType, setConvoType] = useState('direct');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['agentConversations'],
    queryFn: () => base44.entities.AgentConversation.list('-last_message_at'),
    refetchInterval: 3000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['conversationMessages', selectedConversation?.id],
    queryFn: () => base44.entities.AgentMessage.list('-created_date', 100),
    enabled: !!selectedConversation,
    refetchInterval: 2000
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['agentNotifications'],
    queryFn: async () => {
      const allNotifs = await base44.entities.AgentNotification.list('-created_date', 50);
      return allNotifs;
    },
    refetchInterval: 5000
  });

  const startConversationMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('startAgentConversation', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['agentConversations']);
      setShowNewConvo(false);
      setSelectedAgents([]);
      if (response.data.conversation) {
        setSelectedConversation(response.data.conversation);
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendInterAgentMessage', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversationMessages']);
      queryClient.invalidateQueries(['agentConversations']);
      setNewMessage('');
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('markNotificationsRead', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentNotifications']);
    }
  });

  const conversationMessages = selectedConversation 
    ? messages.filter(m => m.context?.conversation_id === selectedConversation.id)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    : [];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = (sender_agent_id, auto_respond = false) => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      conversation_id: selectedConversation.id,
      sender_agent_id,
      content: newMessage,
      auto_respond
    });
  };

  const handleStartConversation = () => {
    if (selectedAgents.length < 2) return;
    
    startConversationMutation.mutate({
      participant_agent_ids: selectedAgents,
      conversation_type: convoType
    });
  };

  const handleMarkAsRead = (conversationId) => {
    const convoNotifs = notifications
      .filter(n => n.related_conversation_id === conversationId && !n.is_read)
      .map(n => n.id);
    
    if (convoNotifs.length > 0) {
      markReadMutation.mutate({ notification_ids: convoNotifs });
    }
  };

  const getUnreadForConvo = (convoId) => {
    return notifications.filter(n => n.related_conversation_id === convoId && !n.is_read).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">Agent Messaging</h1>
                <p className="text-sm text-purple-300/60">Inter-agent communication hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <Bell className="w-5 h-5" />
                </Button>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Dialog open={showNewConvo} onOpenChange={setShowNewConvo}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Conversation
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Start New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={convoType} onValueChange={setConvoType}>
                      <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct Message</SelectItem>
                        <SelectItem value="group">Group Chat</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="space-y-2">
                      <label className="text-sm text-white/80">Select Participants ({selectedAgents.length} selected)</label>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                        {agents.map(agent => (
                          <div
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgents(prev => 
                                prev.includes(agent.id) 
                                  ? prev.filter(id => id !== agent.id)
                                  : [...prev, agent.id]
                              );
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition-all ${
                              selectedAgents.includes(agent.id)
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-white/80 hover:bg-slate-700'
                            }`}
                          >
                            <div className="text-sm font-medium">{agent.name}</div>
                            <div className="text-xs opacity-60">{agent.role}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleStartConversation}
                      disabled={selectedAgents.length < 2 || startConversationMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Start Conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-1 px-4 pb-4">
                  {conversations.map(convo => {
                    const unread = getUnreadForConvo(convo.id);
                    return (
                      <div
                        key={convo.id}
                        onClick={() => {
                          setSelectedConversation(convo);
                          handleMarkAsRead(convo.id);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          selectedConversation?.id === convo.id
                            ? 'bg-purple-600/20 border border-purple-500/30'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {convo.conversation_type === 'group' ? (
                              <Users className="w-4 h-4 text-purple-400" />
                            ) : (
                              <MessageCircle className="w-4 h-4 text-blue-400" />
                            )}
                            <span className="text-white font-medium text-sm">{convo.title}</span>
                          </div>
                          {unread > 0 && (
                            <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                              {unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/60 truncate">{convo.last_message_preview}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-white/40">
                            {new Date(convo.last_message_at).toLocaleTimeString()}
                          </span>
                          <span className="text-xs text-white/40">{convo.message_count} msgs</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages View */}
          <Card className="col-span-2 bg-white/5 backdrop-blur-xl border-white/10 flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b border-white/10">
                  <div>
                    <CardTitle className="text-white">{selectedConversation.title}</CardTitle>
                    <p className="text-sm text-white/60 mt-1">
                      {selectedConversation.participant_agent_ids.length} participants
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {conversationMessages.map(msg => {
                        const sender = agents.find(a => a.id === msg.sender_agent_id);
                        return (
                          <div key={msg.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-purple-300">
                                {sender?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">{sender?.name}</span>
                                <span className="text-xs text-white/40">
                                  {new Date(msg.created_date).toLocaleTimeString()}
                                </span>
                                {msg.context?.ai_generated && (
                                  <Badge variant="outline" className="text-xs">AI</Badge>
                                )}
                              </div>
                              <p className="text-sm text-white/80">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="p-4 border-t border-white/10">
                    <div className="flex gap-2 mb-2">
                      <Select 
                        onValueChange={(agentId) => {
                          const agent = agents.find(a => a.id === agentId);
                          if (agent) setNewMessage('');
                        }}
                      >
                        <SelectTrigger className="w-48 bg-slate-800 border-white/10 text-white">
                          <SelectValue placeholder="Send as..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedConversation.participant_agent_ids.map(agentId => {
                            const agent = agents.find(a => a.id === agentId);
                            return (
                              <SelectItem key={agentId} value={agentId}>
                                {agent?.name}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-slate-800 border-white/10 text-white"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const senderId = selectedConversation.participant_agent_ids[0];
                            handleSendMessage(senderId, false);
                          }
                        }}
                      />
                      {selectedConversation.participant_agent_ids.map(agentId => (
                        <Button
                          key={agentId}
                          onClick={() => handleSendMessage(agentId, selectedConversation.conversation_type === 'direct')}
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-700"
                          title={`Send as ${agents.find(a => a.id === agentId)?.name}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}