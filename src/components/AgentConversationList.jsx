import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AgentConversationList({ agents, allMessages, selectedAgent, onSelectAgent, currentDID }) {
  // Calculate unread and recent messages for each agent
  const agentStats = useMemo(() => {
    return agents.map(agent => {
      // Filter messages based on DID identity if available, otherwise use agent ID
      const agentMessages = currentDID
        ? allMessages.filter(msg => {
            const fromDID = msg.from_agent_id === agent.id;
            const toDID = msg.to_agent_id === agent.id;
            return fromDID || toDID;
          })
        : allMessages.filter(
            msg => msg.from_agent_id === agent.id || msg.to_agent_id === agent.id
          );
      
      const unreadCount = agentMessages.filter(
        msg => msg.to_agent_id === agent.id && msg.status !== 'responded'
      ).length;

      const lastMessage = agentMessages[0]; // Already sorted by -created_date
      
      return {
        agent,
        messageCount: agentMessages.length,
        unreadCount,
        lastMessage,
        lastMessageTime: lastMessage?.created_date
      };
    });
  }, [agents, allMessages, currentDID]);

  const sortedAgents = [...agentStats].sort((a, b) => {
    // Sort by last message time, with unread messages prioritized
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    if (!a.lastMessageTime && !b.lastMessageTime) return 0;
    if (!a.lastMessageTime) return 1;
    if (!b.lastMessageTime) return -1;
    
    return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getRoleColor = (role) => {
    const colors = {
      guardian: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      creator: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      trader: 'bg-green-500/20 text-green-300 border-green-500/30',
      teacher: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      healer: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      scout: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      citizen: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[role] || colors.citizen;
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-light text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Agents ({agents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6">
          <div className="space-y-2 pb-4">
            {sortedAgents.map(({ agent, messageCount, unreadCount, lastMessage }) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-all duration-200",
                  "hover:bg-white/10 hover:border-purple-500/30",
                  selectedAgent?.id === agent.id
                    ? "bg-white/10 border-purple-500/50"
                    : "bg-white/5 border-white/10"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1 truncate">
                         <p className="text-white font-medium truncate">{agent.name}</p>
                         {currentDID && (
                           <span className="text-[9px] text-purple-400/60 flex-shrink-0">DID</span>
                         )}
                      {unreadCount > 0 && (
                        <Badge className="bg-pink-500 text-white text-xs px-1.5 py-0 h-5">
                          {unreadCount}
                        </Badge>
                      )}
                      </div>
                    <Badge className={cn("text-xs border", getRoleColor(agent.role))}>
                      {agent.role}
                    </Badge>
                  </div>
                  <MessageCircle className="w-4 h-4 text-purple-400/60 flex-shrink-0 mt-1" />
                </div>
                
                {lastMessage && (
                  <div className="text-xs">
                    <p className="text-white/50 truncate mb-1">
                      {(lastMessage.message || lastMessage.content || '').substring(0, 50)}...
                    </p>
                    <p className="text-white/30">{formatTime(lastMessage.created_date)}</p>
                  </div>
                )}
                
                {messageCount > 0 && (
                  <div className="text-xs text-purple-300/60 mt-2">
                    {messageCount} message{messageCount !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))}
            
            {agents.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No agents available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}