import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, MessageSquare, Shield, Zap } from 'lucide-react';
import MessageActionPanel from './MessageActionPanel';

export default function AgentChatMessage({ message, isFromUser, fromAgentName, recipientAgent, fromAgent }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const statusIcon = {
    sent: <Clock className="w-3 h-3" />,
    received: <CheckCircle2 className="w-3 h-3" />,
    responded: <MessageSquare className="w-3 h-3" />
  };

  const statusColor = {
    sent: 'text-yellow-400',
    received: 'text-blue-400',
    responded: 'text-green-400'
  };

  return (
    <div className={cn(
      "flex flex-col gap-1",
      isFromUser ? "items-end" : "items-start"
    )}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-white/40">{fromAgentName}</span>
        <span className="text-xs text-white/30">{formatTime(message.created_date)}</span>
      </div>
      
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg space-y-3",
        isFromUser
          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
          : "bg-white/10 backdrop-blur-xl border border-white/10 text-white"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
        
        {message.response && !isFromUser && (
          <div className="pt-3 border-t border-white/20">
            <p className="text-xs text-purple-200 mb-1">Response:</p>
            <p className="text-sm leading-relaxed text-purple-100">{message.response}</p>
          </div>
        )}
        
        {!isFromUser && recipientAgent && fromAgent && (
          <div className="pt-2 border-t border-white/20">
            <MessageActionPanel
              message={message}
              recipientAgent={recipientAgent}
              fromAgent={fromAgent}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1 flex-wrap">
        <div className={cn("flex items-center gap-1", statusColor[message.status])}>
          {statusIcon[message.status]}
          <span className="text-xs capitalize">{message.status}</span>
        </div>
        {message.from_did && (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] flex items-center gap-1 h-5">
            <Shield className="w-2.5 h-2.5" /> DID
          </Badge>
        )}
        {message.ku_generated && (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px] flex items-center gap-1 h-5">
            <Zap className="w-2.5 h-2.5" /> KU
          </Badge>
        )}
        {message.metadata && (
          <span className="text-xs text-white/30">•</span>
        )}
      </div>
    </div>
  );
}