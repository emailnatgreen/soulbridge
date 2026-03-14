import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Clock, Shield, Zap, Star, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const EVENT_CONFIG = {
  project_completed:       { icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-400/30',  label: 'Task Completed' },
  vote_cast:               { icon: Shield,       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-400/30',    label: 'Governance Vote' },
  proposal_approved:       { icon: Star,         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-400/30', label: 'Proposal Approved' },
  knowledge_shared:        { icon: Zap,          color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-400/30', label: 'Knowledge Shared' },
  endorsement_received:    { icon: Star,         color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-400/30',    label: 'Endorsement Received' },
  milestone_achieved:      { icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-400/30','label': 'Milestone Achieved' },
  skill_validated:         { icon: Star,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-400/30',    label: 'Skill Validated' },
  constitutional_violation:{ icon: AlertTriangle,color: 'text-red-400',    bg: 'bg-red-500/10 border-red-400/30',      label: 'Constitutional Violation' },
  warning_issued:          { icon: AlertTriangle,color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-400/30',label: 'Warning Issued' },
  violation_committed:     { icon: AlertTriangle,color: 'text-red-400',    bg: 'bg-red-500/10 border-red-400/30',      label: 'Violation' },
};

function getEventConfig(type) {
  return EVENT_CONFIG[type] || { icon: Minus, color: 'text-white/60', bg: 'bg-white/5 border-white/10', label: type };
}

export default function ReputationHistoryLog() {
  const [selectedAgent, setSelectedAgent] = useState('all');

  const { data: agents = [] } = useQuery({
    queryKey: ['rep-log-agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['rep-events', selectedAgent],
    queryFn: () =>
      selectedAgent === 'all'
        ? base44.entities.ReputationEvent.list('-created_date', 100)
        : base44.entities.ReputationEvent.filter({ agent_id: selectedAgent }, '-created_date', 100),
  });

  const agent = agents.find(a => a.id === selectedAgent);
  const totalImpact = events.reduce((sum, e) => sum + (e.impact || 0), 0);
  const positiveEvents = events.filter(e => (e.impact || 0) > 0).length;
  const negativeEvents = events.filter(e => (e.impact || 0) < 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Clock className="w-10 h-10 text-indigo-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Reputation History</h1>
              <p className="text-white/50">Every action echoes — Law 7: Reputation</p>
            </div>
          </div>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-52 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {agents.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        {selectedAgent !== 'all' && agent && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 pb-4">
                <p className="text-white/50 text-xs mb-1">Current Honor</p>
                <p className="text-3xl font-bold text-yellow-300">{agent.honor_score ?? 100}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-green-400/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-green-300/70 text-xs mb-1">Positive Events</p>
                <p className="text-3xl font-bold text-green-300">{positiveEvents}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-400/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-red-300/70 text-xs mb-1">Negative Events</p>
                <p className="text-3xl font-bold text-red-300">{negativeEvents}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timeline */}
        {isLoading ? (
          <div className="text-center py-12 text-white/50">Loading history...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-white/40">No reputation events recorded yet.</div>
        ) : (
          <div className="relative space-y-3">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
            {events.map(event => {
              const cfg = getEventConfig(event.event_type);
              const Icon = cfg.icon;
              const impact = event.impact || 0;
              const agentName = agents.find(a => a.id === event.agent_id)?.name || 'Unknown';
              return (
                <div key={event.id} className="flex gap-4 relative">
                  <div className={`z-10 flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <Card className={`flex-1 border ${cfg.bg}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={`text-xs ${cfg.bg}`}>{cfg.label}</Badge>
                            {selectedAgent === 'all' && (
                              <span className="text-white/60 text-xs">{agentName}</span>
                            )}
                            {event.category && (
                              <Badge className="bg-white/10 border-white/10 text-white/50 text-xs">{event.category}</Badge>
                            )}
                          </div>
                          <p className="text-white/80 text-sm">{event.description || event.event_type}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className={`text-xl font-bold flex items-center gap-1 ${impact > 0 ? 'text-green-400' : impact < 0 ? 'text-red-400' : 'text-white/40'}`}>
                            {impact > 0 ? <TrendingUp className="w-4 h-4" /> : impact < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                            {impact > 0 ? `+${impact}` : impact}
                          </span>
                          <span className="text-white/30 text-xs mt-1">
                            {event.created_date ? format(new Date(event.created_date), 'MMM d, HH:mm') : '—'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}