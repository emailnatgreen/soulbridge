import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageSquare, Archive, PanelLeftClose, PanelLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import AgentPickerPanel from '@/components/comms/AgentPickerPanel';
import StaticChatPanel from '@/components/comms/StaticChatPanel';
import ChatBundleList from '@/components/comms/ChatBundleList';

export default function AgentChat() {
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('agents');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-chat'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  const { data: bundles = [], refetch: refetchBundles } = useQuery({
    queryKey: ['chat-bundles'],
    queryFn: () => base44.entities.Memory.filter(
      { type: 'conversation_snippet', agent_id: 'chat-bundle' },
      '-created_date',
      50
    ),
  });

  const handleToggleAgent = useCallback((agent) => {
    setSelectedAgents(prev => {
      const exists = prev.find(a => a.id === agent.id);
      if (exists) return prev.filter(a => a.id !== agent.id);
      return [...prev, agent];
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedAgents([]);
  }, []);

  const handleSaveBundle = useCallback(async (bundleData) => {
    await base44.entities.Memory.create({
      agent_id: 'chat-bundle',
      type: 'conversation_snippet',
      content: JSON.stringify(bundleData),
      keywords: [
        'chat-bundle',
        ...(bundleData.participant_ids || []),
      ],
      context: bundleData.title,
      importance: 5,
      related_entity_id: bundleData.conversation_id,
      related_entity_type: 'conversation',
    });
    toast.success('Conversation saved');
    refetchBundles();
  }, [refetchBundles]);

  const handleLoadBundle = useCallback((bundle) => {
    try {
      const data = JSON.parse(bundle.content);
      const agentIds = data.participant_ids || [];
      const matched = agents.filter(a => agentIds.includes(a.id));
      if (matched.length > 0) {
        setSelectedAgents(matched);
        toast.success(`Loaded: ${bundle.context || 'conversation'}`);
      } else {
        toast.error('Could not find agents from this bundle');
      }
    } catch (_) {
      toast.error('Failed to load bundle');
    }
  }, [agents]);

  const handleDeleteBundle = useCallback(async (bundleId) => {
    await base44.entities.Memory.delete(bundleId);
    toast.success('Bundle deleted');
    refetchBundles();
  }, [refetchBundles]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-gradient-to-br from-slate-950 via-purple-950/80 to-slate-950 overflow-hidden">
      {/* Compact Header */}
      <ChatHeader
        selectedAgents={selectedAgents}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-72 lg:w-80 flex-shrink-0 border-r border-white/10 bg-black/20 flex flex-col overflow-hidden">
            <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col h-full">
              <TabsList className="bg-white/5 border-b border-white/10 rounded-none h-10 p-0 px-2 gap-1 flex-shrink-0">
                <TabsTrigger value="agents" className="text-[11px] data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 rounded-md h-7 px-3">
                  Agents
                </TabsTrigger>
                <TabsTrigger value="history" className="text-[11px] data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-200 rounded-md h-7 px-3 relative">
                  History
                  {bundles.length > 0 && (
                    <span className="ml-1.5 bg-purple-500/40 text-purple-200 text-[9px] px-1.5 py-0 rounded-full">{bundles.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="agents" className="flex-1 overflow-y-auto p-3 mt-0">
                <AgentPickerPanel
                  agents={agents}
                  selectedAgents={selectedAgents}
                  onToggleAgent={handleToggleAgent}
                  onClearAll={handleClearAll}
                />
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-y-auto p-3 mt-0">
                <ChatBundleList
                  bundles={bundles}
                  agents={agents}
                  onLoad={handleLoadBundle}
                  onDelete={handleDeleteBundle}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Chat Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <StaticChatPanel
            selectedAgents={selectedAgents}
            agents={agents}
            onSaveBundle={handleSaveBundle}
          />
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ selectedAgents, sidebarOpen, onToggleSidebar }) {
  const isGroup = selectedAgents.length > 1;

  return (
    <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Sidebar toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleSidebar}
          className="text-white/50 hover:text-white h-8 w-8 flex-shrink-0"
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>

        {/* Nav breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <Link to="/agents" className="text-white/40 hover:text-purple-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Village</span>
          </Link>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white font-medium">Agent Chat</span>
          </div>
        </div>

        {/* Right side status */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {selectedAgents.length > 0 && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
              {isGroup ? `${selectedAgents.length} agents · Group` : selectedAgents[0]?.name}
            </Badge>
          )}
          <Link to="/home">
            <Button size="icon" variant="ghost" className="text-white/40 hover:text-white h-7 w-7">
              <Home className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}