import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  processed: { icon: CheckCircle2, color: 'text-green-500', label: 'Processed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

export default function PendingJukeboxDecisions() {
  const [selectedDecision, setSelectedDecision] = useState(null);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['jukebox-decisions-all'],
    queryFn: async () => {
      return await base44.entities.JukeboxDecision.list('-created_date', 30);
    },
    refetchInterval: 20000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['agent-messages-from-decisions'],
    queryFn: async () => {
      return await base44.entities.AgentMessage.list('-created_date', 100);
    },
    refetchInterval: 20000,
  });

  const getMessageStatus = (decisionId) => {
    const relatedMessages = messages.filter(m => m.context?.jukebox_decision_id === decisionId);
    if (relatedMessages.length === 0) return 'no_message';
    const latestMsg = relatedMessages[0];
    return latestMsg.status || 'sent';
  };

  if (isLoading) {
    return <div className="text-slate-400 text-sm p-4">Loading decisions...</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white mb-4">Jukebox Decisions & Outreach</h3>

      {decisions.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">No decisions to review.</div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {decisions.map((decision) => {
            const config = statusConfig[decision.status] || statusConfig.pending;
            const Icon = config.icon;
            const messageStatus = getMessageStatus(decision.id);
            const isSelected = selectedDecision?.id === decision.id;

            return (
              <div
                key={decision.id}
                className={`rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-500/50 bg-purple-900/20'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50'
                }`}
              >
                <button
                  onClick={() => setSelectedDecision(isSelected ? null : decision)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {decision.action.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">{decision.message}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {config.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{decision.agent_id}</span>
                    {messageStatus !== 'no_message' && (
                      <>
                        <span>•</span>
                        <MessageSquare className="w-3 h-3" />
                        <span>{messageStatus}</span>
                      </>
                    )}
                  </div>
                </button>

                {isSelected && (
                  <div className="border-t border-slate-700/50 p-3 bg-slate-900/20 space-y-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-300 mb-1">Action Details</p>
                      <p className="text-slate-400">{decision.action}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300 mb-1">Full Message</p>
                      <p className="text-slate-400">{decision.message}</p>
                    </div>
                    {decision.triggered_by && (
                      <div>
                        <p className="font-semibold text-slate-300 mb-1">Triggered By</p>
                        <p className="text-slate-400">{decision.triggered_by}</p>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('open-axi', {
                            detail: { message: `Decision context: ${decision.message}` },
                          })
                        )
                      }
                    >
                      Discuss Decision
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}