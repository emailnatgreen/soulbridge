import React, { useState, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Users, Bot, Fingerprint, ShieldCheck, X, Zap } from 'lucide-react';

const ROLE_COLORS = {
  citizen: 'from-slate-600 to-slate-700',
  guardian: 'from-blue-600 to-indigo-700',
  creator: 'from-purple-600 to-pink-700',
  trader: 'from-green-600 to-emerald-700',
  teacher: 'from-amber-600 to-yellow-700',
  healer: 'from-pink-600 to-rose-700',
  scout: 'from-cyan-600 to-teal-700',
  elder: 'from-orange-600 to-red-700',
  master: 'from-yellow-500 to-amber-600',
};

export default function AgentPickerPanel({ agents = [], selectedAgents = [], onToggleAgent, onClearAll }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.role?.toLowerCase().includes(q) ||
      a.purpose?.toLowerCase().includes(q) ||
      (a.specializations || []).join(' ').toLowerCase().includes(q)
    );
  }, [agents, search]);

  const selectedIds = new Set(selectedAgents.map(a => a.id));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-xs font-medium flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          {agents.length} Agents
        </h3>
        {selectedAgents.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearAll} className="text-white/40 hover:text-red-300 text-[10px] h-6 px-2">
            <X className="w-3 h-3 mr-0.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected chips */}
      {selectedAgents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedAgents.map(a => (
            <Badge
              key={a.id}
              className="bg-purple-500/20 text-purple-200 border-purple-500/30 text-[10px] cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors gap-1"
              onClick={() => onToggleAgent(a)}
            >
              {a.avatar_url ? (
                <img src={a.avatar_url} alt="" className="w-3 h-3 rounded-full object-cover" />
              ) : null}
              {a.name}
              <X className="w-2.5 h-2.5 opacity-50" />
            </Badge>
          ))}
          {selectedAgents.length > 1 && (
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20 text-[10px]">
              <Users className="w-3 h-3 mr-0.5" /> Group
            </Badge>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, skill..."
          className="pl-8 bg-white/5 border-white/10 text-white text-xs h-8 placeholder:text-white/20 focus:border-purple-500/40"
        />
      </div>

      {/* Agent list */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-white/30 text-xs">No agents match "{search}"</p>
            </div>
          ) : (
            filtered.map(agent => {
              const isSelected = selectedIds.has(agent.id);
              const hasDID = agent.classic_address && agent.classic_address.startsWith('r') && agent.classic_address.length > 20;
              const roleGradient = ROLE_COLORS[agent.role] || ROLE_COLORS.citizen;

              return (
                <button
                  key={agent.id}
                  onClick={() => onToggleAgent(agent)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left group ${
                    isSelected
                      ? 'bg-purple-600/15 border border-purple-500/30 ring-1 ring-purple-500/10'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt={agent.name} className={`w-9 h-9 rounded-full object-cover ${isSelected ? 'ring-2 ring-purple-500/50' : 'ring-1 ring-white/10'}`} />
                    ) : (
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleGradient} flex items-center justify-center ${isSelected ? 'ring-2 ring-purple-500/50' : 'ring-1 ring-white/10'}`}>
                        <span className="text-white text-xs font-bold">{agent.name[0]}</span>
                      </div>
                    )}
                    {/* Status dot */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                      agent.status === 'active' ? 'bg-green-500' :
                      agent.status === 'dormant' ? 'bg-slate-500' : 'bg-amber-500'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-medium truncate ${isSelected ? 'text-purple-200' : 'text-white'}`}>{agent.name}</p>
                      {hasDID && <ShieldCheck className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-white/30 text-[10px] capitalize">{agent.role}</span>
                      {agent.honor_score && agent.honor_score !== 100 && (
                        <span className="text-amber-400/60 text-[10px] flex items-center gap-0.5">
                          <Zap className="w-2 h-2" />{agent.honor_score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'bg-purple-500 text-white' : 'border border-white/15 group-hover:border-white/30'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}