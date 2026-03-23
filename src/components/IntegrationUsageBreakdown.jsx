import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

export default function IntegrationUsageBreakdown({ logs }) {
  const [expandedId, setExpandedId] = useState(null);

  const getIntegrationIcon = (type) => {
    switch(type) {
      case 'llm_call': return <Zap className="w-4 h-4 text-blue-400" />;
      case 'automation_run': return <Clock className="w-4 h-4 text-purple-400" />;
      case 'email': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'agent_message': return <Zap className="w-4 h-4 text-pink-400" />;
      default: return <Zap className="w-4 h-4 text-white/40" />;
    }
  };

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {logs.length === 0 ? (
        <div className="text-center py-8 text-white/40">No integration usage recorded</div>
      ) : (
        logs.slice(0, 50).map((log, idx) => (
          <div
            key={log.id || idx}
            onClick={() => setExpandedId(expandedId === (log.id || idx) ? null : (log.id || idx))}
            className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                {getIntegrationIcon(log.integration_type)}
                <div className="flex-1">
                  <div className="text-white/80 text-sm font-medium">{log.service_name || 'Unknown Service'}</div>
                  <div className="text-xs text-white/40">{new Date(log.created_date).toLocaleString('en-GB')}</div>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${log.success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} border-0`}>
                  {log.credits_consumed} credits
                </Badge>
              </div>
            </div>

            {expandedId === (log.id || idx) && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-white/40">Type:</span> <span className="text-white/80 capitalize">{log.integration_type.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-white/40">Triggered:</span> <span className="text-white/80 capitalize">{log.triggered_by || 'N/A'}</span></div>
                  {log.model_used && <div><span className="text-white/40">Model:</span> <span className="text-white/80">{log.model_used}</span></div>}
                  {log.response_time_ms && <div><span className="text-white/40">Response:</span> <span className="text-white/80">{log.response_time_ms}ms</span></div>}
                  {log.function_name && <div><span className="text-white/40">Function:</span> <span className="text-white/80 font-mono">{log.function_name}</span></div>}
                  {log.user_email && <div><span className="text-white/40">User:</span> <span className="text-white/80">{log.user_email}</span></div>}
                </div>
                {log.error_message && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-red-300">
                    {log.error_message}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}