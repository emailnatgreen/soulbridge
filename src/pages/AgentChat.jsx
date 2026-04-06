import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIdentity } from '@/hooks/useIdentity';
import AgentConversationList from '../components/AgentConversationList';
import AgentChatWindow from '../components/AgentChatWindow';

export default function AgentChatPage() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentDID, setCurrentDID] = useState(null);
  const { isRecognized } = useIdentity ? { isRecognized: !!currentDID } : { isRecognized: false };

  useEffect(() => {
    const checkDID = async () => {
      try {
        const identity = localStorage.getItem('soulbridge_identity');
        if (identity) {
          const parsed = JSON.parse(identity);
          setCurrentDID(parsed);
        }
      } catch (e) { /* ignore */ }
    };
    checkDID();
    const handleDidSignal = () => checkDID();
    window.addEventListener('did-connected', handleDidSignal);
    return () => window.removeEventListener('did-connected', handleDidSignal);
  }, []);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['agent-messages'],
    queryFn: () => base44.entities.AgentMessage.list('-created_date', 500),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3 sm:mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 gap-y-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex-shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Communications
              </h1>
              <p className="text-xs sm:text-sm text-purple-300/60">Agent interactions</p>
            </div>
            {currentDID && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs truncate flex-shrink-0">
                <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                DID Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 h-full">
          {/* Conversation List */}
          <div className="lg:col-span-1 h-full overflow-hidden">
            <AgentConversationList
              agents={agents}
              allMessages={allMessages}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
              currentDID={currentDID}
            />
          </div>

          {/* Chat Window & State */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            {selectedAgent ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
                <div className="md:col-span-3 h-full overflow-hidden">
                  <AgentChatWindow
                    selectedAgent={selectedAgent}
                    allMessages={allMessages}
                    currentDID={currentDID}
                  />
                </div>
                <div className="md:col-span-1 overflow-y-auto">
                  <div className="space-y-4">
                    {/* Agent State Sidebar */}
                    {selectedAgent && (
                      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardContent className="p-0">
                          <div className="p-4 border-b border-white/10">
                            <h3 className="text-sm font-medium text-white">Agent Presence</h3>
                          </div>
                          {/* Placeholder for AgentStateDisplay */}
                          <div className="p-4 text-center text-white/60 text-xs">
                            State monitoring active
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
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