import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

const KU_COLORS = {
  did_publication: '#a78bfa',
  governance_vote: '#60a5fa',
  task_completion: '#34d399',
  mentorship_session: '#f59e0b',
  knowledge_contribution: '#fb923c',
  skill_development: '#e879f9',
  economic_exchange: '#2dd4bf',
  collaborative_action: '#f87171',
  agent_message: '#94a3b8',
  resource_trade: '#86efac',
};

const KU_LABELS = {
  did_publication: 'DID Pub',
  governance_vote: 'Gov Vote',
  task_completion: 'Task Done',
  mentorship_session: 'Mentorship',
  knowledge_contribution: 'Knowledge',
  skill_development: 'Skill Dev',
  economic_exchange: 'Economic',
  collaborative_action: 'Collab',
  agent_message: 'Message',
  resource_trade: 'Trade',
};

export default function RecentKUFeed({ kus = [], agents = [] }) {
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" /> Recent Kinetic Units ({kus.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {kus.slice(0, 30).map(ku => {
            const agent = agentMap[ku.agent_id];
            const color = KU_COLORS[ku.ku_type] || '#64748b';
            return (
              <div key={ku.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-white/50 text-[10px] w-16 flex-shrink-0 truncate">{KU_LABELS[ku.ku_type] || ku.ku_type}</span>
                <span className="text-white/70 text-xs flex-1 truncate">{agent?.name || ku.agent_id?.slice(0, 12)}</span>
                <span className="font-mono text-amber-300/70 text-[10px] flex-shrink-0">×{(ku.weight || 1).toFixed(1)}</span>
                <Badge className="text-[9px] bg-purple-500/10 text-purple-300/70 px-1">{ku.status}</Badge>
                <span className="text-white/25 text-[9px] flex-shrink-0 w-10 text-right">
                  {new Date(ku.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          {kus.length === 0 && (
            <p className="text-white/30 text-xs text-center py-6">No Kinetic Units recorded yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}