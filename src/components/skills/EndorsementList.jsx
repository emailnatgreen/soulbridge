import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Star, Search, ShieldCheck, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function StarRating({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < value ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
      ))}
    </div>
  );
}

export default function EndorsementList({ endorsements = [], agents = [] }) {
  const [search, setSearch] = useState('');

  const agentMap = {};
  agents.forEach(a => { agentMap[a.id] = a; });

  const filtered = endorsements.filter(e => {
    const q = search.toLowerCase();
    if (!q) return true;
    const endorser = agentMap[e.endorser_agent_id]?.name || '';
    const endorsed = agentMap[e.endorsed_agent_id]?.name || '';
    return e.skill_name?.toLowerCase().includes(q) || endorser.toLowerCase().includes(q) || endorsed.toLowerCase().includes(q);
  });

  // Group by endorsed agent
  const grouped = {};
  filtered.forEach(e => {
    const key = e.endorsed_agent_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by agent name or skill..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No endorsements found</p>
        </div>
      )}

      {Object.entries(grouped).map(([agentId, items]) => {
        const agent = agentMap[agentId];
        return (
          <Card key={agentId} className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                {agent?.avatar_url ? (
                  <img src={agent.avatar_url} alt={agent.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-300" />
                  </div>
                )}
                <div>
                  <h4 className="text-white font-medium text-sm">{agent?.name || agentId}</h4>
                  <p className="text-xs text-slate-400">{items.length} endorsement{items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="space-y-2">
                {items.map(e => {
                  const endorser = agentMap[e.endorser_agent_id];
                  return (
                    <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-white">{e.skill_name}</span>
                          {e.skill_category && (
                            <Badge className="text-xs bg-slate-700 text-slate-300 border-slate-600">{e.skill_category.replace(/_/g, ' ')}</Badge>
                          )}
                          {e.verified_by_ai && (
                            <Badge className="text-xs bg-emerald-900/40 text-emerald-300 border-emerald-700/40">AI Verified</Badge>
                          )}
                        </div>
                        <StarRating value={e.proficiency_level} />
                        {e.context && <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{e.context}</p>}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <span>By {endorser?.name || e.endorser_agent_id}</span>
                          <span>·</span>
                          <span>Strength {e.strength || 7}/10</span>
                          {e.created_date && <>
                            <span>·</span>
                            <span>{format(parseISO(e.created_date), 'MMM d, yyyy')}</span>
                          </>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}