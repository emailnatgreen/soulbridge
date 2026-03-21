import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, UserPlus, Loader2 } from 'lucide-react';

export default function AddAgentModal({ onAdd, onClose, alreadyAdded = [] }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    console.log('[AddAgentModal] Component mounted, fetching agents...');
    const fetchAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[AddAgentModal] Calling base44.entities.Agent.list()');
        const list = await base44.entities.Agent.list('-honor_score', 100);
        console.log('[AddAgentModal] Raw result:', list);
        console.log('[AddAgentModal] Is array?', Array.isArray(list));
        console.log('[AddAgentModal] Length:', list?.length);
        setAgents(list || []);
        setLoading(false);
      } catch (err) {
        console.error('[AddAgentModal] ERROR fetching agents:', err);
        setError('Failed to load agents. Please try again.');
        setAgents([]);
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const filtered = agents.filter(a =>
    !alreadyAdded.includes(a.id) &&
    (a.name?.toLowerCase().includes(search.toLowerCase()) ||
     a.role?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-purple-400" />
          <h3 className="text-white text-sm font-semibold">Invite Agent to Chat</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/10 h-8 w-8">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="text-xs text-white/40 px-4 pt-3 pb-2">
        Agent joins from this point — no access to prior history.
      </p>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 pl-9 h-9 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pointer-events-auto">
         {loading && (
           <div className="flex justify-center pt-8">
             <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
           </div>
         )}
         {error && !loading && (
           <div className="text-center pt-8">
             <p className="text-red-400/70 text-xs mb-3">{error}</p>
             <Button size="sm" onClick={() => window.location.reload()} className="text-xs bg-purple-600 hover:bg-purple-700">
               Retry
             </Button>
           </div>
         )}
         {!loading && !error && filtered.length === 0 && (
           <p className="text-white/30 text-xs text-center pt-8">{agents.length === 0 ? 'No agents available' : 'No agents found'}</p>
         )}
        {filtered.map(agent => (
          <button
            key={agent.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              console.log('[AddAgentModal] Button clicked for agent:', agent.name, agent.id);
              setAdding(true);
              onAdd(agent)
                .catch(err => {
                  console.error('[AddAgentModal] ERROR adding agent:', {
                    agentId: agent.id,
                    agentName: agent.name,
                    error: err?.message || err,
                    stack: err?.stack
                  });
                  alert(`Failed to add ${agent.name}: ${err?.message || 'Unknown error'}`);
                })
                .finally(() => {
                  console.log('[AddAgentModal] onAdd callback completed for agent:', agent.id);
                  setAdding(false);
                });
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all text-left group pointer-events-auto"
          >
            {agent.avatar_url ? (
              <img src={agent.avatar_url} alt={agent.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
                {agent.name?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{agent.name}</p>
              <p className="text-white/40 text-xs capitalize truncate">{agent.role} · Honor {agent.honor_score ?? 100}</p>
            </div>
            <UserPlus className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}