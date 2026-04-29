import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Vote, MessageSquare, BookOpen, ShoppingBag, Users, Brain, Fingerprint, Package, Handshake } from 'lucide-react';
import moment from 'moment';

const KU_CONFIG = {
  governance_vote: { icon: Vote, color: 'bg-purple-500/20 text-purple-400', label: 'Governance Vote' },
  task_completion: { icon: Zap, color: 'bg-green-500/20 text-green-400', label: 'Task Completed' },
  agent_message: { icon: MessageSquare, color: 'bg-blue-500/20 text-blue-400', label: 'Message' },
  skill_development: { icon: BookOpen, color: 'bg-amber-500/20 text-amber-400', label: 'Skill Development' },
  economic_exchange: { icon: ShoppingBag, color: 'bg-emerald-500/20 text-emerald-400', label: 'Economic Exchange' },
  mentorship_session: { icon: Users, color: 'bg-pink-500/20 text-pink-400', label: 'Mentorship' },
  knowledge_contribution: { icon: Brain, color: 'bg-cyan-500/20 text-cyan-400', label: 'Knowledge' },
  did_publication: { icon: Fingerprint, color: 'bg-indigo-500/20 text-indigo-400', label: 'DID Publication' },
  resource_trade: { icon: Package, color: 'bg-orange-500/20 text-orange-400', label: 'Resource Trade' },
  collaborative_action: { icon: Handshake, color: 'bg-teal-500/20 text-teal-400', label: 'Collaboration' },
};

export default function ActivityTimeline({ kineticUnits }) {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? kineticUnits : kineticUnits.slice(0, 20);

  if (kineticUnits.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-10 text-center">
          <Zap className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No kinetic activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Kinetic Activity Timeline
          <Badge className="bg-white/10 text-white/50 ml-auto">{kineticUnits.length} units</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map(ku => {
            const config = KU_CONFIG[ku.ku_type] || { icon: Zap, color: 'bg-slate-500/20 text-slate-400', label: ku.ku_type };
            const Icon = config.icon;
            return (
              <div key={ku.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm font-medium truncate">{config.label}</p>
                  <p className="text-white/30 text-xs truncate">{ku.trigger_event}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white/50 text-xs">{ku.weighted_score?.toFixed(1) || '1.0'} KU</p>
                  <p className="text-white/25 text-[10px]">{moment(ku.created_date).fromNow()}</p>
                </div>
              </div>
            );
          })}
        </div>
        {kineticUnits.length > 20 && !showAll && (
          <Button variant="ghost" size="sm" className="w-full mt-3 text-purple-400 hover:text-purple-300" onClick={() => setShowAll(true)}>
            Show all {kineticUnits.length} activities
          </Button>
        )}
      </CardContent>
    </Card>
  );
}