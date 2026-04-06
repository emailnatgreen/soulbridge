import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import AgentChatMessage from './AgentChatMessage';
import AgentStateDisplay from './AgentStateDisplay';
import { cn } from "@/lib/utils";

export default function AgentChatWindow({ selectedAgent, allMessages, currentDID }) {
  const [message, setMessage] = useState('');
  const [fromAgent, setFromAgent] = useState(null);
  const [agentState, setAgentState] = useState(null);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Set sender agent based on DID identity
  useEffect(() => {
    const fetchUserAgent = async () => {
      if (currentDID?.agent_id) {
        try {
          const agent = await base44.entities.Agent.get(currentDID.agent_id);
          if (agent) setFromAgent(agent);
        } catch (e) {
          const agents = await base44.entities.Agent.list();
          const axi = agents.find(a => a.name.toLowerCase() === 'axi');
          if (axi) setFromAgent(axi);
        }
      } else {
        const agents = await base44.entities.Agent.list();
        const axi = agents.find(a => a.name.toLowerCase() === 'axi');
        if (axi) {
          setFromAgent(axi);
        } else if (agents.length > 0) {
          setFromAgent(agents[0]);
        }
      }
    };
    fetchUserAgent();
  }, [currentDID]);

  // Fetch agent state
  useEffect(() => {
    if (!selectedAgent) return;
    const fetchAgentState = async () => {
      try {
        const states = await base44.entities.AgentState.filter({ agent_id: selectedAgent.id }, '-created_date', 1);
        if (states.length > 0) setAgentState(states[0]);
      } catch (e) {
        // Silently fail if AgentState doesn't exist
      }
    };
    fetchAgentState();
  }, [selectedAgent]);

  // Filter messages between the two agents
  const conversationMessages = useMemo(() => {
    if (!fromAgent) return [];
    
    return allMessages.filter(msg =>
      (msg.from_agent_id === fromAgent.id && msg.to_agent_id === selectedAgent.id) ||
      (msg.from_agent_id === selectedAgent.id && msg.to_agent_id === fromAgent.id)
    ).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [allMessages, fromAgent, selectedAgent]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      // Send user message
      await base44.functions.invoke('sendAgentMessage', data);
      
      // If recipient is Axi, generate her persona-driven response
      if (selectedAgent?.name?.toLowerCase() === 'axi') {
        try {
          await base44.functions.invoke('axiRespond', {
            from_agent_id: selectedAgent.id,
            to_agent_id: fromAgent?.id,
            user_message: data.message,
            conversation_context: conversationMessages.slice(-5) // Last 5 messages for context
          });
        } catch (err) {
          console.error('Failed to generate Axi response:', err);
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      setMessage('');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['agent-messages'] });
      }, 500);
      toast.success('Message sent!');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    sendMessageMutation.mutate({
      from_agent_id: fromAgent?.id || null,
      to_agent_id: selectedAgent.id,
      message: message.trim(),
      ...(currentDID && { from_did: currentDID.did || null })
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  // Don't block on fromAgent — just disable send until resolved

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b border-white/10">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-12 h-12 rounded-full bg-gradient-to-br border-2 flex items-center justify-center",
              getRoleColor(selectedAgent.role)
            )}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg font-medium text-white truncate">{selectedAgent.name}</CardTitle>
              <p className="text-xs text-purple-300/60 truncate">{selectedAgent.role} • {selectedAgent.purpose}</p>
              {currentDID && (
                <p className="text-[10px] text-purple-400/60 mt-0.5">via {currentDID.did?.slice(0, 16)}...</p>
              )}
            </div>
          </div>
          <Badge className={cn(
            "border",
            selectedAgent.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
          )}>
            {selectedAgent.status}
          </Badge>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          <div className="py-6 space-y-4">
            {conversationMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-white/60 mb-2">No messages yet</p>
                <p className="text-white/40 text-sm">Start a conversation with {selectedAgent.name}</p>
              </div>
            ) : (
              conversationMessages.map((msg) => (
                <AgentChatMessage
                  key={msg.id}
                  message={msg}
                  isFromUser={msg.from_agent_id === fromAgent.id}
                  fromAgentName={msg.from_agent_id === fromAgent.id ? fromAgent.name : selectedAgent.name}
                  recipientAgent={selectedAgent}
                  fromAgent={fromAgent}
                />
              ))
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${selectedAgent.name}...`}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 resize-none min-h-[60px] max-h-[120px]"
              disabled={sendMessageMutation.isPending}
            />
            <p className="text-xs text-white/30 mt-1">Press Enter to send, Shift+Enter for new line</p>
          </div>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending || !selectedAgent}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 h-[60px] px-6"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}