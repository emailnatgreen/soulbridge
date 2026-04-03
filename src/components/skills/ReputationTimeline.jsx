import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Search, Activity, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const EVENT_COLORS = {
  project_completed: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  proposal_approved: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  endorsement_received: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  skill_validated: 'bg-teal-900/40 text-teal-300 border-teal-700/40',
  milestone_achieved: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  violation_committed: 'bg-red-900/40 text-red-300 border-red-700/40',
  warning_issued: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  mentorship_provided: 'bg-pink-900/40 text-pink-300 border-pink-700/40',
};

export default function ReputationTimeline({ events = [], agents = [] }) {
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');

  const agentMap = {};
  agents.forEach(a => { agentMap[a.id] = a; });

  const filtered = events.filter(e => {
    if (agentFilter !== 'all' && e.agent_id !== agentFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const agentName = agentMap[e.agent_id]?.name || '';
      if (!e.description?.toLowerCase().includes(q) && !agentName.toLowerCase().includes(q) && !e.event_type?.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Compute running totals per agent
  const agentTotals = {};
  events.forEach(e => {
    agentTotals[e.agent_id] = (agentTotals[e.agent_id] || 0) + (e.impact || 0);
  });

  const relevantAgents = agents.filter(a => events.some(e => e.agent_id === a.id));

  return (
    <div className="space-y-4">
      {/* Top agents summary */}
      {relevantAgents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {relevantAgents
            .sort((a, b) => (agentTotals[b.id] || 0) - (agentTotals[a.id] || 0))
            .slice(0, 8)
            .map(agent => {
              const total = agentTotals[agent.id] || 0;
              return (
                <button key={agent.id} onClick={() => setAgentFilter(agentFilter === agent.id ? 'all' : agent.id)}
                  className={`p-3 rounded-xl border transition-all text-left ${agentFilter === agent.id ? 'bg-purple-500/20 border-purple-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {agent.avatar_url ? (
                      <img src={agent.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs font-medium text-white truncate">{agent.name}</span>
                  </div>
                  <div className={`text-sm font-bold ${total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {total >= 0 ? '+' : ''}{total}
                  </div>
                </button>
              );
            })}
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {relevantAgents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No reputation events found</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(event => {
          const agent = agentMap[event.agent_id];
          const colorClass = EVENT_COLORS[event.event_type] || 'bg-slate-800/40 text-slate-300 border-slate-700/40';
          const isPositive = (event.impact || 0) >= 0;

          return (
            <Card key={event.id} className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`text-xs border ${colorClass}`}>{event.event_type?.replace(/_/g, ' ')}</Badge>
                    <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{event.impact}
                    </span>
                    {event.verified && <Badge className="text-xs bg-emerald-900/30 text-emerald-400 border-emerald-600/30">Verified</Badge>}
                  </div>
                  <p className="text-sm text-slate-300">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                    <span>{agent?.name || event.agent_id}</span>
                    {event.category && <><span>·</span><span>{event.category}</span></>}
                    {event.created_date && <><span>·</span><span>{format(parseISO(event.created_date), 'MMM d, yyyy HH:mm')}</span></>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}