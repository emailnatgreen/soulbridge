import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, MessageSquare } from 'lucide-react';

export default function AgentChatMessage({ message, isFromUser, fromAgentName }) {
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
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
        isFromUser
          ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white"
          : "bg-white/10 backdrop-blur-xl border border-white/10 text-white"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
        
        {message.response && !isFromUser && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-purple-200 mb-1">Response:</p>
            <p className="text-sm leading-relaxed text-purple-100">{message.response}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        <div className={cn("flex items-center gap-1", statusColor[message.status])}>
          {statusIcon[message.status]}
          <span className="text-xs capitalize">{message.status}</span>
        </div>
        {message.metadata && (
          <span className="text-xs text-white/30">•</span>
        )}
      </div>
    </div>
  );
}