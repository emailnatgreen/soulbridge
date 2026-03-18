import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, Link as LinkIcon } from 'lucide-react';

export default function CorrelatedInsightsViewer() {
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ['jukebox-decisions-correlation'],
    queryFn: async () => {
      return await base44.entities.JukeboxDecision.filter(
        { status: 'pending' },
        '-created_date',
        20
      );
    },
    refetchInterval: 45000,
  });

  const { data: allMemories = [] } = useQuery({
    queryKey: ['memories-for-correlation'],
    queryFn: async () => {
      return await base44.entities.Memory.list('-created_date', 500);
    },
    refetchInterval: 60000,
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['reputation-events-correlation'],
    queryFn: async () => {
      return await base44.entities.ReputationEvent.list('-created_date', 100);
    },
    refetchInterval: 60000,
  });

  const insights = useMemo(() => {
    if (!decisions.length) return [];

    return decisions.map((decision) => {
      const agentId = decision.agent_id;

      const agentMemories = allMemories.filter((m) => m.agent_id === agentId);
      const agentReputation = reputationEvents.filter((r) => r.agent_id === agentId);

      const recentNegativeEvents = agentReputation
        .filter((r) => r.impact < 0)
        .slice(0, 3);

      const memoryTypes = {};
      agentMemories.forEach((m) => {
        memoryTypes[m.type] = (memoryTypes[m.type] || 0) + 1;
      });

      return {
        decision,
        agentId,
        correlatedMemories: agentMemories.length,
        correlatedReputation: agentReputation.length,
        recentNegativeEvents,
        memoryDistribution: memoryTypes,
      };
    });
  }, [decisions, allMemories, reputationEvents]);

  if (decisionsLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Analyzing correlations...
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No decisions with correlated data to display.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4" /> Data Stream Correlations
      </h3>

      <div className="space-y-2 max-h-[700px] overflow-y-auto">
        {insights.map((insight) => (
          <div
            key={insight.decision.id}
            className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 hover:border-purple-500/30 transition-all"
          >
            <button
              onClick={() =>
                setSelectedAgentId(
                  selectedAgentId === insight.agentId ? null : insight.agentId
                )
              }
              className="w-full text-left"
            >
              <div className="flex items-start gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">
                    {insight.decision.message}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {insight.correlatedMemories} memories
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.correlatedReputation} reputation events
                    </Badge>
                  </div>
                </div>
              </div>
            </button>

            {selectedAgentId === insight.agentId && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-300 mb-2">Memory Distribution</p>
                  <div className="space-y-1">
                    {Object.entries(insight.memoryDistribution).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between text-slate-400">
                        <span>{type}</span>
                        <span className="text-purple-300">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {insight.recentNegativeEvents.length > 0 && (
                  <div>
                    <p className="font-semibold text-red-300 mb-2">Recent Negative Events</p>
                    <div className="space-y-1">
                      {insight.recentNegativeEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-2 bg-red-900/20 rounded border border-red-700/30 text-slate-300"
                        >
                          <p className="font-semibold text-xs">{event.event_type}</p>
                          <p className="text-xs mt-0.5">{event.description}</p>
                          <p className="text-xs text-red-300 mt-0.5">Impact: {event.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('open-axi', {
                        detail: {
                          message: `Analyze correlation for ${insight.agentId}: ${insight.decision.message}`,
                        },
                      })
                    )
                  }
                >
                  Deep Analysis with Axi
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}