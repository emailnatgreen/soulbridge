import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-900/30', border: 'border-red-700/50' },
  high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-900/30', border: 'border-orange-700/50' },
  medium: { icon: Info, color: 'text-yellow-500', bg: 'bg-yellow-900/30', border: 'border-yellow-700/50' },
  low: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-900/30', border: 'border-blue-700/50' },
};

export default function AnomalyOverviewPanel() {
  const [expanded, setExpanded] = useState({});
  
  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['jukebox-decisions-active'],
    queryFn: async () => {
      return await base44.entities.JukeboxDecision.filter({
        status: 'pending'
      }, '-created_date', 50);
    },
    refetchInterval: 30000,
  });

  const groupedByAction = decisions.reduce((acc, dec) => {
    if (!acc[dec.action]) acc[dec.action] = [];
    acc[dec.action].push(dec);
    return acc;
  }, {});

  const toggleExpanded = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-pulse text-slate-400">Loading anomalies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white mb-4">Active Anomalies & Alerts</h3>
      
      {decisions.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No active anomalies detected. The Village is in harmony.
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedByAction).map(([action, items]) => (
            <div key={action} className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-300 px-2 py-1 uppercase">{action}</h4>
              {items.map((decision) => {
                const severity = extractSeverity(decision.message);
                const config = severityConfig[severity] || severityConfig.low;
                const Icon = config.icon;
                const isExpanded = expanded[decision.id];

                return (
                  <div
                    key={decision.id}
                    className={`rounded-lg border ${config.border} ${config.bg} p-3 transition-all`}
                  >
                    <button
                      onClick={() => toggleExpanded(decision.id)}
                      className="w-full flex items-start gap-2 text-left"
                    >
                      <Icon className={`w-4 h-4 ${config.color} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {decision.agent_id}
                          </p>
                          <Badge variant="outline" className="text-xs">{severity}</Badge>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">{decision.message}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-xs text-slate-400">
                        <div>
                          <p className="font-semibold text-slate-300">Full Message:</p>
                          <p className="mt-1">{decision.message}</p>
                        </div>
                        {decision.triggered_by && (
                          <div>
                            <p className="font-semibold text-slate-300">Triggered By:</p>
                            <p className="mt-1">{decision.triggered_by}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-300">Status:</p>
                          <p className="mt-1">{decision.status}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 w-full text-purple-400 hover:text-purple-300 text-xs h-7"
                          onClick={() => window.dispatchEvent(new CustomEvent('open-axi', { detail: { message: `Review anomaly for ${decision.agent_id}: ${decision.message}` } }))}
                        >
                          Discuss with Axi
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractSeverity(message) {
  const lower = message.toLowerCase();
  if (lower.includes('critical') || lower.includes('emergency')) return 'critical';
  if (lower.includes('urgent') || lower.includes('high')) return 'high';
  if (lower.includes('warning')) return 'medium';
  return 'low';
}