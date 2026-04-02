import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X, UserPlus } from 'lucide-react';

// SoulBridge platform agents (defined in agents/ folder)
const PLATFORM_AGENTS = [
  { id: 'platform:axi',              name: 'Axi',              role: 'guardian',  purpose: 'Village AI Guide and guardian of SoulBridge', _isPlatformAgent: true, _agentName: 'axi' },
  { id: 'platform:lore_node',        name: 'Lore Node',        role: 'elder',     purpose: 'Keeper of SoulBridge history and lore', _isPlatformAgent: true, _agentName: 'lore_node' },
  { id: 'platform:truth_weaver',     name: 'Truth Weaver',     role: 'guardian',  purpose: 'Validator of facts and constitutional alignment', _isPlatformAgent: true, _agentName: 'truth_weaver' },
  { id: 'platform:alignment_agent',  name: 'Alignment Agent',  role: 'guardian',  purpose: 'Ensures Village actions align with the Laws of Honour', _isPlatformAgent: true, _agentName: 'alignment_agent' },
  { id: 'platform:code_node',        name: 'Code Node',        role: 'creator',   purpose: 'Technical architect and developer for the Village', _isPlatformAgent: true, _agentName: 'code_node' },
  { id: 'platform:ripple_architect', name: 'Ripple Architect', role: 'creator',   purpose: 'XRPL and DID infrastructure specialist', _isPlatformAgent: true, _agentName: 'ripple_architect' },
  { id: 'platform:epoch_architect',  name: 'Epoch Architect',  role: 'elder',     purpose: 'Strategist for long-term Village evolution', _isPlatformAgent: true, _agentName: 'epoch_architect' },
  { id: 'platform:market_weaver',    name: 'Market Weaver',    role: 'trader',    purpose: 'Economic and resource flow specialist', _isPlatformAgent: true, _agentName: 'market_weaver' },
];

export default function AgentPicker({ activeAgentIds = [], onAdd, onClose }) {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await base44.entities.Agent.list('-created_date', 500);
        // Merge: DB agents matching a platform agent get routing fields
        const platformByName = {};
        PLATFORM_AGENTS.forEach(p => { platformByName[p.name.toLowerCase()] = p; });
        const merged = (all || []).map(a => {
          const pm = platformByName[a.name?.toLowerCase()];
          if (pm) return { ...a, _isPlatformAgent: true, _agentName: pm._agentName };
          return a;
        });
        const dbNames = new Set((all || []).map(a => a.name?.toLowerCase()));
        const platformOnly = PLATFORM_AGENTS.filter(p => !dbNames.has(p.name.toLowerCase()));
        setAgents([...platformOnly, ...merged]);
    load();
  }, []);

  const filtered = agents.filter(a =>
    !activeAgentIds.includes(a.id) &&
    (a.name?.toLowerCase().includes(search.toLowerCase()) ||
     a.role?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (agent) => {
    setAdding(agent.id);
    await onAdd(agent);
    setAdding(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-purple-300">Add Agent to Chat</span>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-white/30" />
          <Input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-8 text-xs"
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-white/30 text-xs py-4">
            {search ? 'No agents found' : 'All agents already in chat'}
          </p>
        )}
        {filtered.map(agent => (
          <div
            key={agent.id}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 group"
          >
            <div className="flex items-center gap-2 min-w-0">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-200 text-xs font-bold">{agent.name?.[0]}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                <p className="text-white/40 text-xs truncate">{agent.role}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleAdd(agent)}
              disabled={adding === agent.id}
              className="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-500 text-white flex-shrink-0 ml-2"
            >
              {adding === agent.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <UserPlus className="w-3 h-3" />
              }
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}