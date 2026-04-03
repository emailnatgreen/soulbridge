import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Archive, Users, Shield, Bot } from 'lucide-react';
import { useIdentity } from '@/hooks/useIdentity';
import BackToHomeButton from '../components/BackToHomeButton';
import AgentPickerPanel from '../components/comms/AgentPickerPanel';
import ChatBundleList from '../components/comms/ChatBundleList';
import StaticChatPanel from '../components/comms/StaticChatPanel';
import { toast } from 'sonner';

export default function AgentCommsDashboard() {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const { didSignal, isAdmin } = useIdentity();
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-comms'],
    queryFn: () => base44.entities.Agent.list('-created_date', 200),
  });

  const { data: bundles = [] } = useQuery({
    queryKey: ['chat-bundles'],
    queryFn: () => base44.entities.Synthesis.filter({ source_type: 'memory_bundle' }, '-created_date', 100),
  });

  const saveBundleMutation = useMutation({
    mutationFn: (data) => base44.entities.Synthesis.create({
      source_type: 'memory_bundle',
      agent_id: data.participant_ids?.[0] || 'user',
      bundle_signature: `chat-${Date.now()}`,
      summary: data.summary || '',
      themes: data.participant_ids || [],
      status: 'completed',
      source_memory_ids: [],
      entities: [{
        name: data.title,
        type: 'chat_bundle',
        salience: data.message_count || 0,
        notes: JSON.stringify({
          participant_ids: data.participant_ids,
          message_count: data.message_count,
          conversation_id: data.conversation_id,
          messages: data.messages?.slice(-50),
        }),
      }],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-bundles']);
      toast.success('Chat bundle saved');
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: (id) => base44.entities.Synthesis.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-bundles']);
      toast.success('Bundle deleted');
    },
  });

  const handleToggleAgent = (agent) => {
    setSelectedAgents(prev =>
      prev.find(a => a.id === agent.id)
        ? prev.filter(a => a.id !== agent.id)
        : [...prev, agent]
    );
  };

  const handleLoadBundle = (bundle) => {
    const entity = bundle.entities?.[0];
    if (!entity?.notes) return;
    const data = JSON.parse(entity.notes);
    const bundleAgents = (data.participant_ids || [])
      .map(id => agents.find(a => a.id === id))
      .filter(Boolean);
    if (bundleAgents.length > 0) {
      setSelectedAgents(bundleAgents);
    }
    toast.success(`Loaded "${entity.name}" — ${data.message_count} messages`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackToHomeButton />
              {didSignal?.isVerified && (
                <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-green-300 text-xs">DID Active</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                <Bot className="w-3 h-3 mr-1" /> {agents.length} Agents
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">
                <Archive className="w-3 h-3 mr-1" /> {bundles.length} Bundles
              </Badge>
            </div>
          </div>
          <div className="mt-2">
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Agent <span className="font-semibold">Communications</span>
            </h1>
            <p className="text-xs text-purple-300/60 mt-0.5">Chat with agents, run group debates, and save bundles</p>
          </div>
        </div>
      </div>

      {/* Main Content — split layout */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" style={{ minHeight: 'calc(100vh - 160px)' }}>

          {/* LEFT — Agent Picker + Bundles */}
          <div className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="pt-5 pb-4">
                <AgentPickerPanel
                  agents={agents}
                  selectedAgents={selectedAgents}
                  onToggleAgent={handleToggleAgent}
                  onClearAll={() => setSelectedAgents([])}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Archive className="w-4 h-4 text-emerald-400" />
                  Saved Chat Bundles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChatBundleList
                  bundles={bundles}
                  agents={agents}
                  onLoad={handleLoadBundle}
                  onDelete={(id) => deleteBundleMutation.mutate(id)}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Static Chat Panel */}
          <Card className="bg-white/[0.03] backdrop-blur-xl border-white/10 flex flex-col overflow-hidden" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 160px)' }}>
            <StaticChatPanel
              selectedAgents={selectedAgents}
              agents={agents}
              onSaveBundle={(data) => saveBundleMutation.mutate(data)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}