import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Users, Bot, Fingerprint } from 'lucide-react';

export default function AgentPickerPanel({ agents = [], selectedAgents = [], onToggleAgent, onClearAll }) {
  const [search, setSearch] = useState('');

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedIds = selectedAgents.map(a => a.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white text-sm font-medium flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-purple-400" />
          Select Agents
        </h3>
        {selectedAgents.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearAll} className="text-white/40 hover:text-white/70 text-xs h-6">
            Clear ({selectedAgents.length})
          </Button>
        )}
      </div>

      {/* Selected chips */}
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAgents.map(a => (
            <Badge
              key={a.id}
              className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs cursor-pointer hover:bg-purple-500/30"
              onClick={() => onToggleAgent(a)}
            >
              {a.name} ×
            </Badge>
          ))}
          {selectedAgents.length > 1 && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
              <Users className="w-3 h-3 mr-0.5" /> Group Debate
            </Badge>
          )}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="pl-8 bg-white/5 border-white/10 text-white text-xs h-8"
        />
      </div>

      <ScrollArea className="h-[200px] lg:h-[280px]">
        <div className="space-y-1 pr-2">
          {filtered.map(agent => {
            const isSelected = selectedIds.includes(agent.id);
            return (
              <button
                key={agent.id}
                onClick={() => onToggleAgent(agent)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                  isSelected
                    ? 'bg-purple-600/20 border border-purple-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  {agent.avatar_url ? (
                    <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">{agent.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-white/40 text-[10px] capitalize">{agent.role}</span>
                    {agent.classic_address && (
                      <Fingerprint className="w-2.5 h-2.5 text-green-400" title="Has DID" />
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}