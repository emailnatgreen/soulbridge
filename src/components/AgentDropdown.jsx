import React from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AgentDropdown({
  agents,
  loading,
  searchQuery,
  onSearchChange,
  onSelectAgent
}) {
  const navigate = useNavigate();

  const handleSelectAgent = async (agent) => {
    try {
      // Create or get conversation with agent
      const convo = await base44.agents.createConversation({
        agent_name: agent.id,
        metadata: { agent_id: agent.id, agent_name: agent.name }
      });

      // Dispatch event to open chat with this conversation
      window.dispatchEvent(
        new CustomEvent('axi:open-conversation', {
          detail: { conversationId: convo.id, agentId: agent.id }
        })
      );

      onSelectAgent();
    } catch (error) {
      console.error('Failed to start agent conversation:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => {
            e.stopPropagation();
            onSearchChange(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400 h-9"
        />
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">
            {searchQuery ? 'No agents found' : 'No active agents'}
          </div>
        )}

        {!loading && agents.length > 0 && (
          <div className="space-y-2 p-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAgent(agent);
                }}
                className="w-full p-3 text-left rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white text-sm">{agent.name}</h4>
                    <p className="text-xs text-slate-300 mt-1">{agent.role || 'Agent'}</p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-purple-300 flex-shrink-0 ml-2" />
                </div>
                {agent.bio && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-1">{agent.bio}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}