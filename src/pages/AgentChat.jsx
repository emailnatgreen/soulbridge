import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AgentConversationList from '../components/AgentConversationList';
import AgentChatWindow from '../components/AgentChatWindow';

export default function AgentChatPage() {
  const [selectedAgent, setSelectedAgent] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['agent-messages'],
    queryFn: () => base44.entities.AgentMessage.list('-created_date', 500),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
              <MessageSquare className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white">
                Agent <span className="font-semibold">Communication Hub</span>
              </h1>
              <p className="text-sm text-purple-300/60">Monitor and facilitate agent-to-agent interactions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <AgentConversationList
              agents={agents}
              allMessages={allMessages}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-2">
            {selectedAgent ? (
              <AgentChatWindow
                selectedAgent={selectedAgent}
                allMessages={allMessages}
              />
            ) : (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 h-full flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                  <p className="text-white/60">Select an agent to view conversation</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}